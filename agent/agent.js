
import 'dotenv/config';

import { fileURLToPath } from 'node:url';
import {
  defineAgent,
  cli,
  ServerOptions,
  voice,
  inference,
} from '@livekit/agents';

import * as synthesia from '@livekit/agents-plugin-synthesia';

const AVATAR_API_URL =
  process.env.AVATAR_API_URL ||
  'http://localhost:8080/api/avatar/ask';

async function fetchAnswer(question) {
  const response = await fetch(AVATAR_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ question }),
    signal: AbortSignal.timeout(60000),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(
      `Backend HTTP ${response.status}: ${errorBody}`
    );
  }

  const data = await response.json();

  if (typeof data.answer !== 'string' || !data.answer.trim()) {
    throw new Error('Backend returned an empty or invalid answer');
  }

  return data.answer.trim();
}

class BackendAgent extends voice.Agent {
  async onUserTurnCompleted(_chatCtx, newMessage) {
    const question = newMessage.textContent?.trim();

    if (!question) {
      console.log('Empty user turn. Ignoring.');
      return;
    }

    console.log('\nUSER:', question);

    await this.answer(question);
  }

  async answer(question) {
    let answerText;

    // Step 1: Get answer from your Express + Gemini RAG backend.
    try {
      console.log('BACKEND: Sending question...');

      answerText = await fetchAnswer(question);

      console.log('BACKEND ANSWER:', answerText);
    } catch (error) {
      console.error('BACKEND ERROR:', error);

      answerText =
        'Sorry, abhi answer generate karne mein problem aa rahi hai.';
    }

    // Step 2: Send the answer to Cartesia TTS and Synthesia avatar.
    try {
      console.log('TTS: Starting speech...');

      const speechHandle = this.session.say(answerText, {
        allowInterruptions: true,
      });

      await speechHandle;

      console.log('TTS: Speech playback completed.');
    } catch (error) {
      console.error('TTS / SPEECH ERROR:', error);
    }
  }
}

export default defineAgent({
  entry: async (ctx) => {
    const avatarId = process.env.SYNTHESIA_AVATAR_ID;
    const voiceId = process.env.CARTESIA_VOICE_ID;

    if (!avatarId) {
      throw new Error('SYNTHESIA_AVATAR_ID is missing in .env');
    }

    if (!voiceId) {
      throw new Error('CARTESIA_VOICE_ID is missing in .env');
    }

    console.log('Connecting to LiveKit room...');

    await ctx.connect();

    // Create the voice session.
    const session = new voice.AgentSession({
      stt: new inference.STT({
        model: 'deepgram/nova-3',
        language: 'multi',
      }),

      tts: new inference.TTS({
        model: 'cartesia/sonic-3.6',
        voice: voiceId,
        language: 'hi',
      }),
    });

    // Log recognized speech for debugging.
    session.on(
      voice.AgentSessionEventTypes.UserInputTranscribed,
      (event) => {
        const transcript = event.transcript?.trim();

        if (transcript) {
          console.log(
            event.isFinal ? 'FINAL TRANSCRIPT:' : 'INTERIM:',
            transcript
          );
        }
      }
    );

    // Create and start Synthesia avatar BEFORE starting AgentSession.
    console.log('Starting Synthesia avatar:', avatarId);

    const avatar = new synthesia.AvatarSession(
      new synthesia.AvatarConfig({
        avatarIds: [avatarId],
      })
    );

    await avatar.start(session, ctx.room);

    console.log('Synthesia avatar connected.');

    // Start the voice agent.
    await session.start({
      agent: new BackendAgent({
        instructions:
          'You are the realtime voice adapter for the Coder Army AI avatar. ' +
          'Do not generate answers yourself. ' +
          'All answers must come from the external backend service.',
      }),
      room: ctx.room,
    });

    console.log('Agent session started successfully.');
  },
});

// Start the LiveKit worker.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  cli.runApp(
    new ServerOptions({
      agent: fileURLToPath(import.meta.url),
    })
  );
}
