import { JournalTable } from "@/components/JournalTable";

export default function JournalPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <header className="overflow-hidden rounded-2xl border border-border-subtle bg-surface-card">
        <div className="relative">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
          <div className="p-6 sm:p-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-gold">TradeOS Journal</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-text-primary sm:text-4xl">Trade Journal</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-text-secondary">Filter, sort, close, edit, delete, view, and export trades from one clean table.</p>
          </div>
        </div>
      </header>
      <JournalTable />
    </div>
  );
}
