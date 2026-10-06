import express, { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// API route: AI Brain Decision Endpoint
app.post('/api/decide', async (req: Request, res: Response): Promise<void> => {
  try {
    const { character, context, availableActions, connectedLocations, presentCharacters } = req.body;

    // If character uses autonomous simulation heuristics, return fallback immediately
    if (
      character?.brainConfig?.brainType === 'autonomous_heuristic' ||
      character?.brainConfig?.modelName === 'autonomous-heuristic'
    ) {
      res.json({ success: false, fallback: true });
      return;
    }

    const apiKey = character?.brainConfig?.customApiKey || process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      // If no valid API key, return null so frontend can use autonomous simulation heuristic
      res.json({ success: false, fallback: true, error: 'No active Gemini API key configured' });
      return;
    }

    const ai = new GoogleGenAI({ apiKey });
    let model = character?.brainConfig?.modelName || 'gemini-3.8-flash';
    if (!model.startsWith('gemini')) {
      model = 'gemini-3.8-flash';
    }

    const prompt = `You are the autonomous decision engine for "${character.name}", a character living in the simulated text world of Evara.
The character's API key is NEVER their identity. You strictly embody ${character.name}.

CHARACTER IDENTITY:
- Name: ${character.name}
- Title: ${character.title}
- Personality: ${character.personality}
- Backstory: ${character.bio}
- Current Needs: Energy: ${character.energy}/100, Social: ${character.social}/100, Purpose: ${character.purpose}/100
- Current Goal: ${character.currentGoal}

CURRENT WORLD CONTEXT:
- World Time: ${context.worldTime}
- Current Weather: ${context.weather}
- Active World Event: ${context.activeEvent || 'None'}
- Location: ${context.locationName} (${context.locationDescription})
- Present Characters in this location: ${presentCharacters?.length ? presentCharacters.map((c: any) => `${c.name} (${c.title})`).join(', ') : 'None, currently alone'}
- Adjacent Connected Locations you could walk to: ${connectedLocations?.join(', ') || 'None'}

RELEVANT MEMORIES RETRIEVED (Recent & Relevant):
${context.relevantMemories?.length ? context.relevantMemories.map((m: any, i: number) => `${i + 1}. [${m.worldTime}] (${m.type}) ${m.content}`).join('\n') : 'No notable recent memories.'}

RELATIONSHIPS WITH OTHERS IN THE ROOM:
${context.relationships?.length ? context.relationships.map((r: any) => `- With ${r.targetName}: Affinity ${r.affinity}/100, Trust ${r.trust}/100 (${r.status})`).join('\n') : 'No one here you know well.'}

RULES OF SIMULATION:
1. You must propose ONE authentic action for this tick.
2. Available action types:
   - "MOVE" (must specify targetLocationId from adjacent locations)
   - "TALK" (must specify targetCharacterId from characters present in room, plus dialogue)
   - "WORK" (engaging in an activity relevant to this room or purpose)
   - "REST" (recover energy, contemplate or relax)
   - "REFLECT" (form an internal philosophical or emotional realization)
   - "INTERACT_OBJECT" (examine or use an item in this room)
3. Characters do NOT just chat endlessly. They pursue goals, work, eat, move between districts, and sleep when exhausted.
4. If energy is below 15, prioritize REST.

Respond ONLY with valid JSON matching this schema:
{
  "actionType": "MOVE" | "TALK" | "WORK" | "REST" | "REFLECT" | "INTERACT_OBJECT",
  "targetLocationId": "string or null",
  "targetCharacterId": "string or null",
  "dialogue": "string or null (spoken words if TALK)",
  "internalMonologue": "string (what the character is thinking internally, 1-2 sentences)",
  "actionDescription": "string (third-person narrative description of what they do, 1-2 sentences)",
  "memoryToForm": {
    "content": "string (a concise memory of what transpired)",
    "type": "observation" | "dialogue" | "decision" | "reflection" | "interaction",
    "importance": 1 to 10,
    "tags": ["tag1", "tag2"]
  },
  "expectedEnergyCost": number (e.g. 5 for work, 3 for move, -10 for rest)
}`;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: character?.brainConfig?.temperature ?? 0.7,
      },
    });

    const text = response.text || '';
    const parsed = JSON.parse(text);

    res.json({ success: true, decision: parsed });
  } catch (error: any) {
    console.warn('AI decision generation notice (falling back to autonomous engine):', error?.message || error);
    res.json({
      success: false,
      fallback: true,
      error: error?.message || 'Gemini decision generation error',
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Evara Living World Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
