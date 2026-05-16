'use client';
import { useState, useEffect, useRef } from 'react';

interface Props {
  cookedScore: number;
  active: boolean;
  onToggle: () => void;
}

// Maps cooked score to a cinematic mood
function getMoodConfig(score: number) {
  if (score >= 76) return { freq: 55, type: 'sawtooth' as OscillatorType, label: 'CHAOS', detune: -20 };
  if (score >= 51) return { freq: 80, type: 'triangle' as OscillatorType, label: 'TENSION', detune: -10 };
  if (score >= 26) return { freq: 110, type: 'sine' as OscillatorType, label: 'WARM', detune: 5 };
  return { freq: 174, type: 'sine' as OscillatorType, label: 'CALM', detune: 10 };
}

export function MoodSoundtrack({ cookedScore, active, onToggle }: Props) {
  const ctxRef = useRef<AudioContext | null>(null);
  const osc1Ref = useRef<OscillatorNode | null>(null);
  const osc2Ref = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  useEffect(() => {
    if (!active) {
      // Fade out and stop
      if (gainRef.current && ctxRef.current) {
        gainRef.current.gain.linearRampToValueAtTime(0, ctxRef.current.currentTime + 1.5);
        setTimeout(() => {
          osc1Ref.current?.stop();
          osc2Ref.current?.stop();
          ctxRef.current?.close();
          ctxRef.current = null;
          osc1Ref.current = null;
          osc2Ref.current = null;
          gainRef.current = null;
        }, 1600);
      }
      return;
    }

    // Start new audio context
    const ctx = new AudioContext();
    ctxRef.current = ctx;

    const config = getMoodConfig(cookedScore);

    // Master gain (starts at 0, fades in)
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, ctx.currentTime);
    masterGain.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 3);
    masterGain.connect(ctx.destination);
    gainRef.current = masterGain;

    // Low frequency drone
    const osc1 = ctx.createOscillator();
    osc1.type = config.type;
    osc1.frequency.value = config.freq;
    osc1.detune.value = config.detune;
    const filter1 = ctx.createBiquadFilter();
    filter1.type = 'lowpass';
    filter1.frequency.value = 400;
    osc1.connect(filter1);
    filter1.connect(masterGain);
    osc1.start();
    osc1Ref.current = osc1;

    // Subtle harmonic (one octave up, quieter)
    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = config.freq * 2;
    const gain2 = ctx.createGain();
    gain2.gain.value = 0.3;
    const filter2 = ctx.createBiquadFilter();
    filter2.type = 'lowpass';
    filter2.frequency.value = 600;
    osc2.connect(filter2);
    filter2.connect(gain2);
    gain2.connect(masterGain);
    osc2.start();
    osc2Ref.current = osc2;

    // Slow LFO for organic movement
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.08;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 8;
    lfo.connect(lfoGain);
    lfoGain.connect(osc1.frequency);
    lfo.start();

    return () => {
      masterGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1);
      setTimeout(() => ctx.close().catch(() => {}), 1200);
    };
  }, [active, cookedScore]);

  const config = getMoodConfig(cookedScore);
  const color = cookedScore >= 76 ? 'rgba(255,77,77,0.6)' : cookedScore >= 51 ? 'rgba(212,158,45,0.6)' : 'rgba(45,158,139,0.6)';

  return (
    <button
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      title={active ? 'Mute ambient sound' : `Play ${config.label} mood soundtrack`}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full transition-all hover:scale-105 active:scale-95"
      style={{
        background: active ? `${color.replace('0.6', '0.12')}` : 'rgba(255,255,255,0.05)',
        border: `1px solid ${active ? color : 'rgba(255,255,255,0.08)'}`,
      }}
    >
      {active ? (
        // Animated sound wave bars
        <span className="flex items-end gap-0.5 h-3">
          {[1, 2, 3].map(i => (
            <span key={i} className="w-0.5 rounded-full"
                  style={{ backgroundColor: color, height: `${[8, 12, 6][i-1]}px`,
                           animation: `sound-bar-${i} ${0.6 + i * 0.15}s ease-in-out infinite alternate` }} />
          ))}
        </span>
      ) : (
        // Muted speaker icon
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2" strokeLinecap="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
          <line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>
        </svg>
      )}
      <span className="text-[7px] font-mono uppercase tracking-wider"
            style={{ color: active ? color : 'rgba(255,255,255,0.25)' }}>
        {active ? config.label : 'VIBE'}
      </span>
    </button>
  );
}
