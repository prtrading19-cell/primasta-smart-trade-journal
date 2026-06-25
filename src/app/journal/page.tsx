import { JournalTable } from "@/components/JournalTable";

export default function JournalPage() {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Spreadsheet-style journal</p>
        <h1 className="text-2xl font-bold tracking-tight">Trading Journal</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Filter, sort, close, edit, delete, view, and export trades from one clean table.</p>
      </header>
      <JournalTable />
    </div>
  );
}
