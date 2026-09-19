import { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useTutorial } from '../context/TutorialContext';
import { useToast } from '../context/ToastContext';
import { fetchUserSettings, updateUserSettings } from '../services/api';
import { Button } from '../components/ui/Button';
import {
  Sun, Moon, GraduationCap, Bell, Map, LogOut,
  RotateCcw, Save
} from 'lucide-react';

export default function SettingsPage() {
  const { isDark, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const { isTutorialOn, toggleTutorial, startTour } = useTutorial();
  const { showToast } = useToast();

  const [saving, setSaving] = useState(false);
  const [notificationSms, setNotificationSms] = useState(true);
  const [notificationPush, setNotificationPush] = useState(true);
  const [notificationInApp, setNotificationInApp] = useState(true);
  const [defaultMapMode, setDefaultMapMode] = useState('roadmap');
  const [defaultZoom, setDefaultZoom] = useState('12');
  const [units, setUnits] = useState('metric');

  useEffect(() => {
    fetchUserSettings().then(data => {
      if (data) {
        if (data.theme === 'dark' && !isDark) toggleTheme();
        if (data.theme === 'light' && isDark) toggleTheme();
        const serverTutorialOn = data.tutorial_enabled !== 'false';
        if (serverTutorialOn !== isTutorialOn) toggleTutorial();
        setNotificationSms(data.notification_sms !== 'false');
        setNotificationPush(data.notification_push !== 'false');
        setNotificationInApp(data.notification_inapp !== 'false');
        if (data.default_map_mode) setDefaultMapMode(data.default_map_mode);
        if (data.default_zoom) setDefaultZoom(data.default_zoom);
        if (data.units) setUnits(data.units);
      }
    }).catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateUserSettings({
        theme: isDark ? 'dark' : 'light',
        tutorial_enabled: isTutorialOn ? 'true' : 'false',
        notification_sms: notificationSms ? 'true' : 'false',
        notification_push: notificationPush ? 'true' : 'false',
        notification_inapp: notificationInApp ? 'true' : 'false',
        default_map_mode: defaultMapMode,
        default_zoom: defaultZoom,
        units
      });
      showToast({
        type: 'success',
        title: 'Settings Saved',
        message: 'Your console preferences have been synchronized with the cloud.'
      });
    } catch {
      showToast({
        type: 'error',
        title: 'Save Failed',
        message: 'Could not sync settings to cloud. Local changes preserved.'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleResetTutorials = () => {
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith('logisync-tour-seen-') || k.startsWith('logisync-hint-dismissed-') || k === 'logisync-welcome-seen') {
        localStorage.removeItem(k);
      }
    });
    showToast({
      type: 'info',
      title: 'Tutorials Reset',
      message: 'Interactive walkthroughs will now prompt again on each page.'
    });
    startTour('settings');
  };

  return (
    <div className="h-full flex flex-col overflow-y-auto p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/40 dark:border-white/10">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white chroma-text">
            Console Preferences & System Config
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Personalize your terminal workspace, guided assistance, and AWS service integrations.
          </p>
        </div>
        <Button variant="primary" onClick={handleSave} isLoading={saving} icon={<Save className="w-4 h-4" />}>
          Save Preferences
        </Button>
      </div>

      <div id="tutorial-settings-form" className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Appearance & Theming */}
        <div className="p-6 rounded-3xl liquid-glass border border-white/70 dark:border-white/15 neu-flat-sm space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-white/40 dark:border-white/10">
            {isDark ? <Moon className="w-5 h-5 text-cyan-400" /> : <Sun className="w-5 h-5 text-amber-500" />}
            <h3 className="text-sm font-black text-slate-900 dark:text-white">Appearance & Theming</h3>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-100">Dark Command Center Mode</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Cyber neon accents on midnight navy canvas</div>
            </div>
            <Button size="sm" variant="secondary" onClick={toggleTheme}>
              {isDark ? 'Switch to Light' : 'Switch to Dark'}
            </Button>
          </div>
        </div>

        {/* Interactive Guided Assistance */}
        <div className="p-6 rounded-3xl liquid-glass border border-white/70 dark:border-white/15 neu-flat-sm space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-white/40 dark:border-white/10">
            <GraduationCap className="w-5 h-5 text-cyan-500" />
            <h3 className="text-sm font-black text-slate-900 dark:text-white">Tutorial & Onboarding</h3>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-100">Interactive Tutorial System</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Step-by-step spotlights and passive helper hints</div>
            </div>
            <button
              onClick={toggleTutorial}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                isTutorialOn ? 'bg-cyan-500 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-white shadow-md transform transition-transform" />
            </button>
          </div>
          <div className="pt-2">
            <Button size="sm" variant="ghost" onClick={handleResetTutorials} icon={<RotateCcw className="w-3.5 h-3.5" />}>
              Replay All Page Walkthroughs
            </Button>
          </div>
        </div>

        {/* Notifications & Dispatch Alerts */}
        <div className="p-6 rounded-3xl liquid-glass border border-white/70 dark:border-white/15 neu-flat-sm space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-white/40 dark:border-white/10">
            <Bell className="w-5 h-5 text-amber-500" />
            <h3 className="text-sm font-black text-slate-900 dark:text-white">Alert Dispatch Channels</h3>
          </div>
          <div className="space-y-3">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">SMS Driver Alerts (AWS SNS)</span>
              <input
                type="checkbox"
                checked={notificationSms}
                onChange={e => setNotificationSms(e.target.checked)}
                className="w-4 h-4 accent-cyan-500 rounded"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Push Browser Notifications</span>
              <input
                type="checkbox"
                checked={notificationPush}
                onChange={e => setNotificationPush(e.target.checked)}
                className="w-4 h-4 accent-cyan-500 rounded"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">In-App HUD Toasts</span>
              <input
                type="checkbox"
                checked={notificationInApp}
                onChange={e => setNotificationInApp(e.target.checked)}
                className="w-4 h-4 accent-cyan-500 rounded"
              />
            </label>
          </div>
        </div>

        {/* GIS & Telematics Defaults */}
        <div className="p-6 rounded-3xl liquid-glass border border-white/70 dark:border-white/15 neu-flat-sm space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-white/40 dark:border-white/10">
            <Map className="w-5 h-5 text-emerald-500" />
            <h3 className="text-sm font-black text-slate-900 dark:text-white">GIS & Measurement Units</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Default Map Layer</span>
              <select
                value={defaultMapMode}
                onChange={e => setDefaultMapMode(e.target.value)}
                className="text-xs font-semibold p-1.5 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-white/60 dark:border-white/10"
              >
                <option value="roadmap">Cyber Dark / Bright Vector</option>
                <option value="satellite">ESRI Satellite World Imagery</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Velocity & Fuel Units</span>
              <select
                value={units}
                onChange={e => setUnits(e.target.value)}
                className="text-xs font-semibold p-1.5 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-white/60 dark:border-white/10"
              >
                <option value="metric">Metric (km/h, Litres, kg CO2)</option>
                <option value="imperial">Imperial (mph, Gallons, lbs CO2)</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <label htmlFor="default-zoom" className="text-xs font-bold text-slate-800 dark:text-slate-200">Default Map Zoom</label>
              <input id="default-zoom" type="number" min="8" max="18" value={defaultZoom} onChange={e => setDefaultZoom(e.target.value)} className="w-16 text-xs font-semibold p-1.5 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-white/60 dark:border-white/10" />
            </div>
          </div>
        </div>
      </div>

      {/* Security & Active Session */}
      <div className="p-6 rounded-3xl liquid-glass border border-white/70 dark:border-white/15 neu-flat-sm flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-400 to-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-md">
            {user?.name?.slice(0, 2) || 'KG'}
          </div>
          <div>
            <div className="text-sm font-black text-slate-900 dark:text-white">
              {user?.name || 'Karanesh G.'}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {user?.email || 'admin@vocport.gov.in'} • <span className="font-bold text-cyan-600 dark:text-cyan-400 uppercase">{user?.role || 'Port Admin'}</span>
            </div>
          </div>
        </div>
        <Button variant="danger" onClick={logout} icon={<LogOut className="w-4 h-4" />}>
          Sign Out of Terminal
        </Button>
      </div>
    </div>
  );
}
