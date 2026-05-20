# Yaarlore Stability Framework

> Engineering playbook produced after root-cause investigation of: screens freezing after navigation, buttons becoming unclickable, demo flow stopping, app stuck between screens.

---

## Root Causes Fixed (May 2026)

| #   | Bug                                                                                                                           | File                        | Fix                                                 |
| --- | ----------------------------------------------------------------------------------------------------------------------------- | --------------------------- | --------------------------------------------------- |
| 1   | Dead rAF mouse-tracking loop burned CPU at 60fps with no consumer                                                             | CinematicLanding.tsx        | Removed — ParticleUniverse was gone but loop stayed |
| 2   | 5 dead state timers (setInterval + 3× setTimeout)                                                                             | CinematicLanding.tsx        | Removed — fed state nobody read                     |
| 3   | `setTimeout(router.push)` fired after component unmount → router state corruption                                             | generating/page.tsx         | mountedRef guard added                              |
| 4   | Supabase channel dep array included `refetch` → potential reconnect churn                                                     | page.tsx + generating       | refetchRef pattern applied                          |
| 5   | Spurious `refetch` in unrelated useEffect dep array                                                                           | trips/[tripId]/page.tsx     | Removed from deps                                   |
| 6   | Demo keyframes scoped by styled-jsx → inline animations referenced non-existent names → content invisible with fill-mode:both | DemoStoryClient.tsx         | Changed to `<style jsx global>`                     |
| 7   | Demo tap-zone buttons (z-40) covered CTA links → clicks intercepted                                                           | DemoStoryClient.tsx         | Tap zones hidden on CTA slide                       |
| 8   | Canvas in generating page had no pointer-events:none → hit-test cost on every click                                           | generating/page.tsx         | Added pointer-events:none                           |
| 9   | rAF loop didn't pause when browser tab hidden → wasted CPU in background                                                      | MemoryConstellationHero.tsx | Page Visibility API pause added                     |

---

## Performance Audit Results

### GPU-Expensive Properties (audited 2026-05-21)

| Property                          | Count | Location                 | Status                           |
| --------------------------------- | ----- | ------------------------ | -------------------------------- |
| `backdrop-filter: blur()`         | 2     | CTA links, footer        | Safe — not in rAF path           |
| `filter: blur()` on photos        | 12    | MemoryConstellationHero  | Safe — will-change:transform set |
| `box-shadow` (glow)               | 3     | progress dots, CTA hover | Safe — static or hover-only      |
| `will-change: transform, opacity` | 15+   | constellation photos     | Correct deployment               |

### rAF Budget (per page)

| Page                             | rAF Loops | Notes                                          |
| -------------------------------- | --------- | ---------------------------------------------- |
| Landing `/`                      | 1         | MemoryConstellationHero — pauses on hidden tab |
| Generating `/trips/X/generating` | 1         | Particle canvas                                |
| Trips `/trips`                   | 0         | CSS animations only                            |
| Trip room `/trips/X`             | 0         | CSS animations only                            |

**Budget limit: 2 concurrent rAF loops per page.** Exceeding this requires justification and profiling.

---

## Stabilization Rules

### 1. rAF / Animation

**Use rAF** only when transforms must be data-driven (physics, parallax, mouse tracking).  
**Use CSS `@keyframe`** for all timed, repeating, or entrance animations.  
**Never** run rAF without a Page Visibility API pause and a cleanup function.

```tsx
// CORRECT — rAF pattern
const rafRef = useRef(0);
useEffect(() => {
  const onVisible = () => {
    if (document.hidden) lastTime = null;
  };
  document.addEventListener('visibilitychange', onVisible);
  const loop = (ts: number) => {
    rafRef.current = requestAnimationFrame(loop);
    if (document.hidden) return; // skip frame
    // ... work ...
  };
  rafRef.current = requestAnimationFrame(loop);
  return () => {
    cancelAnimationFrame(rafRef.current);
    document.removeEventListener('visibilitychange', onVisible);
  };
}, [deps]);
```

**`will-change`**: Add `willChange: 'transform, opacity'` ONLY to elements whose `style.transform` is set imperatively in a rAF loop. Do NOT add it to CSS-animated elements — it wastes GPU layers.

### 2. Overlays (pointer-events)

**Rule: Every `position:fixed` or `position:absolute` element that covers interactive content MUST explicitly declare `pointerEvents: 'none'` unless it IS the interactive content.**

```tsx
// REQUIRED on all decorative overlays
<div style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }} aria-hidden />

// Canvas elements — always
<canvas style={{ pointerEvents: 'none' }} aria-hidden />

// Conditional interactive content
<div style={{ pointerEvents: isVisible ? 'auto' : 'none' }}>
  <button>...</button>
</div>
```

### 3. Effect Cleanup (mandatory)

Every `useEffect` must clean up everything it starts:

```tsx
useEffect(() => {
  const id = setInterval(...);
  window.addEventListener('resize', handler);
  const channel = supabase.channel(...).subscribe();
  return () => {
    clearInterval(id);
    window.removeEventListener('resize', handler);
    supabase.removeChannel(channel);
  };
}, [deps]);
```

**Exception pattern for `refetch` in Supabase channels:**

```tsx
// refetch from React Query is stable but dep-array changes can cause reconnects.
// Use refetchRef to stabilize the channel subscription.
const refetchRef = useRef(refetch);
useEffect(() => { refetchRef.current = refetch; }, [refetch]);

useEffect(() => {
  const channel = supabase.channel(name).on('postgres_changes', ..., () => {
    refetchRef.current(); // ← stable call, never causes re-subscription
  }).subscribe();
  return () => supabase.removeChannel(channel);
}, [tripId]); // refetch intentionally excluded
```

### 4. Navigation Safety

Every `router.push` called inside a `setTimeout` or async callback MUST be guarded:

```tsx
const mountedRef = useRef(true);
useEffect(() => {
  return () => {
    mountedRef.current = false;
  };
}, []);

// Later:
setTimeout(() => {
  if (mountedRef.current) router.push(url);
}, delayMs);
```

**Do not** call `router.push` in a `useEffect` that depends on data without a mounted check. The component could unmount between the data arriving and the push.

### 5. Styled-JSX Keyframes

**Do not** define keyframes in `<style jsx>` when they are referenced via inline `style={{ animation: 'name ...' }}` on a child component. The jsx compiler hashes keyframe names but inline style props reference the literal name.

```tsx
// WRONG — keyframe name gets hashed, inline style uses literal
<style jsx>{`@keyframes slam { ... }`}</style>
<Child style={{ animation: 'slam 0.6s ...' }} />

// CORRECT — use global to keep names unhashed
<style jsx global>{`@keyframes slam { ... }`}</style>
```

---

## Testing Checklist (run before every deploy)

### Functionality

- [ ] Navigate to `/trips/X/generating`, then immediately click browser back — verify no route corruption on return
- [ ] Complete OTP login flow end-to-end in incognito
- [ ] Open demo, tap through all slides, confirm CTA "Start your friendship archive" link works
- [ ] Upload 5+ photos to a trip, click "Ignite the Lore Engine" — verify redirect to generating page

### Performance

- [ ] Chrome DevTools → Performance tab → Record 5 seconds on landing page — verify no frame drops below 55fps
- [ ] Chrome DevTools → Memory tab → Take heap snapshot before and after navigating /, /trips, /trips/X — verify no major leaks
- [ ] Throttle: 4x CPU slowdown + Slow 3G → load landing page — first photo should appear within 2s

### Interaction

- [ ] On landing page: click "BEGIN ANALYSIS" — verify /login navigation
- [ ] On landing page: click "SEE A DEMO" — verify /demo navigation
- [ ] On /demo final slide: click "Start your friendship archive" — verify /login navigation (was broken by tap-zone overlay)
- [ ] On /trips/X after lore ready: confirm LoreWrapped modal closes and all buttons below are clickable

### Production Build

- [ ] `npm run build` — zero errors
- [ ] `npm run type-check` — zero errors
- [ ] Deploy preview URL — run all functionality tests above on the preview

---

## Performance Budget

| Metric                       | Limit    | Current            |
| ---------------------------- | -------- | ------------------ |
| Concurrent rAF loops         | 2 / page | Max 1 / page       |
| Concurrent `blur()` elements | 2        | Max 2              |
| Canvas max particles         | 400      | 150–400 (adaptive) |
| `will-change` elements       | 20       | ~15                |
| `backdrop-filter` elements   | 3        | 2                  |
| Dead event listeners         | 0        | 0 (fixed)          |

---

_Last updated: 2026-05-21. Reflects fixes in commits 60c66bf, 62cb19b, 69f34ef, and canvas fix._
