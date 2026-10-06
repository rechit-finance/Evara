import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  StepForward,
  Clock,
  CloudSun,
  CloudRain,
  Moon,
  Sparkles,
  Plus,
  LogIn,
  LogOut,
  Radio,
  Zap,
  Palette,
} from 'lucide-react';
import { WorldState, WeatherType } from '../types/world';
import { auth, loginWithGoogle, logoutUser } from '../lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

interface HeaderProps {
  worldState: WorldState;
  onTogglePause: () => void;
  onStepTick: () => void;
  onSetSpeed: (speed: number) => void;
  onOpenCreateChar: () => void;
  onOpenTriggerEvent: () => void;
  onOpenThemeSelector: () => void;
  currentThemeName: string;
  awakeCount: number;
  totalCount: number;
  quotaSleepingCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  worldState,
  onTogglePause,
  onStepTick,
  onSetSpeed,
  onOpenCreateChar,
  onOpenTriggerEvent,
  onOpenThemeSelector,
  currentThemeName,
  awakeCount,
  totalCount,
  quotaSleepingCount,
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setCurrentUser(u);
    });
    return () => unsub();
  }, []);

  const getWeatherIcon = (weather: WeatherType) => {
    switch (weather) {
      case 'clear':
        return <CloudSun className="w-4 h-4 text-amber-400" />;
      case 'gentle_rain':
      case 'storm':
        return <CloudRain className="w-4 h-4 text-sky-400" />;
      case 'twilight':
      case 'golden_hour':
        return <Sparkles className="w-4 h-4 text-rose-400" />;
      case 'starry_night':
      default:
        return <Moon className="w-4 h-4 text-indigo-400" />;
    }
  };

  const getDaylightPhase = (hour: number) => {
    if (hour >= 5 && hour < 8) return 'Dawn';
    if (hour >= 8 && hour < 12) return 'Morning';
    if (hour >= 12 && hour < 17) return 'Afternoon';
    if (hour >= 17 && hour < 20) return 'Twilight';
    return 'Night';
  };

  const formattedTime = `${String(worldState.hour).padStart(2, '0')}:${String(worldState.minute).padStart(2, '0')}`;

  return (
    <header className="border-b theme-border theme-header sticky top-0 z-40 backdrop-blur-md px-4 py-3 sm:px-6 transition-colors duration-250">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Brand & World identity */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg theme-accent-bg flex items-center justify-center shadow-lg font-serif font-black text-xl tracking-tighter">
              E
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-serif font-bold text-stone-100 tracking-wide">
                  EVARA
                </h1>
                <span className="text-[10px] tracking-wider uppercase px-1.5 py-0.5 rounded font-mono theme-badge border">
                  Living World Sim
                </span>
              </div>
              <p className="text-xs text-stone-400">Autonomous character brains & persistent memories</p>
            </div>
          </div>

          {/* Quick mobile status */}
          <div className="md:hidden flex items-center gap-2">
            <span className="text-xs font-mono font-medium theme-accent-text">
              Day {worldState.day} • {formattedTime}
            </span>
          </div>
        </div>

        {/* Central World Clock & Atmospheric Bar */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-4 theme-inner border theme-border rounded-xl px-3 py-1.5 shadow-inner">
          {/* Clock */}
          <div className="flex items-center gap-2 pr-3 border-r theme-border">
            <Clock className="w-4 h-4 text-stone-400" />
            <div className="flex items-baseline gap-1.5">
              <span className="text-xs font-semibold uppercase text-stone-400 font-mono">Day {worldState.day}</span>
              <span className="text-sm font-bold text-stone-100 font-mono tracking-wider">{formattedTime}</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full theme-surface text-stone-300 font-medium">
              {getDaylightPhase(worldState.hour)}
            </span>
          </div>

          {/* Weather */}
          <div className="flex items-center gap-1.5 pr-3 border-r theme-border">
            {getWeatherIcon(worldState.weather)}
            <span className="text-xs text-stone-300 capitalize font-medium">
              {worldState.weather.replace('_', ' ')}
            </span>
          </div>

          {/* Inhabitants quick count */}
          <div className="flex items-center gap-2 text-xs text-stone-300">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>{awakeCount}/{totalCount} Awake</span>
            </span>
            {quotaSleepingCount > 0 && (
              <span className="flex items-center gap-1 theme-accent-text text-[11px] theme-inner border theme-border px-1.5 py-0.5 rounded">
                <Zap className="w-3 h-3" />
                <span>{quotaSleepingCount} Quota-Sleeping</span>
              </span>
            )}
          </div>
        </div>

        {/* World Controls & Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Sim Speed & Playback */}
          <div className="flex items-center theme-surface border theme-border rounded-lg p-0.5">
            <button
              onClick={onTogglePause}
              title={worldState.isPaused ? 'Resume Simulation' : 'Pause Simulation'}
              className={`p-1.5 rounded-md transition-colors ${
                worldState.isPaused
                  ? 'theme-accent-bg font-semibold'
                  : 'bg-emerald-600/90 text-stone-100 hover:bg-emerald-500'
              }`}
            >
              {worldState.isPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5 fill-current" />}
            </button>

            <button
              onClick={onStepTick}
              title="Advance 1 World Tick (+10 min)"
              className="p-1.5 text-stone-300 hover:text-stone-100 hover:bg-white/5 rounded-md transition-colors"
            >
              <StepForward className="w-3.5 h-3.5" />
            </button>

            <div className="flex items-center border-l theme-border ml-1 pl-1">
              {[1, 2, 5].map((spd) => (
                <button
                  key={spd}
                  onClick={() => onSetSpeed(spd)}
                  className={`px-1.5 py-0.5 text-[11px] font-mono rounded transition-colors ${
                    worldState.speed === spd
                      ? 'theme-card text-stone-100 font-bold'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>

          {/* UI Style / Theme */}
          <button
            onClick={onOpenThemeSelector}
            title={`Current Style: ${currentThemeName} - Click to customize aesthetic`}
            className="flex items-center gap-1.5 px-2.5 py-1.5 theme-surface hover:brightness-110 text-stone-300 hover:text-stone-100 border theme-border rounded-lg text-xs font-medium transition-all"
          >
            <Palette className="w-3.5 h-3.5 theme-accent-text" />
            <span className="hidden md:inline font-mono text-[11px]">{currentThemeName}</span>
          </button>

          {/* Trigger World Event */}
          <button
            onClick={onOpenTriggerEvent}
            title="Inject an external world event"
            className="flex items-center gap-1 px-2.5 py-1.5 theme-surface hover:brightness-110 text-stone-300 hover:text-stone-100 border theme-border rounded-lg text-xs font-medium transition-all"
          >
            <Radio className="w-3.5 h-3.5 theme-accent-text" />
            <span className="hidden sm:inline">Event</span>
          </button>

          {/* Create Character */}
          <button
            onClick={onOpenCreateChar}
            className="flex items-center gap-1.5 px-3 py-1.5 theme-accent-bg hover:brightness-110 font-semibold rounded-lg text-xs transition-all shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Connect Inhabitant</span>
          </button>

          {/* Auth status */}
          {currentUser ? (
            <button
              onClick={() => logoutUser()}
              title={`Signed in as ${currentUser.email || 'Supervisor'}`}
              className="flex items-center gap-1.5 px-2 py-1.5 bg-stone-900 border border-stone-800 hover:border-stone-700 text-stone-400 hover:text-stone-200 rounded-lg text-xs transition-colors"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span className="max-w-[70px] truncate">{currentUser.displayName || 'Synced'}</span>
              <LogOut className="w-3 h-3 text-stone-500 ml-0.5" />
            </button>
          ) : (
            <button
              onClick={async () => {
                await loginWithGoogle();
              }}
              title="Sign in with Google to sync state"
              className="flex items-center gap-1 px-2 py-1.5 bg-stone-900 border border-stone-800 hover:border-stone-700 text-stone-400 hover:text-stone-200 rounded-lg text-xs transition-colors"
            >
              <LogIn className="w-3.5 h-3.5 text-stone-400" />
              <span className="hidden sm:inline">Sync Cloud</span>
            </button>
          )}
        </div>
      </div>

      {/* Active World Event Banner if present */}
      {worldState.activeEvent && (
        <div className="mt-2.5 max-w-7xl mx-auto py-1 px-3 theme-inner border theme-border rounded-lg flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 truncate">
            <span className="uppercase text-[10px] font-mono tracking-wider font-semibold theme-badge px-1 py-0.5 rounded border">
              Active World Condition
            </span>
            <span className="font-medium truncate text-stone-200">{worldState.activeEvent}</span>
          </div>
          <span className="text-[10px] theme-accent-text font-mono ml-2 shrink-0">Inhabitants are responding</span>
        </div>
      )}
    </header>
  );
};
