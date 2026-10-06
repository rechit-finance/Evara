import React from 'react';
import { Users, Battery, Heart, Target, Cpu, Zap, ArrowRight, Train, Clock, Globe } from 'lucide-react';
import { Character, Location, WorldState, getLocalTime } from '../types/world';

interface CharacterRosterProps {
  characters: Character[];
  locations: Location[];
  worldState?: WorldState;
  onInspectCharacter: (char: Character) => void;
  onFilterByCharacter: (charId: string | null) => void;
  activeCharacterFilterId: string | null;
}

export const CharacterRoster: React.FC<CharacterRosterProps> = ({
  characters,
  locations,
  worldState,
  onInspectCharacter,
  onFilterByCharacter,
  activeCharacterFilterId,
}) => {
  const getLocationName = (locId: string) => {
    return locations.find((l) => l.id === locId)?.name || locId;
  };

  const getStatusBadge = (char: Character) => {
    switch (char.status) {
      case 'in_transit':
        return (
          <span className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-950/90 text-amber-300 border border-amber-700/80">
            <Train className="w-3 h-3 text-amber-400 animate-pulse" />
            <span>In Physical Transit</span>
          </span>
        );
      case 'quota_sleeping':
        return (
          <span className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-rose-950/80 text-rose-300 border border-rose-800/80">
            <Zap className="w-3 h-3 text-rose-400" />
            <span>Sleeping (Quota Reached)</span>
          </span>
        );
      case 'sleeping':
      case 'resting':
        return (
          <span className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-indigo-950/80 text-indigo-300 border border-indigo-800/80">
            <span>Resting</span>
          </span>
        );
      case 'talking':
        return (
          <span className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-sky-950/80 text-sky-300 border border-sky-800/80">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
            <span>Conversing</span>
          </span>
        );
      case 'working':
        return (
          <span className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-800/80">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            <span>Working</span>
          </span>
        );
      case 'thinking':
        return (
          <span className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>Deliberating...</span>
          </span>
        );
      case 'awake':
      default:
        return (
          <span className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800/80">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>Stationed</span>
          </span>
        );
    }
  };

  return (
    <div className="theme-surface border theme-border rounded-2xl p-4 flex flex-col h-full shadow-lg transition-colors duration-250">
      <div className="flex items-center justify-between pb-3 border-b theme-border">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 theme-accent-text" />
          <h2 className="text-sm font-semibold text-stone-200 tracking-wide uppercase font-mono">
            Living Roster ({characters.length})
          </h2>
        </div>
        {activeCharacterFilterId && (
          <button
            onClick={() => onFilterByCharacter(null)}
            className="text-xs theme-accent-text hover:brightness-125 underline font-medium"
          >
            Clear Filter
          </button>
        )}
      </div>

      <div className="space-y-3 mt-3 overflow-y-auto max-h-[720px] pr-1">
        {characters.map((char) => {
          const isFiltered = activeCharacterFilterId === char.id;
          const charLoc = locations.find((l) => l.id === char.locationId);
          const charLocalTime = worldState && charLoc ? getLocalTime(worldState.hour, worldState.minute, charLoc.timezoneOffset) : null;
          const quotaPercent = Math.min(
            100,
            Math.round(((char.brainConfig.quotaUsed || 0) / (char.brainConfig.quotaLimit || 20)) * 100)
          );

          return (
            <div
              key={char.id}
              onClick={() => onInspectCharacter(char)}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer relative ${
                isFiltered
                  ? 'theme-card theme-card-selected'
                  : 'theme-card'
              }`}
            >
              {/* Header row */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-stone-950 shrink-0 shadow-sm"
                    style={{ backgroundColor: char.avatarColor }}
                  >
                    {char.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-stone-100 flex items-center gap-1.5">
                      <span>{char.name}</span>
                    </h3>
                    <p className="text-[11px] text-stone-400">{char.title}</p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  {getStatusBadge(char)}
                  <span className="text-[10px] text-stone-400 font-mono text-right">
                    📍 {charLoc?.name || getLocationName(char.locationId)}
                    {charLocalTime && (
                      <span className="block text-[9px] theme-accent-text">
                        🕒 {charLocalTime.formatted} ({charLoc?.timezoneName})
                      </span>
                    )}
                  </span>
                </div>
              </div>

              {/* In Transit Progress Indicator if traveling */}
              {char.status === 'in_transit' && char.transit && (
                <div className="mt-2.5 p-2 rounded-lg theme-inner border border-amber-800/60 text-xs space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-mono text-amber-300">
                    <span className="flex items-center gap-1 font-bold">
                      <Train className="w-3 h-3 text-amber-400" />
                      <span>{char.transit.originLocationName} ➔ {char.transit.destinationLocationName}</span>
                    </span>
                    <span>
                      {Math.round(((char.transit.totalTicks - char.transit.remainingTicks) / char.transit.totalTicks) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-stone-900 rounded-full h-1 overflow-hidden border theme-border">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all"
                      style={{
                        width: `${Math.round(
                          ((char.transit.totalTicks - char.transit.remainingTicks) / char.transit.totalTicks) * 100
                        )}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[9px] text-stone-400 font-mono">
                    <span>{char.transit.distanceKm} km total</span>
                    <span>~{char.transit.remainingTicks * 10} min remaining</span>
                  </div>
                </div>
              )}

              {/* Current Action */}
              <div className="mt-2.5 text-xs text-stone-300 theme-inner p-2 rounded-lg border theme-border">
                <span className="font-semibold text-stone-400 text-[10px] uppercase font-mono block mb-0.5">
                  Current Activity:
                </span>
                <p className="line-clamp-2 leading-relaxed">{char.currentAction}</p>
              </div>

              {/* Internal Monologue */}
              {char.internalMonologue && (
                <div className="mt-2 text-xs italic text-stone-400 pl-2 border-l-2 theme-border">
                  "{char.internalMonologue}"
                </div>
              )}

              {/* Vital Stat Gauges: Energy, Social, Purpose */}
              <div className="grid grid-cols-3 gap-2 mt-3 pt-2.5 border-t theme-border text-[10px] font-mono">
                {/* Energy */}
                <div>
                  <div className="flex items-center justify-between text-stone-400 mb-0.5">
                    <span className="flex items-center gap-1">
                      <Battery className="w-2.5 h-2.5 text-emerald-400" />
                      <span>NRG</span>
                    </span>
                    <span className="font-bold text-stone-300">{char.energy}%</span>
                  </div>
                  <div className="w-full bg-stone-800 rounded-full h-1 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        char.energy > 40 ? 'bg-emerald-500' : char.energy > 15 ? 'bg-amber-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${char.energy}%` }}
                    />
                  </div>
                </div>

                {/* Social */}
                <div>
                  <div className="flex items-center justify-between text-stone-400 mb-0.5">
                    <span className="flex items-center gap-1">
                      <Heart className="w-2.5 h-2.5 text-rose-400" />
                      <span>SOC</span>
                    </span>
                    <span className="font-bold text-stone-300">{char.social}%</span>
                  </div>
                  <div className="w-full bg-stone-800 rounded-full h-1 overflow-hidden">
                    <div
                      className="h-full bg-rose-500 rounded-full transition-all"
                      style={{ width: `${char.social}%` }}
                    />
                  </div>
                </div>

                {/* Purpose */}
                <div>
                  <div className="flex items-center justify-between text-stone-400 mb-0.5">
                    <span className="flex items-center gap-1">
                      <Target className="w-2.5 h-2.5 text-sky-400" />
                      <span>PUR</span>
                    </span>
                    <span className="font-bold text-stone-300">{char.purpose}%</span>
                  </div>
                  <div className="w-full bg-stone-800 rounded-full h-1 overflow-hidden">
                    <div
                      className="h-full bg-sky-500 rounded-full transition-all"
                      style={{ width: `${char.purpose}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* AI Brain & Quota Info */}
              <div className="mt-2.5 pt-2 border-t theme-border flex items-center justify-between text-[10px] text-stone-400">
                <span className="flex items-center gap-1 font-mono text-stone-400">
                  <Cpu className="w-3 h-3 theme-accent-text" />
                  <span>{char.brainConfig.modelName}</span>
                </span>

                <div className="flex items-center gap-1.5 font-mono">
                  <span>Quota: {char.brainConfig.quotaUsed}/{char.brainConfig.quotaLimit}</span>
                  <div className="w-12 bg-stone-800 rounded-full h-1 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        quotaPercent >= 100 ? 'bg-rose-500' : quotaPercent > 70 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${quotaPercent}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Footer action to inspect */}
              <div className="mt-2 flex items-center justify-end">
                <span className="text-[11px] theme-accent-text hover:brightness-125 flex items-center gap-1 font-medium">
                  <span>Inspect Memories & Bonds</span>
                  <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
