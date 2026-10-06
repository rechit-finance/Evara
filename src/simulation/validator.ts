import { ActionProposal, Character, Location, ValidationResult, WorldState } from '../types/world';

export class SimulationValidator {
  /**
   * Validates an AI-proposed action against physical geography, real distance routes,
   * local capacity, and social presence.
   */
  public static validate(
    character: Character,
    proposal: ActionProposal,
    worldState: WorldState,
    locations: Location[],
    characters: Character[]
  ): ValidationResult {
    const currentLocation = locations.find((l) => l.id === character.locationId);
    const presentOthers = characters.filter(
      (c) => c.locationId === character.locationId && c.id !== character.id && c.status !== 'in_transit'
    );

    // Rule 0: Character currently in physical transit
    if (character.status === 'in_transit' && character.transit) {
      const remainingKm = Math.round(
        (character.transit.remainingTicks / character.transit.totalTicks) * character.transit.distanceKm
      );
      return {
        isValid: true,
        validationNote: `In transit: ${character.name} is physically en route to ${character.transit.destinationLocationName} (${remainingKm} km remaining).`,
        executedAction: {
          actionType: 'REST',
          internalMonologue: `Traveling across the landscape towards ${character.transit.destinationLocationName}. Watching the scenery pass.`,
          actionDescription: `${character.name} is currently traveling via ${character.transit.transitType.replace(/_/g, ' ')} (${remainingKm} km from ${character.transit.destinationLocationName}).`,
          expectedEnergyCost: -2,
        },
        energyDelta: -1,
        socialDelta: 0,
        purposeDelta: +1,
      };
    }

    // Rule 1: Exhaustion check
    if (character.energy <= 8 && proposal.actionType !== 'REST') {
      return {
        isValid: false,
        validationNote: `${character.name} is critically fatigued (Energy ${character.energy}%). Forcing involuntary rest.`,
        executedAction: {
          actionType: 'REST',
          targetLocationId: character.locationId,
          internalMonologue: 'I am too drained to travel or work. I must sit down and rest.',
          actionDescription: `${character.name} leaned back against a rest bench in ${currentLocation?.name || 'here'}, exhausted.`,
          expectedEnergyCost: -15,
          memoryToForm: {
            content: `Felt overwhelmingly exhausted in ${currentLocation?.name} and paused to rest.`,
            type: 'reflection',
            importance: 4,
            tags: ['exhaustion', 'rest', character.locationId],
          },
        },
        energyDelta: +18,
        socialDelta: -1,
        purposeDelta: 0,
      };
    }

    // Rule 2: MOVE validation - Physical Geographic Transit
    if (proposal.actionType === 'MOVE') {
      const destId = proposal.targetLocationId;
      const targetLoc = locations.find((l) => l.id === destId);

      if (!destId || !targetLoc || destId === character.locationId) {
        return {
          isValid: false,
          validationNote: `Invalid destination "${destId}". Remaining in ${currentLocation?.name}.`,
          executedAction: {
            ...proposal,
            actionType: 'REFLECT',
            actionDescription: `${character.name} reviewed local transit departure boards in ${currentLocation?.name}.`,
          },
          energyDelta: -2,
          socialDelta: 0,
          purposeDelta: +2,
        };
      }

      // Check route connectivity
      const route = currentLocation?.routes.find((r) => r.destinationId === destId);
      const isDirectlyConnected = currentLocation?.connectedLocationIds.includes(destId) || !!route;

      if (!isDirectlyConnected) {
        // Fallback to nearest accessible hub
        const fallbackRoute = currentLocation?.routes[0];
        const fallbackLoc = locations.find((l) => l.id === fallbackRoute?.destinationId) || currentLocation;

        return {
          isValid: false,
          validationNote: `No direct route from ${currentLocation?.name} to ${targetLoc.name}. Redirecting towards ${fallbackLoc?.name}.`,
          executedAction: {
            ...proposal,
            targetLocationId: fallbackLoc?.id,
            actionDescription: `${character.name} booked a ticket towards connecting hub ${fallbackLoc?.name}.`,
          },
          energyDelta: -5,
          socialDelta: 0,
          purposeDelta: +2,
        };
      }

      // Capacity check at destination
      const destinationOccupants = characters.filter((c) => c.locationId === destId && c.status !== 'in_transit').length;
      if (destinationOccupants >= targetLoc.capacity) {
        return {
          isValid: false,
          validationNote: `${targetLoc.name} is currently full to capacity.`,
          executedAction: {
            ...proposal,
            actionType: 'REST',
            actionDescription: `${character.name} postponed departure, seeing ${targetLoc.name} is full.`,
          },
          energyDelta: -1,
          socialDelta: 0,
          purposeDelta: 0,
        };
      }

      // Valid physical transit initiation!
      const transitDistance = route ? route.distanceKm : 500;
      const transitType = route ? route.transitType : 'overland_trek';
      const travelTicks = route ? Math.max(1, route.travelTicks) : 2;

      return {
        isValid: true,
        validationNote: `Route verified: Departing ${currentLocation?.name} for ${targetLoc.name} via ${transitType.replace(/_/g, ' ')} (${transitDistance} km).`,
        executedAction: {
          ...proposal,
          actionDescription: `${character.name} boarded ${transitType.replace(/_/g, ' ')} departing from ${currentLocation?.name} for ${targetLoc.name} (${transitDistance} km).`,
          memoryToForm: {
            content: `Departed ${currentLocation?.name} traveling to ${targetLoc.name} via ${transitType.replace(/_/g, ' ')} (${transitDistance} km).`,
            type: 'decision',
            importance: 6,
            tags: ['travel', transitType, currentLocation?.id || '', targetLoc.id],
          },
        },
        initiatesTransit: {
          originLocationId: currentLocation?.id || 'unknown',
          originLocationName: currentLocation?.name || 'Origin',
          destinationLocationId: targetLoc.id,
          destinationLocationName: targetLoc.name,
          transitType,
          distanceKm: transitDistance,
          totalTicks: travelTicks,
          remainingTicks: travelTicks,
          startedAtTick: worldState.tickCount,
        },
        energyDelta: -8,
        socialDelta: 0,
        purposeDelta: +5,
      };
    }

    // Rule 3: TALK validation
    if (proposal.actionType === 'TALK') {
      const targetChar = characters.find((c) => c.id === proposal.targetCharacterId);

      if (!targetChar || targetChar.id === character.id) {
        if (presentOthers.length > 0) {
          const alternate = presentOthers[0];
          return {
            isValid: false,
            validationNote: `Target not specified. Speaking with ${alternate.name} who is present in ${currentLocation?.name}.`,
            executedAction: {
              ...proposal,
              targetCharacterId: alternate.id,
              actionDescription: `${character.name} spoke with ${alternate.name} in ${currentLocation?.name}.`,
            },
            energyDelta: -3,
            socialDelta: +12,
            purposeDelta: +2,
            affinityDelta: +3,
            trustDelta: +2,
          };
        } else {
          return {
            isValid: false,
            validationNote: `No companions present in ${currentLocation?.name}. Converted to contemplation.`,
            executedAction: {
              ...proposal,
              actionType: 'REFLECT',
              actionDescription: `${character.name} pondered aloud in ${currentLocation?.name}: "${proposal.dialogue || 'A fascinating observation...'}"`,
            },
            energyDelta: -2,
            socialDelta: -1,
            purposeDelta: +3,
          };
        }
      }

      // Presence and Transit check
      if (targetChar.locationId !== character.locationId || targetChar.status === 'in_transit') {
        const targetCurrentLoc = locations.find((l) => l.id === targetChar.locationId);
        const where = targetChar.status === 'in_transit' ? 'currently in physical transit' : `at ${targetCurrentLoc?.name}`;
        return {
          isValid: false,
          validationNote: `${targetChar.name} is not present in ${currentLocation?.name} (they are ${where}).`,
          executedAction: {
            ...proposal,
            actionType: 'REFLECT',
            actionDescription: `${character.name} wished to speak with ${targetChar.name}, but noted they are ${where}.`,
          },
          energyDelta: -2,
          socialDelta: -2,
          purposeDelta: +1,
        };
      }

      // Sleeping check
      if (targetChar.status === 'sleeping' || targetChar.status === 'quota_sleeping') {
        return {
          isValid: false,
          validationNote: `${targetChar.name} is resting and cannot respond.`,
          executedAction: {
            ...proposal,
            actionType: 'REFLECT',
            actionDescription: `${character.name} stepped back quietly, letting ${targetChar.name} sleep.`,
          },
          energyDelta: -1,
          socialDelta: 0,
          purposeDelta: +1,
        };
      }

      return {
        isValid: true,
        validationNote: `Conversation validated with ${targetChar.name} in ${currentLocation?.name}.`,
        executedAction: proposal,
        energyDelta: -3,
        socialDelta: +15,
        purposeDelta: +3,
        affinityDelta: +4,
        trustDelta: +3,
      };
    }

    // Rule 4: WORK validation
    if (proposal.actionType === 'WORK') {
      return {
        isValid: true,
        validationNote: `Work effort validated at ${currentLocation?.name}.`,
        executedAction: proposal,
        energyDelta: -8,
        socialDelta: -2,
        purposeDelta: +10,
      };
    }

    // Rule 5: REST validation
    if (proposal.actionType === 'REST') {
      return {
        isValid: true,
        validationNote: `Resting in ${currentLocation?.name} (+16% energy).`,
        executedAction: proposal,
        energyDelta: +16,
        socialDelta: -1,
        purposeDelta: 0,
      };
    }

    // Rule 6: REFLECT validation
    if (proposal.actionType === 'REFLECT') {
      return {
        isValid: true,
        validationNote: `Reflection completed in ${currentLocation?.name}.`,
        executedAction: proposal,
        energyDelta: -1,
        socialDelta: 0,
        purposeDelta: +6,
      };
    }

    // Default fallback
    return {
      isValid: true,
      validationNote: 'Action validated.',
      executedAction: proposal,
      energyDelta: -2,
      socialDelta: 0,
      purposeDelta: +2,
    };
  }
}
