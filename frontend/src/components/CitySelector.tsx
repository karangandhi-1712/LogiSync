import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Search, ChevronDown, Check, Globe2, Building2 } from 'lucide-react';
import type { City } from '../types/logistics';
import { PRESET_CITIES, searchLocations } from '../services/api';

interface CitySelectorProps {
  selectedCity: City;
  onSelectCity: (city: City) => void;
}

export const CitySelector: React.FC<CitySelectorProps> = ({ selectedCity, onSelectCity }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle live global search
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchLocations(searchQuery);
        setSearchResults(results);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectSearchResult = (result: any) => {
    const customCity: City = {
      id: `custom-${Date.now()}`,
      name: result.name,
      state: result.city || '',
      country: result.country || 'Global',
      center: result.coordinates,
      zoom: 13,
      description: `User-selected location: ${result.name}, ${result.city}`,
      type: 'custom',
      defaultWaypoints: [
        {
          label: 'A',
          name: `${result.name} - Inbound Freight Gate`,
          coordinates: [result.coordinates[0] - 0.01, result.coordinates[1] - 0.01],
          role: 'origin'
        },
        {
          label: 'B',
          name: `${result.name} - Logistics Hub Depot`,
          coordinates: [result.coordinates[0] + 0.01, result.coordinates[1] + 0.01],
          role: 'destination'
        }
      ]
    };
    onSelectCity(customCity);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen(!isOpen)}
        className="glass-panel py-2 px-3.5 rounded-xl flex items-center gap-2.5 text-left border border-white/10 hover:border-cyan-400/50 transition-colors shadow-lg"
      >
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
          <Globe2 className="w-4 h-4 animate-spin-slow" />
        </div>
        <div>
          <div className="text-[10px] uppercase font-mono tracking-wider text-cyan-400 flex items-center gap-1">
            <span>ACTIVE FREIGHT HUB</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          </div>
          <div className="text-sm font-semibold text-white truncate max-w-[190px]">
            {selectedCity.name}
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ml-1 ${isOpen ? 'rotate-180 text-cyan-400' : ''}`} />
      </motion.button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="absolute top-full left-0 mt-2 w-84 glass-panel rounded-2xl p-3 z-50 border border-white/15 shadow-2xl overflow-hidden backdrop-blur-xl"
          >
            {/* Search Input for ANY city */}
            <div className="relative mb-3">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search any city or port globally..."
                className="w-full bg-cyber-900/90 border border-white/10 rounded-xl pl-8.5 pr-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 transition-colors"
                autoFocus
              />
              {isSearching && (
                <div className="w-3.5 h-3.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin absolute right-3 top-1/2 -translate-y-1/2"></div>
              )}
            </div>

            {/* Search Results (if querying) */}
            {searchQuery.trim().length >= 2 ? (
              <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                <div className="text-[10px] font-mono uppercase text-slate-400 px-2 py-1">
                  Global Search Results
                </div>
                {searchResults.length === 0 && !isSearching && (
                  <div className="text-xs text-slate-400 px-3 py-3 text-center">
                    No matching cities found. Try another city or port.
                  </div>
                )}
                {searchResults.map((result, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectSearchResult(result)}
                    className="w-full text-left p-2 rounded-lg hover:bg-cyan-500/10 hover:border-cyan-500/30 border border-transparent flex items-center gap-2.5 transition-all group"
                  >
                    <MapPin className="w-4 h-4 text-cyan-400 shrink-0 group-hover:scale-110 transition-transform" />
                    <div className="truncate">
                      <div className="text-xs font-medium text-white truncate">{result.name}</div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {[result.city, result.country].filter(Boolean).join(', ')}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              /* Preset Hubs */
              <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 px-2 py-1 flex items-center gap-1.5">
                  <Building2 className="w-3 h-3 text-cyan-400" />
                  <span>MMLP & Container Hub Presets</span>
                </div>
                {PRESET_CITIES.map((city) => {
                  const isSelected = selectedCity.id === city.id;
                  return (
                    <button
                      key={city.id}
                      onClick={() => {
                        onSelectCity(city);
                        setIsOpen(false);
                      }}
                      className={`w-full text-left p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                        isSelected
                          ? 'bg-cyan-500/15 border-cyan-500/40 text-white shadow-inner'
                          : 'border-transparent hover:bg-white/5 text-slate-300 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <div
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            isSelected ? 'bg-cyan-400 shadow-[0_0_8px_#00f2fe]' : 'bg-slate-600'
                          }`}
                        />
                        <div className="truncate">
                          <div className="text-xs font-medium text-white truncate">{city.name}</div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {city.state}, {city.country} • {city.type.toUpperCase()}
                          </div>
                        </div>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
