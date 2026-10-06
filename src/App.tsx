import React, { useState, useEffect } from 'react';
import { evaraWorld } from './simulation/worldEngine';
import { Character, Location, Memory, Relationship, WorldEvent, WorldState } from './types/world';
import { DensityMode, TypographyStyle, UIThemeId, UI_THEMES } from './types/theme';
import { Header } from './components/Header';
import { EarthMap } from './components/EarthMap';
import { LocationsMap } from './components/LocationsMap';
import { CharacterRoster } from './components/CharacterRoster';
import { LiveChronicles } from './components/LiveChronicles';
import { CharacterDetailModal } from './components/CharacterDetailModal';
import { CreateCharacterModal } from './components/CreateCharacterModal';
import { TriggerEventModal } from './components/TriggerEventModal';
import { ThemeSelectorModal } from './components/ThemeSelectorModal';
import { Sparkles, Info, Cpu, Database, ShieldCheck, Palette, Globe, Compass, Columns3, LayoutTemplate } from 'lucide-react';
import { testConnection, ensureAuth } from './lib/firebase';

export default function App() {
  const [worldState, setWorldState] = useState<WorldState>(evaraWorld.getWorldState());
  const [locations, setLocations] = useState<Location[]>(evaraWorld.getLocations());
  const [characters, setCharacters] = useState<Character[]>(evaraWorld.getCharacters());
  const [relationships, setRelationships] = useState<Relationship[]>(evaraWorld.getRelationships());
  const [events, setEvents] = useState<WorldEvent[]>(evaraWorld.getEvents());

  // UI Theme & Styling states (with localStorage persistence)
  const [themeId, setThemeId] = useState<UIThemeId>(() => {
    return (localStorage.getItem('evara_theme') as UIThemeId) || 'scriptorium';
  });
  const [typography, setTypography] = useState<TypographyStyle>(() => {
    return (localStorage.getItem('evara_typography') as TypographyStyle) || 'editorial';
  });
  const [density, setDensity] = useState<DensityMode>(() => {
    return (localStorage.getItem('evara_density') as DensityMode) || 'comfortable';
  });
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);

  // Filter & Selection states
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [selectedCharacterFilterId, setSelectedCharacterFilterId] = useState<string | null>(null);
  const [inspectedCharacter, setInspectedCharacter] = useState<Character | null>(null);
  const [mapView, setMapView] = useState<'earth_map' | 'districts_atlas'>('earth_map');

  // Modal open states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isTriggerModalOpen, setIsTriggerModalOpen] = useState(false);
  const [showArchExplainer, setShowArchExplainer] = useState(false);

  const currentTheme = UI_THEMES[themeId] || UI_THEMES.scriptorium;

  const handleSelectTheme = (newTheme: UIThemeId) => {
    setThemeId(newTheme);
    localStorage.setItem('evara_theme', newTheme);
  };

  const handleSelectTypography = (newTypo: TypographyStyle) => {
    setTypography(newTypo);
    localStorage.setItem('evara_typography', newTypo);
  };

  const handleSelectDensity = (newDensity: DensityMode) => {
    setDensity(newDensity);
    localStorage.setItem('evara_density', newDensity);
  };

  // Sync theme to root and body elements for complete document styling
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeId);
    document.documentElement.setAttribute('data-typography', typography);
    document.body.setAttribute('data-theme', themeId);
    document.body.setAttribute('data-typography', typography);
  }, [themeId, typography]);

  // Subscribe to simulation changes
  useEffect(() => {
    testConnection();

    const unsubscribe = evaraWorld.subscribe(() => {
      setWorldState(evaraWorld.getWorldState());
      setLocations(evaraWorld.getLocations());
      setCharacters(evaraWorld.getCharacters());
      setRelationships(evaraWorld.getRelationships());
      setEvents(evaraWorld.getEvents());

      // Update inspected character if currently open
      if (inspectedCharacter) {
        const updated = evaraWorld.getCharacters().find((c) => c.id === inspectedCharacter.id);
        if (updated) setInspectedCharacter(updated);
      }
    });

    return () => {
      unsubscribe();
      evaraWorld.stopLoop();
    };
  }, [inspectedCharacter?.id]);

  // Derived counts
  const awakeCharacters = characters.filter((c) => c.status !== 'sleeping' && c.status !== 'quota_sleeping');
  const quotaSleepingCharacters = characters.filter((c) => c.status === 'quota_sleeping');

  // Collect all memories across characters for detail modal
  const allMemories: Memory[] = [];
  characters.forEach((char) => {
    const mems = evaraWorld.getMemoryEngine().getLocalMemories(char.id);
    allMemories.push(...mems);
  });

  const fontClass =
    typography === 'editorial'
      ? 'font-serif'
      : typography === 'technical'
      ? 'font-mono'
      : 'font-sans';

  return (
    <div
      data-theme={themeId}
      data-typography={typography}
      className={`min-h-screen theme-container text-stone-100 flex flex-col ${fontClass} selection:bg-amber-500 selection:text-stone-950 transition-colors duration-250`}
    >
      {/* Top Header */}
      <Header
        worldState={worldState}
        onTogglePause={() => evaraWorld.setPaused(!worldState.isPaused)}
        onStepTick={() => evaraWorld.stepTick()}
        onSetSpeed={(speed) => evaraWorld.setSpeed(speed)}
        onOpenCreateChar={() => setIsCreateModalOpen(true)}
        onOpenTriggerEvent={() => setIsTriggerModalOpen(true)}
        onOpenThemeSelector={() => setIsThemeModalOpen(true)}
        currentThemeName={currentTheme.name}
        awakeCount={awakeCharacters.length}
        totalCount={characters.length}
        quotaSleepingCount={quotaSleepingCharacters.length}
      />

      {/* Main Container */}
      <main
        className={`flex-1 max-w-7xl w-full mx-auto ${
          density === 'compact' ? 'p-2 sm:p-3 gap-2.5' : 'p-3 sm:p-5 gap-4'
        } flex flex-col`}
      >
        {/* Sim Loop Architecture Subheader Bar */}
        <div className="theme-surface border theme-border rounded-xl px-4 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full theme-accent-text bg-current"></span>
            <span className="font-mono text-stone-400 uppercase text-[11px] font-semibold">
              Simulation Loop:
            </span>
            <span className="text-stone-300">
              World State ➔ Fetch Recent/Relevant Memories ➔ AI Proposes Action ➔ Rules Validator ➔ World Update
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsThemeModalOpen(true)}
              className="text-[11px] font-mono theme-accent-text hover:brightness-125 flex items-center gap-1 font-semibold"
              title="Change UI Theme Style"
            >
              <Palette className="w-3 h-3" />
              <span>Theme: {currentTheme.name}</span>
            </button>

            <button
              onClick={() => setShowArchExplainer(!showArchExplainer)}
              className="text-[11px] font-mono text-stone-400 hover:text-stone-200 flex items-center gap-1"
            >
              <Info className="w-3 h-3" />
              <span>{showArchExplainer ? 'Hide Details' : 'How Evara Works'}</span>
            </button>
          </div>
        </div>

        {/* Optional Architecture Explainer Card */}
        {showArchExplainer && (
          <div className="bg-stone-900/90 border border-amber-900/40 rounded-xl p-4 text-xs text-stone-300 grid grid-cols-1 md:grid-cols-3 gap-3 animate-fadeIn">
            <div className="p-3 bg-stone-950/70 border border-stone-800 rounded-lg">
              <div className="flex items-center gap-1.5 font-bold text-amber-300 mb-1">
                <Cpu className="w-3.5 h-3.5" />
                <span>Separate AI Brains</span>
              </div>
              <p className="text-stone-400 leading-relaxed text-[11px]">
                Each character deliberates with an independent model. The API key never forms their identity. If a character hits their decision quota limit, they enter restorative cognitive slumber until the world clock resets.
              </p>
            </div>

            <div className="p-3 bg-stone-950/70 border border-stone-800 rounded-lg">
              <div className="flex items-center gap-1.5 font-bold text-sky-300 mb-1">
                <Database className="w-3.5 h-3.5" />
                <span>Relevance-Scored Memories</span>
              </div>
              <p className="text-stone-400 leading-relaxed text-[11px]">
                Memories live in Firestore. When making decisions, characters don't dump endless tokens: Evara computes hyperbolic recency decay, subjective importance (1-10), and topical relevance to retrieve only the top relevant memories.
              </p>
            </div>

            <div className="p-3 bg-stone-950/70 border border-stone-800 rounded-lg">
              <div className="flex items-center gap-1.5 font-bold text-emerald-300 mb-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Deterministic Validation</span>
              </div>
              <p className="text-stone-400 leading-relaxed text-[11px]">
                The AI does not unilaterally alter the world. The simulation engine validates each proposed action against physical connectivity, location capacity, exhaustion thresholds, and conversant presence before committing changes.
              </p>
            </div>
          </div>
        )}

        {/* Primary Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
          {/* Left Column: World Districts & Locations Map (4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <LocationsMap
              locations={locations}
              characters={characters}
              worldState={worldState}
              selectedLocationId={selectedLocationId}
              onSelectLocation={(locId) => setSelectedLocationId(locId)}
              onInspectCharacter={(char) => setInspectedCharacter(char)}
              onTravelCharacter={(charId, destId) => evaraWorld.travelCharacter(charId, destId)}
            />
          </div>

          {/* Center Column: Live Chronicles & World Feed (5 cols) */}
          <div className="lg:col-span-5 flex flex-col">
            <LiveChronicles
              events={events}
              selectedLocationId={selectedLocationId}
              selectedCharacterId={selectedCharacterFilterId}
              onClearLocationFilter={() => setSelectedLocationId(null)}
              onClearCharacterFilter={() => setSelectedCharacterFilterId(null)}
              onInspectCharacterById={(charId) => {
                const c = characters.find((char) => char.id === charId);
                if (c) setInspectedCharacter(c);
              }}
            />
          </div>

          {/* Right Column: Inhabitants Roster / Who's Awake (3 cols) */}
          <div className="lg:col-span-3 flex flex-col">
            <CharacterRoster
              characters={characters}
              locations={locations}
              worldState={worldState}
              onInspectCharacter={(char) => setInspectedCharacter(char)}
              onFilterByCharacter={(charId) => setSelectedCharacterFilterId(charId)}
              activeCharacterFilterId={selectedCharacterFilterId}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t theme-border theme-header py-3 px-4 text-center text-xs text-stone-500 font-mono transition-colors duration-250">
        <p>
          EVARA • Persistent Simulated Text World • Current Style: {currentTheme.name} ({typography})
        </p>
      </footer>

      {/* Character Deep Inspector Modal */}
      {inspectedCharacter && (
        <CharacterDetailModal
          character={inspectedCharacter}
          locations={locations}
          allCharacters={characters}
          relationships={relationships}
          memories={allMemories}
          onClose={() => setInspectedCharacter(null)}
          onRefreshData={() => {
            const updated = evaraWorld.getCharacters().find((c) => c.id === inspectedCharacter.id);
            if (updated) setInspectedCharacter(updated);
          }}
        />
      )}

      {/* Create Inhabitant Modal with "Connect AI" */}
      {isCreateModalOpen && (
        <CreateCharacterModal
          locations={locations}
          onClose={() => setIsCreateModalOpen(false)}
          onCreate={(newChar) => {
            evaraWorld.addCharacter(newChar);
            setIsCreateModalOpen(false);
          }}
        />
      )}

      {/* Trigger World Event Modal */}
      {isTriggerModalOpen && (
        <TriggerEventModal
          onClose={() => setIsTriggerModalOpen(false)}
          onTrigger={(headline, details) => {
            evaraWorld.triggerWorldEvent(headline, details);
          }}
        />
      )}

      {/* UI Style & Theme Customizer Modal */}
      {isThemeModalOpen && (
        <ThemeSelectorModal
          currentThemeId={themeId}
          currentTypography={typography}
          currentDensity={density}
          onSelectTheme={handleSelectTheme}
          onSelectTypography={handleSelectTypography}
          onSelectDensity={handleSelectDensity}
          onClose={() => setIsThemeModalOpen(false)}
        />
      )}
    </div>
  );
}

