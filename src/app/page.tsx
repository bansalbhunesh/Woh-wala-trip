import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#FAF8F4] flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-2xl animate-in fade-in zoom-in-95 duration-1000">
        <header className="mb-12">
          <div className="w-16 h-16 bg-black text-white rounded-2xl flex items-center justify-center text-2xl font-outfit font-bold mx-auto mb-8 shadow-2xl rotate-3">
            WWT
          </div>
          <h1 className="text-6xl font-outfit font-bold tracking-tighter leading-none mb-6">
            Your trips, <br/>
            <span className="text-amber-600">narrated.</span>
          </h1>
          <p className="text-xl text-gray-500 font-inter max-w-md mx-auto leading-relaxed">
            Turn your group's chaotic photo dump into a cinematic history. 
            AI-powered lore, character roles, and share cards.
          </p>
        </header>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/login" className="btn-primary px-12 py-5 text-lg shadow-2xl">
            Start a trip
          </Link>
          <Link href="/trips/join" className="btn-secondary px-12 py-5 text-lg shadow-premium">
            Join with code
          </Link>
        </div>

        <div className="mt-24 grid grid-cols-2 sm:grid-cols-3 gap-8 opacity-40 grayscale">
          <Stat label="Trips Narrated" value="2.4k+" />
          <Stat label="Chaos Analyzed" value="98%" />
          <Stat label="Memories Saved" value="∞" />
        </div>
      </div>

      <footer className="fixed bottom-8 text-[10px] font-bold uppercase tracking-[0.3em] text-gray-300">
        Woh Wala Trip · 2024
      </footer>
    </div>
  );
}

function Stat({ label, value }: { label: string, value: string }) {
  return (
    <div>
      <p className="text-2xl font-outfit font-bold tracking-tight">{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-widest">{label}</p>
    </div>
  );
}
