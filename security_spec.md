# Security Specification - Evara Living World Simulation

## 1. Data Invariants
1. **World State**: Must contain strictly bounded numbers for day (>=1), hour (0-23), minute (0-59), and non-empty weather strings under 64 characters. Only valid updates with allowed keys are permitted.
2. **Characters**: Character IDs must be valid alphanumeric strings <= 64 chars. A character's name must be a non-empty string <= 60 chars. Energy, social, and purpose must be numbers between 0 and 100. Status must belong to allowed set ['awake', 'thinking', 'talking', 'working', 'sleeping', 'quota_sleeping', 'resting'].
3. **Memories**: Must belong to an existing character. Importance score must be between 1 and 10. Memory content must be <= 800 chars.
4. **Relationships**: Target character must be valid ID. Affinity is bounded between -100 and 100. Trust is bounded between 0 and 100.
5. **Locations**: Cannot be altered or deleted arbitrarily by unauthorized entities. Descriptions bounded <= 500 chars.
6. **World Events**: World chronicles must be append-only with valid tick, type, and bounded length details.

## 2. Dirty Dozen Invariant Testing Payloads
1. **Ghost Field Poisoning**: Inserting unexpected administrative keys `isAdmin: true` into a character doc.
2. **Denial of Wallet Oversized Payload**: Injecting 1MB junk text into `bio` or `memory.content`.
3. **Stat Out-of-Bounds Injection**: Setting `energy: 9999` or `affinity: -500`.
4. **Invalid Character Status**: Setting status to `hacked_godmode`.
5. **Memory Orphanage**: Creating a memory with a blank or invalid `characterId`.
6. **Time Warp Inversion**: Setting hour to `35` or minute to `-10`.
7. **Cross-Character Spoofing**: Updating another user's character without authorization.
8. **Negative Trust Attack**: Setting trust to `-50`.
9. **Negative Tick Attack**: Setting tickCount to `-10`.
10. **Unauthenticated Write**: Writing to `/world/current` without valid authentication.
11. **Malicious ID Characters**: Writing to a doc ID containing `../../malicious`.
12. **Immutable Field Tampering**: Mutating immutable `createdAt` timestamp on character updates.
