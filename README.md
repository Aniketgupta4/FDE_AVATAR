# AI Avatar — Node.js version (Gemini)

Node.js port of the Spring Boot + Python AI Avatar project. Uses the **Gemini API** for answers and embeddings.

```
Browser mic -> LiveKit -> agent (Node worker) -> POST /api/avatar/ask (Express)
                                                        |
                                                Gemini + knowledge/*.md (RAG)
                                                        |
Browser avatar/audio <- LiveKit <- Synthesia <- agent speaks the answer (Cartesia TTS)
```

| Old (Java / Python)                         | New (Node.js)                    |
| ------------------------------------------- | -------------------------------- |
| `AvatarService.java` (RAG, system prompt)   | `src/avatarService.js`, `src/knowledge.js` |
| `AvatarController.java`, `LiveKitTokenController.java` | `src/server.js`       |
| `static/index.html`                         | `public/index.html` (unchanged)  |
| `knowledge/*.md`                            | `knowledge/*.md` (unchanged)     |
| `agent.py` (LiveKit + Synthesia)            | `agent/agent.js`                 |

## 1. Prerequisites

- Node.js 20 or newer (`node -v`)
- Gemini API key (free to create at https://aistudio.google.com/apikey). It is used for answers and for embeddings.
- LiveKit Cloud project: URL, API key, API secret (cloud.livekit.io). It must have LiveKit Inference access (the worker uses Deepgram STT and Cartesia TTS through it).
- Synthesia API key with interactive-avatar access, plus an avatar ID
- A Cartesia voice ID (usable with `cartesia/sonic-3.6`, language `hi`)

## 2. Install

```bash
cd avatar-node
npm install
cp .env.example .env      # Windows: copy .env.example .env
```

## 3. Fill in `.env`

| Variable | Used by | Meaning |
| --- | --- | --- |
| `GEMINI_API_KEY` | server | Gemini key |
| `GEMINI_CHAT_MODEL` | server | default `gemini-2.5-flash`. Newer options such as `gemini-3.6-flash` also work if your key has access. |
| `GEMINI_EMBEDDING_MODEL` | server | default `gemini-embedding-001`. If it is unavailable the server automatically tries `gemini-embedding-2`. |
| `LIVEKIT_URL` | server + agent | `wss://your-project.livekit.cloud` |
| `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` | server + agent | from the **same** LiveKit project |
| `SYNTHESIA_API_KEY` | agent | read automatically by the Synthesia plugin |
| `SYNTHESIA_AVATAR_ID` | agent | avatar to render |
| `CARTESIA_VOICE_ID` | agent | voice for TTS |
| `PORT` | server | default `8080` |
| `AVATAR_API_URL` | agent | default `http://localhost:8080/api/avatar/ask`. If you change `PORT`, change this too. |

## 4. Run (two terminals)

Terminal 1: backend

```bash
npm run server
# Loaded 10 knowledge chunks.
# Server running at http://localhost:8080
```

Terminal 2: voice + avatar worker

```bash
npm run agent
```

Wait until the worker registers with LiveKit, then open http://localhost:8080, click **Start Conversation**, allow the microphone, and speak.

Start the worker **before** clicking Start Conversation. If you started it late, end the session and start a new one.

## 5. Quick checks

```bash
curl -X POST http://localhost:8080/api/avatar/ask \
  -H 'Content-Type: application/json' \
  -d '{"question":"Explain dependency injection briefly."}'

curl -X POST http://localhost:8080/api/livekit/token \
  -H 'Content-Type: application/json' -d '{}'
```

Worker logs show `USER:` (what you said) and `BACKEND:` (answer sent to the avatar).

## 6. Synthesia setup

1. Get a Synthesia API key from your Synthesia account. It needs **interactive avatar** access (check your plan with Synthesia; this is not available on every plan).
2. Pick an avatar from the Synthesia gallery and copy its ID into `SYNTHESIA_AVATAR_ID`.
3. Put the key in `SYNTHESIA_API_KEY`.
4. The plugin (`@livekit/agents-plugin-synthesia`) creates a Synthesia session and makes the avatar join your LiveKit room as participant `synthesia-avatar-agent`. The frontend detects it by its video track, so nothing else changes.
5. To switch avatars during a session, `avatar.swapAvatar(newId)` is available in `agent/agent.js` (up to 5 IDs can be passed to `AvatarConfig`).

## 7. Customising

- Answers/personality: edit `SYSTEM_PROMPT` in `src/avatarService.js`.
- Knowledge: add or edit `.md` files in `knowledge/`, then restart the server. Embeddings are cached in `.cache/`; only changed text is re-embedded.
- Voice / language: `inference.STT` and `inference.TTS` in `agent/agent.js`.
- Retrieval: `topK` (4) in `src/avatarService.js`, chunk size in `src/knowledge.js`.

## 8. Production

```bash
npm run server        # or: pm2 start src/server.js --name avatar-api
npm run agent:start   # worker without the dev file-watcher
```

Use HTTPS for the frontend when it is not on `localhost` (browsers block the microphone otherwise). Set `AVATAR_API_URL` to an address the worker can reach.

## Troubleshooting

| Problem | Check |
| --- | --- |
| `Missing required environment variable` | `.env` exists in the project root and is filled in |
| Server fails at startup | Gemini key/quota. Embeddings are created at startup (first run only). A `429` means free-tier rate limit: wait a minute and restart. |
| Browser joins but no avatar | Worker running? Same LiveKit project in server and agent? Synthesia key, avatar ID and plan |
| No `USER:` log when you speak | Mic permission, LiveKit Inference access/quota |
| `BACKEND:` logged but silent | TTS/voice ID, click **Enable Audio** in the page |
| `ERROR:` + spoken fallback | Backend unreachable or Gemini error; test the `curl` above |

## Notes on Gemini

- Embeddings are requested one text per call on purpose: `gemini-embedding-2` merges several inputs in one call into a single vector.
- For `gemini-2.5-flash` the code turns off "thinking" to keep voice replies fast. Other models use their defaults.
- Only the backend uses Gemini. Speech-to-text and text-to-speech still go through LiveKit Inference (Deepgram and Cartesia), so no extra key is needed for them.

## Security

Never commit `.env`. The original Spring project kept credentials in `application.properties`; if any real key was ever pushed to GitHub, rotate it.
