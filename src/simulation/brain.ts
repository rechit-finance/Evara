import {
  ActionProposal,
  Character,
  Location,
  Memory,
  Relationship,
  WorldState,
} from '../types/world';
import { ScoredMemory } from './memoryEngine';

export interface BrainDecisionContext {
  character: Character;
  worldState: WorldState;
  currentLocation: Location;
  connectedLocations: Location[];
  presentCharacters: Character[];
  relevantMemories: ScoredMemory[];
  relationshipsWithPresent: Relationship[];
}

export class CharacterBrain {
  /**
   * Evaluates quota status. Returns true if character is forced to sleep due to quota exhaustion.
   */
  public static checkQuotaAndSleepState(
    character: Character,
    currentTick: number
  ): { isSleepingDueToQuota: boolean; updatedCharacter: Character } {
    const updated = { ...character };
    const brain = { ...updated.brainConfig };

    // Reset quota if reset tick reached
    if (currentTick >= brain.quotaResetTick) {
      brain.quotaUsed = 0;
      brain.quotaResetTick = currentTick + 15; // resets every 15 world ticks
      if (updated.status === 'quota_sleeping') {
        updated.status = 'awake';
        updated.sleepReason = undefined;
      }
    }

    // Check if quota limit reached
    if (brain.quotaUsed >= brain.quotaLimit) {
      updated.status = 'quota_sleeping';
      updated.sleepReason = `AI decision quota reached (${brain.quotaUsed}/${brain.quotaLimit}). Sleeping until tick #${brain.quotaResetTick}.`;
      updated.currentAction = `Sleeping deeply to recharge cognitive quota (awakens at tick #${brain.quotaResetTick})`;
      updated.internalMonologue = 'My thoughts are dimming... entering meditative cognitive slumber until the world clock resets.';
      updated.brainConfig = brain;
      return { isSleepingDueToQuota: true, updatedCharacter: updated };
    }

    updated.brainConfig = brain;
    return { isSleepingDueToQuota: false, updatedCharacter: updated };
  }

  /**
   * Main AI decision entry point. Proposes an authentic action for this character.
   */
  public static async proposeAction(
    context: BrainDecisionContext
  ): Promise<{ proposal: ActionProposal; quotaConsumed: boolean }> {
    const { character, worldState, currentLocation, presentCharacters, relevantMemories, relationshipsWithPresent } = context;

    // If character is configured with the autonomous heuristic engine, skip network API call directly
    if (
      character.brainConfig?.brainType === 'autonomous_heuristic' ||
      character.brainConfig?.modelName === 'autonomous-heuristic'
    ) {
      const heuristicProposal = this.generateAutonomousHeuristicAction(context);
      return { proposal: heuristicProposal, quotaConsumed: true };
    }

    // Try server-side Gemini decision first for AI-connected characters
    try {
      const response = await fetch('/api/decide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character: {
            name: character.name,
            title: character.title,
            personality: character.personality,
            bio: character.bio,
            energy: character.energy,
            social: character.social,
            purpose: character.purpose,
            currentGoal: character.currentGoal,
            brainConfig: character.brainConfig,
          },
          context: {
            worldTime: `Day ${worldState.day}, ${String(worldState.hour).padStart(2, '0')}:${String(worldState.minute).padStart(2, '0')}`,
            weather: worldState.weather,
            activeEvent: worldState.activeEvent,
            locationName: currentLocation.name,
            locationDescription: currentLocation.description,
            relevantMemories: relevantMemories.map((sm) => ({
              worldTime: sm.memory.worldTime,
              content: sm.memory.content,
              type: sm.memory.type,
              importance: sm.memory.importance,
            })),
            relationships: relationshipsWithPresent.map((r) => {
              const target = presentCharacters.find((c) => c.id === r.targetCharacterId);
              return {
                targetName: target?.name || 'Someone',
                affinity: r.affinity,
                trust: r.trust,
                status: r.status,
              };
            }),
          },
          connectedLocations: context.connectedLocations.map((l) => `${l.id}: ${l.name}`),
          presentCharacters: presentCharacters.map((c) => ({
            id: c.id,
            name: c.name,
            title: c.title,
          })),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.decision) {
          return { proposal: data.decision, quotaConsumed: true };
        }
      }
    } catch (err) {
      // Graceful fallback to heuristic decision engine
      console.warn('Using autonomous simulation heuristic for', character.name, err);
    }

    // High-fidelity autonomous simulation decision engine
    const heuristicProposal = this.generateAutonomousHeuristicAction(context);
    return { proposal: heuristicProposal, quotaConsumed: true };
  }

  /**
   * Autonomous Reasoning Decision Engine:
   * Considers character's current needs, goals, environment, nearby people, and retrieved memories.
   */
  private static generateAutonomousHeuristicAction(
    context: BrainDecisionContext
  ): ActionProposal {
    const { character, currentLocation, connectedLocations, presentCharacters, relevantMemories } = context;

    // Need 1: Very low energy -> Rest
    if (character.energy < 25) {
      // If dormitory is connected and we aren't there, walk to dormitory
      const dorm = connectedLocations.find((l) => l.id === 'dormitory');
      if (dorm && character.locationId !== 'dormitory') {
        return {
          actionType: 'MOVE',
          targetLocationId: 'dormitory',
          internalMonologue: `I'm exhausted. I must head to the dormitory to sleep before I collapse.`,
          actionDescription: `${character.name} yawned and began walking toward ${dorm.name}.`,
          expectedEnergyCost: 4,
          memoryToForm: {
            content: `Left ${currentLocation.name} to head to the dormitory for much-needed rest.`,
            type: 'decision',
            importance: 5,
            tags: ['tired', 'move', 'dormitory'],
          },
        };
      }

      return {
        actionType: 'REST',
        targetLocationId: character.locationId,
        internalMonologue: `My limbs feel heavy. A short rest here is essential.`,
        actionDescription: `${character.name} settled onto a bench in ${currentLocation.name}, closing their eyes to rest.`,
        expectedEnergyCost: -15,
        memoryToForm: {
          content: `Rested quietly in ${currentLocation.name} to regain strength.`,
          type: 'reflection',
          importance: 4,
          tags: ['rest', 'recovery', character.locationId],
        },
      };
    }

    // Need 2: Low social + someone in room -> Talk
    if (character.social < 45 && presentCharacters.length > 0) {
      const companion = presentCharacters[0];
      const memorySnippet = relevantMemories.find((m) =>
        m.memory.relatedCharacterIds?.includes(companion.id)
      );

      const dialogue = memorySnippet
        ? `"${companion.name}, I was recalling earlier when we discussed ${memorySnippet.memory.tags[0] || 'our work'}. How is your progress?"`
        : `"${companion.name}, good day to you. The morning atmosphere here at ${currentLocation.name} is quite remarkable."`;

      return {
        actionType: 'TALK',
        targetCharacterId: companion.id,
        dialogue,
        internalMonologue: `It is good to see ${companion.name}. I've been isolated with my own thoughts for too long.`,
        actionDescription: `${character.name} greeted ${companion.name} with warm attentiveness.`,
        expectedEnergyCost: 3,
        memoryToForm: {
          content: `Had a pleasant conversation with ${companion.name} in ${currentLocation.name}.`,
          type: 'dialogue',
          importance: 6,
          tags: ['conversation', companion.name.toLowerCase(), character.locationId],
        },
      };
    }

    // Need 3: High purpose drive & suitable location -> Work
    if (character.purpose < 85 && character.locationId !== 'dormitory') {
      const suitable = currentLocation.suitableActivities[0] || 'pursuing specialized craft';
      return {
        actionType: 'WORK',
        targetLocationId: character.locationId,
        internalMonologue: `Focus is key. My goal remains: ${character.currentGoal}. Time to make measurable headway.`,
        actionDescription: `${character.name} immersed themselves in ${suitable.toLowerCase()} in ${currentLocation.name}.`,
        expectedEnergyCost: 8,
        memoryToForm: {
          content: `Made notable progress on ${character.currentGoal} while in ${currentLocation.name}.`,
          type: 'observation',
          importance: 7,
          tags: ['work', 'goal', character.locationId],
        },
      };
    }

    // Need 4: Wandering or exploring connected locations
    if (connectedLocations.length > 0 && Math.random() > 0.45) {
      // Pick connected location
      const targetLoc = connectedLocations[Math.floor(Math.random() * connectedLocations.length)];
      return {
        actionType: 'MOVE',
        targetLocationId: targetLoc.id,
        internalMonologue: `I've stayed in ${currentLocation.name} long enough. Perhaps ${targetLoc.name} holds what I'm looking for.`,
        actionDescription: `${character.name} gathered their belongings and set out toward ${targetLoc.name}.`,
        expectedEnergyCost: 5,
        memoryToForm: {
          content: `Walked from ${currentLocation.name} to ${targetLoc.name}.`,
          type: 'decision',
          importance: 5,
          tags: ['travel', targetLoc.id],
        },
      };
    }

    // Default: Reflect on environment
    const randomItem = currentLocation.items[Math.floor(Math.random() * currentLocation.items.length)] || 'the surroundings';
    return {
      actionType: 'INTERACT_OBJECT',
      internalMonologue: `Observing the ${randomItem}. Everything in Evara has a pattern if one looks closely.`,
      actionDescription: `${character.name} examined ${randomItem} thoughtfully in ${currentLocation.name}.`,
      expectedEnergyCost: 3,
      memoryToForm: {
        content: `Studied ${randomItem} in ${currentLocation.name}, noting subtle craftsmanship and age.`,
        type: 'observation',
        importance: 5,
        tags: ['observation', character.locationId],
      },
    };
  }
}
