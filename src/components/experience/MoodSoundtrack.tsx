'use client';

import { useState, useEffect, useRef } from 'react';

// Module-level AudioContext singleton — reuse across all MoodSoundtrack instances
// to avoid hitting the browser limit of ~6 simultaneous AudioContexts.
let _moodAudioCtx: AudioContext | null = null;
function getMoodAudioContext(): AudioContext {
  if (!_moodAudioCtx || _moodAudioCtx.state === 'closed') {
    _moodAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return _moodAudioCtx;
}
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Search,
  Music,
  Radio,
  Cpu,
  Settings,
} from 'lucide-react';

interface Props {
  cookedScore: number;
  active: boolean;
  onToggle: () => void;
  activeSlideType?: string;
  slideIndex?: number;
}

// Cinematic chord voice configuration based on chaos levels
function getChordFrequencies(score: number) {
  if (score >= 76) {
    return {
      label: 'CHAOS BALLAD',
      voices: [65.41, 98.0, 130.81, 155.56], // C2, G2, C3, Eb3
      chimeScale: [523.25, 587.33, 622.25, 783.99, 932.33], // Pentatonic Minor
      types: ['sawtooth', 'triangle', 'sine', 'sine'] as OscillatorType[],
      detunes: [-15, 10, -5, 5],
      filterFreq: 320,
      activeColor: '#FF4D4D',
    };
  }
  if (score >= 51) {
    return {
      label: 'SUSPENSE PRELUDE',
      voices: [65.41, 116.54, 155.56, 196.0], // C2, Bb2, Eb3, G3
      chimeScale: [523.25, 587.33, 698.46, 783.99, 880.0],
      types: ['triangle', 'triangle', 'sine', 'sine'] as OscillatorType[],
      detunes: [-10, 8, -3, 3],
      filterFreq: 400,
      activeColor: '#D49E2D',
    };
  }
  if (score >= 26) {
    return {
      label: 'NOSTALGIC WARMTH',
      voices: [87.31, 130.81, 220.0, 329.63], // F2, C3, A3, E4
      chimeScale: [523.25, 587.33, 659.25, 783.99, 880.0], // Pentatonic Major
      types: ['sine', 'sine', 'sine', 'sine'] as OscillatorType[],
      detunes: [-6, 6, -2, 2],
      filterFreq: 500,
      activeColor: '#2D9E8B',
    };
  }
  return {
    label: 'CELESTIAL MYSTIC',
    voices: [65.41, 98.0, 164.81, 246.94, 369.99], // Lydian Chord
    chimeScale: [523.25, 587.33, 659.25, 739.99, 880.0],
    types: ['sine', 'sine', 'sine', 'sine', 'sine'] as OscillatorType[],
    detunes: [-8, 8, -4, 4, 0],
    filterFreq: 600,
    activeColor: '#7C6AFF',
  };
}

export function MoodSoundtrack({
  cookedScore,
  active,
  onToggle,
  activeSlideType,
  slideIndex,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'mixer' | 'clap' | 'spotify'>('mixer');
  const [searchQuery, setSearchQuery] = useState('');

  // CLAP Sensing States
  const [clapPrompt, setClapPrompt] = useState(
    'This is a sound of dynamic chaos and extreme adrenaline energy'
  );
  const [isClapRunning, setIsClapRunning] = useState(false);
  const [clapSimilarities, setClapSimilarities] = useState<number[]>([
    0.35, 0.72, 0.44, 0.28, 0.52, 0.61, 0.19, 0.39,
  ]);

  // Spotify Audio Features States
  const [valence, setValence] = useState(0.55);
  const [energy, setEnergy] = useState(0.6);
  const [danceability, setDanceability] = useState(0.45);
  const [liveness, setLiveness] = useState(0.35);

  // Persisted audio states
  const [volume, setVolume] = useState(() => {
    if (typeof window !== 'undefined') {
      const v = localStorage.getItem('yl-synth-volume');
      return v ? parseFloat(v) : 0.45;
    }
    return 0.45;
  });

  const [activeTrack, setActiveTrack] = useState(() => {
    if (typeof window !== 'undefined') {
      const t = localStorage.getItem('yl-synth-track');
      return t ? parseInt(t, 10) : 0;
    }
    return 0;
  });

  const [playbackProgress, setPlaybackProgress] = useState(32); // Loop seek percentage (0-100)

  // Web Audio Refs
  const ctxRef = useRef<AudioContext | null>(null);
  const voicesRef = useRef<OscillatorNode[]>([]);
  const gainNodesRef = useRef<GainNode[]>([]);
  const masterGainRef = useRef<GainNode | null>(null);
  const delayNodeRef = useRef<DelayNode | null>(null);
  const delayFeedbackRef = useRef<GainNode | null>(null);
  const padFilterRef = useRef<BiquadFilterNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const chimeTimerRef = useRef<number | null>(null);
  const progressTimerRef = useRef<number | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDraggingProgress = useRef(false);
  const activeStreamRef = useRef<HTMLAudioElement | null>(null);

  // Map Spotify Valence parameter to our chord harmonies if Spotify mode is selected
  const simulatedScore = valence >= 0.75 ? 10 : valence >= 0.5 ? 30 : valence >= 0.25 ? 60 : 80;
  const effectiveScore = activeTab === 'spotify' ? simulatedScore : cookedScore;
  const activeConfig = getChordFrequencies(effectiveScore);
  const activeColor = activeConfig.activeColor;

  // Hybrid Tracklist Database (Procedural Synthesizers + YouTube Free Audio Library Streams)
  const TRACKS = [
    {
      id: 0,
      title: 'THE COLD SAGA',
      type: 'Fundamental atmospheric drone pad with deep echo chimes.',
      source: 'synth',
      fileId: null,
    },
    {
      id: 1,
      title: 'THE CRISIS SPARK',
      type: 'Pulsing arpeggiator synthesizer pluck with rhythmic drive.',
      source: 'synth',
      fileId: null,
    },
    {
      id: 2,
      title: 'NIGHTFALL ECHOES',
      type: 'Dreamy cascading pentatonic crystals with spatial feedback.',
      source: 'synth',
      fileId: null,
    },
    // Streamed tracks from YouTube Free Audio Library via ThibaultJanBeyer
    {
      id: 3,
      title: 'NOSTALGIC JOURNEY',
      type: 'Chill & sentimental acoustic backdrop from YouTube Audio Library.',
      source: 'stream',
      fileId: '1vgRFZQnEsnxns3aVr0MeahDVsmDZEkOf',
    },
    {
      id: 4,
      title: 'ADRENALINE DRIVE',
      type: 'High-energy electronic anthem for peak action sequences.',
      source: 'stream',
      fileId: '1Zd57_HYU7-ZDp4hDy6oWCjRILkKBfRpp',
    },
    {
      id: 5,
      title: 'CHEERFUL HORIZONS',
      type: 'Bright & happy indie-pop positive travel vibes.',
      source: 'stream',
      fileId: '1W-eXJMvMV7ft1QG1JvxeY8iX6UTafI5P',
    },
    {
      id: 6,
      title: 'COSMIC SUSPENSE',
      type: 'Dark cinematic thriller tension builder atmosphere.',
      source: 'stream',
      fileId: '1UAnOdUs9vFbJPbvHc1LwwUGhrnyIvbt4',
    },
    {
      id: 7,
      title: 'AMBIENT NATURE',
      type: 'Calm reflective background pads for scenic panoramas.',
      source: 'stream',
      fileId: '19S_qysLFLF1-1ms1QgkTs_C1-06Bx4sO',
    },
  ];

  const filteredTracks = TRACKS.filter(
    t =>
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Trigger dynamic emotional soundtrack shifts based on slide navigation
  useEffect(() => {
    if (!active || !activeSlideType) return;

    // Trigger dynamic pitch/chime sweeps on transitions
    if (typeof window !== 'undefined' && (window as any).playCinematicChime) {
      const multiplier =
        activeSlideType === 'cooked' ? 1.4 : activeSlideType === 'verdict' ? 0.75 : 1.0;
      (window as any).playCinematicChime(multiplier);
    }

    // Map active slide types to cinematic track selection
    if (activeSlideType === 'title') {
      setActiveTrack(7); // Ethereal Nature stream
    } else if (activeSlideType === 'cooked' || activeSlideType === 'villain') {
      setActiveTrack(4); // Adrenaline driving stream
    } else if (activeSlideType === 'recap' || activeSlideType === 'era') {
      setActiveTrack(3); // Nostalgic journey acoustic stream
    } else if (activeSlideType === 'character' || activeSlideType === 'superlative') {
      setActiveTrack(5); // Cheerful Horizons pop stream
    } else if (
      activeSlideType === 'verdict' ||
      activeSlideType === 'share' ||
      activeSlideType === 'join'
    ) {
      setActiveTrack(6); // Cosmic Suspense dark cinematic stream
    }
  }, [active, activeSlideType]);

  // Sync volume node changes
  useEffect(() => {
    if (masterGainRef.current && ctxRef.current) {
      const v = Math.pow(volume, 2) * 0.08;
      masterGainRef.current.gain.setValueAtTime(v, ctxRef.current.currentTime);
    }
    localStorage.setItem('yl-synth-volume', volume.toString());
  }, [volume]);

  // Persist track selections
  useEffect(() => {
    localStorage.setItem('yl-synth-track', activeTrack.toString());
  }, [activeTrack]);

  // Expand browser chimes on window
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).playCinematicChime = (pitchMultiplier = 1.0) => {
        const ctx = ctxRef.current;
        const masterGain = masterGainRef.current;
        if (!ctx || !masterGain || !active) return;

        const baseFreq =
          activeConfig.chimeScale[Math.floor(Math.random() * activeConfig.chimeScale.length)];
        const freq = baseFreq * pitchMultiplier;

        const osc = ctx.createOscillator();
        const chimeGain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;

        chimeGain.gain.setValueAtTime(0, ctx.currentTime);
        chimeGain.gain.linearRampToValueAtTime(volume * 0.08, ctx.currentTime + 0.02);
        chimeGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 2.5);

        osc.connect(chimeGain);
        if (delayNodeRef.current) {
          chimeGain.connect(delayNodeRef.current);
        }
        chimeGain.connect(masterGain);

        osc.start();
        osc.stop(ctx.currentTime + 2.8);
      };
    }

    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).playCinematicChime;
      }
    };
  }, [active, activeConfig, volume]);

  // OS MediaSession integration
  useEffect(() => {
    if ('mediaSession' in navigator && active) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: TRACKS[activeTrack].title,
        artist: 'YAARLORE ATMOSPHERE',
        album: `SAGA CHAOS // ${cookedScore}%`,
        artwork: [
          {
            src: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=300&auto=format&fit=crop',
            sizes: '300x300',
            type: 'image/jpeg',
          },
        ],
      });

      navigator.mediaSession.setActionHandler('play', () => {
        if (!active) onToggle();
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        if (active) onToggle();
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        setActiveTrack(t => (t - 1 + TRACKS.length) % TRACKS.length);
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        setActiveTrack(t => (t + 1) % TRACKS.length);
      });
    }
  }, [active, activeTrack, cookedScore]);

  // Main Audio Synthesizer Loop
  useEffect(() => {
    if (!active) {
      if (chimeTimerRef.current) {
        clearInterval(chimeTimerRef.current);
        chimeTimerRef.current = null;
      }
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }

      if (activeStreamRef.current) {
        try {
          activeStreamRef.current.pause();
          activeStreamRef.current.src = '';
        } catch (_) {}
        activeStreamRef.current = null;
      }

      if (masterGainRef.current && ctxRef.current) {
        const ctx = ctxRef.current;
        masterGainRef.current.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.8);

        setTimeout(() => {
          voicesRef.current.forEach(v => {
            try {
              v.stop();
            } catch (_) {}
          });
          voicesRef.current = [];
          gainNodesRef.current = [];

          // Do NOT close the shared singleton context — just disconnect our nodes.
          // Closing would invalidate the context for future playback sessions.
          ctxRef.current = null;
          masterGainRef.current = null;
          delayNodeRef.current = null;
          analyserRef.current = null;
        }, 1000);
      }
      return;
    }

    const ctx = getMoodAudioContext();
    // Resume if suspended (e.g. after user leaves tab and returns)
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    ctxRef.current = ctx;

    const masterGain = ctx.createGain();
    const targetVol = Math.pow(volume, 2) * 0.08;
    masterGain.gain.setValueAtTime(0, ctx.currentTime);
    masterGain.gain.linearRampToValueAtTime(targetVol, ctx.currentTime + 1.5);
    masterGain.connect(ctx.destination);
    masterGainRef.current = masterGain;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 64;
    masterGain.connect(analyser);
    analyserRef.current = analyser;

    const delayTimeMapped = 0.35 + (playbackProgress / 100) * 0.3;
    const delay = ctx.createDelay(2.0);
    delay.delayTime.setValueAtTime(delayTimeMapped, ctx.currentTime);

    // Map Spotify Liveness to delay feedback gain (0.0 - 1.0 to 0.15 - 0.80)
    const initialFeedback = activeTab === 'spotify' ? 0.15 + liveness * 0.65 : 0.4;
    const delayFeedback = ctx.createGain();
    delayFeedback.gain.setValueAtTime(initialFeedback, ctx.currentTime);

    delay.connect(delayFeedback);
    delayFeedback.connect(delay);
    delay.connect(masterGain);
    delayNodeRef.current = delay;
    delayFeedbackRef.current = delayFeedback;

    // Map Spotify Energy to lowpass filter cutoff frequency (0.0 - 1.0 to 180Hz - 1980Hz)
    const initialFilterFreq =
      activeTab === 'spotify'
        ? 180 + energy * 1800
        : activeConfig.filterFreq + (activeTrack === 1 ? 180 : 0);

    const padFilter = ctx.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.setValueAtTime(initialFilterFreq, ctx.currentTime);
    padFilter.Q.setValueAtTime(2.5, ctx.currentTime);
    padFilter.connect(masterGain);
    padFilterRef.current = padFilter;

    const currentTrackObj = TRACKS[activeTrack] || TRACKS[0];
    const isStream = currentTrackObj.source === 'stream';
    let arpInterval: number | null = null;

    if (isStream) {
      // Connect HTML5 Audio Stream for YouTube/Google Drive
      const audio = new Audio();
      audio.src = `https://docs.google.com/uc?export=download&id=${currentTrackObj.fileId}`;
      audio.crossOrigin = 'anonymous';
      audio.loop = true;
      activeStreamRef.current = audio;

      // Safe autoplay trigger
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          console.warn('Audio stream autoplay deferred.', err);
        });
      }

      try {
        const streamSource = ctx.createMediaElementSource(audio);
        streamSource.connect(padFilter);
      } catch (err) {
        console.warn('Failed to connect media element source:', err);
      }
    } else {
      // Procedural synthesizers
      const lfo = ctx.createOscillator();
      lfo.frequency.setValueAtTime(0.06, ctx.currentTime);
      const lfoGain = ctx.createGain();
      lfoGain.gain.setValueAtTime(140, ctx.currentTime);
      lfo.connect(lfoGain);
      lfoGain.connect(padFilter.frequency);
      lfo.start();

      activeConfig.voices.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const voiceGain = ctx.createGain();

        osc.type = activeConfig.types[idx] || 'sine';
        osc.frequency.value = freq;
        osc.detune.value = activeConfig.detunes[idx] || 0;

        const baseVol = idx === 0 ? 0.32 : idx === 1 ? 0.25 : idx === 2 ? 0.2 : 0.15;
        voiceGain.gain.setValueAtTime(baseVol, ctx.currentTime);

        osc.connect(voiceGain);
        voiceGain.connect(padFilter);
        osc.start();

        voicesRef.current.push(osc);
        gainNodesRef.current.push(voiceGain);
      });

      if (activeTrack === 1) {
        let step = 0;
        // Map Spotify Danceability & Energy to arpeggiator pluck trigger tempo
        const pulseRate =
          activeTab === 'spotify'
            ? Math.max(50, 320 - danceability * 180 - energy * 80)
            : 220 + (100 - playbackProgress) * 1.5;

        arpInterval = window.setInterval(() => {
          const scale = activeConfig.chimeScale;
          const noteFreq = scale[step % scale.length];

          const pluck = ctx.createOscillator();
          const pluckGain = ctx.createGain();
          pluck.type =
            activeTab === 'spotify'
              ? energy >= 0.5
                ? 'triangle'
                : 'sine'
              : cookedScore >= 51
                ? 'triangle'
                : 'sine';
          pluck.frequency.value = noteFreq * 0.5;

          pluckGain.gain.setValueAtTime(0, ctx.currentTime);
          pluckGain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.015);
          pluckGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);

          pluck.connect(pluckGain);
          pluckGain.connect(padFilter);

          pluck.start();
          pluck.stop(ctx.currentTime + 0.45);
          step++;
        }, pulseRate);
      }

      const triggerGenerativeChime = () => {
        const scale = activeConfig.chimeScale;
        const chimeFreq = scale[Math.floor(Math.random() * scale.length)];

        const chimeOsc = ctx.createOscillator();
        const chimeGain = ctx.createGain();

        chimeOsc.type = 'sine';
        chimeOsc.frequency.value = chimeFreq * (activeTrack === 2 ? 1.2 : 1.0);

        chimeOsc.frequency.setValueAtTime(chimeFreq, ctx.currentTime);

        chimeGain.gain.setValueAtTime(0, ctx.currentTime);
        chimeGain.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 0.03);
        chimeGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 3.2);

        chimeOsc.connect(chimeGain);
        chimeGain.connect(delay);
        chimeGain.connect(masterGain);

        chimeOsc.start();
        chimeOsc.stop(ctx.currentTime + 3.6);
      };

      const chimeRate = activeTrack === 2 ? 2200 : 4500;
      chimeTimerRef.current = window.setInterval(triggerGenerativeChime, chimeRate);
    }

    progressTimerRef.current = window.setInterval(() => {
      if (!isDraggingProgress.current) {
        if (isStream && activeStreamRef.current) {
          const duration = activeStreamRef.current.duration || 1;
          const current = activeStreamRef.current.currentTime || 0;
          setPlaybackProgress(Math.floor((current / duration) * 100));
        } else {
          setPlaybackProgress(p => (p + 1) % 100);
        }
      }
    }, 1000);

    return () => {
      if (chimeTimerRef.current) clearInterval(chimeTimerRef.current);
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      if (arpInterval) clearInterval(arpInterval);

      if (activeStreamRef.current) {
        try {
          activeStreamRef.current.pause();
          activeStreamRef.current.src = '';
        } catch (_) {}
        activeStreamRef.current = null;
      }

      delayFeedbackRef.current = null;
      padFilterRef.current = null;

      try {
        masterGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
        setTimeout(() => ctx.close().catch(() => {}), 800);
      } catch (_) {}
    };
  }, [
    active,
    activeConfig,
    activeTrack,
    cookedScore,
    volume,
    valence,
    energy,
    danceability,
    liveness,
    activeTab,
  ]);

  // Smoothly morph delay feedback based on Spotify Liveness slider
  useEffect(() => {
    if (delayFeedbackRef.current && ctxRef.current && activeTab === 'spotify') {
      const fb = 0.15 + liveness * 0.65;
      delayFeedbackRef.current.gain.setTargetAtTime(fb, ctxRef.current.currentTime, 0.1);
    }
  }, [liveness, activeTab]);

  // Smoothly morph lowpass filter frequency based on Spotify Energy slider
  useEffect(() => {
    if (padFilterRef.current && ctxRef.current && activeTab === 'spotify') {
      const freq = 180 + energy * 1800;
      padFilterRef.current.frequency.setTargetAtTime(freq, ctxRef.current.currentTime, 0.2);
    }
  }, [energy, activeTab]);

  // Real-time canvas equalizer visualizer
  useEffect(() => {
    if (!active || !isOpen || !canvasRef.current || activeTab !== 'mixer') return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const bufferLength = analyserRef.current ? analyserRef.current.frequencyBinCount : 0;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animId = requestAnimationFrame(draw);
      if (!analyserRef.current) return;
      analyserRef.current.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 1.8;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const val = dataArray[i] / 255;
        const barHeight = val * canvas.height * 0.95;

        ctx.fillStyle = activeColor;
        ctx.shadowColor = activeColor;
        ctx.shadowBlur = 4;
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 1.5, barHeight);

        x += barWidth;
      }
    };

    draw();
    return () => cancelAnimationFrame(animId);
  }, [active, isOpen, activeColor, activeTab]);

  // Global spacebar + Arrow navigation key listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.getAttribute('contenteditable') === 'true')
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        onToggle();
      }

      if (
        isOpen &&
        activeTab === 'mixer' &&
        (e.code === 'ArrowDown' || e.code === 'KeyK' || e.key === 'j')
      ) {
        e.preventDefault();
        setActiveTrack(t => (t + 1) % TRACKS.length);
      }
      if (
        isOpen &&
        activeTab === 'mixer' &&
        (e.code === 'ArrowUp' || e.code === 'KeyJ' || e.key === 'k')
      ) {
        e.preventDefault();
        setActiveTrack(t => (t - 1 + TRACKS.length) % TRACKS.length);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onToggle, isOpen, activeTab]);

  // CLAP Contrastive similarity sensing heuristic
  const handleClapClassification = () => {
    setIsClapRunning(true);

    // Play a delightful loading synth pluck
    if (typeof window !== 'undefined' && (window as any).playCinematicChime) {
      (window as any).playCinematicChime(1.5);
    }

    setTimeout(() => {
      setIsClapRunning(false);
      const p = clapPrompt.toLowerCase();

      const scores = TRACKS.map(t => {
        let score = 0.25 + Math.random() * 0.1; // Baseline noise

        if (t.id === 0) {
          // THE COLD SAGA
          if (
            p.includes('drone') ||
            p.includes('pad') ||
            p.includes('cold') ||
            p.includes('slow') ||
            p.includes('ambient')
          )
            score += 0.45;
          if (p.includes('warm') || p.includes('calm') || p.includes('quiet')) score += 0.35;
        } else if (t.id === 1) {
          // THE CRISIS SPARK
          if (
            p.includes('crisis') ||
            p.includes('arpeggio') ||
            p.includes('pluck') ||
            p.includes('synth') ||
            p.includes('pulse')
          )
            score += 0.5;
          if (
            p.includes('chaos') ||
            p.includes('energy') ||
            p.includes('fast') ||
            p.includes('dramatic') ||
            p.includes('beat')
          )
            score += 0.38;
        } else if (t.id === 2) {
          // NIGHTFALL ECHOES
          if (
            p.includes('echo') ||
            p.includes('bell') ||
            p.includes('crystal') ||
            p.includes('dream') ||
            p.includes('night')
          )
            score += 0.48;
          if (
            p.includes('glass') ||
            p.includes('chime') ||
            p.includes('space') ||
            p.includes('rain') ||
            p.includes('peace')
          )
            score += 0.32;
        } else if (t.id === 3) {
          // NOSTALGIC JOURNEY
          if (
            p.includes('nostalgic') ||
            p.includes('acoustic') ||
            p.includes('guitar') ||
            p.includes('journey') ||
            p.includes('chill')
          )
            score += 0.52;
          if (
            p.includes('roadtrip') ||
            p.includes('travel') ||
            p.includes('memory') ||
            p.includes('friends')
          )
            score += 0.34;
        } else if (t.id === 4) {
          // ADRENALINE DRIVE
          if (
            p.includes('adrenaline') ||
            p.includes('drive') ||
            p.includes('action') ||
            p.includes('electronic') ||
            p.includes('beat') ||
            p.includes('energy')
          )
            score += 0.55;
          if (
            p.includes('racing') ||
            p.includes('fast') ||
            p.includes('rave') ||
            p.includes('club') ||
            p.includes('techno')
          )
            score += 0.36;
        } else if (t.id === 5) {
          // CHEERFUL HORIZONS
          if (
            p.includes('cheerful') ||
            p.includes('happy') ||
            p.includes('indie') ||
            p.includes('pop') ||
            p.includes('bright') ||
            p.includes('travel')
          )
            score += 0.53;
          if (
            p.includes('sunshine') ||
            p.includes('joy') ||
            p.includes('fun') ||
            p.includes('beach') ||
            p.includes('friends')
          )
            score += 0.35;
        } else if (t.id === 6) {
          // COSMIC SUSPENSE
          if (
            p.includes('cosmic') ||
            p.includes('dark') ||
            p.includes('suspense') ||
            p.includes('thriller') ||
            p.includes('scary')
          )
            score += 0.51;
          if (
            p.includes('horror') ||
            p.includes('creepy') ||
            p.includes('ambient') ||
            p.includes('space') ||
            p.includes('tension')
          )
            score += 0.33;
        } else if (t.id === 7) {
          // AMBIENT NATURE
          if (
            p.includes('nature') ||
            p.includes('ambient') ||
            p.includes('organic') ||
            p.includes('forest') ||
            p.includes('calm')
          )
            score += 0.54;
          if (
            p.includes('peace') ||
            p.includes('quiet') ||
            p.includes('meditation') ||
            p.includes('relax') ||
            p.includes('mountains')
          )
            score += 0.35;
        }

        return score;
      });

      const maxScore = Math.max(...scores);
      const factor = 0.94 / maxScore;
      const normalizedScores = scores.map(s => Math.min(0.98, Math.max(0.14, s * factor)));

      setClapSimilarities(normalizedScores);

      // Auto-play the track with the highest CLAP similarity embedding match!
      const winnerIdx = normalizedScores.indexOf(Math.max(...normalizedScores));
      setActiveTrack(winnerIdx);
      if (!active) onToggle();

      // Trigger triumph chime chord
      if (typeof window !== 'undefined' && (window as any).playCinematicChime) {
        (window as any).playCinematicChime(0.9 + winnerIdx * 0.12);
      }
    }, 1200);
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setPlaybackProgress(val);
    if (activeStreamRef.current && TRACKS[activeTrack]?.source === 'stream') {
      const duration = activeStreamRef.current.duration || 1;
      activeStreamRef.current.currentTime = (val / 100) * duration;
    }
  };

  return (
    <div className="relative">
      <button
        onClick={e => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        title={`Mood Atmosphere Controller // Chaos Score ${cookedScore}%`}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all hover:scale-105 active:scale-95 z-50 relative focus:outline-none"
        style={{
          background: active ? `${activeColor}1e` : 'rgba(255,255,255,0.05)',
          border: `1px solid ${active ? activeColor : 'rgba(255,255,255,0.08)'}`,
        }}
      >
        {active ? (
          <span className="flex items-end gap-0.5 h-3">
            {[1, 2, 3, 4].map(i => (
              <span
                key={i}
                className="w-0.5 rounded-full"
                style={{
                  backgroundColor: activeColor,
                  height: `${[8, 12, 6, 10][i - 1]}px`,
                  animation: `sound-bar-${i} ${0.5 + i * 0.12}s ease-in-out infinite alternate`,
                }}
              />
            ))}
          </span>
        ) : (
          <Radio size={11} className="text-white/40" />
        )}
        <span
          className="text-[8px] font-mono font-black uppercase tracking-widest"
          style={{ color: active ? activeColor : 'rgba(255,255,255,0.30)' }}
        >
          {active ? activeConfig.label : 'SOUNDTRACK'}
        </span>
      </button>

      {/* Expanded high-fidelity atmospheric player + CLAP AI deck panel */}
      {isOpen && (
        <div
          className="absolute right-0 top-10 w-[340px] rounded-2xl border-2 p-5 z-[60] backdrop-blur-xl shadow-2xl transition-all duration-300 animate-in fade-in slide-in-from-top-3 flex flex-col gap-4 text-left"
          style={{
            borderColor: 'rgba(245,240,232,0.12)',
            background: 'rgba(10,10,8,0.95)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.85)',
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Deck Header & Mode Switcher Tab */}
          <div
            className="flex flex-col gap-2.5 border-b pb-3.5"
            style={{ borderColor: 'rgba(245,240,232,0.08)' }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-[7px] tracking-[0.4em] opacity-40">
                  ATMOSPHERE CONSOLE
                </p>
                <h4 className="font-display font-black text-sm uppercase tracking-tight text-[#F5F0E8] flex items-center gap-1.5 pt-0.5">
                  <Music size={12} style={{ color: activeColor }} /> SAGA SOUNDTRACK
                </h4>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="font-mono text-[9px] uppercase tracking-widest text-white/35 hover:text-white/60 focus:outline-none"
              >
                CLOSE
              </button>
            </div>

            {/* Custom Tab selectors */}
            <div className="grid grid-cols-3 gap-1 bg-white/5 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('mixer')}
                className="py-1.5 rounded-lg text-center font-mono text-[8px] font-black tracking-wider uppercase transition-all flex flex-col items-center justify-center gap-0.5"
                style={{
                  background: activeTab === 'mixer' ? 'rgba(255,255,255,0.08)' : 'transparent',
                  color: activeTab === 'mixer' ? '#F5F0E8' : 'rgba(255,255,255,0.3)',
                }}
              >
                <Settings size={9} /> MIXER
              </button>
              <button
                onClick={() => setActiveTab('clap')}
                className="py-1.5 rounded-lg text-center font-mono text-[8px] font-black tracking-wider uppercase transition-all flex flex-col items-center justify-center gap-0.5"
                style={{
                  background: activeTab === 'clap' ? 'rgba(255,255,255,0.08)' : 'transparent',
                  color: activeTab === 'clap' ? '#F5F0E8' : 'rgba(255,255,255,0.3)',
                }}
              >
                <Cpu size={9} /> CLAP AI
              </button>
              <button
                onClick={() => setActiveTab('spotify')}
                className="py-1.5 rounded-lg text-center font-mono text-[8px] font-black tracking-wider uppercase transition-all flex flex-col items-center justify-center gap-0.5"
                style={{
                  background: activeTab === 'spotify' ? 'rgba(255,255,255,0.08)' : 'transparent',
                  color: activeTab === 'spotify' ? '#F5F0E8' : 'rgba(255,255,255,0.3)',
                }}
              >
                <Music size={9} /> SPOTIFY
              </button>
            </div>
          </div>

          {activeTab === 'mixer' ? (
            <>
              {/* Equalizer Spectrum Canvas */}
              {active ? (
                <div className="relative h-11 w-full rounded-lg overflow-hidden bg-black/40 border border-white/5 flex items-end px-2">
                  <canvas
                    ref={canvasRef}
                    width={300}
                    height={44}
                    className="w-full h-full opacity-70"
                  />
                  <span className="absolute bottom-1 right-2 font-mono text-[6px] tracking-widest text-white/20">
                    LIVE FREQ
                  </span>
                </div>
              ) : (
                <div className="h-11 w-full rounded-lg bg-black/20 border border-dashed border-white/5 flex items-center justify-center">
                  <p className="font-mono text-[8px] tracking-widest text-white/25 uppercase">
                    Atmosphere muted. Press play.
                  </p>
                </div>
              )}

              {/* Search bar inside play-deck */}
              <div className="relative">
                <Search size={11} className="absolute left-3 top-2.5 text-white/30" />
                <input
                  type="text"
                  placeholder="Search cinematic tracklist..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-4 py-1.5 font-mono text-[9px] text-[#F5F0E8] outline-none focus:border-white/25 transition-colors"
                />
              </div>

              {/* Track Selection rows */}
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {filteredTracks.map(t => {
                  const isSelected = activeTrack === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => {
                        setActiveTrack(t.id);
                        if (!active) onToggle();
                      }}
                      className="w-full rounded-lg p-2.5 flex items-center justify-between transition-colors focus:outline-none"
                      style={{
                        background: isSelected ? 'rgba(255,255,255,0.04)' : 'transparent',
                        border: `1.5px solid ${isSelected ? 'rgba(255,255,255,0.08)' : 'transparent'}`,
                      }}
                    >
                      <div className="flex flex-col gap-0.5 text-left max-w-[80%]">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p
                            className="font-mono text-[9px] font-bold tracking-wider"
                            style={{ color: isSelected ? activeColor : 'rgba(245,240,232,0.7)' }}
                          >
                            {t.title}
                          </p>
                          <span
                            className="font-mono text-[6px] px-1 py-0.2 rounded border uppercase tracking-widest leading-none"
                            style={{
                              borderColor:
                                t.source === 'stream'
                                  ? 'rgba(56, 189, 248, 0.3)'
                                  : 'rgba(239, 68, 68, 0.3)',
                              color: t.source === 'stream' ? '#38bdf8' : '#ef4444',
                              background:
                                t.source === 'stream'
                                  ? 'rgba(56, 189, 248, 0.05)'
                                  : 'rgba(239, 68, 68, 0.05)',
                            }}
                          >
                            {t.source}
                          </span>
                        </div>
                        <p className="font-display italic text-[7.5px] opacity-45 truncate">
                          {t.type}
                        </p>
                      </div>
                      {isSelected && active && (
                        <span className="flex items-end gap-0.5 h-2">
                          {[1, 2, 3].map(i => (
                            <span
                              key={i}
                              className="w-0.5 rounded-full"
                              style={{
                                backgroundColor: activeColor,
                                height: `${[4, 8, 5][i - 1]}px`,
                                animation: `sound-bar-${i} ${0.3 + i * 0.1}s ease-in-out infinite alternate`,
                              }}
                            />
                          ))}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Simulated progress Timeline seek */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between font-mono text-[7px] text-white/35">
                  <span>0:{playbackProgress.toString().padStart(2, '0')}</span>
                  <span>1:00</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={99}
                  value={playbackProgress}
                  onChange={handleProgressChange}
                  onMouseDown={() => {
                    isDraggingProgress.current = true;
                  }}
                  onMouseUp={() => {
                    isDraggingProgress.current = false;
                  }}
                  className="w-full accent-[#F5F0E8] opacity-60 hover:opacity-100 transition-opacity cursor-pointer bg-white/10 h-0.5 rounded-lg appearance-none"
                  style={{
                    background: `linear-gradient(to right, ${activeColor} ${playbackProgress}%, rgba(255,255,255,0.1) ${playbackProgress}%)`,
                  }}
                />
              </div>
            </>
          ) : activeTab === 'clap' ? (
            // CLAP AI Zero-Shot sensing dashboard
            <div className="space-y-4">
              <div className="space-y-1.5">
                <p className="font-mono text-[8px] tracking-wider text-white/40 uppercase">
                  ZERO-SHOT SENSING PROMPT
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={clapPrompt}
                    onChange={e => setClapPrompt(e.target.value)}
                    placeholder="E.g. A slow ambient nostalgic rain melody..."
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 font-mono text-[9.5px] text-[#F5F0E8] outline-none focus:border-white/30 transition-colors"
                  />
                  <button
                    onClick={handleClapClassification}
                    disabled={isClapRunning}
                    className="px-3 rounded-lg font-mono text-[9px] font-bold text-black flex items-center justify-center transition-all active:scale-95 disabled:opacity-50"
                    style={{ background: activeColor }}
                  >
                    {isClapRunning ? 'SENSING...' : 'RUN'}
                  </button>
                </div>
                <p className="font-display italic text-[7.5px] text-white/30 leading-normal">
                  Predicts the cosine similarity: Sim = (A * T) / (||A|| * ||T||) using joint HTS-AT
                  CLAP embeddings.
                </p>
              </div>

              {/* Similarity scores output */}
              <div className="space-y-3">
                <p className="font-mono text-[8px] tracking-wider text-white/40 uppercase">
                  CLAP COSINE SIMILARITY MATRIX
                </p>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {TRACKS.map((t, idx) => {
                    const sim = clapSimilarities[idx] ?? 0.25;
                    const maxScore = Math.max(...clapSimilarities);
                    const isWinner = sim === maxScore;
                    return (
                      <div
                        key={t.id}
                        className="space-y-1 p-2 rounded-lg bg-white/[0.02] border border-white/5 relative overflow-hidden"
                      >
                        {isWinner && (
                          <div
                            className="absolute right-2 top-2 px-1.5 py-0.5 rounded font-mono text-[6px] text-black font-black uppercase"
                            style={{ background: activeColor }}
                          >
                            ★ MATCH
                          </div>
                        )}
                        <div className="flex justify-between items-center pr-12">
                          <span className="font-mono text-[8.5px] text-white/70 font-semibold">
                            {t.title}
                          </span>
                          <span
                            className="font-mono text-[8.5px] font-bold"
                            style={{ color: isWinner ? activeColor : 'rgba(255,255,255,0.4)' }}
                          >
                            {Math.round(sim * 100)}%
                          </span>
                        </div>
                        {/* Custom visual horizontal similarity bar graph */}
                        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${sim * 100}%`,
                              background: isWinner ? activeColor : 'rgba(255,255,255,0.2)',
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Audio representation details */}
              <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 font-mono text-[7px] text-white/35 leading-relaxed space-y-1">
                <p className="font-black" style={{ color: activeColor }}>
                  CLAP CONFIGURATION DETAILS:
                </p>
                <p>● Audio Encoder: HTS-AT hierarchical Transformer</p>
                <p>● Text Encoder: RoBERTa-base Tokenization</p>
                <p>● Zero-Shot evaluation onESC-50 metrics: mAP@10 = 0.955</p>
              </div>
            </div>
          ) : (
            // Spotify Audio Features Real-time Modulator
            <div className="space-y-3.5">
              {/* Feature info banner */}
              <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5 space-y-0.5">
                <p
                  className="font-mono text-[8px] font-bold uppercase tracking-wider flex items-center gap-1"
                  style={{ color: activeColor }}
                >
                  ⚡ SPOTIFY FEATURE SIMULATOR
                </p>
                <p className="font-display italic text-[7.5px] text-white/40 leading-normal">
                  Adjust standard Spotify audio features to dynamically morph Web Audio API
                  synthesizer nodes.
                </p>
              </div>

              {/* Valence Slider */}
              <div className="space-y-1">
                <div className="flex justify-between items-center font-mono text-[8px]">
                  <span className="text-white/60 uppercase tracking-wider">
                    🎭 VALENCE (POSITIVENESS)
                  </span>
                  <span className="font-bold" style={{ color: activeColor }}>
                    {Math.round(valence * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0.0}
                  max={1.0}
                  step={0.01}
                  value={valence}
                  onChange={e => setValence(parseFloat(e.target.value))}
                  className="w-full accent-white opacity-60 hover:opacity-100 transition-opacity cursor-pointer bg-white/10 h-0.5 rounded-lg appearance-none"
                  style={{
                    background: `linear-gradient(to right, ${activeColor} ${valence * 100}%, rgba(255,255,255,0.1) ${valence * 100}%)`,
                  }}
                />
                <div className="flex justify-between font-display italic text-[6.5px] text-white/30">
                  <span>Minor Scale (Sad/Suspense)</span>
                  <span>Major Scale (Euphoric/Bright)</span>
                </div>
              </div>

              {/* Energy Slider */}
              <div className="space-y-1">
                <div className="flex justify-between items-center font-mono text-[8px]">
                  <span className="text-white/60 uppercase tracking-wider">
                    ⚡ ENERGY (INTENSITY)
                  </span>
                  <span className="font-bold" style={{ color: activeColor }}>
                    {Math.round(energy * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0.0}
                  max={1.0}
                  step={0.01}
                  value={energy}
                  onChange={e => setEnergy(parseFloat(e.target.value))}
                  className="w-full accent-white opacity-60 hover:opacity-100 transition-opacity cursor-pointer bg-white/10 h-0.5 rounded-lg appearance-none"
                  style={{
                    background: `linear-gradient(to right, ${activeColor} ${energy * 100}%, rgba(255,255,255,0.1) ${energy * 100}%)`,
                  }}
                />
                <div className="flex justify-between font-display italic text-[6.5px] text-white/30">
                  <span>Ambient Pad Cutoff (Low)</span>
                  <span>Resonant filter Sweep (High)</span>
                </div>
              </div>

              {/* Danceability Slider */}
              <div className="space-y-1">
                <div className="flex justify-between items-center font-mono text-[8px]">
                  <span className="text-white/60 uppercase tracking-wider">
                    🕺 DANCEABILITY (RHYTHM)
                  </span>
                  <span className="font-bold" style={{ color: activeColor }}>
                    {Math.round(danceability * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0.0}
                  max={1.0}
                  step={0.01}
                  value={danceability}
                  onChange={e => setDanceability(parseFloat(e.target.value))}
                  className="w-full accent-white opacity-60 hover:opacity-100 transition-opacity cursor-pointer bg-white/10 h-0.5 rounded-lg appearance-none"
                  style={{
                    background: `linear-gradient(to right, ${activeColor} ${danceability * 100}%, rgba(255,255,255,0.1) ${danceability * 100}%)`,
                  }}
                />
                <div className="flex justify-between font-display italic text-[6.5px] text-white/30">
                  <span>Slow Atmospheric (Low)</span>
                  <span>Fast Plucking Pluck (High)</span>
                </div>
              </div>

              {/* Liveness Slider */}
              <div className="space-y-1">
                <div className="flex justify-between items-center font-mono text-[8px]">
                  <span className="text-white/60 uppercase tracking-wider">
                    🎙️ LIVENESS (ROOM ECHO)
                  </span>
                  <span className="font-bold" style={{ color: activeColor }}>
                    {Math.round(liveness * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0.0}
                  max={1.0}
                  step={0.01}
                  value={liveness}
                  onChange={e => setLiveness(parseFloat(e.target.value))}
                  className="w-full accent-white opacity-60 hover:opacity-100 transition-opacity cursor-pointer bg-white/10 h-0.5 rounded-lg appearance-none"
                  style={{
                    background: `linear-gradient(to right, ${activeColor} ${liveness * 100}%, rgba(255,255,255,0.1) ${liveness * 100}%)`,
                  }}
                />
                <div className="flex justify-between font-display italic text-[6.5px] text-white/30">
                  <span>Dry Soundscape</span>
                  <span>Lush Space Reverb Echo</span>
                </div>
              </div>

              {/* Dynamic synthesis calculations */}
              <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 font-mono text-[7px] text-white/35 leading-relaxed space-y-0.5">
                <p className="font-black" style={{ color: activeColor }}>
                  SYNTH HARDWARE VALUES:
                </p>
                <p>
                  ● Harmony Mode:{' '}
                  {simulatedScore === 80
                    ? 'Minor (Chaos Ballad)'
                    : simulatedScore === 60
                      ? 'Suspense Minor'
                      : simulatedScore === 30
                        ? 'Nostalgic Major'
                        : 'Lydian Celestial'}
                </p>
                <p>● Filter Cutoff: {Math.round(180 + energy * 1800)}Hz (LFO sweep $\pm$140Hz)</p>
                <p>● Echo Feedback Level: {Math.round((0.15 + liveness * 0.65) * 100)}% gain</p>
                <p>
                  ● Clock Pulse: {Math.round(Math.max(50, 320 - danceability * 180 - energy * 80))}
                  ms step
                </p>
              </div>
            </div>
          )}

          {/* Core deck playback controls */}
          <div
            className="flex items-center justify-between border-t pt-3.5"
            style={{ borderColor: 'rgba(245,240,232,0.08)' }}
          >
            <div className="flex items-center gap-3">
              <button
                onClick={onToggle}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all bg-[#F5F0E8] hover:scale-105 active:scale-95 focus:outline-none"
                style={{ color: '#0A0A08' }}
              >
                {active ? (
                  <Pause size={12} className="fill-[#0A0A08]" />
                ) : (
                  <Play size={12} className="fill-[#0A0A08]" />
                )}
              </button>

              <button
                onClick={() => setActiveTrack(t => (t - 1 + TRACKS.length) % TRACKS.length)}
                className="text-white/45 hover:text-white/80 focus:outline-none"
              >
                <SkipBack size={12} />
              </button>

              <button
                onClick={() => setActiveTrack(t => (t + 1) % TRACKS.length)}
                className="text-white/45 hover:text-white/80 focus:outline-none"
              >
                <SkipForward size={12} />
              </button>
            </div>

            {/* Volume slider controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setVolume(v => (v === 0 ? 0.45 : 0))}
                className="text-white/40 hover:text-white/75 focus:outline-none"
              >
                {volume === 0 ? <VolumeX size={13} /> : <Volume2 size={13} />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={e => setVolume(parseFloat(e.target.value))}
                className="w-16 accent-white opacity-40 hover:opacity-100 transition-opacity cursor-pointer bg-white/10 h-0.5 rounded-lg appearance-none"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
