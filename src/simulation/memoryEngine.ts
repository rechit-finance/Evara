import { collection, doc, getDocs, setDoc, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrors';
import { Memory } from '../types/world';

export interface MemoryRetrievalContext {
  characterId: string;
  currentTick: number;
  locationId: string;
  locationName: string;
  presentCharacterIds: string[];
  presentCharacterNames: string[];
  currentGoal: string;
  activeWorldEvent?: string | null;
  limitCount?: number;
}

export interface ScoredMemory {
  memory: Memory;
  recencyScore: number;
  importanceScore: number;
  relevanceScore: number;
  totalScore: number;
  matchedKeywords: string[];
}

export class MemoryEngine {
  private localMemoryCache: Map<string, Memory[]> = new Map();

  constructor(initialMemories: Memory[] = []) {
    initialMemories.forEach((mem) => {
      this.addToLocalCache(mem);
    });
  }

  public addToLocalCache(mem: Memory) {
    const list = this.localMemoryCache.get(mem.characterId) || [];
    if (!list.some((m) => m.id === mem.id)) {
      list.push(mem);
      this.localMemoryCache.set(mem.characterId, list);
    }
  }

  public getLocalMemories(characterId: string): Memory[] {
    return this.localMemoryCache.get(characterId) || [];
  }

  /**
   * Fetch recent, relevant memories for a character's decision context
   */
  public async fetchRelevantMemories(
    context: MemoryRetrievalContext
  ): Promise<ScoredMemory[]> {
    const { characterId, currentTick, limitCount = 4 } = context;

    // 1. Fetch from Firestore with fallback to local cache
    let candidateMemories = this.getLocalMemories(characterId);

    try {
      const memsRef = collection(db, 'characters', characterId, 'memories');
      const q = query(memsRef, orderBy('tick', 'desc'), limit(25));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const firestoreMemories: Memory[] = [];
        snapshot.forEach((docSnap) => {
          firestoreMemories.push(docSnap.data() as Memory);
        });
        // Merge with local cache
        firestoreMemories.forEach((m) => this.addToLocalCache(m));
        candidateMemories = this.getLocalMemories(characterId);
      }
    } catch (err) {
      // If Firestore is still initializing or offline, proceed with local cache seamlessly
      handleFirestoreError(err, OperationType.LIST, `characters/${characterId}/memories`);
    }

    if (candidateMemories.length === 0) {
      return [];
    }

    // 2. Build context search tokens
    const queryTokens = new Set<string>();
    const addTokens = (str?: string | null) => {
      if (!str) return;
      str
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 2)
        .forEach((w) => queryTokens.add(w));
    };

    addTokens(context.locationId);
    addTokens(context.locationName);
    addTokens(context.currentGoal);
    addTokens(context.activeWorldEvent);
    context.presentCharacterNames.forEach(addTokens);
    context.presentCharacterIds.forEach(addTokens);

    // 3. Score each memory: Recency + Importance + Topical Relevance
    const scoredList: ScoredMemory[] = candidateMemories.map((mem) => {
      // Recency: Exponential/Hyperbolic decay
      const tickDelta = Math.max(0, currentTick - (mem.tick || 0));
      const recencyScore = 1 / (1 + 0.15 * tickDelta);

      // Importance: Normalized 1 to 10 scale
      const importanceScore = Math.min(10, Math.max(1, mem.importance || 5)) / 10;

      // Relevance: Token matching against memory content + tags
      const matchedKeywords: string[] = [];
      const memoryText = `${mem.content} ${(mem.tags || []).join(' ')} ${mem.locationId}`.toLowerCase();

      queryTokens.forEach((token) => {
        if (memoryText.includes(token)) {
          matchedKeywords.push(token);
        }
      });

      // Character presence bonus
      let charMatchBonus = 0;
      if (mem.relatedCharacterIds && context.presentCharacterIds.length > 0) {
        const overlap = mem.relatedCharacterIds.filter((id) =>
          context.presentCharacterIds.includes(id)
        );
        if (overlap.length > 0) {
          charMatchBonus = 0.3 * overlap.length;
        }
      }

      // Location match bonus
      const locBonus = mem.locationId === context.locationId ? 0.2 : 0;

      const keywordRelevance = Math.min(
        1,
        matchedKeywords.length * 0.25 + charMatchBonus + locBonus
      );

      // Weights: Relevance (0.45), Importance (0.35), Recency (0.20)
      const totalScore =
        0.45 * keywordRelevance + 0.35 * importanceScore + 0.20 * recencyScore;

      return {
        memory: mem,
        recencyScore,
        importanceScore,
        relevanceScore: keywordRelevance,
        totalScore,
        matchedKeywords,
      };
    });

    // 4. Sort by highest totalScore and take top-K
    scoredList.sort((a, b) => b.totalScore - a.totalScore);
    return scoredList.slice(0, limitCount);
  }

  /**
   * Commit a newly formed memory to both Firestore and local cache
   */
  public async recordMemory(memory: Memory): Promise<void> {
    this.addToLocalCache(memory);

    try {
      const docRef = doc(db, 'characters', memory.characterId, 'memories', memory.id);
      await setDoc(docRef, memory);
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.CREATE,
        `characters/${memory.characterId}/memories/${memory.id}`
      );
    }
  }
}
