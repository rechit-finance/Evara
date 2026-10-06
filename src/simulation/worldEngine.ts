import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrors';
import {
  Character,
  Location,
  Memory,
  Relationship,
  WeatherType,
  WorldEvent,
  WorldState,
  getLocalTime,
} from '../types/world';
import { CharacterBrain } from './brain';
import { INITIAL_CHARACTERS, INITIAL_LOCATIONS, INITIAL_MEMORIES, INITIAL_RELATIONSHIPS, INITIAL_WORLD_STATE } from './defaultWorld';
import { MemoryEngine } from './memoryEngine';
import { SimulationValidator } from './validator';

export class WorldEngine {
  private worldState: WorldState = { ...INITIAL_WORLD_STATE };
  private locations: Location[] = [...INITIAL_LOCATIONS];
  private characters: Character[] = [...INITIAL_CHARACTERS];
  private relationships: Relationship[] = [...INITIAL_RELATIONSHIPS];
  private events: WorldEvent[] = [];
  private memoryEngine: MemoryEngine;
  private onStateChangeListeners: Array<() => void> = [];
  private timerId: number | null = null;
  private isProcessingTick = false;

  constructor() {
    this.memoryEngine = new MemoryEngine(INITIAL_MEMORIES);
    // Seed initial event chronicle
    this.events = [
      {
        id: 'evt_init_1',
        tick: 0,
        worldTime: 'Day 1, 08:30',
        locationId: 'commons',
        locationName: 'The Sunlit Commons',
        type: 'environmental',
        headline: 'Morning chimes chime over Evara',
        details: 'The obsidian fountain water gleams under the pale clear sky. The living world awakens.',
        isValidated: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'evt_init_2',
        tick: 0,
        worldTime: 'Day 1, 08:30',
        characterId: 'char_soren',
        characterName: 'Soren Blake',
        locationId: 'mill',
        locationName: 'The Whispering Mill',
        type: 'action',
        headline: 'Soren began daily escapement inspection',
        details: 'Calibrating the heavy river wheel gears to maintain town chronometry.',
        internalThought: 'Sixty oscillations per minute. Clean and steady.',
        isValidated: true,
        createdAt: new Date().toISOString(),
      },
    ];
  }

  // Getters
  public getWorldState(): WorldState {
    return { ...this.worldState };
  }
  public getLocations(): Location[] {
    return [...this.locations];
  }
  public getCharacters(): Character[] {
    return [...this.characters];
  }
  public getRelationships(): Relationship[] {
    return [...this.relationships];
  }
  public getEvents(): WorldEvent[] {
    return [...this.events];
  }
  public getMemoryEngine(): MemoryEngine {
    return this.memoryEngine;
  }

  public subscribe(listener: () => void): () => void {
    this.onStateChangeListeners.push(listener);
    return () => {
      this.onStateChangeListeners = this.onStateChangeListeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.onStateChangeListeners.forEach((fn) => fn());
  }

  // World Controls
  public setPaused(paused: boolean) {
    this.worldState.isPaused = paused;
    this.notify();
    if (!paused) {
      this.startLoop();
    } else {
      this.stopLoop();
    }
  }

  public setSpeed(speed: number) {
    this.worldState.speed = speed;
    this.notify();
    if (!this.worldState.isPaused) {
      this.stopLoop();
      this.startLoop();
    }
  }

  public startLoop() {
    this.stopLoop();
    const intervalMs = Math.max(1000, Math.floor(4000 / (this.worldState.speed || 1)));
    this.timerId = window.setInterval(() => {
      if (!this.worldState.isPaused && !this.isProcessingTick) {
        this.stepTick();
      }
    }, intervalMs);
  }

  public stopLoop() {
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  /**
   * Advance World Clock by 10 simulation minutes and cycle day/weather
   */
  private advanceClock(): { newTimeStr: string; tick: number } {
    let { day, hour, minute, tickCount } = this.worldState;
    minute += 10;
    if (minute >= 60) {
      minute = 0;
      hour += 1;
    }
    if (hour >= 24) {
      hour = 0;
      day += 1;
    }
    tickCount += 1;

    // Dynamic Weather progression
    let weather: WeatherType = this.worldState.weather;
    if (hour >= 5 && hour < 9) weather = 'clear';
    else if (hour >= 9 && hour < 16) {
      if (Math.random() > 0.85) weather = 'gentle_rain';
      else weather = 'clear';
    } else if (hour >= 16 && hour < 19) weather = 'golden_hour';
    else if (hour >= 19 && hour < 21) weather = 'twilight';
    else weather = 'starry_night';

    this.worldState = {
      ...this.worldState,
      day,
      hour,
      minute,
      tickCount,
      weather,
      updatedAt: new Date().toISOString(),
    };

    const newTimeStr = `Day ${day}, ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    return { newTimeStr, tick: tickCount };
  }

  /**
   * Execute 1 complete Simulation Step for all characters
   */
  public async stepTick(): Promise<void> {
    if (this.isProcessingTick) return;
    this.isProcessingTick = true;

    try {
      const { newTimeStr, tick } = this.advanceClock();

      // Pick an active character to perform autonomous decision this tick
      // (Rotates through characters or evaluates all awake characters sequentially)
      for (const char of [...this.characters]) {
        // Step 1: Check Quota and Sleep lifecycle
        const { isSleepingDueToQuota, updatedCharacter } =
          CharacterBrain.checkQuotaAndSleepState(char, tick);

        if (isSleepingDueToQuota) {
          // Update character in roster
          this.updateCharacterInState(updatedCharacter);

          // If recently put to quota sleep, emit chronicle event
          if (char.status !== 'quota_sleeping') {
            const dorm = this.locations.find((l) => l.id === char.locationId);
            this.addEvent({
              id: `evt_quota_${char.id}_${tick}`,
              tick,
              worldTime: newTimeStr,
              characterId: char.id,
              characterName: char.name,
              locationId: char.locationId,
              locationName: dorm?.name || 'Sanctuary',
              type: 'quota_sleep',
              headline: `${char.name} entered cognitive slumber (Quota exhausted)`,
              details: updatedCharacter.sleepReason || 'Cognitive quota exhausted. Sleeping to recharge.',
              internalThought: 'Resting consciousness until world quota resets...',
              isValidated: true,
              createdAt: new Date().toISOString(),
            });
          }
          continue; // cannot act while sleeping
        }

        // Recover energy slightly if naturally resting or sleeping
        if (updatedCharacter.status === 'resting' || updatedCharacter.status === 'sleeping') {
          updatedCharacter.energy = Math.min(100, updatedCharacter.energy + 10);
          if (updatedCharacter.energy >= 80) {
            updatedCharacter.status = 'awake';
            updatedCharacter.currentAction = `Woke up feeling rejuvenated in ${this.getLocationName(updatedCharacter.locationId)}`;
          }
          this.updateCharacterInState(updatedCharacter);
          continue;
        }

        // Physical Geographic Transit Progression
        if (updatedCharacter.status === 'in_transit' && updatedCharacter.transit) {
          updatedCharacter.transit.remainingTicks -= 1;
          const originLoc = this.locations.find((l) => l.id === updatedCharacter.transit!.originLocationId);
          const destLoc = this.locations.find((l) => l.id === updatedCharacter.transit!.destinationLocationId);

          if (updatedCharacter.transit.remainingTicks <= 0 && destLoc) {
            // Physical arrival at geographic destination!
            const destLocalTime = getLocalTime(this.worldState.hour, this.worldState.minute, destLoc.timezoneOffset, destLoc.ianaTimezone);
            updatedCharacter.locationId = destLoc.id;
            updatedCharacter.latitude = destLoc.coordinates.lat;
            updatedCharacter.longitude = destLoc.coordinates.lng;
            updatedCharacter.city = destLoc.city;
            updatedCharacter.country = destLoc.country;
            updatedCharacter.ianaTimezone = destLoc.ianaTimezone;
            updatedCharacter.status = 'awake';
            updatedCharacter.currentAction = `Arrived in ${destLoc.name} (${destLoc.country}) after traveling ${updatedCharacter.transit.distanceKm} km`;
            updatedCharacter.internalMonologue = `Stepped out into ${destLoc.name}. Local time is ${destLocalTime.formatted} (${destLoc.timezoneName}). The climate feels ${destLoc.climateBiome.toLowerCase()}.`;

            this.addEvent({
              id: `evt_arrival_${updatedCharacter.id}_${tick}`,
              tick,
              worldTime: `${newTimeStr} UTC`,
              localTime: `${destLocalTime.formatted} (${destLoc.timezoneName})`,
              characterId: updatedCharacter.id,
              characterName: updatedCharacter.name,
              locationId: destLoc.id,
              locationName: destLoc.name,
              type: 'arrival',
              headline: `${updatedCharacter.name} arrived in ${destLoc.name} (${destLoc.country})`,
              details: `Completed physical journey from ${originLoc?.name || 'Origin'} via ${updatedCharacter.transit.transitType.replace(/_/g, ' ')} (${updatedCharacter.transit.distanceKm} km). Local time: ${destLocalTime.formatted} (${destLocalTime.daylightPhase}).`,
              internalThought: updatedCharacter.internalMonologue,
              isValidated: true,
              createdAt: new Date().toISOString(),
            });

            await this.memoryEngine.recordMemory({
              id: `mem_arr_${updatedCharacter.id}_${tick}`,
              characterId: updatedCharacter.id,
              worldTime: `${newTimeStr} UTC`,
              localTime: `${destLocalTime.formatted} (${destLoc.timezoneName})`,
              tick,
              content: `Arrived in ${destLoc.name} (${destLoc.country}) via ${updatedCharacter.transit.transitType.replace(/_/g, ' ')} after traveling ${updatedCharacter.transit.distanceKm} km. Local time was ${destLocalTime.formatted}.`,
              type: 'observation',
              importance: 7,
              tags: ['travel', 'arrival', destLoc.id, destLoc.country.toLowerCase()],
              locationId: destLoc.id,
              createdAt: new Date().toISOString(),
            });

            updatedCharacter.transit = undefined;
            this.updateCharacterInState(updatedCharacter);
            this.syncCharacterToFirestore(updatedCharacter);
          } else if (destLoc) {
            // Still traveling en route - interpolate Earth coordinates dynamically
            const total = updatedCharacter.transit.totalTicks;
            const remaining = updatedCharacter.transit.remainingTicks;
            const progress = (total - remaining) / total;
            if (originLoc) {
              updatedCharacter.latitude = Number((originLoc.coordinates.lat + (destLoc.coordinates.lat - originLoc.coordinates.lat) * progress).toFixed(4));
              updatedCharacter.longitude = Number((originLoc.coordinates.lng + (destLoc.coordinates.lng - originLoc.coordinates.lng) * progress).toFixed(4));
            }
            const remainingKm = Math.round((remaining / total) * updatedCharacter.transit.distanceKm);
            const progressPercent = Math.round(progress * 100);
            updatedCharacter.currentAction = `Traveling to ${destLoc.name} via ${updatedCharacter.transit.transitType.replace(/_/g, ' ')} (${progressPercent}% complete, ${remainingKm} km remaining)`;
            this.updateCharacterInState(updatedCharacter);
            this.syncCharacterToFirestore(updatedCharacter);
          }
          continue; // In-transit characters do not perform city tasks
        }

        // Step 2: Context Gathering
        const currentLoc = this.locations.find((l) => l.id === updatedCharacter.locationId)!;
        const connectedLocs = this.locations.filter((l) =>
          currentLoc.connectedLocationIds.includes(l.id)
        );
        const presentChars = this.characters.filter(
          (c) => c.locationId === updatedCharacter.locationId && c.id !== updatedCharacter.id
        );

        // Fetch top relevant & recent memories for this context
        const relevantMemories = await this.memoryEngine.fetchRelevantMemories({
          characterId: updatedCharacter.id,
          currentTick: tick,
          locationId: currentLoc.id,
          locationName: currentLoc.name,
          presentCharacterIds: presentChars.map((c) => c.id),
          presentCharacterNames: presentChars.map((c) => c.name),
          currentGoal: updatedCharacter.currentGoal,
          activeWorldEvent: this.worldState.activeEvent,
          limitCount: 4,
        });

        // Get active relationships with present people
        const presentRels = this.relationships.filter(
          (r) =>
            r.characterId === updatedCharacter.id &&
            presentChars.some((c) => c.id === r.targetCharacterId)
        );

        // Step 3: AI Proposes Action
        updatedCharacter.status = 'thinking';
        this.updateCharacterInState(updatedCharacter);
        this.notify();

        const { proposal, quotaConsumed } = await CharacterBrain.proposeAction({
          character: updatedCharacter,
          worldState: this.worldState,
          currentLocation: currentLoc,
          connectedLocations: connectedLocs,
          presentCharacters: presentChars,
          relevantMemories,
          relationshipsWithPresent: presentRels,
        });

        // Step 4: Simulation Validates
        const validation = SimulationValidator.validate(
          updatedCharacter,
          proposal,
          this.worldState,
          this.locations,
          this.characters
        );

        // Step 5: Simulation Updates World & Character State
        const action = validation.executedAction;

        // Apply stat changes
        updatedCharacter.energy = Math.max(0, Math.min(100, updatedCharacter.energy + validation.energyDelta));
        updatedCharacter.social = Math.max(0, Math.min(100, updatedCharacter.social + validation.socialDelta));
        updatedCharacter.purpose = Math.max(0, Math.min(100, updatedCharacter.purpose + validation.purposeDelta));

        // Location move or Physical Transit
        if (validation.initiatesTransit) {
          updatedCharacter.status = 'in_transit';
          updatedCharacter.transit = validation.initiatesTransit;
          updatedCharacter.currentAction = action.actionDescription;
          updatedCharacter.internalMonologue = action.internalMonologue;
          updatedCharacter.lastActionTick = tick;

          const currentLoc = this.locations.find((l) => l.id === updatedCharacter.locationId);
          const local = currentLoc ? getLocalTime(this.worldState.hour, this.worldState.minute, currentLoc.timezoneOffset) : null;

          this.addEvent({
            id: `evt_dep_${updatedCharacter.id}_${tick}`,
            tick,
            worldTime: `${newTimeStr} UTC`,
            localTime: local ? `${local.formatted} (${currentLoc?.timezoneName})` : undefined,
            characterId: updatedCharacter.id,
            characterName: updatedCharacter.name,
            locationId: updatedCharacter.locationId,
            locationName: currentLoc?.name || 'World Hub',
            type: 'transit',
            headline: `${updatedCharacter.name} departed ${currentLoc?.name} for ${validation.initiatesTransit.destinationLocationName}`,
            details: `Boarded ${validation.initiatesTransit.transitType.replace(/_/g, ' ')} covering ${validation.initiatesTransit.distanceKm} km (~${validation.initiatesTransit.totalTicks * 10} sim minutes).`,
            internalThought: action.internalMonologue,
            isValidated: true,
            createdAt: new Date().toISOString(),
          });

          if (action.memoryToForm) {
            await this.memoryEngine.recordMemory({
              id: `mem_${updatedCharacter.id}_${Date.now()}`,
              characterId: updatedCharacter.id,
              worldTime: `${newTimeStr} UTC`,
              localTime: local ? `${local.formatted} (${currentLoc?.timezoneName})` : undefined,
              tick,
              content: action.memoryToForm.content,
              type: action.memoryToForm.type,
              importance: action.memoryToForm.importance,
              tags: action.memoryToForm.tags,
              locationId: updatedCharacter.locationId,
              createdAt: new Date().toISOString(),
            });
          }

          if (quotaConsumed) {
            updatedCharacter.brainConfig.quotaUsed = (updatedCharacter.brainConfig.quotaUsed || 0) + 1;
          }

          this.updateCharacterInState(updatedCharacter);
          continue;
        } else if (action.actionType === 'MOVE' && action.targetLocationId) {
          updatedCharacter.locationId = action.targetLocationId;
        }

        // Status update
        if (action.actionType === 'TALK') updatedCharacter.status = 'talking';
        else if (action.actionType === 'WORK') updatedCharacter.status = 'working';
        else if (action.actionType === 'REST') updatedCharacter.status = 'resting';
        else updatedCharacter.status = 'awake';

        updatedCharacter.currentAction = action.actionDescription;
        updatedCharacter.internalMonologue = action.internalMonologue;
        updatedCharacter.lastActionTick = tick;

        // Quota usage update
        if (quotaConsumed) {
          updatedCharacter.brainConfig.quotaUsed = (updatedCharacter.brainConfig.quotaUsed || 0) + 1;
        }

        this.updateCharacterInState(updatedCharacter);

        // Update Relationship if TALK action with another character
        if (action.actionType === 'TALK' && action.targetCharacterId) {
          this.updateRelationship(
            updatedCharacter.id,
            action.targetCharacterId,
            validation.affinityDelta || 2,
            validation.trustDelta || 1,
            action.dialogue || action.actionDescription
          );
        }

        // Form and store new Memory in Firestore & local engine with Local Time
        const eventLoc = this.locations.find((l) => l.id === updatedCharacter.locationId);
        const charLocalTime = eventLoc ? getLocalTime(this.worldState.hour, this.worldState.minute, eventLoc.timezoneOffset) : null;

        if (action.memoryToForm) {
          const newMem: Memory = {
            id: `mem_${updatedCharacter.id}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            characterId: updatedCharacter.id,
            worldTime: `${newTimeStr} UTC`,
            localTime: charLocalTime ? `${charLocalTime.formatted} (${eventLoc?.timezoneName})` : undefined,
            tick,
            content: action.memoryToForm.content,
            type: action.memoryToForm.type,
            importance: action.memoryToForm.importance,
            tags: action.memoryToForm.tags || [],
            locationId: updatedCharacter.locationId,
            relatedCharacterIds: action.targetCharacterId ? [action.targetCharacterId] : undefined,
            createdAt: new Date().toISOString(),
          };
          await this.memoryEngine.recordMemory(newMem);
        }

        // Emit Chronicle World Event
        this.addEvent({
          id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          tick,
          worldTime: `${newTimeStr} UTC`,
          localTime: charLocalTime ? `${charLocalTime.formatted} (${eventLoc?.timezoneName})` : undefined,
          characterId: updatedCharacter.id,
          characterName: updatedCharacter.name,
          locationId: updatedCharacter.locationId,
          locationName: eventLoc?.name || 'World Hub',
          type:
            action.actionType === 'TALK'
              ? 'dialogue'
              : action.actionType === 'MOVE'
              ? 'move'
              : action.actionType === 'REST'
              ? 'rest'
              : action.actionType === 'REFLECT'
              ? 'reflection'
              : 'action',
          headline: `${updatedCharacter.name}: ${action.actionType} in ${eventLoc?.name}`,
          details: action.actionDescription,
          internalThought: action.internalMonologue,
          spokenDialogue: action.dialogue || undefined,
          isValidated: validation.isValid,
          createdAt: new Date().toISOString(),
        });

        // Persist character update to Firestore
        this.syncCharacterToFirestore(updatedCharacter);
      }

      // Sync World State to Firestore
      this.syncWorldStateToFirestore();

      this.notify();
    } catch (err) {
      console.error('Simulation loop error:', err);
    } finally {
      this.isProcessingTick = false;
    }
  }

  // Helper state updates
  private updateCharacterInState(char: Character) {
    const idx = this.characters.findIndex((c) => c.id === char.id);
    if (idx !== -1) {
      this.characters[idx] = { ...char, updatedAt: new Date().toISOString() };
    }
  }

  private updateRelationship(
    charId: string,
    targetId: string,
    affinityDelta: number,
    trustDelta: number,
    interactionSummary: string
  ) {
    let rel = this.relationships.find(
      (r) => r.characterId === charId && r.targetCharacterId === targetId
    );

    if (rel) {
      rel.affinity = Math.max(-100, Math.min(100, rel.affinity + affinityDelta));
      rel.trust = Math.max(0, Math.min(100, rel.trust + trustDelta));
      rel.lastInteraction = interactionSummary;
      rel.updatedAt = new Date().toISOString();

      // Update label
      if (rel.affinity > 60 && rel.trust > 60) rel.status = 'close_friend';
      else if (rel.affinity > 25) rel.status = 'friendly';
      else if (rel.affinity < -30) rel.status = 'rival';
      else rel.status = 'acquaintance';
    } else {
      rel = {
        id: `rel_${charId}_${targetId}`,
        characterId: charId,
        targetCharacterId: targetId,
        affinity: affinityDelta,
        trust: Math.max(10, 20 + trustDelta),
        status: 'acquaintance',
        lastInteraction: interactionSummary,
        updatedAt: new Date().toISOString(),
      };
      this.relationships.push(rel);
    }

    // Reciprocal relationship update
    let recipRel = this.relationships.find(
      (r) => r.characterId === targetId && r.targetCharacterId === charId
    );
    if (recipRel) {
      recipRel.affinity = Math.max(-100, Math.min(100, recipRel.affinity + Math.floor(affinityDelta * 0.7)));
      recipRel.trust = Math.max(0, Math.min(100, recipRel.trust + Math.floor(trustDelta * 0.7)));
      recipRel.lastInteraction = interactionSummary;
      recipRel.updatedAt = new Date().toISOString();
    }
  }

  public addEvent(event: WorldEvent) {
    this.events.unshift(event);
    if (this.events.length > 80) {
      this.events = this.events.slice(0, 80);
    }
    // Also try saving to Firestore
    this.syncEventToFirestore(event);
  }

  public getLocationName(locId: string): string {
    return this.locations.find((l) => l.id === locId)?.name || locId;
  }

  /**
   * Inject a global world event that characters perceive
   */
  public triggerWorldEvent(headline: string, details: string) {
    this.worldState.activeEvent = headline;
    const timeStr = `Day ${this.worldState.day}, ${String(this.worldState.hour).padStart(2, '0')}:${String(this.worldState.minute).padStart(2, '0')}`;
    this.addEvent({
      id: `evt_manual_${Date.now()}`,
      tick: this.worldState.tickCount,
      worldTime: timeStr,
      locationId: 'commons',
      locationName: 'Evara Living World',
      type: 'environmental',
      headline,
      details,
      isValidated: true,
      createdAt: new Date().toISOString(),
    });
    this.notify();
  }

  /**
   * Dispatch a character on a physical geographic journey to another hub
   */
  public travelCharacter(characterId: string, destinationId: string): boolean {
    const char = this.characters.find((c) => c.id === characterId);
    const destLoc = this.locations.find((l) => l.id === destinationId);
    if (!char || !destLoc || char.locationId === destinationId) return false;

    const currentLoc = this.locations.find((l) => l.id === char.locationId);
    const route = currentLoc?.routes.find((r) => r.destinationId === destinationId);

    const distanceKm = route ? route.distanceKm : 1200;
    const transitType = route ? route.transitType : 'overland_trek';
    const travelTicks = route ? Math.max(1, route.travelTicks) : 3;

    char.status = 'in_transit';
    char.transit = {
      originLocationId: char.locationId,
      originLocationName: currentLoc?.name || 'Origin',
      destinationLocationId: destLoc.id,
      destinationLocationName: destLoc.name,
      transitType,
      distanceKm,
      totalTicks: travelTicks,
      remainingTicks: travelTicks,
      startedAtTick: this.worldState.tickCount,
    };
    char.currentAction = `Boarded ${transitType.replace(/_/g, ' ')} traveling from ${currentLoc?.name} to ${destLoc.name} (${distanceKm} km)`;
    char.internalMonologue = `Packed travel supplies and departed ${currentLoc?.name}. Watching the terrain shift towards ${destLoc.name}.`;

    const timeStr = `Day ${this.worldState.day}, ${String(this.worldState.hour).padStart(2, '0')}:${String(this.worldState.minute).padStart(2, '0')} UTC`;
    this.addEvent({
      id: `evt_travel_${char.id}_${Date.now()}`,
      tick: this.worldState.tickCount,
      worldTime: timeStr,
      characterId: char.id,
      characterName: char.name,
      locationId: char.locationId,
      locationName: currentLoc?.name || 'Origin',
      type: 'move',
      headline: `${char.name} embarked on physical transit to ${destLoc.name}`,
      details: `Departed ${currentLoc?.name} aboard ${transitType.replace(/_/g, ' ')} traveling ${distanceKm} km across physical geography towards ${destLoc.name} (${destLoc.country}). Estimated duration: ~${travelTicks * 10} min (${travelTicks} ticks).`,
      internalThought: char.internalMonologue,
      isValidated: true,
      createdAt: new Date().toISOString(),
    });

    this.syncCharacterToFirestore(char);
    this.notify();
    return true;
  }

  /**
   * Add a newly created character to the living world
   */
  public addCharacter(newChar: Character) {
    const loc = this.locations.find((l) => l.id === newChar.locationId);
    if (loc) {
      newChar.latitude = newChar.latitude ?? loc.coordinates.lat;
      newChar.longitude = newChar.longitude ?? loc.coordinates.lng;
      newChar.city = newChar.city || loc.city;
      newChar.country = newChar.country || loc.country;
      newChar.ianaTimezone = newChar.ianaTimezone || loc.ianaTimezone;
    }
    this.characters.push(newChar);
    const timeStr = `Day ${this.worldState.day}, ${String(this.worldState.hour).padStart(2, '0')}:${String(this.worldState.minute).padStart(2, '0')}`;

    // Initial starter memory
    const initMem: Memory = {
      id: `mem_${newChar.id}_init`,
      characterId: newChar.id,
      worldTime: timeStr,
      tick: this.worldState.tickCount,
      content: `Arrived in Evara at ${loc?.name}. Goal: ${newChar.currentGoal}.`,
      type: 'decision',
      importance: 8,
      tags: ['arrival', newChar.locationId, 'goal'],
      locationId: newChar.locationId,
      createdAt: new Date().toISOString(),
    };
    this.memoryEngine.recordMemory(initMem);

    this.addEvent({
      id: `evt_arrive_${newChar.id}`,
      tick: this.worldState.tickCount,
      worldTime: timeStr,
      characterId: newChar.id,
      characterName: newChar.name,
      locationId: newChar.locationId,
      locationName: loc?.name || 'Evara',
      type: 'action',
      headline: `${newChar.name} joined the simulation`,
      details: `${newChar.name} (${newChar.title}) has entered ${loc?.name} with AI Brain model: ${newChar.brainConfig.modelName}.`,
      internalThought: newChar.internalMonologue,
      isValidated: true,
      createdAt: new Date().toISOString(),
    });

    this.syncCharacterToFirestore(newChar);
    this.notify();
  }

  // Firestore synchronizers
  public async syncCharacterToFirestore(char: Character) {
    try {
      const docRef = doc(db, 'characters', char.id);
      const payload: Record<string, any> = {
        id: char.id,
        name: char.name,
        title: char.title,
        bio: char.bio,
        personality: char.personality,
        avatarColor: char.avatarColor,
        locationId: char.locationId,
        latitude: char.latitude,
        longitude: char.longitude,
        city: char.city,
        country: char.country,
        ianaTimezone: char.ianaTimezone,
        status: char.status,
        energy: char.energy,
        social: char.social,
        purpose: char.purpose,
        currentGoal: char.currentGoal,
        currentAction: char.currentAction,
        internalMonologue: char.internalMonologue,
        brainConfig: char.brainConfig,
        lastActionTick: char.lastActionTick,
        createdAt: char.createdAt,
        updatedAt: new Date().toISOString(),
      };
      if (char.transit) payload.transit = char.transit;
      if (char.sleepReason) payload.sleepReason = char.sleepReason;
      if (char.ownerId) payload.ownerId = char.ownerId;
      await setDoc(docRef, payload, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `characters/${char.id}`);
    }
  }

  public async syncAllCharactersToFirestore() {
    for (const char of this.characters) {
      await this.syncCharacterToFirestore(char);
    }
  }

  private async syncWorldStateToFirestore() {
    try {
      const docRef = doc(db, 'world', 'current');
      await setDoc(docRef, this.worldState);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'world/current');
    }
  }

  private async syncEventToFirestore(event: WorldEvent) {
    try {
      const docRef = doc(db, 'events', event.id);
      await setDoc(docRef, event);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `events/${event.id}`);
    }
  }
}

// Singleton world instance
export const evaraWorld = new WorldEngine();
