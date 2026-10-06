export type WeatherType =
  | 'clear'
  | 'mist'
  | 'gentle_rain'
  | 'golden_hour'
  | 'twilight'
  | 'starry_night'
  | 'storm';

export interface WorldState {
  id: string;
  day: number;
  hour: number; // Master UTC hour (0-23)
  minute: number; // Master UTC minute (0-59)
  weather: WeatherType;
  activeEvent: string | null;
  tickCount: number;
  speed: number;
  isPaused: boolean;
  updatedAt: string;
}

export type CharacterStatus =
  | 'awake'
  | 'thinking'
  | 'talking'
  | 'working'
  | 'resting'
  | 'sleeping'
  | 'quota_sleeping'
  | 'in_transit';

export type ActionType =
  | 'MOVE'
  | 'TALK'
  | 'WORK'
  | 'REST'
  | 'REFLECT'
  | 'INTERACT_OBJECT';

export interface BrainConfig {
  brainType: 'gemini' | 'gemini_lite' | 'custom_key' | 'autonomous_heuristic';
  modelName: string;
  customApiKey?: string;
  quotaLimit: number;
  quotaUsed: number;
  quotaResetTick: number;
  temperature: number;
}

export type TransitType =
  | 'high_speed_rail'
  | 'coastal_ferry'
  | 'overland_trek'
  | 'alpine_rail';

export interface TransitRoute {
  destinationId: string;
  destinationName: string;
  distanceKm: number;
  transitType: TransitType;
  travelTicks: number; // How many simulation ticks to physically travel this distance
}

export interface CharacterTransit {
  originLocationId: string;
  originLocationName: string;
  destinationLocationId: string;
  destinationLocationName: string;
  transitType: TransitType;
  distanceKm: number;
  totalTicks: number;
  remainingTicks: number;
  startedAtTick: number;
}

export interface Character {
  id: string;
  name: string;
  title: string;
  bio: string;
  personality: string;
  avatarColor: string;
  locationId: string; // Current location, or origin if currently in transit
  latitude: number; // Real Earth Latitude (-90 to +90)
  longitude: number; // Real Earth Longitude (-180 to +180)
  city: string; // Real Earth City
  country: string; // Real Earth Country
  ianaTimezone: string; // e.g. "Asia/Tokyo", "Europe/Zurich", "America/Mexico_City"
  status: CharacterStatus;
  transit?: CharacterTransit; // Populated while physically traveling
  energy: number; // 0 to 100
  social: number; // 0 to 100
  purpose: number; // 0 to 100
  currentGoal: string;
  currentAction: string;
  internalMonologue: string;
  brainConfig: BrainConfig;
  lastActionTick: number;
  sleepReason?: string;
  ownerId?: string;
  createdAt: string;
  updatedAt: string;
}

export type MemoryType =
  | 'observation'
  | 'dialogue'
  | 'decision'
  | 'reflection'
  | 'interaction';

export interface Memory {
  id: string;
  characterId: string;
  worldTime: string; // e.g. "Day 1, 09:30"
  localTime?: string; // e.g. "18:30 (Kyoto JST)"
  tick: number;
  content: string;
  type: MemoryType;
  importance: number; // 1 to 10
  tags: string[];
  locationId: string;
  relatedCharacterIds?: string[];
  createdAt: string;
}

export type RelationshipStatus =
  | 'stranger'
  | 'acquaintance'
  | 'friendly'
  | 'close_friend'
  | 'rival'
  | 'confidant';

export interface Relationship {
  id: string;
  characterId: string;
  targetCharacterId: string;
  affinity: number; // -100 to 100
  trust: number; // 0 to 100
  status: RelationshipStatus;
  lastInteraction: string;
  notes?: string;
  updatedAt: string;
}

export interface LocationCoordinates {
  lat: number;
  lng: number;
}

export interface Location {
  id: string;
  name: string;
  district: string; // Real geographic World District name
  city: string; // Real geographic city
  region: string;
  country: string;
  countryCode: string;
  coordinates: LocationCoordinates;
  timezoneOffset: number; // UTC offset in hours (-12 to +14)
  timezoneName: string;
  ianaTimezone: string; // Standard IANA timezone (e.g. "Asia/Tokyo")
  climateBiome: string;
  elevationMeters: number;
  description: string;
  atmosphere: string;
  connectedLocationIds: string[];
  routes: TransitRoute[];
  items: string[];
  capacity: number;
  suitableActivities: string[];
}

export interface ActionProposal {
  actionType: ActionType;
  targetLocationId?: string | null;
  targetCharacterId?: string | null;
  dialogue?: string | null;
  internalMonologue: string;
  actionDescription: string;
  memoryToForm?: {
    content: string;
    type: MemoryType;
    importance: number;
    tags: string[];
  };
  expectedEnergyCost: number;
}

export interface ValidationResult {
  isValid: boolean;
  validationNote: string;
  executedAction: ActionProposal;
  energyDelta: number;
  socialDelta: number;
  purposeDelta: number;
  affinityDelta?: number;
  trustDelta?: number;
  initiatesTransit?: CharacterTransit;
}

export type WorldEventType =
  | 'action'
  | 'dialogue'
  | 'move'
  | 'transit'
  | 'arrival'
  | 'rest'
  | 'quota_sleep'
  | 'environmental'
  | 'reflection';

export interface WorldEvent {
  id: string;
  tick: number;
  worldTime: string;
  localTime?: string;
  characterId?: string;
  characterName?: string;
  locationId: string;
  locationName: string;
  type: WorldEventType;
  headline: string;
  details: string;
  internalThought?: string;
  spokenDialogue?: string;
  isValidated: boolean;
  createdAt: string;
}

/**
 * Calculates local solar/standard time for a geographic location given UTC simulation time
 * and an optional IANA timezone or UTC offset.
 */
export function getLocalTime(
  utcHour: number,
  utcMinute: number,
  timezoneOffset: number,
  ianaTimezone?: string
) {
  let localHour = Math.floor(utcHour + timezoneOffset);
  let localMinute = utcMinute;

  if (ianaTimezone) {
    try {
      const syntheticDate = new Date(Date.UTC(2026, 9, 6, utcHour, utcMinute, 0));
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: ianaTimezone,
        hour: 'numeric',
        minute: 'numeric',
        hour12: false,
      });
      const parts = formatter.formatToParts(syntheticDate);
      const hStr = parts.find((p) => p.type === 'hour')?.value;
      const mStr = parts.find((p) => p.type === 'minute')?.value;
      if (hStr !== undefined && mStr !== undefined) {
        localHour = parseInt(hStr, 10) % 24;
        localMinute = parseInt(mStr, 10);
      }
    } catch {
      // Fallback to offset math
      if (localHour < 0) localHour = (localHour % 24) + 24;
      if (localHour >= 24) localHour = localHour % 24;
    }
  } else {
    if (localHour < 0) localHour = (localHour % 24) + 24;
    if (localHour >= 24) localHour = localHour % 24;
  }

  const formatted = `${String(localHour).padStart(2, '0')}:${String(localMinute).padStart(2, '0')}`;

  let daylightPhase = 'Night';
  if (localHour >= 5 && localHour < 8) daylightPhase = 'Dawn / Sunrise';
  else if (localHour >= 8 && localHour < 12) daylightPhase = 'Morning';
  else if (localHour >= 12 && localHour < 17) daylightPhase = 'Solar Afternoon';
  else if (localHour >= 17 && localHour < 21) daylightPhase = 'Dusk / Twilight';
  else daylightPhase = 'Midnight';

  return {
    hour: localHour,
    minute: localMinute,
    formatted,
    daylightPhase,
  };
}
