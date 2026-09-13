import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  Plus,
  Trash2,
  Crosshair,
  Search,
  Route,
  Sparkles
} from 'lucide-react';
import type { Waypoint, City } from '../types/logistics';
import { searchLocations } from '../services/api';

interface WaypointManagerProps {
  waypoints: Waypoint[];
  onUpdateWaypoints: (waypoints: Waypoint[]) => void;
  onSelectMapPickStop: (stopId: string | null) => void;
  activeMapPickStopId: string | null;
  selectedCity: City;
  onCalculateRoute: () => void;
  isCalculating: boolean;
}

const WAYPOINT_COLORS: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  A: { bg: 'bg-emerald-500/20', border: 'border-emerald-500/50', text: 'text-emerald-400', glow: 'shadow-[0_0_12px_rgba(16,185,129,0.3)]' },
  B: { bg: 'bg-cyan-500/20', border: 'border-cyan-500/50', text: 'text-cyan-400', glow: 'shadow-[0_0_12px_rgba(0,242,254,0.3)]' },
  C: { bg: 'bg-blue-500/20', border: 'border-blue-500/50', text: 'text-blue-400', glow: 'shadow-[0_0_12px_rgba(59,130,246,0.3)]' },
  D: { bg: 'bg-purple-500/20', border: 'border-purple-500/50', text: 'text-purple-400', glow: 'shadow-[0_0_12px_rgba(168,85,247,0.3)]' },
  E: { bg: 'bg-rose-500/20', border: 'border-rose-500/50', text: 'text-rose-400', glow: 'shadow-[0_0_12px_rgba(244,63,94,0.3)]' },
};

export const WaypointManager: React.FC<WaypointManagerProps> = ({
  waypoints,
  onUpdateWaypoints,
  onSelectMapPickStop,
  activeMapPickStopId,
  selectedCity,
  onCalculateRoute,
  isCalculating,
}) => {
  const [editingStopId, setEditingStopId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Alphabet generator
  const getNextLabel = (index: number) => String.fromCharCode(65 + index); // 0 -> A, 1 -> B, etc.

  const handleAddStop = () => {
    if (waypoints.length >= 8) return;
    const nextIdx = waypoints.length;
    const nextLabel = getNextLabel(nextIdx);
    const lastCoord = waypoints[waypoints.length - 1]?.coordinates || selectedCity.center;

    // Offset slightly from last point
    const newCoord: [number, number] = [
      lastCoord[0] + (Math.random() - 0.5) * 0.03,
      lastCoord[1] + (Math.random() - 0.5) * 0.03
    ];

    const newWaypoint: Waypoint = {
      id: `wp-${Date.now()}`,
      label: nextLabel,
      name: `Waypoint ${nextLabel} (Transit Node)`,
      coordinates: newCoord,
      role: 'checkpoint'
    };

    onUpdateWaypoints([...waypoints, newWaypoint]);
  };

  const handleRemoveStop = (id: string) => {
    if (waypoints.length <= 2) return; // Keep minimum Origin & Destination
    const filtered = waypoints.filter(w => w.id !== id);
    // Relabel remaining waypoints A, B, C...
    const relabeled = filtered.map((w, idx) => ({
      ...w,
      label: getNextLabel(idx)
    }));
    onUpdateWaypoints(relabeled);
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= waypoints.length) return;

    const copy = [...waypoints];
    const temp = copy[index];
    copy[index] = copy[targetIdx];
    copy[targetIdx] = temp;

    // Relabel
    const relabeled = copy.map((w, idx) => ({
      ...w,
      label: getNextLabel(idx)
    }));
    onUpdateWaypoints(relabeled);
  };

  const handleSearchPlaces = async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const results = await searchLocations(query, selectedCity.bbox);
    setSearchResults(results);
  };

  const handleSelectPlace = (stopId: string, result: any) => {
    const updated = waypoints.map(w => {
      if (w.id === stopId) {
        return {
          ...w,
          name: result.name,
          coordinates: result.coordinates as [number, number],
          address: result.city ? `${result.city}, ${result.country}` : ''
        };
      }
      return w;
    });
    onUpdateWaypoints(updated);
    setEditingStopId(null);
    setSearchQuery('');
    setSearchResults([]);
  };

  return (
    <div className="glass-panel p-4 rounded-2xl flex flex-col gap-3 shadow-2xl border border-white/10">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Route className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white tracking-wide">Multi-Point Waypoints</h3>
            <p className="text-[11px] text-slate-400">Origin A to Destination ({getNextLabel(waypoints.length - 1)})</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
            {waypoints.length} STOPS
          </span>
        </div>
      </div>

      {/* Active Pin Pick Prompt */}
      {activeMapPickStopId && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-between text-amber-300 text-xs"
        >
          <div className="flex items-center gap-2">
            <Crosshair className="w-4 h-4 animate-spin-slow text-amber-400" />
            <span>Click any road or terminal on the map to set coordinate</span>
          </div>
          <button
            onClick={() => onSelectMapPickStop(null)}
            className="text-[10px] uppercase font-bold underline hover:text-white"
          >
            Cancel
          </button>
        </motion.div>
      )}

      {/* Waypoint List */}
      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
        <AnimatePresence>
          {waypoints.map((wp, idx) => {
            const colorStyle = WAYPOINT_COLORS[wp.label] || {
              bg: 'bg-slate-500/20',
              border: 'border-slate-500/50',
              text: 'text-slate-300',
              glow: ''
            };
            const isPickingOnMap = activeMapPickStopId === wp.id;
            const isEditing = editingStopId === wp.id;

            return (
              <motion.div
                key={wp.id}
                layout
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, height: 0 }}
                transition={{ duration: 0.2 }}
                className={`p-2.5 rounded-xl border transition-all ${
                  isPickingOnMap
                    ? 'bg-amber-500/10 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                    : 'bg-cyber-900/80 border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  {/* Waypoint Letter Badge */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-lg ${colorStyle.bg} ${colorStyle.border} ${colorStyle.text} ${colorStyle.glow} border flex items-center justify-center font-bold text-xs shrink-0 font-mono shadow-md`}
                    >
                      {wp.label}
                    </div>

                    {/* Name & Coordinates */}
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white truncate max-w-[150px]">
                        {wp.name}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 truncate">
                        {wp.coordinates[1].toFixed(4)}°N, {wp.coordinates[0].toFixed(4)}°E
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Search address button */}
                    <button
                      title="Search place inside city"
                      onClick={() => {
                        setEditingStopId(isEditing ? null : wp.id);
                        setSearchQuery('');
                        setSearchResults([]);
                      }}
                      className={`p-1.5 rounded-lg border text-xs transition-colors ${
                        isEditing
                          ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                          : 'border-transparent hover:bg-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      <Search className="w-3.5 h-3.5" />
                    </button>

                    {/* Pick on Map button */}
                    <button
                      title="Click on map to position this stop"
                      onClick={() => onSelectMapPickStop(isPickingOnMap ? null : wp.id)}
                      className={`p-1.5 rounded-lg border text-xs transition-colors ${
                        isPickingOnMap
                          ? 'bg-amber-500/30 border-amber-500 text-amber-300'
                          : 'border-transparent hover:bg-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      <Crosshair className="w-3.5 h-3.5" />
                    </button>

                    {/* Move Up/Down buttons */}
                    <div className="flex flex-col">
                      <button
                        disabled={idx === 0}
                        onClick={() => handleMove(idx, 'up')}
                        className="text-[9px] text-slate-500 hover:text-white disabled:opacity-20 px-1"
                      >
                        ▲
                      </button>
                      <button
                        disabled={idx === waypoints.length - 1}
                        onClick={() => handleMove(idx, 'down')}
                        className="text-[9px] text-slate-500 hover:text-white disabled:opacity-20 px-1"
                      >
                        ▼
                      </button>
                    </div>

                    {/* Remove button (if >2 stops) */}
                    {waypoints.length > 2 && (
                      <button
                        onClick={() => handleRemoveStop(wp.id)}
                        className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors ml-0.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline Search Modal for Stop */}
                <AnimatePresence>
                  {isEditing && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-2.5 pt-2.5 border-t border-white/10"
                    >
                      <div className="relative">
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => handleSearchPlaces(e.target.value)}
                          placeholder={`Search location for Point ${wp.label}...`}
                          className="w-full bg-cyber-950 border border-cyan-500/40 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                          autoFocus
                        />
                      </div>

                      {searchResults.length > 0 && (
                        <div className="mt-1.5 space-y-1 max-h-36 overflow-y-auto pr-1">
                          {searchResults.map((res, sIdx) => (
                            <button
                              key={sIdx}
                              onClick={() => handleSelectPlace(wp.id, res)}
                              className="w-full text-left p-1.5 rounded bg-cyber-800/80 hover:bg-cyan-500/20 text-slate-200 hover:text-white text-[11px] truncate flex items-center gap-1.5"
                            >
                              <MapPin className="w-3 h-3 text-cyan-400 shrink-0" />
                              <span className="truncate">{res.name} {res.city ? `(${res.city})` : ''}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Buttons: Add Stop & Recalculate Route */}
      <div className="flex items-center gap-2 pt-1">
        {waypoints.length < 8 && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleAddStop}
            className="flex-1 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-slate-300 hover:text-white flex items-center justify-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-cyan-400" />
            <span>Add Waypoint ({getNextLabel(waypoints.length)})</span>
          </motion.button>
        )}

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onCalculateRoute}
          disabled={isCalculating}
          className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-semibold text-xs flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(0,242,254,0.3)] transition-all disabled:opacity-50"
        >
          {isCalculating ? (
            <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <Sparkles className="w-3.5 h-3.5" />
          )}
          <span>Dispatch & Route</span>
        </motion.button>
      </div>
    </div>
  );
};
