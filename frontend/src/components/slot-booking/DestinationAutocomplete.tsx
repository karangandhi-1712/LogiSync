// ─── DestinationAutocomplete.tsx — Google Maps style location search ─────────
import { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Search, X, Loader2, Navigation2, Building2, Warehouse } from 'lucide-react';
import { clsx } from 'clsx';
import {
  searchLocationSuggestions,
  getPopularDestinationsForPort,
  type LocationSuggestion
} from '../../data/locationSuggestions';

interface DestinationAutocompleteProps {
  value: string;
  onChange: (val: string) => void;
  portId?: string;
  placeholder?: string;
}

const CATEGORY_ICONS: Record<string, any> = {
  'CFS': Warehouse,
  'ICD': Building2,
  'Port Yard': Navigation2,
  'Industrial Zone': Building2,
  'Logistics Park': Warehouse,
  'City Hub': MapPin,
};

const CATEGORY_COLORS: Record<string, string> = {
  'CFS': 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-400/30',
  'ICD': 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-400/30',
  'Port Yard': 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-400/30',
  'Industrial Zone': 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-400/30',
  'Logistics Park': 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-400/30',
  'City Hub': 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-400/30',
};

export function DestinationAutocomplete({
  value,
  onChange,
  portId,
  placeholder = 'Search destination or cargo yard (e.g. CCTL Bay 4, ICD, CFS)...'
}: DestinationAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<any>(null);

  const popularPills = getPopularDestinationsForPort(portId);

  const performSearch = useCallback(async (query: string) => {
    setIsLoading(true);
    try {
      const results = await searchLocationSuggestions(query, portId);
      setSuggestions(results);
    } catch {
      setSuggestions(getPopularDestinationsForPort(portId));
    } finally {
      setIsLoading(false);
    }
  }, [portId]);

  // Debounced input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    onChange(text);
    setIsOpen(true);
    setHighlightIndex(-1);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      performSearch(text);
    }, 240);
  };

  const handleSelect = (item: LocationSuggestion) => {
    onChange(`${item.title}, ${item.subtitle.split(',')[0]}`);
    setIsOpen(false);
    setHighlightIndex(-1);
  };

  const handleClear = () => {
    onChange('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown') {
        setIsOpen(true);
        performSearch(value);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex(prev => (prev + 1) % Math.max(1, suggestions.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex(prev => (prev <= 0 ? suggestions.length - 1 : prev - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightIndex >= 0 && highlightIndex < suggestions.length) {
        handleSelect(suggestions[highlightIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Input container */}
      <div className={clsx(
        'relative flex items-center rounded-2xl bg-white/60 dark:bg-slate-900/60 border transition-all duration-200 px-3.5 py-2.5',
        isOpen ? 'border-cyan-400 ring-2 ring-cyan-400/20 shadow-lg' : 'border-white/70 dark:border-white/10 hover:border-cyan-400/40'
      )}>
        <MapPin className="w-3.5 h-3.5 text-cyan-500 mr-2 flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={() => {
            setIsOpen(true);
            if (suggestions.length === 0) performSearch(value);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-xs font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
        />

        {isLoading && (
          <Loader2 className="w-3.5 h-3.5 text-cyan-500 animate-spin flex-shrink-0 mr-1.5" />
        )}

        {value && !isLoading && (
          <button
            type="button"
            onClick={handleClear}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Quick 1-tap pills below input */}
      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Quick:</span>
        {popularPills.slice(0, 3).map(pill => (
          <button
            key={pill.id}
            type="button"
            onClick={() => handleSelect(pill)}
            className="px-2 py-0.5 rounded-full text-[9px] font-semibold
              bg-white/50 dark:bg-slate-800/50 border border-white/60 dark:border-white/10
              text-slate-600 dark:text-slate-300 hover:border-cyan-400/50 hover:text-cyan-600 dark:hover:text-cyan-300 transition-all truncate max-w-[180px]"
          >
            {pill.title.split(',')[0]}
          </button>
        ))}
      </div>

      {/* Suggestions dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-2xl
          bg-white/95 dark:bg-[#0d1628]/95 backdrop-blur-2xl
          border border-white/80 dark:border-white/15
          shadow-[0_16px_40px_rgba(0,0,0,0.3)] overflow-hidden">
          <div className="p-2 border-b border-slate-200/50 dark:border-white/10 flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wider">
            <span className="flex items-center gap-1">
              <Search className="w-3 h-3 text-cyan-500" />
              Location Suggestions
            </span>
            <span>{suggestions.length} locations found</span>
          </div>

          <div className="max-h-60 overflow-y-auto p-1.5 space-y-1">
            {suggestions.length === 0 && !isLoading ? (
              <div className="p-4 text-center text-xs text-slate-400">
                No matching location. Press Enter to use entered address.
              </div>
            ) : (
              suggestions.map((item, idx) => {
                const IconComponent = CATEGORY_ICONS[item.category] || MapPin;
                const categoryColor = CATEGORY_COLORS[item.category] || 'bg-slate-500/15 text-slate-400 border-slate-400/30';
                const isHighlighted = highlightIndex === idx;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setHighlightIndex(idx)}
                    className={clsx(
                      'w-full flex items-start gap-2.5 p-2.5 rounded-xl text-left transition-all duration-150',
                      isHighlighted
                        ? 'bg-cyan-500/15 dark:bg-cyan-500/20 text-slate-900 dark:text-white ring-1 ring-cyan-400/40'
                        : 'hover:bg-slate-100/70 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200'
                    )}
                  >
                    <div className="w-7 h-7 rounded-lg bg-cyan-500/10 dark:bg-cyan-500/20 flex items-center justify-center flex-shrink-0 mt-0.5 border border-cyan-400/20">
                      <IconComponent className="w-3.5 h-3.5 text-cyan-500" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold truncate leading-tight">
                          {item.title}
                        </span>
                        <span className={clsx('text-[8px] font-black px-1.5 py-0.5 rounded-md border flex-shrink-0', categoryColor)}>
                          {item.category}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                        {item.subtitle}
                      </p>
                    </div>

                    {item.approxKm != null && (
                      <span className="text-[9px] font-mono text-slate-400 flex-shrink-0 self-center">
                        ~{item.approxKm} km
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
