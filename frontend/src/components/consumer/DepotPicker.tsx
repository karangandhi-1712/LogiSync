import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Anchor, MapPin, Search, X } from 'lucide-react';
import type { PortInfo } from '../../data/ports';
import { useTheme } from '../../context/ThemeContext';

interface Props {
  ports: PortInfo[];
  value: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
  title?: string;
  subtitle?: string;
}

/** Centered depot picker, styled like the other overlays in the app. */
export function DepotPickerModal({ ports, value, onSelect, onClose, title, subtitle }: Props) {
  const { isDark } = useTheme();
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ports;
    return ports.filter((p) =>
      [p.name, p.short, p.city, p.state, p.code]
        .filter(Boolean)
        .some((f) => String(f).toLowerCase().includes(q)),
    );
  }, [ports, query]);

  useEffect(() => {
    const t = setTimeout(() => searchRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocused((f) => Math.min(f + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocused((f) => Math.max(f - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const picked = results[focused];
        if (picked) {
          onSelect(picked.id);
          onClose();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [results, focused, onSelect, onClose]);

  useEffect(() => {
    setFocused(0);
  }, [query]);

  const grouped = useMemo(() => {
    const west = results.filter((p) => p.coast === 'West');
    const east = results.filter((p) => p.coast === 'East');
    return [
      { label: 'West Coast', items: west },
      { label: 'East Coast', items: east },
    ].filter((g) => g.items.length);
  }, [results]);

  let flatIndex = -1;

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[1400] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title ?? 'Select pickup depot'}
    >
      <div
        className="absolute inset-0 bg-slate-900/45 dark:bg-black/65 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.18 }}
        className="relative w-full max-w-lg rounded-2xl liquid-glass-elevated border border-white/50 dark:border-white/10 shadow-2xl overflow-hidden"
      >
        <div className="flex items-start gap-3 px-5 pt-5 pb-3">
          <div className="mt-0.5 p-2 rounded-xl bg-sky-500/12 text-sky-600 dark:text-cyan-300">
            <Anchor className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-black text-slate-900 dark:text-white">
              {title ?? 'Choose your pickup depot'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {subtitle ?? 'Cargo collects from the port and travels to your address.'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-auto p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-500/10"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search port, city or code…"
              className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/5 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20"
            />
          </div>
        </div>

        <div
          ref={listRef}
          className="max-h-[46vh] overflow-y-auto px-3 pb-4"
          role="listbox"
        >
          {grouped.length === 0 && (
            <p className="px-3 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
              No depot matches “{query}”.
            </p>
          )}
          {grouped.map((group) => (
            <div key={group.label} className="mb-2">
              <p className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
                {group.label}
              </p>
              {group.items.map((port) => {
                flatIndex += 1;
                const myIndex = flatIndex;
                const active = myIndex === focused;
                const selected = port.id === value;
                return (
                  <button
                    key={port.id}
                    role="option"
                    aria-selected={selected}
                    onMouseEnter={() => setFocused(myIndex)}
                    onClick={() => {
                      onSelect(port.id);
                      onClose();
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition ${
                      active
                        ? 'bg-sky-500/12 ring-1 ring-sky-400/30'
                        : 'hover:bg-slate-500/8'
                    } ${selected ? 'bg-sky-500/8' : ''}`}
                  >
                    <div
                      className={`p-2 rounded-lg shrink-0 ${
                        selected
                          ? 'bg-sky-500 text-white'
                          : 'bg-slate-500/12 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      <MapPin className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                          {port.short}
                        </span>
                        {port.code && (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-slate-500/12 text-slate-500 dark:text-slate-400">
                            {port.code}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {port.city}, {port.state}
                      </p>
                    </div>
                    {selected && (
                      <span className="text-[10px] font-black uppercase tracking-wide text-sky-600 dark:text-cyan-300 shrink-0">
                        Selected
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="px-5 py-3 border-t border-slate-200/60 dark:border-white/8 flex items-center justify-between">
          <p className="text-[10px] text-slate-400">
            {results.length} depot{results.length === 1 ? '' : 's'} · ↑↓ to navigate · ⏎ to select
          </p>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              isDark ? 'bg-white/10 text-slate-300' : 'bg-slate-500/10 text-slate-500'
            }`}
          >
            Esc to close
          </span>
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  );
}

/** Compact inline trigger showing the currently chosen depot. */
export function DepotSelectorBar({
  ports,
  value,
  onClick,
  onClear,
  id,
}: {
  ports: PortInfo[];
  value: string | null;
  onClick: () => void;
  onClear?: () => void;
  id?: string;
}) {
  const port = ports.find((p) => p.id === value) ?? null;

  return (
    <div id={id}>
      <button
        onClick={onClick}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left border border-white/50 dark:border-white/10 liquid-glass hover:border-sky-400/40 transition"
      >
        <div
          className={`p-2.5 rounded-xl shrink-0 ${
            port
              ? 'bg-sky-500/15 text-sky-600 dark:text-cyan-300'
              : 'bg-slate-500/10 text-slate-400'
          }`}
        >
          <Anchor className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          {port ? (
            <>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-slate-900 dark:text-white truncate">
                  {port.short}
                </span>
                {port.code && (
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-600 dark:text-cyan-300">
                    {port.code}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {port.city}, {port.state} · {port.corridor}
              </p>
            </>
          ) : (
            <>
              <span className="text-sm font-bold text-slate-600 dark:text-slate-300">
                Select a pickup depot
              </span>
              <p className="text-[11px] text-slate-400">Required before you can request a delivery</p>
            </>
          )}
        </div>
        {port && onClear ? (
          <span
            role="button"
            tabIndex={0}
            aria-label="Clear depot"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.stopPropagation();
                onClear();
              }
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </span>
        ) : (
          <span className="text-[11px] font-bold text-sky-600 dark:text-cyan-300 shrink-0">
            Change
          </span>
        )}
      </button>
    </div>
  );
}

export { AnimatePresence };