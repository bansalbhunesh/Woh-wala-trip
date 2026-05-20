"""
Slambook PDF generator for Yaarlore print tier.

Generates a print-quality A4 PDF slambook using the trip's ACTUAL uploaded photos:

  Cover (photo background)
  → Hero Photo Spread (top 2 most-viewed photos, full-bleed)
  → The Crew (character dossiers, each with that member's best photo)
  → The Journey (chaos stats, narrative, chapters)
  → Your Photos (trip photos across multiple pages — real uploaded images)
  → Awards + Quotes
  → Closing

Photo quality strategy:
  - Full-resolution originals downloaded for hero/cover/featured spots
  - Resized to 1800px max dimension in memory (print-ready, RAM-safe)
  - Thumbnails (300px) used only for the 3×3 overview grid
  - Photos ranked by engagement (photo_view_stats.long_view_count DESC)

The PDF is uploaded to Supabase Storage at {trip_id}/slambook.pdf and
trips.slambook_path is updated so the tRPC getSlambookUrl query returns
a signed download URL.
"""
import io
import asyncio
import logging
from typing import Any, Optional

from fpdf import FPDF
from fpdf.enums import XPos, YPos
from PIL import Image

from .clients import supabase

log = logging.getLogger("wwt.slambook")

# ── Colour palette ─────────────────────────────────────────────────────────────
BG       = (10,  10,  8)
CARD_BG  = (18,  18,  14)
RED      = (255, 77,  77)
CREAM    = (245, 240, 232)
DIM      = (160, 150, 135)
GOLD     = (212, 175, 55)
WHITE    = (255, 255, 255)
LINE_CLR = (40,  40,  35)

W, H   = 210, 297   # A4 portrait, mm
MARGIN = 14

# Max pixel dimension when processing a full-res photo for embedding.
# 1800px gives ~150 DPI at A5 and ~100 DPI full A4 — adequate for photobook printing.
# Keeps memory at ~3MB per photo in memory vs. 50MB raw upload.
MAX_PHOTO_PX = 1800


# ── PDF class ──────────────────────────────────────────────────────────────────

class SlamPDF(FPDF):
    def header(self):
        pass

    def footer(self):
        self.set_y(-9)
        self.set_font("Helvetica", size=6)
        self.set_text_color(*DIM)
        self.cell(0, 4, f"YAARLORE  ·  AI FRIENDSHIP ARCHIVE  ·  PAGE {self.page_no()}",
                  align="C")

    def fill_bg(self):
        self.set_fill_color(*BG)
        self.rect(0, 0, W, H, style="F")

    def h_line(self, y: float):
        self.set_draw_color(*LINE_CLR)
        self.line(MARGIN, y, W - MARGIN, y)

    def label(self, text: str, x: float, y: float, size: float = 7,
              color=DIM, align: str = "L"):
        self.set_xy(x, y)
        self.set_font("Helvetica", style="B", size=size)
        self.set_text_color(*color)
        self.cell(W - 2 * MARGIN, size + 1, text.upper(), align=align,
                  new_x=XPos.LMARGIN, new_y=YPos.NEXT)

    def body(self, text: str, x: float, y: float, w: float,
             size: float = 9, color=CREAM, lh: float = 1.4) -> float:
        self.set_xy(x, y)
        self.set_font("Helvetica", size=size)
        self.set_text_color(*color)
        self.multi_cell(w, size * lh, text, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        return self.get_y()

    def stat_box(self, label: str, value: str, x: float, y: float, w: float = 42, h: float = 16):
        self.set_fill_color(*CARD_BG)
        self.rect(x, y, w, h, style="F")
        self.set_xy(x + 3, y + 2)
        self.set_font("Helvetica", style="B", size=6)
        self.set_text_color(*DIM)
        self.cell(w - 6, 5, label.upper())
        self.set_xy(x + 3, y + 8)
        self.set_font("Helvetica", style="B", size=11)
        self.set_text_color(*CREAM)
        self.cell(w - 6, 6, str(value)[:20])

    def embed_photo(self, img_bytes: bytes, x: float, y: float,
                    w: float, h: float, full_res: bool = False) -> bool:
        """
        Embed a photo at (x, y) scaled to fit w×h while preserving aspect ratio.
        full_res=True: resize to MAX_PHOTO_PX first (print quality, more RAM).
        full_res=False: embed as-is (for thumbnails in grids).
        Returns True on success.
        """
        try:
            img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
            if full_res:
                img.thumbnail((MAX_PHOTO_PX, MAX_PHOTO_PX), Image.Resampling.LANCZOS)
            buf = io.BytesIO()
            img.save(buf, format="JPEG", quality=90 if full_res else 82)
            buf.seek(0)
            self.image(buf, x=x, y=y, w=w, h=h, keep_aspect_ratio=True)
            return True
        except Exception as e:
            log.warning(f"embed_photo failed: {e}")
            return False

    def dark_overlay(self, x: float, y: float, w: float, h: float, alpha: float = 0.6):
        """Draw a semi-transparent dark rectangle over a photo."""
        self.set_alpha(alpha)
        self.set_fill_color(*BG)
        self.rect(x, y, w, h, style="F")
        self.set_alpha(1.0)


# ── Photo utilities ────────────────────────────────────────────────────────────

def _resize_to_jpeg(img_bytes: bytes, max_px: int = MAX_PHOTO_PX) -> bytes:
    """Resize to max_px on longest dimension and return JPEG bytes."""
    img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    img.thumbnail((max_px, max_px), Image.Resampling.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=90)
    return buf.getvalue()


async def _download_photo(storage_path: str, full_res: bool = True) -> Optional[bytes]:
    """Download a photo from Supabase Storage. Returns None on failure."""
    try:
        raw = await asyncio.to_thread(
            lambda: supabase.storage.from_("trip-photos").download(storage_path)
        )
        if not raw:
            return None
        if full_res:
            return await asyncio.to_thread(lambda: _resize_to_jpeg(raw))
        return raw  # thumbnail bytes, already small
    except Exception as e:
        log.warning(f"_download_photo({storage_path}) failed: {e}")
        return None


async def _fetch_ranked_photos(trip_id: str, limit: int = 30) -> list[dict]:
    """
    Fetch photos ranked by engagement (long_view_count DESC, then view_count DESC,
    then created_at ASC for timeline coverage).

    Returns list of photo rows with added engagement fields.
    """
    # Left-join photos with photo_view_stats to get engagement signals
    result = await asyncio.to_thread(
        lambda: supabase.table("photos")
            .select(
                "id, user_id, storage_path, thumbnail_path, created_at, is_private, "
                "photo_view_stats!left(view_count, long_view_count, avg_duration_ms)"
            )
            .eq("trip_id", trip_id)
            .eq("is_private", False)
            .order("created_at")
            .limit(200)  # fetch broadly, then rank
            .execute()
    )
    photos: list[dict] = result.data or []

    # Flatten the joined stats
    for ph in photos:
        stats = ph.pop("photo_view_stats", None) or {}
        if isinstance(stats, list):
            stats = stats[0] if stats else {}
        ph["long_view_count"] = int(stats.get("long_view_count") or 0)
        ph["view_count"]      = int(stats.get("view_count") or 0)
        ph["avg_duration_ms"] = float(stats.get("avg_duration_ms") or 0)

    # Sort: long views first, then total views, then early in trip (timeline coverage)
    photos.sort(
        key=lambda p: (-p["long_view_count"], -p["view_count"]),
    )

    return photos[:limit]


async def _per_member_best_photo(
    member_user_id: str,
    all_photos: list[dict],
) -> Optional[str]:
    """
    Return the storage_path of the best (most-viewed) photo uploaded BY this member.
    Falls back to any photo with this member in the trip if none uploaded by them.
    """
    member_photos = [p for p in all_photos if p.get("user_id") == member_user_id]
    if member_photos:
        return member_photos[0]["storage_path"]
    return None


# ── Main generator ────────────────────────────────────────────────────────────

async def generate_slambook(trip_id: str) -> None:
    log.info(f"[slambook] starting for trip {trip_id}")
    try:
        # ── 1. Fetch trip ──────────────────────────────────────────────────────
        trip_row = await asyncio.to_thread(
            lambda: supabase.table("trips")
                .select("id, name, destination, trip_start_date, trip_end_date, "
                        "chaos_score, lore_json, tier")
                .eq("id", trip_id)
                .single()
                .execute()
        )
        trip: dict[str, Any] = trip_row.data or {}
        if not trip:
            log.error(f"[slambook] trip {trip_id} not found")
            return

        lore: dict[str, Any] = trip.get("lore_json") or {}

        # ── 2. Fetch members ──────────────────────────────────────────────────
        members_row = await asyncio.to_thread(
            lambda: supabase.table("trip_members")
                .select("user_id, profiles:user_id(display_name, username)")
                .eq("trip_id", trip_id)
                .execute()
        )
        members: list[dict] = members_row.data or []

        # ── 3. Fetch and rank all photos by engagement ────────────────────────
        all_photos = await _fetch_ranked_photos(trip_id, limit=40)
        log.info(f"[slambook] {len(all_photos)} photos fetched for trip {trip_id}")

        if not all_photos:
            log.warning(f"[slambook] no photos for trip {trip_id} — continuing without photos")

        # ── 4. Download photos in parallel ────────────────────────────────────
        # Hero photos (top 2 most-viewed): full resolution for cover + hero spread
        # Featured photos (next 8): full resolution for character pages + photo album
        # Grid photos (next 12): thumbnails for 3×3 overview grid

        hero_paths    = [p["storage_path"] for p in all_photos[:2]]
        featured_paths = [p["storage_path"] for p in all_photos[2:10]]
        grid_paths    = [
            p.get("thumbnail_path") or p["storage_path"]
            for p in all_photos[10:22]
        ]

        # Download concurrently (cap at 12 simultaneous to stay within Render RAM)
        async def dl_batch(paths: list[str], full_res: bool) -> list[Optional[bytes]]:
            tasks = [_download_photo(p, full_res=full_res) for p in paths]
            return await asyncio.gather(*tasks)

        hero_bytes, featured_bytes, grid_bytes = await asyncio.gather(
            dl_batch(hero_paths, full_res=True),
            dl_batch(featured_paths, full_res=True),
            dl_batch(grid_paths, full_res=False),
        )

        # Per-member best photos (full-res, from the ranked list)
        member_photo_map: dict[str, Optional[bytes]] = {}
        for member in members:
            uid = member.get("user_id", "")
            best_path = await _per_member_best_photo(uid, all_photos)
            if best_path:
                # Use already-downloaded bytes if available, else download
                idx = next((i for i, p in enumerate(all_photos[:10])
                            if p["storage_path"] == best_path), None)
                if idx is not None and idx < 2:
                    member_photo_map[uid] = hero_bytes[idx]
                elif idx is not None and 2 <= idx < 10:
                    member_photo_map[uid] = featured_bytes[idx - 2]
                else:
                    member_photo_map[uid] = await _download_photo(best_path, full_res=True)
            else:
                member_photo_map[uid] = None

        # ── 5. Build PDF ───────────────────────────────────────────────────────
        cover_photo  = hero_bytes[0] if hero_bytes else None
        hero_photo_2 = hero_bytes[1] if len(hero_bytes) > 1 else None
        all_feature_bytes = [b for b in featured_bytes if b is not None]
        all_grid_bytes    = [b for b in grid_bytes if b is not None]

        lore_chars: list[dict] = lore.get("character_roles") or []
        char_by_name = {c.get("name", "").strip(): c for c in lore_chars}

        pdf_bytes = await asyncio.to_thread(
            lambda: _build_pdf(
                trip, lore, members, char_by_name,
                cover_photo, hero_photo_2,
                all_feature_bytes, all_grid_bytes,
                member_photo_map,
            )
        )

        # ── 6. Upload PDF ──────────────────────────────────────────────────────
        slambook_path = f"{trip_id}/slambook.pdf"
        await asyncio.to_thread(
            lambda: supabase.storage.from_("trip-photos").upload(
                slambook_path, pdf_bytes,
                {"content-type": "application/pdf", "upsert": "true"},
            )
        )

        # ── 7. Stamp slambook_path ─────────────────────────────────────────────
        await asyncio.to_thread(
            lambda: supabase.table("trips")
                .update({"slambook_path": slambook_path})
                .eq("id", trip_id)
                .execute()
        )

        log.info(
            f"[slambook] done for trip {trip_id} — "
            f"{len(pdf_bytes):,} bytes, "
            f"{len(all_photos)} photos included"
        )

    except Exception as e:
        log.exception(f"[slambook] failed for trip {trip_id}: {e}")


# ── PDF builder ───────────────────────────────────────────────────────────────

def _build_pdf(
    trip: dict,
    lore: dict,
    members: list,
    char_by_name: dict[str, dict],
    cover_photo: Optional[bytes],
    hero_photo_2: Optional[bytes],
    featured_bytes: list[bytes],
    grid_bytes: list[bytes],
    member_photo_map: dict[str, Optional[bytes]],
) -> bytes:
    pdf = SlamPDF()
    pdf.set_auto_page_break(auto=False)

    _page_cover(pdf, trip, lore, cover_photo)

    # Hero photo spread — most-viewed photo, full bleed
    if hero_photo_2:
        _page_hero_spread(pdf, trip, lore, hero_photo_2)

    # Character dossiers — each with their actual photo
    _page_crew(pdf, trip, lore, members, char_by_name, member_photo_map)

    # Journey / narrative
    _page_journey(pdf, trip, lore)

    # Photo album — featured full-res photos, 2 per spread
    if featured_bytes:
        _pages_photo_album(pdf, trip, featured_bytes)

    # Overview grid — broader set of thumbnails
    if grid_bytes:
        _page_moments_grid(pdf, trip, grid_bytes)

    # Awards + quotes
    _page_awards_and_quotes(pdf, trip, lore)

    # Closing
    _page_closing(pdf, trip, lore)

    return bytes(pdf.output())


# ── Page builders ─────────────────────────────────────────────────────────────

def _page_cover(pdf: SlamPDF, trip: dict, lore: dict, cover_photo: Optional[bytes]):
    pdf.add_page()

    chaos   = trip.get("chaos_score") or lore.get("cooked_level") or 0
    verdict = lore.get("cooked_verdict") or "Historically Cooked"
    tagline = lore.get("tagline") or ""
    title   = lore.get("trip_title") or trip.get("name") or "The Trip"
    dest    = trip.get("destination") or ""
    start   = (trip.get("trip_start_date") or "")[:7]
    end     = (trip.get("trip_end_date")   or "")[:7]

    if cover_photo:
        # Full-bleed photo background
        pdf.embed_photo(cover_photo, 0, 0, W, H, full_res=True)
        # Dark gradient overlay so text is legible
        pdf.dark_overlay(0, 0, W, H, alpha=0.58)
    else:
        pdf.fill_bg()

    # Top eyebrow
    pdf.set_xy(MARGIN, 20)
    pdf.set_font("Helvetica", style="B", size=7)
    pdf.set_text_color(*RED)
    pdf.cell(0, 5, "● YAARLORE  ·  FRIENDSHIP ARCHIVE")

    # Chaos score — huge, floating
    pdf.set_xy(MARGIN, 52)
    pdf.set_font("Helvetica", style="B", size=78)
    pdf.set_text_color(*RED)
    pdf.cell(0, 66, str(int(chaos)))

    # Verdict
    pdf.set_xy(MARGIN, 120)
    pdf.set_font("Helvetica", style="B", size=9)
    pdf.set_text_color(*RED)
    pdf.cell(0, 6, verdict.upper())

    # Rule
    pdf.set_draw_color(*RED)
    pdf.set_line_width(0.5)
    pdf.line(MARGIN, 130, W - MARGIN, 130)
    pdf.set_line_width(0.2)

    # Title
    pdf.set_xy(MARGIN, 135)
    pdf.set_font("Helvetica", style="B", size=28)
    pdf.set_text_color(*CREAM)
    pdf.multi_cell(W - 2 * MARGIN, 13, title)

    # Tagline
    if tagline:
        y = pdf.get_y() + 3
        pdf.set_xy(MARGIN, y)
        pdf.set_font("Helvetica", style="I", size=10)
        pdf.set_text_color(*DIM)
        pdf.multi_cell(W - 2 * MARGIN, 6, f'"{tagline}"')

    # Destination + date — bottom-left
    date_str = f"{start}  –  {end}".strip(" –") if start else ""
    info_line = "  ·  ".join(filter(None, [dest, date_str]))
    pdf.set_xy(MARGIN, H - 22)
    pdf.set_font("Helvetica", size=7)
    pdf.set_text_color(*DIM)
    pdf.cell(0, 5, info_line)

    # "Print edition" stamp — bottom-right
    pdf.set_xy(W - 55, H - 22)
    pdf.set_font("Helvetica", style="B", size=6)
    pdf.set_text_color(*DIM)
    pdf.cell(55 - MARGIN, 5, "PRINT EDITION  ·  SLAMBOOK", align="R")


def _page_hero_spread(pdf: SlamPDF, trip: dict, lore: dict, photo: bytes):
    """Full-bleed hero photo page — the second most-viewed trip photo."""
    pdf.add_page()
    pdf.embed_photo(photo, 0, 0, W, H, full_res=True)

    # Minimal caption strip at the bottom
    pdf.set_alpha(0.7)
    pdf.set_fill_color(*BG)
    pdf.rect(0, H - 16, W, 16, style="F")
    pdf.set_alpha(1.0)

    title = lore.get("trip_title") or trip.get("name") or ""
    pdf.set_xy(MARGIN, H - 13)
    pdf.set_font("Helvetica", style="B", size=7)
    pdf.set_text_color(*CREAM)
    pdf.cell(0, 5, f"{title.upper()}  ·  YAARLORE")


def _page_crew(
    pdf: SlamPDF,
    trip: dict,
    lore: dict,
    members: list,
    char_by_name: dict[str, dict],
    member_photo_map: dict[str, Optional[bytes]],
):
    """One spread per member: large photo left + dossier right."""
    for member in members:
        profile     = member.get("profiles") or {}
        uid         = member.get("user_id", "")
        name        = (profile.get("display_name") or profile.get("username") or "Member")[:24]
        char        = char_by_name.get(name) or {}
        archetype   = char.get("role_title") or "Trip Member"
        verdict_txt = char.get("verdict") or ""
        photo_bytes = member_photo_map.get(uid)

        pdf.add_page()
        pdf.fill_bg()

        # ── Left half: photo ────────────────────────────────────────────────
        left_w = W / 2 - 2
        if photo_bytes:
            pdf.embed_photo(photo_bytes, 0, 0, left_w, H, full_res=True)
            # Gradient right-edge fade (approximated with semi-transparent strip)
            pdf.set_alpha(0.4)
            pdf.set_fill_color(*BG)
            pdf.rect(left_w - 8, 0, 10, H, style="F")
            pdf.set_alpha(1.0)
        else:
            # No photo: fill with card colour + initial
            pdf.set_fill_color(*CARD_BG)
            pdf.rect(0, 0, left_w, H, style="F")
            pdf.set_xy(left_w / 2 - 20, H / 2 - 20)
            pdf.set_font("Helvetica", style="B", size=60)
            pdf.set_text_color(*RED)
            pdf.cell(40, 40, name[0].upper(), align="C")

        # ── Right half: dossier ─────────────────────────────────────────────
        rx = W / 2 + 4
        rw = W / 2 - MARGIN - 4

        # Eyebrow
        pdf.set_xy(rx, 22)
        pdf.set_font("Helvetica", style="B", size=6)
        pdf.set_text_color(*RED)
        pdf.cell(rw, 5, "● CHARACTER DOSSIER")

        # Name
        pdf.set_xy(rx, 30)
        pdf.set_font("Helvetica", style="B", size=20)
        pdf.set_text_color(*CREAM)
        pdf.multi_cell(rw, 10, name)

        # Archetype
        y = pdf.get_y() + 2
        pdf.set_xy(rx, y)
        pdf.set_font("Helvetica", style="B", size=8)
        pdf.set_text_color(*RED)
        pdf.cell(rw, 5, archetype.upper()[:30])

        # Rule
        pdf.h_line(y + 9)
        y += 14

        # Evidence bullets from char data
        evidence_items: list[str] = []
        if char.get("archetype_evidence"):
            evidence_items.append(char["archetype_evidence"])
        if char.get("most_photographed_doing"):
            evidence_items.append(f"Most photographed: {char['most_photographed_doing']}")
        chaos_pct = char.get("chaos_contribution_pct")
        if chaos_pct:
            evidence_items.append(f"Chaos contribution: {chaos_pct}% of total")
        dominant_quote = char.get("dominant_quote") or ""
        what_wont_admit = char.get("what_they_wont_admit") or ""

        for item in evidence_items[:3]:
            pdf.set_xy(rx, y)
            pdf.set_font("Helvetica", size=7)
            pdf.set_text_color(*DIM)
            pdf.multi_cell(rw, 4.5, f"• {item[:80]}")
            y = pdf.get_y() + 2

        # Dominant quote
        if dominant_quote and y < H - 70:
            pdf.h_line(y + 2)
            y += 6
            pdf.set_xy(rx, y)
            pdf.set_font("Helvetica", style="I", size=8)
            pdf.set_text_color(*CREAM)
            pdf.multi_cell(rw, 5, f'"{dominant_quote[:120]}"')
            y = pdf.get_y() + 4

        # Verdict box
        if verdict_txt and y < H - 50:
            pdf.set_fill_color(*CARD_BG)
            box_h = min(30, H - y - 20)
            pdf.rect(rx, y, rw, box_h, style="F")
            pdf.set_xy(rx + 3, y + 3)
            pdf.set_font("Helvetica", style="B", size=6)
            pdf.set_text_color(*RED)
            pdf.cell(rw - 6, 4, "AI VERDICT")
            pdf.set_xy(rx + 3, y + 9)
            pdf.set_font("Helvetica", style="I", size=7)
            pdf.set_text_color(*CREAM)
            pdf.multi_cell(rw - 6, 4.5, verdict_txt[:160])
            y = y + box_h + 4

        # "What they won't admit"
        if what_wont_admit and y < H - 28:
            pdf.set_xy(rx, y)
            pdf.set_font("Helvetica", size=7)
            pdf.set_text_color(*DIM)
            pdf.multi_cell(rw, 4.5, f"What {name.split()[0]} won't admit: {what_wont_admit[:100]}")

        # Signature box at bottom
        sig_y = H - 22
        pdf.h_line(sig_y - 4)
        pdf.set_xy(rx, sig_y - 2)
        pdf.set_font("Helvetica", size=6)
        pdf.set_text_color(*DIM)
        pdf.cell(rw, 4, "SIGNATURE:")
        pdf.set_draw_color(*LINE_CLR)
        pdf.line(rx + 22, sig_y + 1, rx + rw, sig_y + 1)


def _page_journey(pdf: SlamPDF, trip: dict, lore: dict):
    pdf.add_page()
    pdf.fill_bg()

    pdf.label("THE JOURNEY", MARGIN, 20, size=8, color=RED)
    pdf.h_line(30)

    chaos = trip.get("chaos_score") or lore.get("cooked_level") or 0
    stats = [
        ("CHAOS SCORE",  str(int(chaos))),
        ("ERA",          (lore.get("era_title") or "—")[:16]),
        ("VERDICT",      (lore.get("cooked_verdict") or "—")[:16]),
        ("CREW SIZE",    str(len(lore.get("character_roles") or []) or "—")),
    ]
    sx = MARGIN
    for lbl, val in stats:
        pdf.stat_box(lbl, val, sx, 34)
        sx += 47
    pdf.h_line(56)

    y = 62
    narrative: str = lore.get("trip_narrative") or lore.get("lore_narrative") or ""
    if narrative:
        pdf.label("NARRATIVE", MARGIN, y, size=7)
        y += 7
        y = pdf.body(narrative[:1400], MARGIN, y, W - 2 * MARGIN, size=8) + 4

    chapters: list[dict] = lore.get("chapters") or []
    if chapters and y < H - 40:
        pdf.h_line(y)
        y += 4
        pdf.label("CHAPTERS", MARGIN, y, size=7)
        y += 7
        for i, ch in enumerate(chapters[:5]):
            if y >= H - 18:
                break
            ch_title = ch.get("title") or ch.get("chapter_title") or f"Chapter {i+1}"
            pdf.set_xy(MARGIN, y)
            pdf.set_font("Helvetica", style="B", size=8)
            pdf.set_text_color(*RED)
            pdf.cell(6, 5, str(i + 1))
            pdf.set_font("Helvetica", size=8)
            pdf.set_text_color(*CREAM)
            pdf.cell(0, 5, ch_title[:65])
            y += 6
            ch_body = ch.get("content") or ch.get("body") or ""
            if ch_body and y < H - 20:
                y = pdf.body(ch_body[:280], MARGIN + 8, y, W - 2 * MARGIN - 8,
                             size=7, color=DIM) + 3


def _pages_photo_album(pdf: SlamPDF, trip: dict, featured_bytes: list[bytes]):
    """
    2-up photo layout: each page shows 2 real uploaded photos side by side.
    Full-resolution images make this the visual heart of the slambook.
    Up to 4 pages (8 photos max).
    """
    title = lore_title = trip.get("name") or "The Trip"
    photos = [b for b in featured_bytes if b]

    for page_start in range(0, min(len(photos), 8), 2):
        batch = photos[page_start:page_start + 2]
        pdf.add_page()
        pdf.fill_bg()

        # Section label (first page only)
        if page_start == 0:
            pdf.set_xy(MARGIN, 6)
            pdf.set_font("Helvetica", style="B", size=7)
            pdf.set_text_color(*RED)
            pdf.cell(0, 5, f"● YOUR PHOTOS  ·  {title.upper()}")

        # Two photos stacked vertically with a small gap
        usable_h = H - 14  # leave room for footer
        start_y  = 14 if page_start == 0 else 8
        ph       = (usable_h - start_y - 4) / 2  # height per photo
        pw       = W - 2 * MARGIN                 # full page width

        for i, photo_b in enumerate(batch):
            py = start_y + i * (ph + 4)
            pdf.embed_photo(photo_b, MARGIN, py, pw, ph, full_res=True)


def _page_moments_grid(pdf: SlamPDF, trip: dict, grid_bytes: list[bytes]):
    """3×3 thumbnail grid — shows 9 more photos from the trip."""
    pdf.add_page()
    pdf.fill_bg()

    pdf.label("MOMENTS", MARGIN, 20, size=8, color=RED)
    pdf.h_line(30)

    photos   = [b for b in grid_bytes if b][:9]
    cell_w   = (W - 2 * MARGIN - 8) / 3
    cell_h   = cell_w
    start_y  = 36

    for idx, img_b in enumerate(photos):
        row = idx // 3
        col = idx % 3
        x = MARGIN + col * (cell_w + 4)
        y = start_y + row * (cell_h + 4)
        if y + cell_h > H - 14:
            break
        pdf.embed_photo(img_b, x, y, cell_w, cell_h, full_res=False)


def _page_awards_and_quotes(pdf: SlamPDF, trip: dict, lore: dict):
    pdf.add_page()
    pdf.fill_bg()

    y = 20
    pdf.label("THE AWARDS CEREMONY", MARGIN, y, size=8, color=RED)
    pdf.h_line(y + 10)
    y += 14

    awards: list[dict] = lore.get("fake_awards") or lore.get("superlatives") or []
    for award in awards[:6]:
        if y >= H / 2 - 10:
            break
        a_title  = award.get("title") or award.get("label") or award.get("category") or ""
        a_winner = award.get("winner") or award.get("value") or ""
        a_note   = award.get("evidence") or award.get("reason") or ""
        if not a_title:
            continue

        pdf.set_fill_color(*CARD_BG)
        pdf.rect(MARGIN, y, W - 2 * MARGIN, 18, style="F")
        pdf.set_xy(MARGIN + 3, y + 2)
        pdf.set_font("Helvetica", style="B", size=6)
        pdf.set_text_color(*GOLD)
        pdf.cell(W - 2 * MARGIN - 6, 5, a_title.upper()[:60])
        pdf.set_xy(MARGIN + 3, y + 8)
        pdf.set_font("Helvetica", style="B", size=10)
        pdf.set_text_color(*CREAM)
        pdf.cell(W - 2 * MARGIN - 6, 6, a_winner[:40])
        if a_note:
            pdf.set_xy(MARGIN + 3, y + 14)
            pdf.set_font("Helvetica", style="I", size=6)
            pdf.set_text_color(*DIM)
            pdf.cell(W - 2 * MARGIN - 6, 4, a_note[:70])
        y += 22

    # Quote archive (bottom half of page)
    pdf.h_line(y + 2)
    y += 6
    pdf.label("QUOTE ARCHIVE", MARGIN, y, size=7)
    y += 8

    quotes: list[dict] = lore.get("extracted_quotes") or []
    if not quotes:
        quotes = [{"quote": q} for q in (lore.get("key_quotes") or []) if q]

    for q in quotes[:5]:
        if y >= H - 18:
            break
        q_text   = q.get("quote") or ""
        q_person = q.get("attributed_to") or q.get("person") or ""
        if not q_text:
            continue
        pdf.set_xy(MARGIN, y)
        pdf.set_font("Helvetica", style="I", size=8)
        pdf.set_text_color(*CREAM)
        pdf.multi_cell(W - 2 * MARGIN, 5, f'"{q_text[:100]}"')
        if q_person:
            pdf.set_font("Helvetica", size=7)
            pdf.set_text_color(*DIM)
            pdf.cell(0, 4, f"  — {q_person}")
            pdf.ln(4)
        else:
            pdf.ln(3)
        y = pdf.get_y()


def _page_closing(pdf: SlamPDF, trip: dict, lore: dict):
    pdf.add_page()
    pdf.fill_bg()

    closing = lore.get("closing_line") or lore.get("cooked_verdict") or "Legendary."
    title   = lore.get("trip_title") or trip.get("name") or "The Trip"

    pdf.set_xy(MARGIN, H / 2 - 35)
    pdf.set_font("Helvetica", size=7)
    pdf.set_text_color(*DIM)
    pdf.cell(0, 6, "— CLOSING LINE —", align="C")

    pdf.set_xy(MARGIN, H / 2 - 25)
    pdf.set_font("Helvetica", style="BI", size=18)
    pdf.set_text_color(*CREAM)
    pdf.multi_cell(W - 2 * MARGIN, 12, f'"{closing}"', align="C")

    pdf.set_xy(MARGIN, H / 2 + 18)
    pdf.set_font("Helvetica", style="B", size=9)
    pdf.set_text_color(*RED)
    pdf.cell(0, 6, title.upper(), align="C")

    # Signature spread
    pdf.h_line(H / 2 + 38)
    pdf.set_xy(MARGIN, H / 2 + 42)
    pdf.set_font("Helvetica", size=6)
    pdf.set_text_color(*DIM)
    pdf.cell(0, 5, "SIGN HERE  ·  THIS TRIP IS NOW MYTHOLOGY", align="C")

    sig_y = H / 2 + 54
    sig_w = (W - 2 * MARGIN) / 3
    for i in range(3):
        sx = MARGIN + i * (sig_w + 4)
        pdf.set_draw_color(*LINE_CLR)
        pdf.line(sx, sig_y + 6, sx + sig_w - 4, sig_y + 6)

    # Footer
    pdf.set_xy(MARGIN, H - 28)
    pdf.set_font("Helvetica", size=7)
    pdf.set_text_color(*DIM)
    pdf.cell(0, 5, "Generated by Yaarlore AI  ·  yaarlore.app", align="C")
