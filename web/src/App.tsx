import { useCallback, useState } from 'react';
import {
  BarChart3,
  BookOpen,
  FlaskConical,
  History,
  Plus,
  Settings as SettingsIcon,
  TrendingUp,
} from 'lucide-react';
import { Dashboard } from './features/dashboard/Dashboard';
import { HistoryView } from './features/history/HistoryView';
import { JournalView } from './features/journal/JournalView';
import { SettingsView } from './features/settings/SettingsView';
import { SimulatorView } from './features/simulator/SimulatorView';
import { TradeFormModal } from './components/TradeFormModal';
import { Button } from './components/ui';
import type { Trade } from './lib/types';

type View = 'dashboard' | 'history' | 'journal' | 'simulator' | 'settings';

const NAV: { key: View; label: string; icon: typeof BarChart3 }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { key: 'history', label: 'Histórico', icon: History },
  { key: 'journal', label: 'Journal', icon: BookOpen },
  { key: 'simulator', label: 'Simule um teste de mesa proprietária', icon: FlaskConical },
  { key: 'settings', label: 'Configurações', icon: SettingsIcon },
];

const TITLES: Record<View, string> = {
  dashboard: 'Painel de performance',
  history: 'Histórico',
  journal: 'Journal',
  simulator: 'Simulador de exame',
  settings: 'Configurações',
};

export function App() {
  const [view, setView] = useState<View>('dashboard');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Trade | null>(null);
  const [initialDate, setInitialDate] = useState<string | undefined>(undefined);

  const openNew = useCallback((date?: string) => {
    setEditing(null);
    setInitialDate(date);
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((trade: Trade) => {
    setEditing(trade);
    setInitialDate(undefined);
    setModalOpen(true);
  }, []);

  return (
    <div className="flex h-full">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-surface lg:flex">
        <div className="flex h-14 items-center gap-2 border-b border-border px-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent">
            <TrendingUp size={18} />
          </span>
          <div className="leading-tight">
            <div className="text-sm font-bold tracking-wide">TradeLog</div>
            <div className="text-[10px] text-muted">Mini Dólar</div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setView(key)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                view === key
                  ? 'bg-accent/10 text-accent'
                  : 'text-muted hover:bg-panel-2 hover:text-text'
              }`}
            >
              <Icon size={17} />
              {label}
            </button>
          ))}
        </nav>
        <div className="border-t border-border p-3">
          <div className="flex items-center gap-2 rounded-lg bg-panel px-3 py-2">
            <span className="h-2 w-2 rounded-full bg-gain" />
            <span className="font-mono text-[11px] text-muted">local · SQLite</span>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between gap-3 border-b border-border bg-surface px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent lg:hidden">
              <TrendingUp size={17} />
            </span>
            <h1 className="text-sm font-semibold tracking-wide uppercase">{TITLES[view]}</h1>
          </div>
          <Button variant="primary" onClick={() => openNew()}>
            <Plus size={16} /> <span className="hidden sm:inline">Nova operação</span>
          </Button>
        </header>

        <nav className="flex gap-1 overflow-x-auto border-b border-border bg-surface px-4 py-2 lg:hidden">
          {NAV.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setView(key)}
              className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium ${
                view === key ? 'bg-accent/10 text-accent' : 'text-muted'
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </nav>

        <main className="min-h-0 flex-1 overflow-y-auto p-4 lg:p-6">
          {view === 'dashboard' && (
            <Dashboard onNewTrade={() => openNew()} onEditTrade={openEdit} onDayClick={openNew} />
          )}
          {view === 'history' && <HistoryView onEditTrade={openEdit} />}
          {view === 'journal' && <JournalView onEditTrade={openEdit} />}
          {view === 'simulator' && <SimulatorView />}
          {view === 'settings' && <SettingsView />}
        </main>
      </div>

      <TradeFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        trade={editing}
        initialDate={initialDate}
      />
    </div>
  );
}
