import React, { useState } from 'react';
import {
  Activity,
  MessageSquare,
  Footprints,
  Coffee,
  Zap,
  Globe,
  Sparkles,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Search,
} from 'lucide-react';
import { WorldEvent, WorldEventType } from '../types/world';

interface LiveChroniclesProps {
  events: WorldEvent[];
  selectedLocationId: string | null;
  selectedCharacterId: string | null;
  onClearLocationFilter: () => void;
  onClearCharacterFilter: () => void;
  onInspectCharacterById: (charId: string) => void;
}

export const LiveChronicles: React.FC<LiveChroniclesProps> = ({
  events,
  selectedLocationId,
  selectedCharacterId,
  onClearLocationFilter,
  onClearCharacterFilter,
  onInspectCharacterById,
}) => {
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<WorldEventType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedThoughts, setExpandedThoughts] = useState<Record<string, boolean>>({});

  const toggleThought = (id: string) => {
    setExpandedThoughts((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getEventIcon = (type: WorldEventType) => {
    switch (type) {
      case 'dialogue':
        return <MessageSquare className="w-3.5 h-3.5 text-sky-400" />;
      case 'move':
        return <Footprints className="w-3.5 h-3.5 text-amber-400" />;
      case 'rest':
        return <Coffee className="w-3.5 h-3.5 text-indigo-400" />;
      case 'quota_sleep':
        return <Zap className="w-3.5 h-3.5 text-rose-400" />;
      case 'reflection':
        return <Sparkles className="w-3.5 h-3.5 text-purple-400" />;
      case 'environmental':
        return <Globe className="w-3.5 h-3.5 text-emerald-400" />;
      case 'action':
      default:
        return <Activity className="w-3.5 h-3.5 text-stone-300" />;
    }
  };

  // Filter events
  const filteredEvents = events.filter((evt) => {
    if (selectedLocationId && evt.locationId !== selectedLocationId) return false;
    if (selectedCharacterId && evt.characterId !== selectedCharacterId) return false;
    if (selectedTypeFilter !== 'all' && evt.type !== selectedTypeFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchDetails = evt.details.toLowerCase().includes(q);
      const matchHeadline = evt.headline.toLowerCase().includes(q);
      const matchName = evt.characterName?.toLowerCase().includes(q);
      const matchDialogue = evt.spokenDialogue?.toLowerCase().includes(q);
      if (!matchDetails && !matchHeadline && !matchName && !matchDialogue) return false;
    }
    return true;
  });

  return (
    <div className="theme-surface border theme-border rounded-2xl p-4 flex flex-col h-full shadow-lg transition-colors duration-250">
      {/* Header & Filter Controls */}
      <div className="pb-3 border-b theme-border space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 theme-accent-text" />
            <h2 className="text-sm font-semibold text-stone-200 tracking-wide uppercase font-mono">
              Live World Chronicles
            </h2>
          </div>
          <span className="text-xs font-mono text-stone-400">
            {filteredEvents.length} Events Logged
          </span>
        </div>

        {/* Active Filters Pill Bar */}
        {(selectedLocationId || selectedCharacterId) && (
          <div className="flex items-center gap-2 flex-wrap text-xs">
            {selectedLocationId && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full theme-badge border font-mono">
                <span>Location: {selectedLocationId}</span>
                <button
                  onClick={onClearLocationFilter}
                  className="hover:brightness-125 font-bold ml-1"
                >
                  ✕
                </button>
              </span>
            )}
            {selectedCharacterId && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full theme-badge border font-mono">
                <span>Character: {selectedCharacterId}</span>
                <button
                  onClick={onClearCharacterFilter}
                  className="hover:brightness-125 font-bold ml-1"
                >
                  ✕
                </button>
              </span>
            )}
          </div>
        )}

        {/* Filter Toolbar */}
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-stone-500 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search narrative events, dialogue..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full theme-inner border theme-border text-stone-200 text-xs rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:border-stone-500 transition-colors"
            />
          </div>

          {/* Type Selectors */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'dialogue', label: 'Spoken' },
                { id: 'action', label: 'Actions' },
                { id: 'move', label: 'Moves' },
                { id: 'quota_sleep', label: 'Quota' },
              ] as const
            ).map((filter) => (
              <button
                key={filter.id}
                onClick={() => setSelectedTypeFilter(filter.id)}
                className={`px-2 py-1 text-[11px] rounded-md font-mono whitespace-nowrap transition-colors ${
                  selectedTypeFilter === filter.id
                    ? 'theme-badge border font-semibold'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-white/5'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Events Stream */}
      <div className="space-y-3 mt-3 overflow-y-auto max-h-[640px] pr-1">
        {filteredEvents.length === 0 ? (
          <div className="py-12 text-center text-stone-500 text-xs italic">
            No events match the current filter criteria.
          </div>
        ) : (
          filteredEvents.map((evt) => {
            const hasThoughts = !!evt.internalThought;
            const isThoughtOpen = !!expandedThoughts[evt.id];

            return (
              <div
                key={evt.id}
                className={`p-3.5 rounded-xl border transition-all text-xs ${
                  evt.type === 'quota_sleep'
                    ? 'bg-rose-950/30 border-rose-900/50'
                    : evt.type === 'dialogue'
                    ? 'bg-sky-950/30 border-sky-900/50'
                    : evt.type === 'environmental'
                    ? 'bg-amber-950/30 border-amber-900/50'
                    : 'theme-card'
                }`}
              >
                {/* Meta Row: Time, Location, Validation status */}
                <div className="flex items-center justify-between text-[11px] text-stone-400 font-mono mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 font-bold text-stone-300">
                      {getEventIcon(evt.type)}
                      <span>{evt.worldTime}</span>
                    </span>
                    {evt.localTime && (
                      <span className="theme-accent-text font-semibold">
                        • 🕒 {evt.localTime}
                      </span>
                    )}
                    <span>•</span>
                    <span className="text-stone-400 font-normal">
                      📍 {evt.locationName}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {evt.isValidated && (
                      <span
                        className="flex items-center gap-0.5 text-[10px] text-emerald-400/90 font-mono"
                        title="Validated by Simulation rules engine"
                      >
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span className="hidden sm:inline">Validated</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Actor & Headline */}
                <div className="mb-1">
                  {evt.characterName ? (
                    <button
                      onClick={() => evt.characterId && onInspectCharacterById(evt.characterId)}
                      className="font-bold text-stone-200 hover:theme-accent-text transition-colors inline-flex items-center gap-1"
                    >
                      <span>{evt.characterName}</span>
                    </button>
                  ) : null}
                  <span className="text-stone-300 ml-1 font-medium">{evt.headline}</span>
                </div>

                {/* Narrative Details */}
                <p className="text-stone-400 leading-relaxed mt-1">
                  {evt.details}
                </p>

                {/* Spoken Dialogue speech bubble if applicable */}
                {evt.spokenDialogue && (
                  <div className="mt-2.5 p-2 rounded-lg theme-inner border border-sky-800/40 text-sky-200 text-xs italic pl-3 relative shadow-inner">
                    <span className="text-sky-400 font-serif font-black text-sm absolute -left-1 -top-1">“</span>
                    <span>{evt.spokenDialogue}</span>
                  </div>
                )}

                {/* Internal Monologue Accordion */}
                {hasThoughts && (
                  <div className="mt-2 pt-1.5 border-t theme-border">
                    <button
                      onClick={() => toggleThought(evt.id)}
                      className="flex items-center gap-1 text-[11px] text-stone-500 hover:text-stone-300 font-mono transition-colors"
                    >
                      <span>Cognitive Monologue</span>
                      {isThoughtOpen ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                    </button>

                    {isThoughtOpen && (
                      <div className="mt-1.5 p-2 rounded-md theme-inner text-stone-400 italic text-[11px] border theme-border">
                        "{evt.internalThought}"
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
