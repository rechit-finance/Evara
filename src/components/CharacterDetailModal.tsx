import React, { useState } from 'react';
import {
  X,
  Battery,
  Heart,
  Target,
  Brain,
  Zap,
  BookOpen,
  Users,
  Compass,
  RefreshCw,
  Search,
} from 'lucide-react';
import { Character, Location, Memory, Relationship, getLocalTime } from '../types/world';
import { ScoredMemory } from '../simulation/memoryEngine';
import { evaraWorld } from '../simulation/worldEngine';

interface CharacterDetailModalProps {
  character: Character;
  locations: Location[];
  allCharacters: Character[];
  relationships: Relationship[];
  memories: Memory[];
  onClose: () => void;
  onRefreshData: () => void;
}

export const CharacterDetailModal: React.FC<CharacterDetailModalProps> = ({
  character,
  locations,
  allCharacters,
  relationships,
  memories,
  onClose,
  onRefreshData,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'memories' | 'relationships' | 'brain'>('overview');
  const [inspectorQuery, setInspectorQuery] = useState(character.currentGoal);
  const [simulatedScoredMemories, setSimulatedScoredMemories] = useState<ScoredMemory[] | null>(null);
  const [isScoring, setIsScoring] = useState(false);

  const currentLocation = locations.find((l) => l.id === character.locationId);
  const charRelationships = relationships.filter((r) => r.characterId === character.id);
  const charMemories = memories.filter((m) => m.characterId === character.id);

  // Test relevance scoring
  const handleTestRelevance = async () => {
    setIsScoring(true);
    const scored = await evaraWorld.getMemoryEngine().fetchRelevantMemories({
      characterId: character.id,
      currentTick: evaraWorld.getWorldState().tickCount,
      locationId: character.locationId,
      locationName: currentLocation?.name || character.locationId,
      presentCharacterIds: allCharacters
        .filter((c) => c.locationId === character.locationId && c.id !== character.id)
        .map((c) => c.id),
      presentCharacterNames: allCharacters
        .filter((c) => c.locationId === character.locationId && c.id !== character.id)
        .map((c) => c.name),
      currentGoal: inspectorQuery || character.currentGoal,
      activeWorldEvent: evaraWorld.getWorldState().activeEvent,
      limitCount: 5,
    });
    setSimulatedScoredMemories(scored);
    setIsScoring(false);
  };

  const handleWakeCharacter = () => {
    character.brainConfig.quotaUsed = 0;
    character.status = 'awake';
    character.sleepReason = undefined;
    character.currentAction = 'Recharged and alert. Resuming daily activities.';
    onRefreshData();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="theme-surface border theme-border rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden transition-colors duration-250">
        {/* Header with avatar color and close button */}
        <div className="p-4 sm:p-5 border-b theme-border theme-header flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg text-stone-950 shadow-md"
              style={{ backgroundColor: character.avatarColor }}
            >
              {character.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-stone-100">{character.name}</h2>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-stone-800 text-stone-300 border border-stone-700">
                  {character.status.replace('_', ' ')}
                </span>
              </div>
              <p className="text-xs text-stone-400">{character.title}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-stone-800 bg-stone-950/60 px-4 text-xs font-mono">
          {[
            { id: 'overview', label: 'Identity & Needs', icon: Compass },
            { id: 'memories', label: `Memories (${charMemories.length})`, icon: BookOpen },
            { id: 'relationships', label: `Bonds (${charRelationships.length})`, icon: Users },
            { id: 'brain', label: 'AI Brain & Quota', icon: Brain },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-4 py-3 border-b-2 font-medium transition-colors ${
                  isActive
                    ? 'border-amber-400 text-amber-300'
                    : 'border-transparent text-stone-400 hover:text-stone-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'overview' && (
            <div className="space-y-4 text-xs">
              {/* Backstory & Personality */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-stone-950/80 border border-stone-800">
                  <h4 className="text-[11px] font-mono uppercase text-stone-400 mb-1">
                    Origin & Backstory
                  </h4>
                  <p className="text-stone-300 leading-relaxed">{character.bio}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-stone-950/80 border border-stone-800">
                  <h4 className="text-[11px] font-mono uppercase text-stone-400 mb-1">
                    Personality Traits
                  </h4>
                  <p className="text-stone-300 leading-relaxed">{character.personality}</p>
                </div>
              </div>

              {/* Geographic Hub, Local Time & Transit Status */}
              <div className="p-3.5 rounded-xl bg-stone-950/80 border border-stone-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-stone-400">Geographic Hub:</span>
                  <span className="font-bold text-amber-300">
                    📍 {currentLocation?.name} ({currentLocation?.country}, {currentLocation?.region})
                  </span>
                </div>
                {currentLocation && (
                  <div className="flex items-center justify-between font-mono text-[11px]">
                    <span className="text-stone-400">Local Solar Time:</span>
                    <span className="font-bold theme-accent-text">
                      🕒 {getLocalTime(evaraWorld.getWorldState().hour, evaraWorld.getWorldState().minute, currentLocation.timezoneOffset).formatted} ({currentLocation.timezoneName}) • {getLocalTime(evaraWorld.getWorldState().hour, evaraWorld.getWorldState().minute, currentLocation.timezoneOffset).daylightPhase}
                    </span>
                  </div>
                )}
                {character.status === 'in_transit' && character.transit && (
                  <div className="p-2.5 rounded-lg theme-inner border border-amber-800/80 text-xs space-y-1">
                    <div className="flex items-center justify-between font-mono text-amber-300 font-bold">
                      <span>🚆 En Route: {character.transit.originLocationName} ➔ {character.transit.destinationLocationName}</span>
                      <span>{Math.round(((character.transit.totalTicks - character.transit.remainingTicks) / character.transit.totalTicks) * 100)}%</span>
                    </div>
                    <div className="text-[11px] text-stone-400 font-mono">
                      Transit Mode: {character.transit.transitType.replace(/_/g, ' ')} ({character.transit.distanceKm} km total • ~{character.transit.remainingTicks * 10} min remaining)
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="font-mono text-stone-400">Primary Goal:</span>
                  <span className="font-medium text-stone-200">{character.currentGoal}</span>
                </div>
                <div className="pt-2 border-t border-stone-800/80">
                  <span className="font-mono text-stone-400 block mb-1">Current Action:</span>
                  <p className="text-stone-300">{character.currentAction}</p>
                </div>
                {character.internalMonologue && (
                  <div className="p-2.5 rounded-lg bg-stone-900 border border-stone-800 italic text-stone-400">
                    "{character.internalMonologue}"
                  </div>
                )}
              </div>

              {/* Needs Gauges */}
              <div className="p-3.5 rounded-xl bg-stone-950/80 border border-stone-800">
                <h4 className="text-[11px] font-mono uppercase text-stone-400 mb-3">
                  Autonomous Needs & Drives
                </h4>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between font-mono mb-1 text-stone-300">
                      <span className="flex items-center gap-1.5">
                        <Battery className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Energy (Physical Endurance)</span>
                      </span>
                      <span>{character.energy}%</span>
                    </div>
                    <div className="w-full bg-stone-800 rounded-full h-2">
                      <div
                        className="bg-emerald-500 h-2 rounded-full transition-all"
                        style={{ width: `${character.energy}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between font-mono mb-1 text-stone-300">
                      <span className="flex items-center gap-1.5">
                        <Heart className="w-3.5 h-3.5 text-rose-400" />
                        <span>Social Fulfillment (Connection)</span>
                      </span>
                      <span>{character.social}%</span>
                    </div>
                    <div className="w-full bg-stone-800 rounded-full h-2">
                      <div
                        className="bg-rose-500 h-2 rounded-full transition-all"
                        style={{ width: `${character.social}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between font-mono mb-1 text-stone-300">
                      <span className="flex items-center gap-1.5">
                        <Target className="w-3.5 h-3.5 text-sky-400" />
                        <span>Purpose Fulfillment (Aspiration)</span>
                      </span>
                      <span>{character.purpose}%</span>
                    </div>
                    <div className="w-full bg-stone-800 rounded-full h-2">
                      <div
                        className="bg-sky-500 h-2 rounded-full transition-all"
                        style={{ width: `${character.purpose}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'memories' && (
            <div className="space-y-4">
              {/* Memory Relevance Inspector Panel */}
              <div className="p-3.5 rounded-xl bg-stone-950/90 border border-stone-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Search className="w-3.5 h-3.5 text-amber-400" />
                    <h4 className="text-xs font-semibold text-stone-200 font-mono">
                      Memory Relevance Retrieval Inspector
                    </h4>
                  </div>
                  <span className="text-[10px] text-stone-500 font-mono">
                    Scoring: Recency Decay (20%) + Importance (35%) + Topic Relevance (45%)
                  </span>
                </div>
                <p className="text-[11px] text-stone-400">
                  In Evara, characters fetch only recent and relevant memories from Firestore. Test what {character.name} recalls under different context queries:
                </p>

                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    value={inspectorQuery}
                    onChange={(e) => setInspectorQuery(e.target.value)}
                    placeholder="E.g., Soren, waterwheel, rare moss, ancient book..."
                    className="flex-1 bg-stone-900 border border-stone-800 rounded-lg px-3 py-1.5 text-xs text-stone-200 focus:outline-none focus:border-amber-400"
                  />
                  <button
                    onClick={handleTestRelevance}
                    disabled={isScoring}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold rounded-lg text-xs flex items-center gap-1 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${isScoring ? 'animate-spin' : ''}`} />
                    <span>Score & Fetch Top 5</span>
                  </button>
                </div>

                {simulatedScoredMemories && (
                  <div className="mt-3 pt-3 border-t border-stone-800 space-y-2">
                    <span className="text-[10px] font-mono text-stone-400 uppercase">
                      Top Retrieved Memories for Context:
                    </span>
                    {simulatedScoredMemories.length === 0 ? (
                      <p className="text-xs text-stone-500 italic">No matching memories scored.</p>
                    ) : (
                      simulatedScoredMemories.map((sm, idx) => (
                        <div
                          key={idx}
                          className="p-2 rounded-lg bg-stone-900 border border-stone-800/90 text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between text-[10px] font-mono">
                            <span className="text-amber-400 font-bold">
                              #{idx + 1} Composite Score: {sm.totalScore.toFixed(3)}
                            </span>
                            <span className="text-stone-400">
                              Relevance: {sm.relevanceScore.toFixed(2)} | Imp: {sm.importanceScore.toFixed(2)} | Recency: {sm.recencyScore.toFixed(2)}
                            </span>
                          </div>
                          <p className="text-stone-200">{sm.memory.content}</p>
                          {sm.matchedKeywords.length > 0 && (
                            <div className="flex gap-1 text-[10px] text-emerald-400 font-mono">
                              <span>Matched:</span>
                              <span>{sm.matchedKeywords.join(', ')}</span>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* All Stored Memories */}
              <div className="space-y-2">
                <h4 className="text-xs font-mono uppercase text-stone-400">
                  Chronological Memory Stream ({charMemories.length})
                </h4>
                {charMemories.map((mem) => (
                  <div
                    key={mem.id}
                    className="p-3 rounded-xl bg-stone-950/70 border border-stone-800 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between text-[11px] font-mono text-stone-400">
                      <span className="text-stone-300 font-medium">🕒 {mem.worldTime}</span>
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-stone-800 text-stone-300">
                          Importance: {mem.importance}/10
                        </span>
                        <span className="capitalize text-stone-400">{mem.type}</span>
                      </div>
                    </div>
                    <p className="text-stone-300 leading-relaxed">{mem.content}</p>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {mem.tags.map((tag, i) => (
                        <span
                          key={i}
                          className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-stone-900 text-stone-400 border border-stone-800"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'relationships' && (
            <div className="space-y-3">
              <h4 className="text-xs font-mono uppercase text-stone-400">
                Dynamic Interpersonal Bonds ({charRelationships.length})
              </h4>
              {charRelationships.length === 0 ? (
                <p className="text-xs text-stone-500 italic">
                  No relationships recorded yet. When characters converse, their bonds develop here.
                </p>
              ) : (
                charRelationships.map((rel) => {
                  const target = allCharacters.find((c) => c.id === rel.targetCharacterId);
                  return (
                    <div
                      key={rel.id}
                      className="p-3.5 rounded-xl bg-stone-950/80 border border-stone-800 text-xs space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] text-stone-950"
                            style={{ backgroundColor: target?.avatarColor || '#e5e7eb' }}
                          >
                            {target?.name.charAt(0) || '?'}
                          </div>
                          <div>
                            <h5 className="font-bold text-stone-200">{target?.name || 'Inhabitant'}</h5>
                            <span className="text-[10px] font-mono capitalize text-stone-400">
                              {rel.status.replace('_', ' ')}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 font-mono text-[11px]">
                          <div>
                            <span className="text-stone-500 block text-[9px]">AFFINITY</span>
                            <span
                              className={`font-bold ${
                                rel.affinity > 20
                                  ? 'text-emerald-400'
                                  : rel.affinity < -10
                                  ? 'text-rose-400'
                                  : 'text-stone-300'
                              }`}
                            >
                              {rel.affinity > 0 ? `+${rel.affinity}` : rel.affinity}
                            </span>
                          </div>
                          <div>
                            <span className="text-stone-500 block text-[9px]">TRUST</span>
                            <span className="font-bold text-sky-400">{rel.trust}%</span>
                          </div>
                        </div>
                      </div>

                      {rel.lastInteraction && (
                        <div className="p-2 rounded bg-stone-900 border border-stone-800/80 text-stone-400 text-[11px]">
                          <span className="font-mono text-stone-500 text-[10px] uppercase block">
                            Last Interaction:
                          </span>
                          <p>{rel.lastInteraction}</p>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === 'brain' && (
            <div className="space-y-4 text-xs">
              {/* Brain Architecture Card */}
              <div className="p-4 rounded-xl bg-stone-950/90 border border-stone-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Brain className="w-4 h-4 text-amber-400" />
                    <h4 className="text-sm font-bold text-stone-100">
                      Configured AI Decision Brain
                    </h4>
                  </div>
                  <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-stone-800 text-amber-300 border border-stone-700">
                    {character.brainConfig.modelName}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-stone-900/90 border border-stone-800/80 text-stone-400 text-[11px] leading-relaxed">
                  <span className="font-semibold text-stone-300 block mb-0.5">
                    Identity Safeguard Protocol:
                  </span>
                  "The API key never becomes their identity. All decisions, quirks, memories, and motivations stem exclusively from {character.name}'s living persona and episodic memory archive."
                </div>

                {/* Quota Management */}
                <div className="pt-2 border-t border-stone-800 space-y-2">
                  <div className="flex justify-between font-mono text-[11px]">
                    <span className="text-stone-400">Decision Quota Usage:</span>
                    <span className="text-stone-200 font-bold">
                      {character.brainConfig.quotaUsed} / {character.brainConfig.quotaLimit} decisions
                    </span>
                  </div>

                  <div className="w-full bg-stone-800 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        character.brainConfig.quotaUsed >= character.brainConfig.quotaLimit
                          ? 'bg-rose-500'
                          : 'bg-amber-500'
                      }`}
                      style={{
                        width: `${Math.min(
                          100,
                          (character.brainConfig.quotaUsed / character.brainConfig.quotaLimit) * 100
                        )}%`,
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-stone-500">
                    <span>Quota Reset Schedule:</span>
                    <span>Tick #{character.brainConfig.quotaResetTick}</span>
                  </div>
                </div>

                {/* Sleeping state status */}
                {character.status === 'quota_sleeping' && (
                  <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/50 text-rose-300 space-y-2">
                    <div className="flex items-center gap-1.5 font-bold">
                      <Zap className="w-4 h-4 text-rose-400" />
                      <span>Involuntary Cognitive Slumber Active</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-rose-300/90">
                      {character.sleepReason || 'Quota limit reached. The character is resting in deep sleep until the simulation quota cycle resets.'}
                    </p>
                    <button
                      onClick={handleWakeCharacter}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-stone-100 font-semibold rounded-lg text-xs transition-colors"
                    >
                      Manually Recharge Quota & Awaken
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
