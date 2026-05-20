'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { analytics } from '@/lib/analytics';
import { AnimatePresence, motion } from 'framer-motion';
import { useToast } from '@/components/ui/Toast';

export default function NewTripPage() {
  const router = useRouter();
  const { toast } = useToast();

  // Onboarding wizard steps:
  // 0: Welcome / Preparation
  // 1: Season Title (name)
  // 2: Filming Location (destination)
  // 3: Premiere Date (startDate)
  // 4: Finale Date (endDate)
  // 5: Summary / Launch Portal
  const [step, setStep] = useState(0);
  const [fields, setFields] = useState({ name: '', destination: '', startDate: '', endDate: '' });
  const [activeHintIndex, setActiveHintIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input automatically on step changes and clear any lingering validation error
  useEffect(() => {
    setValidationError('');
    if (step >= 1 && step <= 4) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 350);
    }
  }, [step]);

  // Audio feedback helper
  const triggerChime = (pitchMultiplier = 1.0) => {
    if (typeof window !== 'undefined' && (window as any).playCinematicChime) {
      try {
        (window as any).playCinematicChime(pitchMultiplier);
      } catch (_) {}
    }
  };

  // Rotating hints for title/destination
  const HINT_PRESETS: Record<string, string[]> = {
    name: [
      '"The Bus That Betrayed Us"',
      '"A Series of Poor Decisions"',
      '"Coimbatore Lockdown"',
      '"Three Nights of Absolute Chaos"',
    ],
    destination: [
      '"Midnight Gokarna Shack"',
      '"High Altitude Himalayan Ridge"',
      '"The Alleys of Pondicherry"',
      '"Platform 4, Bangalore Station"',
    ],
  };

  const [todayStr, setTodayStr] = useState('');
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveHintIndex(idx => (idx + 1) % 4);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setTodayStr(new Date().toLocaleDateString('sv'));
  }, []);

  // Pretrip prophecy auto-generation removed: the ProphecyCard surface was
  // pulled from the trip room (it was retention noise before the user had any
  // reason to engage with it). Keeping the mutation fire here would burn AI
  // tokens producing content that has no UI to render it.
  const createTrip = trpc.trips.create.useMutation({
    onSuccess: trip => {
      analytics.tripCreated(trip.id, trip.name);
      triggerChime(1.5);
      toast('Archive created — initialising crew roster');
      router.push(`/trips/${trip.id}/invite`);
    },
  });

  const handleNext = () => {
    setValidationError('');
    const today = new Date().toLocaleDateString('sv');

    if (step === 1 && !fields.name.trim()) {
      setValidationError('Give the chaos a name. Even a bad one works.');
      return;
    }
    if (step === 3) {
      if (!fields.startDate) {
        setValidationError('Select when the season began.');
        return;
      }
      if (fields.startDate > today) {
        setValidationError("Future trips don't have lore yet. Pick a past date.");
        return;
      }
    }
    if (step === 4) {
      if (!fields.endDate) {
        setValidationError('Select when the finale happened.');
        return;
      }
      if (fields.endDate > today) {
        setValidationError('The finale must be in the past — lore requires lived experience.');
        return;
      }
      if (fields.endDate < fields.startDate) {
        setValidationError("The finale can't come before the premiere.");
        return;
      }
    }

    triggerChime(1.0 + step * 0.08);
    setStep(s => s + 1);
  };

  const handlePrev = () => {
    if (step === 0) {
      router.back();
      return;
    }
    triggerChime(0.85);
    setStep(s => s - 1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleNext();
    }
  };

  const isStepValid = () => {
    if (step === 1) return fields.name.trim().length > 0;
    if (step === 3) {
      if (!fields.startDate) return false;
      const today = new Date().toLocaleDateString('sv');
      return fields.startDate <= today;
    }
    if (step === 4) {
      if (!fields.endDate) return false;
      const today = new Date().toLocaleDateString('sv');
      return fields.endDate <= today && fields.endDate >= fields.startDate;
    }
    return true;
  };

  const isFormFullyReady =
    fields.name.trim() &&
    fields.startDate &&
    fields.endDate &&
    (!todayStr ||
      (fields.startDate <= todayStr &&
        fields.endDate <= todayStr &&
        fields.endDate >= fields.startDate)) &&
    !createTrip.isPending;

  return (
    <div
      className="min-h-screen flex flex-col relative overflow-hidden select-none"
      style={{ background: 'oklch(97% 0.008 70)', color: 'oklch(16% 0.015 60)' }}
    >
      {/* Dynamic atmospheric light textures */}
      <div className="absolute inset-0 pointer-events-none opacity-40">
        <div
          className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full blur-[140px]"
          style={{ background: 'radial-gradient(circle, oklch(90% 0.12 30) 0%, transparent 70%)' }}
        />
        <div
          className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full blur-[120px]"
          style={{ background: 'radial-gradient(circle, oklch(92% 0.08 75) 0%, transparent 70%)' }}
        />
      </div>

      <div className="light-grain pointer-events-none" />

      {/* Interactive Navbar */}
      <nav
        className="relative z-20 flex items-center justify-between px-8 py-5 transition-colors duration-300"
        style={{ borderBottom: '1px solid oklch(88% 0.012 70)' }}
      >
        <button
          onClick={handlePrev}
          onMouseEnter={() => triggerChime(1.3)}
          className="font-mono text-[9px] uppercase tracking-[0.4em] hover:opacity-60 transition-opacity"
          style={{ color: 'oklch(50% 0.01 60)' }}
        >
          ← {step === 0 ? 'BACK' : 'BACKTRACK'}
        </button>
        <span
          className="font-display italic font-black text-lg tracking-tight select-none cursor-pointer"
          style={{ color: 'oklch(60% 0.22 25)' }}
          onClick={() => {
            triggerChime(1.0);
            setStep(0);
          }}
        >
          yaarlore
        </span>
        <div className="flex items-center gap-4">
          <span className="font-mono text-[9px] uppercase tracking-widest opacity-55">
            {step > 0 && step <= 5 ? `RECORD // 0${step}` : ''}
          </span>
          {/* Exit to trips dashboard — gives users a clear escape */}
          <button
            onClick={() => router.push('/trips')}
            className="font-mono text-[9px] uppercase tracking-[0.4em] hover:opacity-60 transition-opacity"
            style={{ color: 'oklch(50% 0.01 60)' }}
            title="Cancel and go to My Trips"
          >
            ✕
          </button>
        </div>
      </nav>

      {/* Main Questionnaire Stage */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-xl">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div
                key="welcome"
                initial={{ opacity: 0, y: 30, filter: 'blur(8px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -30, filter: 'blur(8px)' }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-8 text-center"
              >
                <div className="space-y-3">
                  <span
                    className="px-3.5 py-1 rounded-full font-mono text-[8px] uppercase tracking-[0.3em] inline-block"
                    style={{
                      border: '1.5px solid oklch(85% 0.015 70)',
                      background: 'oklch(95% 0.01 70)',
                      color: 'oklch(60% 0.22 25)',
                    }}
                  >
                    LORE SYSTEM INITIALIZATION
                  </span>
                  <h1
                    className="font-display font-black uppercase tracking-tighter leading-[0.85] pt-1"
                    style={{ fontSize: 'clamp(42px, 8vw, 78px)', color: 'oklch(16% 0.015 60)' }}
                  >
                    CATALOGUE A NEW <br />
                    <em className="italic font-light" style={{ color: 'oklch(60% 0.22 25)' }}>
                      DISASTER
                    </em>
                  </h1>
                  <p
                    className="font-display italic text-base max-w-md mx-auto"
                    style={{ color: 'oklch(48% 0.012 60)' }}
                  >
                    "Every legendary saga starts with an unhinged plan, a budget spreadsheet, and a
                    group chat."
                  </p>
                </div>

                <div className="pt-4">
                  <button
                    onClick={() => {
                      triggerChime(1.1);
                      setStep(1);
                    }}
                    onMouseEnter={() => triggerChime(1.3)}
                    className="px-8 py-[18px] rounded-full font-ui font-black text-[11px] uppercase tracking-[0.3em] transition-all hover:scale-[1.03] active:scale-95 shadow-md shadow-black/[0.04]"
                    style={{
                      background: 'oklch(16% 0.015 60)',
                      color: 'oklch(97% 0.008 70)',
                    }}
                  >
                    INITIATE ARCHIVE LOGS →
                  </button>
                </div>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div
                key="name"
                initial={{ opacity: 0, x: 50, filter: 'blur(6px)' }}
                animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, x: -50, filter: 'blur(6px)' }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-6"
              >
                <div className="space-y-1">
                  <span className="font-mono text-[9px] uppercase tracking-[0.35em] opacity-55">
                    SAGA IDENTITY // 01
                  </span>
                  <h2
                    id="step-1-label"
                    className="font-display font-black text-4xl uppercase tracking-tight"
                  >
                    What is the title of this season?
                  </h2>
                  <p id="step-1-hint" className="font-display italic text-sm opacity-60">
                    The official name of your trip's archive. Make it dramatic.
                  </p>
                </div>

                <div className="relative pt-4">
                  <label htmlFor="trip-name" className="sr-only">
                    Trip title
                  </label>
                  <input
                    id="trip-name"
                    ref={inputRef}
                    type="text"
                    value={fields.name}
                    aria-labelledby="step-1-label"
                    aria-describedby="step-1-hint"
                    aria-required="true"
                    onChange={e => setFields(f => ({ ...f, name: e.target.value }))}
                    onKeyDown={handleKeyDown}
                    placeholder={HINT_PRESETS.name[activeHintIndex]}
                    className="w-full bg-transparent outline-none font-display italic font-black text-2xl py-3 border-b-2 transition-all duration-300"
                    style={{
                      borderColor: fields.name ? 'oklch(60% 0.22 25)' : 'oklch(80% 0.015 70)',
                      color: 'oklch(16% 0.015 60)',
                      caretColor: 'oklch(60% 0.22 25)',
                    }}
                  />
                </div>

                <div className="flex items-center justify-between pt-6">
                  <span className="font-mono text-[9px] text-black/50">
                    Press <span className="font-bold border px-1.5 py-0.5 rounded">Enter ↵</span> to
                    proceed
                  </span>
                  <button
                    onClick={handleNext}
                    disabled={!isStepValid()}
                    onMouseEnter={() => isStepValid() && triggerChime(1.3)}
                    className="px-6 py-3 rounded-full font-ui font-black text-[10px] uppercase tracking-[0.25em] transition-all disabled:opacity-20 hover:translate-x-1"
                    style={{
                      background: 'oklch(16% 0.015 60)',
                      color: 'oklch(97% 0.008 70)',
                    }}
                  >
                    CONTINUE →
                  </button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="destination"
                initial={{ opacity: 0, x: 50, filter: 'blur(6px)' }}
                animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, x: -50, filter: 'blur(6px)' }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-6"
              >
                <div className="space-y-1">
                  <span className="font-mono text-[9px] uppercase tracking-[0.35em] opacity-55">
                    THEATER OF OPERATIONS // 02
                  </span>
                  <h2 className="font-display font-black text-4xl uppercase tracking-tight">
                    Where did the events unfold?
                  </h2>
                  <p className="font-display italic text-sm opacity-60">
                    Filming location or main base of conflict. Leave blank if top classified.
                  </p>
                </div>

                <div className="relative pt-4">
                  <input
                    ref={inputRef}
                    type="text"
                    value={fields.destination}
                    onChange={e => setFields(f => ({ ...f, destination: e.target.value }))}
                    onKeyDown={handleKeyDown}
                    placeholder={HINT_PRESETS.destination[activeHintIndex]}
                    className="w-full bg-transparent outline-none font-display italic font-black text-2xl py-3 border-b-2 transition-all duration-300"
                    style={{
                      borderColor: fields.destination
                        ? 'oklch(60% 0.22 25)'
                        : 'oklch(80% 0.015 70)',
                      color: 'oklch(16% 0.015 60)',
                      caretColor: 'oklch(60% 0.22 25)',
                    }}
                  />
                </div>

                <div className="flex items-center justify-between pt-6">
                  <span className="font-mono text-[9px] text-black/50">
                    Press <span className="font-bold border px-1.5 py-0.5 rounded">Enter ↵</span> to
                    skip or proceed
                  </span>
                  <button
                    onClick={handleNext}
                    onMouseEnter={() => triggerChime(1.3)}
                    className="px-6 py-3 rounded-full font-ui font-black text-[10px] uppercase tracking-[0.25em] transition-all hover:translate-x-1"
                    style={{
                      background: 'oklch(16% 0.015 60)',
                      color: 'oklch(97% 0.008 70)',
                    }}
                  >
                    {fields.destination ? 'CONTINUE →' : 'SKIP FOR NOW →'}
                  </button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="startDate"
                initial={{ opacity: 0, x: 50, filter: 'blur(6px)' }}
                animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, x: -50, filter: 'blur(6px)' }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-6"
              >
                <div className="space-y-1">
                  <span className="font-mono text-[9px] uppercase tracking-[0.35em] opacity-55">
                    TIMELINE ENTRY // 03
                  </span>
                  <h2 className="font-display font-black text-4xl uppercase tracking-tight">
                    When did the descent start?
                  </h2>
                  <p className="font-display italic text-sm opacity-60">
                    The Premiere Date. The day the first records began.
                  </p>
                </div>

                <div className="relative pt-4">
                  <input
                    ref={inputRef}
                    type="date"
                    max={todayStr}
                    value={fields.startDate}
                    onChange={e => setFields(f => ({ ...f, startDate: e.target.value }))}
                    onKeyDown={handleKeyDown}
                    className="w-full bg-transparent outline-none font-display font-black text-2xl py-3 border-b-2 transition-all duration-300"
                    style={{
                      borderColor: fields.startDate ? 'oklch(60% 0.22 25)' : 'oklch(80% 0.015 70)',
                      color: 'oklch(16% 0.015 60)',
                      colorScheme: 'light',
                    }}
                  />
                </div>

                <div className="flex items-center justify-between pt-6">
                  <span className="font-mono text-[9px] text-black/50">
                    Press <span className="font-bold border px-1.5 py-0.5 rounded">Enter ↵</span> to
                    proceed
                  </span>
                  <button
                    onClick={handleNext}
                    disabled={!isStepValid()}
                    onMouseEnter={() => isStepValid() && triggerChime(1.3)}
                    className="px-6 py-3 rounded-full font-ui font-black text-[10px] uppercase tracking-[0.25em] transition-all disabled:opacity-20 hover:translate-x-1"
                    style={{
                      background: 'oklch(16% 0.015 60)',
                      color: 'oklch(97% 0.008 70)',
                    }}
                  >
                    CONTINUE →
                  </button>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="endDate"
                initial={{ opacity: 0, x: 50, filter: 'blur(6px)' }}
                animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, x: -50, filter: 'blur(6px)' }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-6"
              >
                <div className="space-y-1">
                  <span className="font-mono text-[9px] uppercase tracking-[0.35em] opacity-55">
                    TIMELINE EXIT // 04
                  </span>
                  <h2 className="font-display font-black text-4xl uppercase tracking-tight">
                    When did the curtain fall?
                  </h2>
                  <p className="font-display italic text-sm opacity-60">
                    The Finale Date. The day the saga concluded.
                  </p>
                </div>

                <div className="relative pt-4">
                  <input
                    ref={inputRef}
                    type="date"
                    min={fields.startDate}
                    max={todayStr}
                    value={fields.endDate}
                    onChange={e => setFields(f => ({ ...f, endDate: e.target.value }))}
                    onKeyDown={handleKeyDown}
                    className="w-full bg-transparent outline-none font-display font-black text-2xl py-3 border-b-2 transition-all duration-300"
                    style={{
                      borderColor: fields.endDate ? 'oklch(60% 0.22 25)' : 'oklch(80% 0.015 70)',
                      color: 'oklch(16% 0.015 60)',
                      colorScheme: 'light',
                    }}
                  />
                </div>

                <div className="flex items-center justify-between pt-6">
                  <span className="font-mono text-[9px] text-black/50">
                    Press <span className="font-bold border px-1.5 py-0.5 rounded">Enter ↵</span> to
                    review
                  </span>
                  <button
                    onClick={handleNext}
                    disabled={!isStepValid()}
                    onMouseEnter={() => isStepValid() && triggerChime(1.3)}
                    className="px-6 py-3 rounded-full font-ui font-black text-[10px] uppercase tracking-[0.25em] transition-all disabled:opacity-20 hover:translate-x-1"
                    style={{
                      background: 'oklch(16% 0.015 60)',
                      color: 'oklch(97% 0.008 70)',
                    }}
                  >
                    REVIEW DETAILS →
                  </button>
                </div>
              </motion.div>
            )}

            {step === 5 && (
              <motion.div
                key="summary"
                initial={{ opacity: 0, y: 30, filter: 'blur(8px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -30, filter: 'blur(8px)' }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-8"
              >
                <div className="space-y-1 text-center">
                  <span className="font-mono text-[9px] uppercase tracking-[0.35em] opacity-55">
                    READY FOR LAUNCH // 05
                  </span>
                  <h2 className="font-display font-black text-4xl uppercase tracking-tight">
                    Confirm Dossier Details
                  </h2>
                  <p className="font-display italic text-sm opacity-60">
                    Confirm your season's record details before writing them to the ledger.
                  </p>
                </div>

                {/* Styled review grid */}
                <div
                  className="rounded-2xl border-2 p-6 space-y-4"
                  style={{
                    borderColor: 'oklch(88% 0.012 70)',
                    background: 'oklch(94% 0.012 70 / 0.5)',
                  }}
                >
                  <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                    <div>
                      <p className="font-mono text-[9px] tracking-widest opacity-60">
                        SEASON TITLE
                      </p>
                      <p className="font-display italic font-black text-lg truncate leading-tight">
                        {fields.name}
                      </p>
                    </div>
                    <div>
                      <p className="font-mono text-[9px] tracking-widest opacity-60">LOCATION</p>
                      <p className="font-display italic font-black text-lg truncate leading-tight">
                        {fields.destination || 'Top Classified'}
                      </p>
                    </div>
                    <div>
                      <p className="font-mono text-[9px] tracking-widest opacity-60">
                        PREMIERE DATE
                      </p>
                      <p className="font-mono font-bold text-sm leading-tight">
                        {fields.startDate}
                      </p>
                    </div>
                    <div>
                      <p className="font-mono text-[9px] tracking-widest opacity-60">FINALE DATE</p>
                      <p className="font-mono font-bold text-sm leading-tight">{fields.endDate}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <button
                    onClick={() =>
                      createTrip.mutate({
                        name: fields.name,
                        destination: fields.destination || undefined,
                        startDate: fields.startDate,
                        endDate: fields.endDate,
                      })
                    }
                    disabled={!isFormFullyReady || createTrip.isPending}
                    onMouseEnter={() => isFormFullyReady && triggerChime(1.4)}
                    className="w-full py-[18px] rounded-full font-ui font-black text-[11px] uppercase tracking-[0.3em] flex items-center justify-center gap-3 disabled:opacity-30 transition-all hover:scale-[1.01] active:scale-95 shadow-md shadow-black/[0.04]"
                    style={{
                      background: 'oklch(16% 0.015 60)',
                      color: 'oklch(97% 0.008 70)',
                    }}
                  >
                    {createTrip.isPending ? (
                      <>
                        <div
                          style={{
                            width: 14,
                            height: 14,
                            borderRadius: '50%',
                            border: '1.5px solid currentColor',
                            borderTopColor: 'transparent',
                            animation: 'nt-spin 0.8s linear infinite',
                          }}
                        />{' '}
                        CREATING PORTAL...
                      </>
                    ) : (
                      'LAUNCH THE SAGA →'
                    )}
                  </button>

                  <button
                    onClick={() => {
                      triggerChime(0.9);
                      setStep(1);
                    }}
                    onMouseEnter={() => triggerChime(1.2)}
                    className="w-full py-3.5 rounded-full font-mono text-[9px] uppercase tracking-[0.3em] flex items-center justify-center border hover:bg-black/[0.03] transition-colors"
                    style={{
                      borderColor: 'oklch(80% 0.015 70)',
                      color: 'oklch(40% 0.015 60)',
                    }}
                  >
                    RE-EDIT FIELDS
                  </button>
                </div>

                {createTrip.error && (
                  <p
                    className="text-center text-xs font-mono font-bold tracking-tight uppercase"
                    style={{
                      color: 'oklch(60% 0.22 25)',
                      animation: 'nt-error-enter 0.45s cubic-bezier(0.16,1,0.3,1) forwards',
                    }}
                  >
                    ⚠️ {createTrip.error.message}
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Inline validation error — appears when handleNext catches an invalid field */}
          {validationError && (
            <div
              className="mt-4 text-center"
              style={{ animation: 'nt-error-enter 0.4s cubic-bezier(0.16,1,0.3,1) both' }}
            >
              <span
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-mono text-[8px] uppercase tracking-[0.25em]"
                style={{
                  background: 'oklch(96% 0.012 25 / 0.6)',
                  border: '1px solid oklch(60% 0.22 25 / 0.35)',
                  color: 'oklch(50% 0.22 25)',
                }}
              >
                <span
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    background: 'oklch(60% 0.22 25)',
                    flexShrink: 0,
                    display: 'inline-block',
                  }}
                />
                {validationError}
              </span>
            </div>
          )}

          {/* Stepper Dots Indicator */}
          {step > 0 && step <= 4 && (
            <nav aria-label="Form steps" className="flex justify-center items-center gap-2 pt-12">
              {[1, 2, 3, 4].map(s => (
                <button
                  key={s}
                  onClick={() => {
                    triggerChime(0.9 + s * 0.08);
                    setStep(s);
                  }}
                  aria-label={`Go to step ${s}${s === step ? ' (current)' : ''}`}
                  aria-current={s === step ? 'step' : undefined}
                  className="w-1.5 h-1.5 rounded-full transition-all duration-300 no-min-h"
                  style={{
                    background: s === step ? 'oklch(60% 0.22 25)' : 'oklch(80% 0.015 70)',
                    transform: s === step ? 'scale(1.5)' : 'scale(1)',
                  }}
                />
              ))}
            </nav>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes nt-spin {
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes nt-error-enter {
          from {
            opacity: 0;
            transform: translate3d(0, 16px, 0);
            filter: blur(6px);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0);
            filter: blur(0px);
          }
        }
      `}</style>
    </div>
  );
}
