'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ─────────────────────────────────────────────────────────────────────────────
// GROUP ANTHEM
// The AI Historian's musical assessment of the trip — hidden in Deeper Record.
// Not background audio. Not ambient sound.
// A recovered artifact. Emotionally loaded discovery.
//
// Design philosophy:
// - Never autoplays. Never plays at all — this is a text artifact.
// - Discovered, not presented. Lives inside DeeperRecord, not above fold.
// - Points to where the feeling lives (Spotify search) without hosting audio.
// - Feels like recovering a cassette tape from a 3 AM glove compartment.
// ─────────────────────────────────────────────────────────────────────────────

interface AnthemData {
  title: string;
  reason: string;
  vibe: string;
  spotify_search: string;
}

export function GroupAnthem({ anthem, chaosScore }: { anthem: AnthemData; chaosScore?: number }) {
  const [revealed, setRevealed] = useState(false);

  if (!anthem?.title) return null;

  // Color based on chaos — the anthem's emotional register
  const accentColor =
    (chaosScore ?? 0) >= 76
      ? '#FF4D4D'
      : (chaosScore ?? 0) >= 51
        ? '#D45D2D'
        : (chaosScore ?? 0) >= 26
          ? '#D49E2D'
          : '#7C6AFF';

  const spotifyUrl = `https://open.spotify.com/search/${encodeURIComponent(anthem.spotify_search)}`;

  return (
    <div className="space-y-2">
      {/* The discovery moment — blurred until tapped */}
      <button onClick={() => setRevealed(r => !r)} className="w-full text-left">
        <div
          className="flex items-start gap-4 px-4 py-4 rounded-2xl transition-all"
          style={{
            background: `${accentColor}06`,
            border: `1px solid ${accentColor}15`,
          }}
        >
          {/* Vinyl record illustration */}
          <div className="flex-shrink-0 mt-0.5">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center relative"
              style={{
                background: `${accentColor}12`,
                border: `2px solid ${accentColor}25`,
              }}
            >
              {/* Vinyl grooves */}
              <div
                className="w-3 h-3 rounded-full"
                style={{ background: `${accentColor}30`, border: `1px solid ${accentColor}50` }}
              />
              {/* Center hole */}
              <div className="absolute w-1 h-1 rounded-full" style={{ background: accentColor }} />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <p
              className="font-mono text-[7px] uppercase tracking-[0.5em] mb-1"
              style={{ color: `${accentColor}60` }}
            >
              ◉ RECOVERED AUDIO ARTIFACT
            </p>

            {!revealed ? (
              <div>
                <p
                  className="text-sm font-black tracking-tight"
                  style={{ color: `${accentColor}90`, filter: 'blur(4px)', userSelect: 'none' }}
                >
                  {anthem.title}
                </p>
                <p className="font-mono text-[7px] text-white/25 mt-1">
                  Tap to reveal the group anthem
                </p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-black tracking-tight text-white/90">{anthem.title}</p>
                <p
                  className="font-mono text-[7px] uppercase tracking-wider mt-0.5"
                  style={{ color: `${accentColor}60` }}
                >
                  {anthem.vibe}
                </p>
              </div>
            )}
          </div>

          <div
            className="font-mono text-[8px] flex-shrink-0 mt-1"
            style={{ color: `${accentColor}40` }}
          >
            {revealed ? '↑' : '↓'}
          </div>
        </div>
      </button>

      {/* Expanded: reason + Spotify link */}
      <AnimatePresence>
        {revealed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-2 space-y-3">
              {/* The reason — the most important field */}
              <p className="text-sm text-white/55 leading-relaxed italic">
                &ldquo;{anthem.reason}&rdquo;
              </p>

              {/* Spotify search link — points, never plays */}
              <a
                href={spotifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 font-mono text-[8px] uppercase tracking-[0.35em] transition-colors hover:opacity-80"
                style={{ color: '#1DB954' }}
                onClick={e => e.stopPropagation()}
              >
                <svg
                  viewBox="0 0 24 24"
                  style={{ width: 12, height: 12, fill: '#1DB954', flexShrink: 0 }}
                >
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                </svg>
                Find on Spotify
              </a>

              <p className="font-mono text-[6px] text-white/15 uppercase tracking-wider">
                AI assessment · not a recommendation · never plays
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
