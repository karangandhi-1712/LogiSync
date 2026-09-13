import React, { useState, useEffect } from 'react';
import { PlusCircle, Search, QrCode, CheckCircle2 } from 'lucide-react';

interface LogisticsAppPanelProps {
  apiUrl: string;
}

export const LogisticsAppPanel: React.FC<LogisticsAppPanelProps> = ({ apiUrl }) => {
  const [activeTab, setActiveTab] = useState<'gate_passes' | 'containers' | 'docks'>('gate_passes');
  const [gatePasses, setGatePasses] = useState<any[]>([]);
  const [containers, setContainers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showNewPassModal, setShowNewPassModal] = useState<boolean>(false);
  const [newPassForm, setNewPassForm] = useState({
    truck_plate: 'TN-69-D-2041',
    driver_name: 'P. Shanmugam',
    driver_phone: '+91 94431 55678',
    container_no: 'MSKU-994102-1',
    cargo_name: 'Precision Engineering Castings',
    cargo_type: 'AUTO_PARTS',
    booked_weight_tonnes: 24.8,
    origin: 'Madurai Industrial Hub via SH-176',
    destination: 'MMLP Central Warehouse WH-01',
    pass_type: 'INBOUND_IMPORT'
  });
  const [passIssuedMessage, setPassIssuedMessage] = useState<string | null>(null);

  const fetchPassesAndContainers = async () => {
    try {
      const [passesRes, contsRes] = await Promise.all([
        fetch(`${apiUrl}/api/entities/gate-passes`).then(r => r.json()).catch(() => []),
        fetch(`${apiUrl}/api/entities/containers`).then(r => r.json()).catch(() => [])
      ]);
      setGatePasses(passesRes || []);
      setContainers(contsRes || []);
    } catch (err) {
      console.error('Error fetching logistics records:', err);
    }
  };

  useEffect(() => {
    fetchPassesAndContainers();
  }, [apiUrl]);

  const handleCreatePass = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${apiUrl}/api/entities/gate-passes/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPassForm)
      });
      const data = await res.json();
      setPassIssuedMessage(`Issued Gate Pass ${data.gate_pass?.pass_number} with QR Token ${data.gate_pass?.qr_token}`);
      setShowNewPassModal(false);
      fetchPassesAndContainers();
      setTimeout(() => setPassIssuedMessage(null), 5000);
    } catch (err) {
      console.error('Error issuing gate pass:', err);
    }
  };

  const filteredContainers = containers.filter(c => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.container_no?.toLowerCase().includes(q) ||
      c.cargo_type?.toLowerCase().includes(q) ||
      c.yard_block_id?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white tracking-tight">
              Logistics Terminal Operations & Gate Pass Management
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
              Active Logistics System
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Issue digital Gate Passes with QR verification, inspect container manifests, and manage warehouse dock bays.
          </p>
        </div>

        {/* Tab Controls & Actions */}
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-950/80 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('gate_passes')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'gate_passes'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Gate Passes ({gatePasses.length})
            </button>
            <button
              onClick={() => setActiveTab('containers')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'containers'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Container Inventory ({containers.length})
            </button>
          </div>

          <button
            onClick={() => setShowNewPassModal(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition flex items-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4" /> Issue Gate Pass
          </button>
        </div>
      </div>

      {passIssuedMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          {passIssuedMessage}
        </div>
      )}

      {/* Tab 1: Gate Passes Registry */}
      {activeTab === 'gate_passes' && (
        <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
          <div className="font-bold text-sm text-slate-200 mb-4 flex items-center justify-between">
            <span>Active Gate Passes & E-Waybill Registrations</span>
            <span className="text-xs text-slate-400 font-mono">ANPR & OCR FastTrack Enabled</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] font-mono">
                <tr>
                  <th className="p-3">Pass No</th>
                  <th className="p-3">Truck Plate</th>
                  <th className="p-3">Container No</th>
                  <th className="p-3">Driver Name</th>
                  <th className="p-3">Appointment Window</th>
                  <th className="p-3">Booked Wt</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">QR Token</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono">
                {gatePasses.map((gp) => (
                  <tr key={gp.id} className="hover:bg-slate-800/40">
                    <td className="p-3 font-bold text-white">{gp.pass_number}</td>
                    <td className="p-3 text-cyan-300">{gp.truck_plate}</td>
                    <td className="p-3 text-slate-200">{gp.container_id}</td>
                    <td className="p-3 text-slate-400 font-sans">{gp.driver_name}</td>
                    <td className="p-3 text-purple-300">{gp.appointment_window}</td>
                    <td className="p-3 text-emerald-400 font-bold">{gp.booked_weight_tonnes} t</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                        {gp.status}
                      </span>
                    </td>
                    <td className="p-3 text-slate-400 flex items-center gap-1 text-[10px]">
                      <QrCode className="w-3.5 h-3.5 text-slate-400" /> {gp.qr_token || 'QR-MMLP-8841'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Container Inventory Lookup */}
      {activeTab === 'containers' && (
        <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-3">
            <div className="font-bold text-sm text-slate-200">
              Terminal Container Inventory & 3D Slot Allocations
            </div>
            <div className="relative w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search container no, cargo, block..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-4 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredContainers.map((c) => (
              <div key={c.id} className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-white">{c.container_no || c.id}</span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-500/20 text-cyan-300">
                    {c.iso_type}
                  </span>
                </div>
                <div className="text-xs text-slate-300 font-medium truncate">
                  {c.cargo_description || c.cargo_type}
                </div>
                <div className="pt-2 border-t border-slate-800 text-[11px] font-mono space-y-1">
                  <div className="flex justify-between text-slate-400">
                    <span>3D Slot:</span>
                    <span className="text-purple-300 font-bold">{c.yard_block_id} B{c.bay} R{c.row} T{c.tier}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Gross Wt:</span>
                    <span className="text-emerald-400 font-bold">{c.gross_weight_tonnes} t</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Seal No:</span>
                    <span className="text-slate-300">{c.seal_number || 'SL-998234'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New Gate Pass Modal Form */}
      {showNewPassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-emerald-400" /> Issue New Digital Gate Pass
              </h3>
              <button onClick={() => setShowNewPassModal(false)} className="text-slate-400 hover:text-white text-xs">
                Cancel
              </button>
            </div>

            <form onSubmit={handleCreatePass} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Truck License Plate</label>
                  <input
                    type="text"
                    required
                    value={newPassForm.truck_plate}
                    onChange={(e) => setNewPassForm({ ...newPassForm, truck_plate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Container Number (ISO)</label>
                  <input
                    type="text"
                    required
                    value={newPassForm.container_no}
                    onChange={(e) => setNewPassForm({ ...newPassForm, container_no: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Driver Name</label>
                  <input
                    type="text"
                    required
                    value={newPassForm.driver_name}
                    onChange={(e) => setNewPassForm({ ...newPassForm, driver_name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Driver Phone</label>
                  <input
                    type="text"
                    required
                    value={newPassForm.driver_phone}
                    onChange={(e) => setNewPassForm({ ...newPassForm, driver_phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Cargo Description</label>
                  <input
                    type="text"
                    required
                    value={newPassForm.cargo_name}
                    onChange={(e) => setNewPassForm({ ...newPassForm, cargo_name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Booked Gross Weight (Tonnes)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={newPassForm.booked_weight_tonnes}
                    onChange={(e) => setNewPassForm({ ...newPassForm, booked_weight_tonnes: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Origin Location</label>
                  <input
                    type="text"
                    required
                    value={newPassForm.origin}
                    onChange={(e) => setNewPassForm({ ...newPassForm, origin: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Destination Facility</label>
                  <input
                    type="text"
                    required
                    value={newPassForm.destination}
                    onChange={(e) => setNewPassForm({ ...newPassForm, destination: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewPassModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg font-bold hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold shadow-lg shadow-emerald-600/30 transition"
                >
                  Issue Pass & Generate QR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
