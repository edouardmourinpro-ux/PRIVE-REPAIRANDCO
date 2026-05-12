import { useState, useRef, useEffect } from 'react';
import { Calendar } from './ui/calendar';
import { CalendarDays, ChevronDown, X } from 'lucide-react';
import { Button } from './ui/button';
import { fr } from 'date-fns/locale';

// ── helpers ────────────────────────────────────────────────────────────────────
const toISO = (d) => (d ? d.toISOString().slice(0, 10) : '');
const fmtFr = (d) =>
  d
    ? d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
    : '';

const today = () => new Date();
const startOfYear = () => new Date(new Date().getFullYear(), 0, 1);
const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - (n - 1));
  return d;
};

const SHORTCUTS = [
  { id: 'always',  label: 'Depuis toujours',   getRange: () => ({ from: undefined, to: undefined }) },
  { id: '7d',      label: '7 derniers jours',   getRange: () => ({ from: daysAgo(7),  to: today() }) },
  { id: '30d',     label: '30 derniers jours',  getRange: () => ({ from: daysAgo(30), to: today() }) },
  { id: 'year',    label: 'Cette année',         getRange: () => ({ from: startOfYear(), to: today() }) },
];

// Brand-colour class overrides for DayPicker range mode
const RANGE_CLASSNAMES = {
  cell: [
    'relative p-0 text-center text-sm focus-within:relative focus-within:z-20',
    '[&:has([aria-selected])]:bg-[#E8F5EE]',
    '[&:has([aria-selected].day-outside)]:bg-[#E8F5EE]/40',
    '[&:has([aria-selected].day-range-end)]:rounded-r-md',
    '[&:has(>.day-range-end)]:rounded-r-md',
    '[&:has(>.day-range-start)]:rounded-l-md',
    'first:[&:has([aria-selected])]:rounded-l-md',
    'last:[&:has([aria-selected])]:rounded-r-md',
  ].join(' '),
  day_selected:
    'bg-[#1A5C3A] text-white hover:bg-[#1A5C3A] hover:text-white focus:bg-[#1A5C3A] focus:text-white rounded-md',
  day_range_middle:
    'aria-selected:bg-[#E8F5EE] aria-selected:text-[#1A5C3A] aria-selected:rounded-none',
  day_range_start: 'day-range-start rounded-l-md',
  day_range_end:   'day-range-end rounded-r-md',
  day_today:       'font-semibold text-[#1A5C3A]',
};

// ── Component ──────────────────────────────────────────────────────────────────
export const DateRangePicker = ({ onChange }) => {
  const [open, setOpen]                   = useState(false);
  const [applied, setApplied]             = useState({ from: undefined, to: undefined });
  const [pending, setPending]             = useState({ from: undefined, to: undefined });
  const [activeShortcut, setActiveShortcut] = useState('always');
  const containerRef                      = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Sync pending to applied when opening
  const handleOpen = () => {
    setPending({ ...applied });
    setOpen((v) => !v);
  };

  const selectShortcut = (s) => {
    const range = s.getRange();
    setPending(range);
    setActiveShortcut(s.id);
  };

  const handleCalendarSelect = (range) => {
    setPending(range || { from: undefined, to: undefined });
    setActiveShortcut(''); // custom range → deselect shortcut
  };

  const apply = () => {
    setApplied(pending);
    onChange(toISO(pending?.from), toISO(pending?.to));
    setOpen(false);
  };

  const clear = (e) => {
    e.stopPropagation();
    const empty = { from: undefined, to: undefined };
    setApplied(empty);
    setPending(empty);
    setActiveShortcut('always');
    onChange('', '');
  };

  // ── button label
  const hasFilter = applied.from || applied.to;
  const buttonLabel = hasFilter
    ? `${fmtFr(applied.from)}${applied.to ? ' → ' + fmtFr(applied.to) : ''}`
    : 'Toute la période';

  // ── pending label (inside dropdown)
  const pendingLabel =
    pending?.from
      ? `${fmtFr(pending.from)}${pending?.to ? ' → ' + fmtFr(pending.to) : ' → …'}`
      : 'Aucune sélection';

  return (
    <div className="relative flex-shrink-0" ref={containerRef} data-testid="date-range-picker">
      {/* Trigger button */}
      <button
        onClick={handleOpen}
        className={[
          'flex items-center gap-2 px-3 py-1.5 border rounded-lg text-sm transition-all',
          hasFilter
            ? 'border-[#1A5C3A] bg-[#E8F5EE] text-[#1A5C3A] font-medium'
            : 'border-[#E8F5EE] bg-white text-[#1A1A2E] hover:border-[#2ECC71]',
        ].join(' ')}
        data-testid="date-range-trigger"
      >
        <CalendarDays size={15} className="text-[#1A5C3A] flex-shrink-0" />
        <span className="max-w-[200px] truncate">{buttonLabel}</span>
        {hasFilter ? (
          <X
            size={13}
            className="flex-shrink-0 ml-1 opacity-70 hover:opacity-100"
            onClick={clear}
            data-testid="date-range-clear"
          />
        ) : (
          <ChevronDown size={13} className="flex-shrink-0 opacity-50" />
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className="absolute top-full left-0 mt-2 z-50 bg-white rounded-2xl shadow-2xl border border-[#E8F5EE] overflow-hidden"
          style={{ minWidth: 320 }}
          data-testid="date-range-panel"
        >
          <div className="flex flex-col sm:flex-row">
            {/* ── Shortcuts ────────────────────── */}
            <div className="p-4 sm:w-44 border-b sm:border-b-0 sm:border-r border-[#E8F5EE] bg-[#fafffe] flex flex-col gap-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#1A1A2E]/40 mb-2">
                Raccourcis
              </p>
              {SHORTCUTS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => selectShortcut(s)}
                  className={[
                    'w-full text-left px-3 py-2 text-sm rounded-lg transition-colors font-medium',
                    activeShortcut === s.id
                      ? 'bg-[#1A5C3A] text-white'
                      : 'text-[#1A1A2E] hover:bg-[#E8F5EE] hover:text-[#1A5C3A]',
                  ].join(' ')}
                  data-testid={`shortcut-${s.id}`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* ── Calendar + Apply ─────────────── */}
            <div className="flex flex-col">
              <Calendar
                mode="range"
                selected={pending}
                onSelect={handleCalendarSelect}
                locale={fr}
                weekStartsOn={1}
                classNames={RANGE_CLASSNAMES}
                numberOfMonths={1}
              />

              {/* Footer */}
              <div className="flex items-center justify-between gap-3 px-4 pb-4 pt-1 border-t border-[#E8F5EE]">
                <span className="text-xs text-[#1A1A2E]/50 truncate max-w-[160px]">
                  {pendingLabel}
                </span>
                <Button
                  onClick={apply}
                  className="bg-[#1A5C3A] text-white hover:bg-[#2ECC71] rounded-full text-xs px-5 flex-shrink-0"
                  data-testid="date-range-apply"
                >
                  Appliquer
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateRangePicker;
