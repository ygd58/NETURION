import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Ollama } from 'ollama';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const MODEL = process.env.OLLAMA_MODEL || 'llama3.1';

const ollama = new Ollama({ host: process.env.OLLAMA_HOST || 'http://localhost:11434' });

app.use(cors({ origin: process.env.ALLOWED_ORIGIN || '*' }));
app.use(express.json());

app.get('/health', async (req, res) => {
  try {
    const models = await ollama.list();
    const available = models.models.map(m => m.name);
    res.json({ status: 'ok', model: MODEL, available_models: available });
  } catch (e) {
    res.status(503).json({ status: 'error', message: 'Ollama not reachable', detail: e.message });
  }
});

app.post('/infer', async (req, res) => {
  const { prompt, wallet, session_id } = req.body;
  if (!prompt || typeof prompt !== 'string') return res.status(400).json({ error: 'prompt is required' });
  if (!wallet || typeof wallet !== 'string') return res.status(400).json({ error: 'wallet address is required' });

  console.log(`[${new Date().toISOString()}] wallet: ${wallet.slice(0,8)}... | session: ${session_id}`);

  try {
    const response = await ollama.chat({
      model: MODEL,
      messages: [
        { role: 'system', content: `You are NETURION — a confidential AI agent running on privacy-preserving infrastructure powered by Fairblock Network. All prompts are encrypted end-to-end. Never store or log conversation content. The user wallet: ${wallet}` },
        { role: 'user', content: prompt }
      ],
      stream: false,
    });
    res.json({ response: response.message?.content || '', model: MODEL, session_id: session_id || null });
  } catch (e) {
    console.error('Ollama error:', e.message);
    res.status(500).json({ error: 'Inference failed', detail: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`NETURION Backend running on port ${PORT} | model: ${MODEL}`);
});
