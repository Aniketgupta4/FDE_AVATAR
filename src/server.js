import crypto from 'node:crypto';
import express from 'express';
import { AccessToken } from 'livekit-server-sdk';
import { config } from './config.js';
import { initAvatarService, ask, askStream } from './avatarService.js';

const app = express();
app.use(express.json({ limit: '1mb' }));

// Frontend (same as Spring's static/index.html)
app.use(express.static(config.publicDir));

// POST /api/avatar/ask  ->  { answer }   (used by the agent worker)
app.post('/api/avatar/ask', async (req, res) => {
  const question = req.body?.question;
  if (!question || typeof question !== 'string' || !question.trim()) {
    return res.status(400).json({ error: 'question is required' });
  }
  try {
    const answer = await ask(question.trim());
    res.json({ answer });
  } catch (err) {
    console.error('ask failed:', err);
    res.status(500).json({ error: 'Failed to generate answer' });
  }
});

// POST /api/avatar/ask/stream  ->  Server-Sent Events
app.post('/api/avatar/ask/stream', async (req, res) => {
  const question = req.body?.question;
  if (!question || typeof question !== 'string' || !question.trim()) {
    return res.status(400).json({ error: 'question is required' });
  }
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  try {
    for await (const chunk of askStream(question.trim())) {
      // Each SSE message may contain newlines; send one data: line per line.
      const lines = chunk.split('\n').map((l) => `data: ${l}`).join('\n');
      res.write(`${lines}\n\n`);
    }
  } catch (err) {
    console.error('stream failed:', err);
  } finally {
    res.end();
  }
});

// POST /api/livekit/token  ->  { serverUrl, token, roomName }
app.post('/api/livekit/token', async (req, res) => {
  try {
    let roomName = req.body?.roomName;
    if (!roomName || !String(roomName).trim()) roomName = `avatar-${crypto.randomUUID()}`;

    const at = new AccessToken(config.livekit.apiKey, config.livekit.apiSecret, {
      identity: `user-${crypto.randomUUID()}`,
      name: 'Coder Army User',
      ttl: '1h',
    });
    at.addGrant({ roomJoin: true, room: roomName });

    res.json({
      serverUrl: config.livekit.url,
      token: await at.toJwt(),
      roomName,
    });
  } catch (err) {
    console.error('token failed:', err);
    res.status(500).json({ error: 'Failed to create token' });
  }
});

app.get('/health', (_req, res) => res.json({ ok: true }));

await initAvatarService();
app.listen(config.port, () => {
  console.log(`Server running at http://localhost:${config.port}`);
});
