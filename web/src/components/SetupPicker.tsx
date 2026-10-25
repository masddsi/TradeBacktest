import { SETUPS } from '../lib/types';

/**
 * Multi-seleção de estratégias (setups). Quando vazio, nenhum filtro é aplicado
 * (mostra todas as estratégias). Mantém o mesmo estilo dos meses do simulador.
 */
export function SetupPicker({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  function toggle(setup: string) {
    onChange(
      selected.includes(setup) ? selected.filter((s) => s !== setup) : [...selected, setup],
    );
  }

  const allSelected = SETUPS.every((s) => selected.includes(s));

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {SETUPS.map((setup) => (
        <button
          key={setup}
          type="button"
          aria-pressed={selected.includes(setup)}
          onClick={() => toggle(setup)}
          className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
            selected.includes(setup)
              ? 'border-accent/40 bg-accent/10 text-accent'
              : 'border-border text-muted hover:text-text'
          }`}
        >
          {setup}
        </button>
      ))}
      <button
        type="button"
        onClick={() => onChange(allSelected ? [] : [...SETUPS])}
        className="ml-1 rounded-md px-2 py-1 text-[11px] text-muted/70 transition-colors hover:text-text"
      >
        {allSelected ? 'limpar' : 'todas'}
      </button>
    </div>
  );
}
