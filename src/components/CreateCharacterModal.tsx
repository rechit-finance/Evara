import React, { useState } from 'react';
import { X, Sparkles, Brain, Key, Cpu, Zap, Check } from 'lucide-react';
import { Character, Location } from '../types/world';

interface CreateCharacterModalProps {
  locations: Location[];
  onClose: () => void;
  onCreate: (char: Character) => void;
}

const PRESET_ARCHETYPES = [
  {
    name: 'Elian Vance',
    title: 'Stellar Astrologer',
    bio: 'Studies the movements of twin moons through the brass astrolabe in the Archive.',
    personality: 'Soft-spoken, contemplative, highly observant, fascinated by cycles and cosmic math.',
    color: '#8b5cf6',
    locationId: 'archive',
    goal: 'Map the orbital conjunction of the sapphire comet',
  },
  {
    name: 'Cassian Reed',
    title: 'Hearth Baker',
    bio: 'Former traveler who settled by the cafe hearth to brew roasted grain brews and spiced dough.',
    personality: 'Gregarious, warm-hearted, tells tall tales of the outer valleys.',
    color: '#f97316',
    locationId: 'cafe',
    goal: 'Perfect a honeyed rye recipe for the upcoming solstice feast',
  },
  {
    name: 'Theron Pike',
    title: 'Aqueduct Mason',
    bio: 'Inspects stone conduits, limestone arches, and water pressure valves around the city.',
    personality: 'Gruff, dependable, vigilant about structural stability, skeptical of poetry.',
    color: '#64748b',
    locationId: 'mill',
    goal: 'Reinforce the third limestone weir against spring runoff',
  },
];

export const CreateCharacterModal: React.FC<CreateCharacterModalProps> = ({
  locations,
  onClose,
  onCreate,
}) => {
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [bio, setBio] = useState('');
  const [personality, setPersonality] = useState('');
  const [avatarColor, setAvatarColor] = useState('#10b981');
  const [locationId, setLocationId] = useState(locations[0]?.id || 'commons');
  const [goal, setGoal] = useState('');

  // "Connect AI" Brain state
  const [isAIConnected, setIsAIConnected] = useState(true);
  const [brainType, setBrainType] = useState<'gemini' | 'gemini_lite' | 'custom_key' | 'autonomous_heuristic'>('gemini');
  const [customKey, setCustomKey] = useState('');
  const [quotaLimit, setQuotaLimit] = useState(15);
  const [temperature, setTemperature] = useState(0.7);

  const applyArchetype = (arch: (typeof PRESET_ARCHETYPES)[0]) => {
    setName(arch.name);
    setTitle(arch.title);
    setBio(arch.bio);
    setPersonality(arch.personality);
    setAvatarColor(arch.color);
    setLocationId(arch.locationId);
    setGoal(arch.goal);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    let modelName = 'gemini-3.8-flash';
    if (brainType === 'gemini_lite') modelName = 'gemini-3.1-flash-lite';
    else if (brainType === 'autonomous_heuristic') modelName = 'autonomous-heuristic';
    else if (brainType === 'custom_key') modelName = 'gemini-3.8-flash (custom)';

    const targetLoc = locations.find((l) => l.id === locationId);

    const newChar: Character = {
      id: `char_${Date.now()}`,
      name: name.trim(),
      title: title.trim() || 'Town Inhabitant',
      bio: bio.trim() || 'A new arrival in Evara.',
      personality: personality.trim() || 'Curious, peaceful, exploring.',
      avatarColor,
      locationId,
      latitude: targetLoc ? targetLoc.coordinates.lat : 35.0116,
      longitude: targetLoc ? targetLoc.coordinates.lng : 135.6777,
      city: targetLoc?.city || 'Kyoto',
      country: targetLoc?.country || 'Japan',
      ianaTimezone: targetLoc?.ianaTimezone || 'Asia/Tokyo',
      status: 'awake',
      energy: 90,
      social: 60,
      purpose: 75,
      currentGoal: goal.trim() || 'Find one’s place in Evara',
      currentAction: `Arrived at ${targetLoc?.name || 'Evara'} and surveying surroundings`,
      internalMonologue: 'A fresh beginning in this world. So much to learn and observe.',
      brainConfig: {
        brainType,
        modelName,
        customApiKey: brainType === 'custom_key' ? customKey.trim() : undefined,
        quotaLimit: Math.max(5, quotaLimit),
        quotaUsed: 0,
        quotaResetTick: 15,
        temperature,
      },
      lastActionTick: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onCreate(newChar);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="theme-surface border theme-border rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden transition-colors duration-250">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b theme-border theme-header flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg theme-accent-bg font-bold flex items-center justify-center shadow-md">
              +
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-100">
                Connect New Inhabitant to Evara
              </h2>
              <p className="text-xs text-stone-400">
                Configure autonomous personality and separate AI brain
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-200 theme-inner rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs flex-1">
          {/* Quick Preset Archetypes */}
          <div className="p-3 bg-stone-950/70 border border-stone-800 rounded-xl space-y-2">
            <span className="text-[11px] font-mono text-stone-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Or choose a preset persona:</span>
            </span>
            <div className="flex flex-wrap gap-2">
              {PRESET_ARCHETYPES.map((arch, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => applyArchetype(arch)}
                  className="px-2.5 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-stone-100 border border-stone-700/80 transition-colors flex items-center gap-1.5"
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: arch.color }}
                  />
                  <span>{arch.name} ({arch.title})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Identity Fields */}
          <div className="space-y-3">
            <h3 className="font-mono text-stone-300 uppercase tracking-wider text-[11px] font-semibold">
              1. Inhabitant Persona & Origin
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-stone-400 mb-1 font-medium">Full Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rowan Dale"
                  className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-stone-200 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-stone-400 mb-1 font-medium">Occupation / Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Glassblower, Astrologer"
                  className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-stone-200 focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-stone-400 mb-1 font-medium">Origin & Backstory</label>
              <textarea
                rows={2}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Where they came from, their formative memories..."
                className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-stone-200 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-stone-400 mb-1 font-medium">Personality & Traits</label>
              <input
                type="text"
                value={personality}
                onChange={(e) => setPersonality(e.target.value)}
                placeholder="e.g. Patient, observant, prone to daydreaming"
                className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-stone-200 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-stone-400 mb-1 font-medium">Starting District</label>
                <select
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-stone-200 focus:outline-none focus:border-amber-400"
                >
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} ({loc.district})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-stone-400 mb-1 font-medium">Theme Color</label>
                <div className="flex items-center gap-2 mt-1">
                  {['#10b981', '#f59e0b', '#6366f1', '#ec4899', '#06b6d4', '#8b5cf6', '#e11d48'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setAvatarColor(c)}
                      className={`w-6 h-6 rounded-full border-2 transition-transform ${
                        avatarColor === c ? 'border-white scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-stone-400 mb-1 font-medium">Primary Goal in Evara</label>
              <input
                type="text"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="e.g. Catalog every ancient carving in the Archive"
                className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-stone-200 focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {/* "Connect AI" Brain Section */}
          <div className="p-4 rounded-xl bg-stone-950 border border-amber-800/40 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-amber-400" />
                <h3 className="font-mono text-stone-200 uppercase tracking-wider text-[11px] font-bold">
                  2. Connect AI Brain
                </h3>
              </div>
              <span className="text-[10px] text-amber-400 font-mono">
                API key never becomes character identity
              </span>
            </div>

            <p className="text-stone-400 text-[11px]">
              Every character possesses an independent AI cognitive engine. If decision quota runs out, they enter restorative slumber until the cycle resets.
            </p>

            {/* Brain Preset Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {[
                {
                  id: 'gemini',
                  title: 'Gemini 3.8 Flash',
                  desc: 'Default Cloud Brain (High reasoning)',
                },
                {
                  id: 'gemini_lite',
                  title: 'Gemini 3.1 Flash-Lite',
                  desc: 'Lightweight & swift decisions',
                },
                {
                  id: 'custom_key',
                  title: 'Custom API Key',
                  desc: 'Independent character API key',
                },
                {
                  id: 'autonomous_heuristic',
                  title: 'Autonomous Heuristic',
                  desc: 'Zero-network local cognitive engine',
                },
              ].map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setBrainType(b.id as any)}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    brainType === b.id
                      ? 'bg-amber-950/40 border-amber-500 text-stone-100 ring-1 ring-amber-500/50'
                      : 'bg-stone-900 border-stone-800 text-stone-400 hover:border-stone-700'
                  }`}
                >
                  <div className="font-bold text-xs flex items-center justify-between">
                    <span>{b.title}</span>
                    {brainType === b.id && <Check className="w-3.5 h-3.5 text-amber-400" />}
                  </div>
                  <p className="text-[10px] text-stone-400 mt-0.5">{b.desc}</p>
                </button>
              ))}
            </div>

            {/* Custom key field if selected */}
            {brainType === 'custom_key' && (
              <div className="pt-2">
                <label className="block text-stone-400 mb-1 font-medium">Custom Gemini API Key</label>
                <div className="relative">
                  <Key className="w-3.5 h-3.5 text-stone-500 absolute left-2.5 top-2.5" />
                  <input
                    type="password"
                    value={customKey}
                    onChange={(e) => setCustomKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full bg-stone-900 border border-stone-800 rounded-lg pl-8 pr-3 py-1.5 text-stone-200 focus:outline-none focus:border-amber-400 text-xs font-mono"
                  />
                </div>
              </div>
            )}

            {/* Quota limit configuration */}
            <div className="pt-2 border-t border-stone-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <label className="text-stone-300 font-mono text-[11px] block">
                  Decision Quota per World Cycle:
                </label>
                <span className="text-stone-500 text-[10px]">
                  When reached, character falls asleep until next cycle.
                </span>
              </div>
              <div className="flex items-center gap-2">
                {[10, 20, 35].map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setQuotaLimit(q)}
                    className={`px-2.5 py-1 text-xs font-mono rounded-md border ${
                      quotaLimit === q
                        ? 'bg-amber-500 text-stone-950 font-bold border-amber-400'
                        : 'bg-stone-900 text-stone-400 border-stone-800 hover:text-stone-200'
                    }`}
                  >
                    {q} Quota
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Submit Footer */}
          <div className="pt-4 border-t theme-border flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg theme-inner hover:brightness-125 text-stone-300 transition-colors font-medium border theme-border"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg theme-accent-bg font-bold flex items-center gap-1.5 transition-colors shadow-md cursor-pointer"
            >
              <Cpu className="w-4 h-4" />
              <span>Connect & Awake Inhabitant</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
