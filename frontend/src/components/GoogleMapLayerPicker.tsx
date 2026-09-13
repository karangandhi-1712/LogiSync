import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, Map as MapIcon, Key, Check, X } from 'lucide-react';

export type MapTileStyle = 'google_roadmap' | 'google_hybrid' | 'google_terrain' | 'carto_dark' | 'carto_light';

interface GoogleMapLayerPickerProps {
  currentStyle: MapTileStyle;
  onSelectStyle: (style: MapTileStyle) => void;
  apiKey: string;
  onSaveApiKey: (key: string) => void;
}

export const GoogleMapLayerPicker: React.FC<GoogleMapLayerPickerProps> = ({
  currentStyle,
  onSelectStyle,
  apiKey,
  onSaveApiKey,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [tempKey, setTempKey] = useState(apiKey);

  const OPTIONS: { id: MapTileStyle; label: string; icon: string; desc: string }[] = [
    { id: 'google_roadmap', label: 'Google Roadmap', icon: '🗺️', desc: 'Official Google Maps standard vector roads' },
    { id: 'google_hybrid', label: 'Google Satellite', icon: '🛰️', desc: 'Real-time satellite imagery with road labels' },
    { id: 'google_terrain', label: 'Google Terrain', icon: '⛰️', desc: 'Topographic contour & physical elevation' },
    { id: 'carto_dark', label: 'Cyber Dark (Night)', icon: '🌙', desc: 'High-contrast dark mode for night dispatch' },
    { id: 'carto_light', label: 'Studio Light', icon: '☀️', desc: 'Clean high-readability daylight cartography' },
  ];

  return (
    <div className="relative">
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        title="Map Tile Layers (Google Maps & Satellites)"
        className="px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white text-xs font-semibold backdrop-blur-md border border-slate-700/80 shadow-xl flex items-center gap-2 transition-all"
      >
        <Layers className="w-3.5 h-3.5 text-cyan-400" />
        <span className="hidden sm:inline">Map Layers</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono">
          {currentStyle.startsWith('google') ? 'Google' : 'CARTO'}
        </span>
      </button>

      {/* Layer Picker Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            className="absolute right-0 top-11 z-50 w-72 p-2.5 rounded-2xl bg-slate-900/95 backdrop-blur-2xl border border-slate-700/80 shadow-2xl space-y-1.5"
          >
            <div className="px-2 py-1 flex items-center justify-between border-b border-slate-800 mb-1">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <MapIcon className="w-3 h-3 text-cyan-400" />
                Select Basemap Engine
              </span>
              <button
                onClick={() => setShowKeyModal(true)}
                title="Configure Google Maps API Key"
                className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 hover:underline"
              >
                <Key className="w-3 h-3" />
                API Key
              </button>
            </div>

            {OPTIONS.map((opt) => {
              const active = currentStyle === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => {
                    onSelectStyle(opt.id);
                    setIsOpen(false);
                  }}
                  className={`w-full px-3 py-2 rounded-xl text-left flex items-start gap-2.5 transition-all ${
                    active
                      ? 'bg-cyan-500/20 border border-cyan-500/40 text-white'
                      : 'hover:bg-slate-800/80 text-slate-300 border border-transparent'
                  }`}
                >
                  <span className="text-base leading-none mt-0.5">{opt.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold flex items-center justify-between">
                      <span>{opt.label}</span>
                      {active && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">{opt.desc}</div>
                  </div>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Google Maps API Key Modal */}
      <AnimatePresence>
        {showKeyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md p-6 rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl text-slate-100"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                    <Key className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Google Maps API Configuration</h3>
                    <p className="text-[11px] text-slate-400">Optional: Enter your Google Cloud Platform key</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowKeyModal(false)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-300 mb-3 leading-relaxed">
                LogiSync renders Google Maps tiles automatically. If you have an official Google Cloud Platform account with the <strong>Maps JavaScript API</strong> or <strong>Places API</strong> enabled, paste it below to enable official client quota:
              </p>

              <div className="space-y-3 mb-5">
                <input
                  type="text"
                  value={tempKey}
                  onChange={(e) => setTempKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
                <div className="text-[10px] text-slate-400 bg-slate-800/50 p-2.5 rounded-xl border border-slate-700/50">
                  Tip: If left blank, LogiSync uses high-speed direct Google Maps hybrid raster tiles without requiring an API billing account.
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowKeyModal(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onSaveApiKey(tempKey);
                    setShowKeyModal(false);
                  }}
                  className="flex-1 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold shadow-lg shadow-cyan-500/20"
                >
                  Save API Key
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
