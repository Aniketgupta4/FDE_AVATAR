import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

/**
 * In-memory vector store, the Node equivalent of Spring AI's SimpleVectorStore.
 * Chunks are embedded once at startup. Embeddings are cached on disk
 * (.cache/embeddings.json) so restarts do not call Gemini again unless a
 * knowledge file changes.
 */

// TokenTextSplitter(chunkSize=400 tokens) is roughly 1600 characters.
const CHUNK_CHARS = 1600;
const MIN_CHUNK_CHARS = 100;

export function splitIntoChunks(text, maxChars = CHUNK_CHARS, minChars = MIN_CHUNK_CHARS) {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks = [];
  let current = '';

  const flush = () => {
    if (current.trim().length >= minChars) chunks.push(current.trim());
    else if (current.trim() && chunks.length) chunks[chunks.length - 1] += '\n\n' + current.trim();
    else if (current.trim()) chunks.push(current.trim());
    current = '';
  };

  for (const para of paragraphs) {
    // Paragraph itself too long: split on sentence boundaries.
    const pieces =
      para.length > maxChars ? para.match(/[^.!?\n]+[.!?]*\s*/g) || [para] : [para];

    for (const piece of pieces) {
      if (current && current.length + piece.length + 2 > maxChars) flush();
      current += (current ? '\n\n' : '') + piece;
    }
  }
  flush();
  return chunks;
}

function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

export class KnowledgeBase {
  constructor({ ai, embeddingModel, knowledgeDir, cacheDir }) {
    this.ai = ai;
    this.embeddingModel = embeddingModel;
    this.knowledgeDir = knowledgeDir;
    this.cacheDir = cacheDir;
    this.items = []; // { text, source, embedding }
  }

  /**
   * Embeds texts ONE PER REQUEST. (gemini-embedding-2 merges multiple inputs of a single
   * request into one vector, so batching is not safe across both models.)
   * If the configured model is not available, falls back to the other known model.
   */
  async embed(texts, taskType) {
    const candidates = [
      ...new Set([this.embeddingModel, 'gemini-embedding-001', 'gemini-embedding-2']),
    ];
    let lastError;

    for (const model of candidates) {
      try {
        // taskType is supported by gemini-embedding-001; embedding-2 takes no taskType.
        const config = model.includes('embedding-001') && taskType ? { taskType } : undefined;
        const vectors = [];
        const CONCURRENCY = 5;
        for (let i = 0; i < texts.length; i += CONCURRENCY) {
          const part = await Promise.all(
            texts.slice(i, i + CONCURRENCY).map(async (text) => {
              const res = await this.ai.models.embedContent({ model, contents: text, config });
              return res.embeddings[0].values;
            }),
          );
          vectors.push(...part);
        }
        if (model !== this.embeddingModel) {
          console.warn(`Embedding model "${this.embeddingModel}" failed, using "${model}" instead.`);
          this.embeddingModel = model;
        }
        return vectors;
      } catch (err) {
        lastError = err;
        const notFound = err?.status === 404 || /not found|NOT_FOUND|no longer available/i.test(String(err?.message));
        if (!notFound) throw err; // bad key, quota, network: do not hide it
      }
    }
    throw lastError;
  }

  async load() {
    const files = (await fs.readdir(this.knowledgeDir)).filter((f) => f.endsWith('.md'));

    const chunks = [];
    for (const file of files) {
      const content = await fs.readFile(path.join(this.knowledgeDir, file), 'utf8');
      for (const text of splitIntoChunks(content)) chunks.push({ text, source: file });
    }

    // Load embedding cache
    const cacheFile = path.join(this.cacheDir, 'embeddings.json');
    let cache = {};
    try {
      cache = JSON.parse(await fs.readFile(cacheFile, 'utf8'));
    } catch {
      /* no cache yet */
    }

    const keyOf = (c) => sha(this.embeddingModel + '|' + c.text);
    const missing = chunks.filter((c) => !cache[keyOf(c)]);

    if (missing.length) {
      const BATCH = 20;
      for (let i = 0; i < missing.length; i += BATCH) {
        const batch = missing.slice(i, i + BATCH);
        const vectors = await this.embed(batch.map((c) => c.text), 'RETRIEVAL_DOCUMENT');
        batch.forEach((c, j) => (cache[keyOf(c)] = vectors[j]));
      }
      await fs.mkdir(this.cacheDir, { recursive: true });
      await fs.writeFile(cacheFile, JSON.stringify(cache));
    }

    this.items = chunks.map((c) => ({ ...c, embedding: cache[keyOf(c)] }));
    console.log(`Loaded ${this.items.length} knowledge chunks.`);
  }

  async search(query, topK = 4) {
    const [q] = await this.embed([query], 'RETRIEVAL_QUERY');
    return this.items
      .map((item) => ({ item, score: cosine(q, item.embedding) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map((r) => r.item);
  }
}
