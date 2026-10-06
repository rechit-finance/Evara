import React, { useState } from 'react';
import {
  Globe,
  MapPin,
  Clock,
  Compass,
  Navigation,
  Train,
  Ship,
  Footprints,
  Mountain,
  Sun,
  Moon,
  Users,
  ExternalLink,
  ArrowRight,
  Sparkles,
  Send,
  Layers,
  Map as MapIcon,
} from 'lucide-react';
import { Character, Location, getLocalTime, WorldState, TransitType } from '../types/world';

interface LocationsMapProps {
  locations: Location[];
  characters: Character[];
  worldState: WorldState;
  selectedLocationId: string | null;
  onSelectLocation: (locationId: string | null) => void;
  onInspectCharacter: (char: Character) => void;
  onTravelCharacter?: (characterId: string, destinationLocationId: string) => void;
}

export const LocationsMap: React.FC<LocationsMapProps> = ({
  locations,
  characters,
  worldState,
  selectedLocationId,
  onSelectLocation,
  onInspectCharacter,
  onTravelCharacter,
}) => {
  const [activeTab, setActiveTab] = useState<'districts' | 'map' | 'transit'>('districts');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all');
  const [showRoutesForId, setShowRoutesForId] = useState<string | null>(null);
  const [travelModalChar, setTravelModalChar] = useState<Character | null>(null);

  // Characters currently in physical transit across the globe
  const inTransitCharacters = characters.filter((c) => c.status === 'in_transit' && c.transit);

  const getTransitIcon = (transitType?: TransitType) => {
    switch (transitType) {
      case 'high_speed_rail':
      case 'alpine_rail':
        return <Train className="w-3.5 h-3.5 text-amber-400" />;
      case 'coastal_ferry':
        return <Ship className="w-3.5 h-3.5 text-sky-400" />;
      case 'overland_trek':
      default:
        return <Footprints className="w-3.5 h-3.5 text-emerald-400" />;
    }
  };

  const getDaylightIcon = (phase: string) => {
    if (phase.includes('Night') || phase.includes('Midnight')) {
      return <Moon className="w-3.5 h-3.5 text-indigo-400" />;
    }
    if (phase.includes('Sunrise') || phase.includes('Dawn') || phase.includes('Twilight')) {
      return <Sparkles className="w-3.5 h-3.5 text-amber-400" />;
    }
    return <Sun className="w-3.5 h-3.5 text-amber-300" />;
  };

  // Group unique districts
  const districts = Array.from(new Set(locations.map((l) => l.district || 'Unassigned District')));

  // Filter locations by district
  const filteredLocations =
    selectedDistrict === 'all'
      ? locations
      : locations.filter((l) => (l.district || 'Unassigned District') === selectedDistrict);

  // Geographic SVG map projection coordinates (simplified Equirectangular projection)
  // maps lng (-180..180) to x (20..580), lat (-60..75) to y (250..30)
  const mapCoords = (lat: number, lng: number) => {
    const x = ((lng + 180) / 360) * 560 + 20;
    const y = ((75 - lat) / 135) * 220 + 20;
    return { x, y };
  };

  return (
    <div className="theme-surface border theme-border rounded-2xl p-4 flex flex-col h-full shadow-lg transition-colors duration-250">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b theme-border gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg theme-inner border theme-border flex items-center justify-center shrink-0">
            <Globe className="w-4 h-4 theme-accent-text" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-stone-200 tracking-wide uppercase font-mono">
              World Districts & Locations
            </h2>
            <p className="text-[11px] text-stone-400">
              Real solar local times, geographic coordinates, and physical transit corridors
            </p>
          </div>
        </div>

        {/* View mode toggle tabs */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <div className="flex items-center theme-inner border theme-border rounded-lg p-0.5 text-xs font-mono">
            <button
              onClick={() => setActiveTab('districts')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all ${
                activeTab === 'districts'
                  ? 'theme-accent-bg font-semibold shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Layers className="w-3 h-3" />
              <span>Districts</span>
            </button>
            <button
              onClick={() => setActiveTab('map')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all ${
                activeTab === 'map'
                  ? 'theme-accent-bg font-semibold shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <MapIcon className="w-3 h-3" />
              <span>Globe Map</span>
            </button>
            <button
              onClick={() => setActiveTab('transit')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all relative ${
                activeTab === 'transit'
                  ? 'theme-accent-bg font-semibold shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Train className="w-3 h-3" />
              <span>Transit ({inTransitCharacters.length})</span>
              {inTransitCharacters.length > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping absolute -top-0.5 -right-0.5" />
              )}
            </button>
          </div>

          {selectedLocationId && (
            <button
              onClick={() => onSelectLocation(null)}
              className="text-xs theme-accent-text hover:brightness-125 underline font-medium ml-1"
            >
              Reset Filter
            </button>
          )}
        </div>
      </div>

      {/* Global Solar Local Time Ribbon (Comparison Bar Across All Time Zones) */}
      <div className="mt-3 theme-inner border theme-border rounded-xl p-2.5 space-y-1.5">
        <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-stone-400">
          <span className="flex items-center gap-1 font-semibold text-stone-300">
            <Clock className="w-3 h-3 theme-accent-text" />
            <span>24-Hour Solar Synchronization Arc</span>
          </span>
          <span className="text-stone-400 font-mono">
            Master UTC: {String(worldState.hour).padStart(2, '0')}:{String(worldState.minute).padStart(2, '0')}
          </span>
        </div>

        {/* Horizontal scroll of local times */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {locations.map((loc) => {
            const local = getLocalTime(worldState.hour, worldState.minute, loc.timezoneOffset);
            const isSelected = selectedLocationId === loc.id;
            const occupants = characters.filter((c) => c.locationId === loc.id && c.status !== 'in_transit');

            return (
              <button
                key={loc.id}
                onClick={() => onSelectLocation(isSelected ? null : loc.id)}
                className={`flex flex-col items-start p-2 rounded-lg border text-left shrink-0 transition-all ${
                  isSelected
                    ? 'theme-card theme-card-selected ring-1'
                    : 'theme-card hover:brightness-110'
                }`}
                style={{ minWidth: '135px' }}
              >
                <div className="flex items-center justify-between w-full text-[10px] text-stone-400 font-mono">
                  <span className="font-bold text-stone-300 truncate max-w-[85px]">{loc.name.split(' ')[0]}</span>
                  <span className="theme-accent-text font-semibold">{loc.countryCode}</span>
                </div>

                <div className="flex items-center gap-1.5 mt-1">
                  {getDaylightIcon(local.daylightPhase)}
                  <span className="text-xs font-mono font-bold text-stone-100">{local.formatted}</span>
                </div>

                <div className="flex items-center justify-between w-full mt-1 text-[9px] text-stone-400 font-mono">
                  <span>{loc.timezoneName.split(' ')[0]}</span>
                  <span className="text-emerald-400">{occupants.length} stationed</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2D Geographic SVG Globe Map View */}
      {activeTab === 'map' && (
        <div className="mt-3.5 theme-inner border theme-border rounded-xl p-3 flex flex-col space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-stone-400">
            <span className="flex items-center gap-1.5 text-stone-200 font-semibold">
              <Compass className="w-3.5 h-3.5 theme-accent-text" />
              <span>Real Geographic Coordinate Plot</span>
            </span>
            <span className="text-[10px]">Active Physical Travel Corridors</span>
          </div>

          <div className="relative w-full aspect-[2.4/1] bg-stone-950/80 rounded-lg border theme-border overflow-hidden">
            <svg viewBox="0 0 600 250" className="w-full h-full">
              {/* Latitude / Longitude Grid lines */}
              <line x1="20" y1="125" x2="580" y2="125" stroke="rgba(255,255,255,0.08)" strokeDasharray="2,4" />
              <line x1="300" y1="20" x2="300" y2="240" stroke="rgba(255,255,255,0.08)" strokeDasharray="2,4" />
              <text x="305" y="32" fill="rgba(255,255,255,0.2)" fontSize="8" fontFamily="monospace">UTC 0° GMT</text>
              <text x="25" y="122" fill="rgba(255,255,255,0.2)" fontSize="8" fontFamily="monospace">Equator</text>

              {/* Transit Route Corridors (Lines between connected locations) */}
              {locations.flatMap((loc) =>
                loc.routes.map((route) => {
                  const destLoc = locations.find((l) => l.id === route.destinationId);
                  if (!destLoc) return null;
                  const start = mapCoords(loc.coordinates.lat, loc.coordinates.lng);
                  const end = mapCoords(destLoc.coordinates.lat, destLoc.coordinates.lng);

                  return (
                    <g key={`${loc.id}-${route.destinationId}`}>
                      <line
                        x1={start.x}
                        y1={start.y}
                        x2={end.x}
                        y2={end.y}
                        stroke="rgba(217, 119, 6, 0.25)"
                        strokeWidth="1.5"
                        strokeDasharray="3,3"
                      />
                    </g>
                  );
                })
              )}

              {/* Moving In-Transit Characters plotted dynamically */}
              {inTransitCharacters.map((char) => {
                const transit = char.transit!;
                const originLoc = locations.find((l) => l.id === transit.originLocationId);
                const destLoc = locations.find((l) => l.id === transit.destinationLocationId);
                if (!originLoc || !destLoc) return null;

                const start = mapCoords(originLoc.coordinates.lat, originLoc.coordinates.lng);
                const end = mapCoords(destLoc.coordinates.lat, destLoc.coordinates.lng);
                const progress = (transit.totalTicks - transit.remainingTicks) / transit.totalTicks;
                const curX = start.x + (end.x - start.x) * progress;
                const curY = start.y + (end.y - start.y) * progress;

                return (
                  <g key={`transit-marker-${char.id}`}>
                    <circle cx={curX} cy={curY} r="6" fill="#f59e0b" opacity="0.4" className="animate-ping" />
                    <circle cx={curX} cy={curY} r="4.5" fill="#f59e0b" stroke="#1c1917" strokeWidth="1.5" />
                    <text
                      x={curX + 7}
                      y={curY + 3}
                      fill="#fef3c7"
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {char.name} ({Math.round(progress * 100)}%)
                    </text>
                  </g>
                );
              })}

              {/* Location Node Points */}
              {locations.map((loc) => {
                const { x, y } = mapCoords(loc.coordinates.lat, loc.coordinates.lng);
                const isSelected = selectedLocationId === loc.id;
                const local = getLocalTime(worldState.hour, worldState.minute, loc.timezoneOffset);
                const occupants = characters.filter((c) => c.locationId === loc.id && c.status !== 'in_transit');

                return (
                  <g
                    key={loc.id}
                    onClick={() => onSelectLocation(isSelected ? null : loc.id)}
                    className="cursor-pointer group"
                  >
                    <circle
                      cx={x}
                      cy={y}
                      r={isSelected ? '7' : '5'}
                      fill={isSelected ? '#f59e0b' : occupants.length > 0 ? '#10b981' : '#64748b'}
                      stroke="#0f172a"
                      strokeWidth="2"
                      className="transition-all"
                    />
                    {occupants.length > 0 && (
                      <circle cx={x} cy={y} r="8" fill="none" stroke="#10b981" strokeWidth="1" opacity="0.6" />
                    )}
                    <text
                      x={x + 7}
                      y={y + 3}
                      fill={isSelected ? '#fbbf24' : '#e2e8f0'}
                      fontSize="9"
                      fontWeight={isSelected ? 'bold' : 'normal'}
                      fontFamily="monospace"
                    >
                      {loc.name.split(' ')[0]} ({local.formatted})
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono text-stone-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> Inhabitants Present
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block ml-2" /> Traveler en Route
            </span>
            <span>Click any node to focus on that hub</span>
          </div>
        </div>
      )}

      {/* Transit View: Active Physical Corridors Progression */}
      {activeTab === 'transit' && (
        <div className="mt-3.5 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-stone-400">
            <span className="flex items-center gap-1.5 text-amber-400 font-bold uppercase">
              <Navigation className="w-3.5 h-3.5" />
              <span>Active Physical Transit Corridors</span>
            </span>
            <span>{inTransitCharacters.length} Voyagers Currently Moving</span>
          </div>

          {inTransitCharacters.length === 0 ? (
            <div className="p-8 theme-inner border theme-border rounded-xl text-center space-y-2">
              <Train className="w-8 h-8 text-stone-500 mx-auto" />
              <p className="text-xs text-stone-300 font-medium">All inhabitants are currently stationed at local hubs.</p>
              <p className="text-[11px] text-stone-400 max-w-sm mx-auto">
                Characters initiate physical travel when proposing MOVE actions, or you can manually dispatch an inhabitant below!
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {inTransitCharacters.map((char) => {
                const transit = char.transit!;
                const progressPercent = Math.min(
                  100,
                  Math.round(((transit.totalTicks - transit.remainingTicks) / transit.totalTicks) * 100)
                );
                const remainingKm = Math.round((transit.remainingTicks / transit.totalTicks) * transit.distanceKm);

                return (
                  <div
                    key={char.id}
                    onClick={() => onInspectCharacter(char)}
                    className="p-3.5 rounded-xl theme-card border theme-border cursor-pointer hover:brightness-110 text-xs space-y-2 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-medium">
                        {getTransitIcon(transit.transitType)}
                        <span className="font-bold text-stone-100">{char.name}</span>
                        <span className="text-stone-400">
                          {transit.originLocationName} ➔{' '}
                          <span className="theme-accent-text font-semibold">{transit.destinationLocationName}</span>
                        </span>
                      </div>
                      <span className="font-mono text-[11px] theme-accent-text font-bold">
                        {progressPercent}% complete
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-stone-950 rounded-full h-2 overflow-hidden border theme-border">
                      <div
                        className="h-full bg-amber-500 rounded-full transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono text-stone-400">
                      <span>
                        Transport: {transit.transitType.replace(/_/g, ' ')} • {transit.distanceKm} km total
                      </span>
                      <span>
                        {remainingKm} km / ~{transit.remainingTicks * 10} min remaining
                      </span>
                    </div>

                    {char.internalMonologue && (
                      <p className="text-[11px] text-stone-300 italic theme-inner p-2 rounded-lg border theme-border">
                        "{char.internalMonologue}"
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Districts View: Filter & Cards Grid */}
      {activeTab === 'districts' && (
        <div className="flex flex-col flex-1 mt-3.5 space-y-3">
          {/* District Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-mono scrollbar-thin">
            <button
              onClick={() => setSelectedDistrict('all')}
              className={`px-2.5 py-1 rounded-lg border text-[11px] shrink-0 transition-all ${
                selectedDistrict === 'all'
                  ? 'theme-accent-bg font-semibold'
                  : 'theme-inner theme-border text-stone-400 hover:text-stone-200'
              }`}
            >
              All Districts ({locations.length})
            </button>
            {districts.map((d) => (
              <button
                key={d}
                onClick={() => setSelectedDistrict(d)}
                className={`px-2.5 py-1 rounded-lg border text-[11px] shrink-0 transition-all ${
                  selectedDistrict === d
                    ? 'theme-accent-bg font-semibold'
                    : 'theme-inner theme-border text-stone-400 hover:text-stone-200'
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          {/* Grid of Geographic Hubs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 overflow-y-auto max-h-[620px] pr-1 flex-1">
            {filteredLocations.map((loc) => {
              const occupants = characters.filter((c) => c.locationId === loc.id && c.status !== 'in_transit');
              const isSelected = selectedLocationId === loc.id;
              const localTime = getLocalTime(worldState.hour, worldState.minute, loc.timezoneOffset);
              const isRoutesOpen = showRoutesForId === loc.id;
              const arrivingSoon = inTransitCharacters.filter((c) => c.transit?.destinationLocationId === loc.id);

              return (
                <div
                  key={loc.id}
                  onClick={() => onSelectLocation(isSelected ? null : loc.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected ? 'theme-card theme-card-selected' : 'theme-card'
                  }`}
                >
                  <div>
                    {/* Geographic & Local Time Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        {/* World District Tag */}
                        <div className="flex items-center gap-1 text-[10px] font-mono uppercase theme-accent-text font-bold">
                          <span>{loc.district}</span>
                        </div>

                        <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase text-stone-400 mt-0.5">
                          <span>{loc.country} ({loc.countryCode})</span>
                          <span>•</span>
                          <span className="truncate max-w-[120px]">{loc.region}</span>
                        </div>

                        <h3 className="text-sm font-bold text-stone-100 flex items-center gap-1.5 mt-1">
                          <MapPin className="w-3.5 h-3.5 theme-accent-text shrink-0" />
                          <span>{loc.name}</span>
                        </h3>
                      </div>

                      {/* Local Solar Time Badge */}
                      <div className="flex flex-col items-end">
                        <div className="flex items-center gap-1 theme-badge border px-2 py-0.5 rounded-lg font-mono font-bold text-xs">
                          {getDaylightIcon(localTime.daylightPhase)}
                          <span>{localTime.formatted}</span>
                        </div>
                        <span className="text-[10px] text-stone-400 font-mono mt-0.5">
                          {loc.timezoneName}
                        </span>
                      </div>
                    </div>

                    {/* Daylight phase and Biome */}
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                      <span className="theme-inner px-1.5 py-0.5 rounded border theme-border text-stone-300">
                        ☀️ {localTime.daylightPhase}
                      </span>
                      <span className="theme-inner px-1.5 py-0.5 rounded border theme-border text-stone-300">
                        <Mountain className="w-2.5 h-2.5 inline mr-1 text-emerald-400" />
                        {loc.elevationMeters}m elev
                      </span>
                      <span className="theme-inner px-1.5 py-0.5 rounded border theme-border text-stone-400">
                        {loc.coordinates.lat.toFixed(2)}°, {loc.coordinates.lng.toFixed(2)}°
                      </span>
                    </div>

                    {/* Atmosphere */}
                    <p className="text-[11px] text-stone-400 mt-2 italic leading-relaxed">
                      "{loc.atmosphere}"
                    </p>

                    {/* Arriving soon indicator if transit active */}
                    {arrivingSoon.length > 0 && (
                      <div className="mt-2 p-1.5 rounded theme-inner border border-amber-800/40 text-[10px] text-amber-300 flex items-center gap-1.5 font-mono">
                        <Train className="w-3 h-3 text-amber-400 shrink-0" />
                        <span>
                          {arrivingSoon.map((c) => c.name).join(', ')} arriving soon (~{arrivingSoon[0].transit?.remainingTicks! * 10} min)
                        </span>
                      </div>
                    )}

                    {/* Items & Resources */}
                    <div className="flex flex-wrap gap-1 mt-2.5">
                      {loc.items.slice(0, 3).map((item, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] theme-inner text-stone-400 px-1.5 py-0.5 rounded border theme-border"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Occupants & Connected Transit Routes Footer */}
                  <div className="mt-3.5 pt-2.5 border-t theme-border space-y-2">
                    {/* Physical Inhabitants */}
                    <div>
                      <div className="flex items-center justify-between text-[11px] mb-1.5 text-stone-400 font-mono">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3 text-stone-400" />
                          <span>Inhabitants ({occupants.length}/{loc.capacity}):</span>
                        </span>
                      </div>

                      {occupants.length === 0 ? (
                        <span className="text-xs text-stone-500 italic block py-0.5">
                          No inhabitants currently stationed here.
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {occupants.map((char) => (
                            <div key={char.id} className="flex items-center gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onInspectCharacter(char);
                                }}
                                className="flex items-center gap-1.5 px-2 py-1 rounded-md theme-inner hover:brightness-125 border theme-border text-stone-200 text-xs transition-colors group"
                                title={`${char.name} (${char.status}) - Local Time: ${localTime.formatted}`}
                              >
                                <span
                                  className="w-2 h-2 rounded-full shrink-0"
                                  style={{ backgroundColor: char.avatarColor }}
                                />
                                <span className="font-medium group-hover:theme-accent-text">
                                  {char.name}
                                </span>
                                {char.status === 'quota_sleeping' && (
                                  <span className="text-[10px] theme-accent-text font-mono">💤</span>
                                )}
                                <ExternalLink className="w-2.5 h-2.5 text-stone-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </button>

                              {/* Dispatch Journey quick trigger */}
                              {onTravelCharacter && loc.routes.length > 0 && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setTravelModalChar(char);
                                  }}
                                  title={`Dispatch ${char.name} on a journey`}
                                  className="p-1 theme-inner hover:brightness-125 border theme-border rounded text-[10px] text-amber-400"
                                >
                                  <Send className="w-2.5 h-2.5" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Connected Transit Corridors Accordion Toggle */}
                    <div className="pt-1.5 border-t theme-border flex items-center justify-between text-[11px]">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowRoutesForId(isRoutesOpen ? null : loc.id);
                        }}
                        className="theme-accent-text hover:brightness-125 font-mono text-[10px] flex items-center gap-1"
                      >
                        <Navigation className="w-3 h-3" />
                        <span>{isRoutesOpen ? 'Hide Transit Routes' : `View ${loc.routes.length} Transit Routes`}</span>
                      </button>
                      <span className="text-[10px] text-stone-500 font-mono">
                        {loc.routes.length} outbound corridors
                      </span>
                    </div>

                    {/* Expanded Transit Routes view */}
                    {isRoutesOpen && (
                      <div className="p-2 rounded-lg theme-inner border theme-border space-y-1.5 text-[11px]">
                        <span className="text-[10px] font-mono uppercase text-stone-400 block font-semibold">
                          Outbound Geographic Corridors:
                        </span>
                        {loc.routes.map((route, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between text-stone-300 py-1 border-b border-white/5 last:border-b-0"
                          >
                            <span className="flex items-center gap-1.5">
                              {getTransitIcon(route.transitType)}
                              <span className="font-medium">{route.destinationName}</span>
                            </span>
                            <span className="font-mono text-[10px] text-stone-400">
                              {route.distanceKm} km • ~{route.travelTicks * 10}m
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Manual Travel Dispatch Modal */}
      {travelModalChar && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="theme-surface border theme-border rounded-xl w-full max-w-md p-4 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between border-b theme-border pb-2">
              <div className="flex items-center gap-2">
                <Navigation className="w-4 h-4 theme-accent-text" />
                <h3 className="font-bold text-sm text-stone-100">
                  Dispatch Journey for {travelModalChar.name}
                </h3>
              </div>
              <button
                onClick={() => setTravelModalChar(null)}
                className="text-stone-400 hover:text-stone-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-stone-400">
              Select an outbound connected hub to send {travelModalChar.name} on a real physical journey:
            </p>

            <div className="space-y-2">
              {locations
                .find((l) => l.id === travelModalChar.locationId)
                ?.routes.map((route) => {
                  return (
                    <button
                      key={route.destinationId}
                      onClick={() => {
                        if (onTravelCharacter) {
                          onTravelCharacter(travelModalChar.id, route.destinationId);
                        }
                        setTravelModalChar(null);
                      }}
                      className="w-full p-2.5 rounded-lg theme-card border theme-border hover:brightness-125 flex items-center justify-between text-xs transition-all text-left group"
                    >
                      <div className="flex items-center gap-2">
                        {getTransitIcon(route.transitType)}
                        <div>
                          <span className="font-bold text-stone-100 group-hover:theme-accent-text block">
                            {route.destinationName}
                          </span>
                          <span className="text-[10px] text-stone-400 font-mono">
                            Mode: {route.transitType.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </div>

                      <div className="text-right font-mono text-[11px]">
                        <span className="theme-accent-text font-bold block">{route.distanceKm} km</span>
                        <span className="text-stone-400 text-[10px]">~{route.travelTicks * 10} min</span>
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
