import React, { useState, useRef, useEffect } from 'react';
import { Search, MapPin, Globe, Loader2, X } from 'lucide-react';
import type { City } from '../types/logistics';
import { PRESET_CITIES } from '../services/api';

interface GlobalCitySearchProps {
  selectedCity: City;
  onSelectCity: (city: City) => void;
}

export const GlobalCitySearch: React.FC<GlobalCitySearchProps> = ({
  selectedCity,
  onSelectCity,
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<City[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced global search
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      setIsLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        // First match presets
        const lowerQ = query.toLowerCase();
        const matchedPresets = PRESET_CITIES.filter(
          (c) =>
            c.name.toLowerCase().includes(lowerQ) ||
            c.state.toLowerCase().includes(lowerQ) ||
            c.id.toLowerCase().includes(lowerQ)
        );

        // Fetch from Nominatim geocoding API for any city worldwide
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
            query
          )}&format=json&limit=5&addressdetails=1`,
          { headers: { 'User-Agent': 'LogiSync-Fleet-Dispatcher/6.0' } }
        );
        const data = await res.json();

        const externalCities: City[] = (data || []).map((item: any) => {
          const lon = parseFloat(item.lon);
          const lat = parseFloat(item.lat);
          return {
            id: `custom-${item.place_id || Math.random()}`,
            name: item.display_name.split(',')[0] || item.name,
            state: item.address?.state || item.address?.country || '',
            country: item.address?.country || 'Global',
            center: [lon, lat],
            zoom: 13,
            description: item.display_name,
            type: 'custom',
            defaultWaypoints: [
              { label: 'A', name: `${item.name || 'City Center'} Terminal`, coordinates: [lon - 0.03, lat - 0.02], role: 'origin' },
              { label: 'B', name: `${item.name || 'Central'} Logistics Hub`, coordinates: [lon + 0.01, lat + 0.01], role: 'checkpoint' },
              { label: 'C', name: `${item.name || 'North'} Distribution Depot`, coordinates: [lon + 0.04, lat + 0.03], role: 'destination' },
            ],
          };
        });

        // Combine unique
        const combined = [...matchedPresets, ...externalCities];
        setSearchResults(combined);
      } catch (err) {
        console.warn('Geocoding search failed:', err);
      } finally {
        setIsLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div ref={containerRef} className="relative w-72 sm:w-80">
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={`Current: ${selectedCity.name.split('/')[0]} (Search any city...)`}
          className="w-full pl-9 pr-8 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-900 focus:bg-slate-900 border border-slate-700/80 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all backdrop-blur-md"
        />
        {query ? (
          <button
            onClick={() => {
              setQuery('');
              setSearchResults([]);
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : isLoading ? (
          <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin absolute right-2.5 top-1/2 -translate-y-1/2" />
        ) : null}
      </div>

      {/* Dropdown Results */}
      {isOpen && (
        <div className="absolute left-0 top-10 z-50 w-full max-h-72 overflow-y-auto rounded-2xl bg-slate-900/95 backdrop-blur-2xl border border-slate-700/80 shadow-2xl p-1.5 space-y-1">
          {/* Quick Presets header */}
          {!query && (
            <div>
              <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Major Logistics Hubs
              </div>
              {PRESET_CITIES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    onSelectCity(c);
                    setIsOpen(false);
                    setQuery('');
                  }}
                  className={`w-full px-2.5 py-1.5 rounded-xl text-left flex items-center justify-between text-xs transition-all ${
                    selectedCity.id === c.id
                      ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span className="truncate">{c.name}</span>
                  <span className="text-[10px] text-slate-500">{c.state}</span>
                </button>
              ))}
            </div>
          )}

          {/* Search results */}
          {query && searchResults.length > 0 && (
            <div>
              <div className="px-2.5 py-1 text-[10px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1">
                <Globe className="w-3 h-3" />
                Worldwide Cities & Ports
              </div>
              {searchResults.map((c, idx) => (
                <button
                  key={`${c.id}-${idx}`}
                  onClick={() => {
                    onSelectCity(c);
                    setIsOpen(false);
                    setQuery('');
                  }}
                  className="w-full px-2.5 py-2 rounded-xl text-left hover:bg-slate-800 text-slate-200 transition-all flex items-start gap-2"
                >
                  <MapPin className="w-3.5 h-3.5 text-cyan-400 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate">{c.name}</div>
                    <div className="text-[10px] text-slate-400 truncate">{c.description}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {query && !isLoading && searchResults.length === 0 && (
            <div className="p-3 text-center text-xs text-slate-400">
              No matching cities found. Try typing a major city name like "Mumbai", "Delhi", "Dubai", or "Tokyo".
            </div>
          )}
        </div>
      )}
    </div>
  );
};
