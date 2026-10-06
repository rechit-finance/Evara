import React, { useState } from 'react';
import { X, Radio, CloudRain, Bell, BookOpen, Compass, Sparkles } from 'lucide-react';

interface TriggerEventModalProps {
  onClose: () => void;
  onTrigger: (headline: string, details: string) => void;
}

const PRESET_EVENTS = [
  {
    icon: CloudRain,
    headline: 'A sudden summer thunderstorm rolls over Evara',
    details: 'Heavy raindrops clatter against the cedar shingles and garden leaves. Those outdoors will seek shelter.',
  },
  {
    icon: Bell,
    headline: 'The Grand Waterclock strikes noon across the valley',
    details: 'Deep resonant bronze chimes echo from the Whispering Mill. Workers pause to take their midday repast.',
  },
  {
    icon: BookOpen,
    headline: 'An unclaimed leather-bound journal was left on the cafe table',
    details: 'Filled with obscure stellar notes and handwritten sketches of ancient aqueduct valves.',
  },
  {
    icon: Sparkles,
    headline: 'The bioluminescent silver-moss in the Grove begins to glow',
    details: 'Pale luminescent pollen drifts into the air, creating a tranquil nocturnal ambiance.',
  },
];

export const TriggerEventModal: React.FC<TriggerEventModalProps> = ({
  onClose,
  onTrigger,
}) => {
  const [headline, setHeadline] = useState('');
  const [details, setDetails] = useState('');

  const handleSelectPreset = (preset: (typeof PRESET_EVENTS)[0]) => {
    setHeadline(preset.headline);
    setDetails(preset.details);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!headline.trim()) return;
    onTrigger(headline.trim(), details.trim() || 'A new environmental condition has developed in Evara.');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="theme-surface border theme-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden transition-colors duration-250">
        <div className="p-4 sm:p-5 border-b theme-border theme-header flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 theme-accent-text" />
            <h2 className="text-base font-bold text-stone-100">
              Trigger World Condition / Event
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-200 theme-inner rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 text-xs">
          <p className="text-stone-400 leading-relaxed">
            Inhabitants of Evara perceive active world conditions and incorporate them into their autonomous deliberation loop and memory records.
          </p>

          {/* Quick presets */}
          <div className="space-y-2">
            <span className="font-mono text-stone-400 uppercase text-[10px] block">
              Quick World Occurrences:
            </span>
            <div className="space-y-1.5">
              {PRESET_EVENTS.map((p, idx) => {
                const Icon = p.icon;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectPreset(p)}
                    className="w-full text-left p-2.5 rounded-lg theme-inner hover:brightness-125 border theme-border transition-colors flex items-start gap-2.5 group"
                  >
                    <Icon className="w-4 h-4 theme-accent-text mt-0.5 shrink-0" />
                    <div>
                      <span className="font-bold text-stone-200 group-hover:theme-accent-text block">
                        {p.headline}
                      </span>
                      <p className="text-stone-400 text-[11px] mt-0.5 line-clamp-1">{p.details}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-stone-400 mb-1 font-medium">Event Headline *</label>
            <input
              type="text"
              required
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="e.g. A caravan of herbal traders arrives at the Commons"
              className="w-full theme-inner border theme-border rounded-lg px-3 py-2 text-stone-200 focus:outline-none focus:border-stone-500"
            />
          </div>

          <div>
            <label className="block text-stone-400 mb-1 font-medium">Narrative Details</label>
            <textarea
              rows={3}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Describe sensory details, weather shifts, or items left behind..."
              className="w-full theme-inner border theme-border rounded-lg px-3 py-2 text-stone-200 focus:outline-none focus:border-stone-500"
            />
          </div>

          <div className="pt-3 border-t theme-border flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg theme-inner hover:brightness-125 text-stone-300 transition-colors font-medium border theme-border"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg theme-accent-bg font-bold transition-colors shadow-sm cursor-pointer"
            >
              Broadcast to World
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
