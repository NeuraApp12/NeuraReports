export default function Home() {
  return (
    <div className="min-h-screen bg-neura-bg flex items-center justify-center">
      <div className="text-center px-6 max-w-md">
        <p className="text-neura-accent text-xs font-bold uppercase tracking-[3px] mb-4">
          Neura
        </p>
        <h1 className="text-3xl font-bold text-white mb-3 tracking-tight">
          Brain Performance Reports
        </h1>
        <p className="text-white/45 text-base leading-relaxed">
          Open a report link from your Neura session to view your personalized
          EEG analysis.
        </p>
      </div>
    </div>
  );
}
