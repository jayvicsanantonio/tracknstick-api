/**
 * Embedding Generation Script for Atomic Habits
 *
 * This script generates embeddings for the chunked text using Cloudflare Workers AI
 * and uploads them to Pinecone.
 *
 * Prerequisites:
 *   - Run ingest-atomic-habits.ts first to create chunks.json
 *   - Set environment variables:
 *     - CLOUDFLARE_ACCOUNT_ID
 *     - CLOUDFLARE_API_TOKEN
 *     - PINECONE_API_KEY
 *
 * Usage: npx tsx scripts/generate-embeddings.ts
 */

import { Pinecone } from '@pinecone-database/pinecone';
import fs from 'fs';
import path from 'path';

// Configuration
const PINECONE_INDEX_NAME = 'atomic-habits';
const EMBEDDING_MODEL = '@cf/baai/bge-base-en-v1.5';
const BATCH_SIZE = 10; // Process chunks in batches to avoid rate limits

// Environment variables
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const PINECONE_API_KEY = process.env.PINECONE_API_KEY;

/**
 * Generate embedding for a text using Cloudflare Workers AI.
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/run/${EMBEDDING_MODEL}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: [text] }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Embedding API error: ${response.status} - ${error}`);
  }

  const data = (await response.json()) as {
    result: { data: number[][] };
    success: boolean;
  };

  if (!data.success || !data.result?.data?.[0]) {
    throw new Error('Invalid embedding response');
  }

  return data.result.data[0];
}

/**
 * Main embedding generation function.
 */
async function main() {
  // Validate environment variables
  if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN || !PINECONE_API_KEY) {
    console.error('❌ Missing required environment variables.');
    console.log('\nPlease set:');
    console.log('  export CLOUDFLARE_ACCOUNT_ID=your_account_id');
    console.log('  export CLOUDFLARE_API_TOKEN=your_api_token');
    console.log('  export PINECONE_API_KEY=your_pinecone_api_key');
    process.exit(1);
  }

  // Read chunks
  const chunksPath = path.join(process.cwd(), 'data', 'chunks.json');
  if (!fs.existsSync(chunksPath)) {
    console.error(
      '❌ chunks.json not found. Run ingest-atomic-habits.ts first.'
    );
    process.exit(1);
  }

  const chunks: string[] = JSON.parse(fs.readFileSync(chunksPath, 'utf-8'));
  console.log(`📚 Loaded ${chunks.length} chunks from ${chunksPath}`);

  // Initialize Pinecone
  console.log(`🔗 Connecting to Pinecone index: ${PINECONE_INDEX_NAME}`);
  const pinecone = new Pinecone({ apiKey: PINECONE_API_KEY });
  const index = pinecone.index(PINECONE_INDEX_NAME);

  // Process chunks in batches
  console.log(`\n🚀 Generating embeddings and uploading to Pinecone...`);
  let processed = 0;

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);

    // Generate embeddings for batch
    const embeddings = await Promise.all(
      batch.map((chunk) => generateEmbedding(chunk))
    );

    // Create vectors for Pinecone
    const vectors = batch.map((chunk, j) => ({
      id: `atomic-habits-${i + j}`,
      values: embeddings[j],
      metadata: { text: chunk, source: 'atomic-habits' },
    }));

    // Upsert to Pinecone
    await index.upsert(vectors);
    processed += batch.length;

    console.log(
      `   ✅ Upserted ${processed}/${chunks.length} (${Math.round((processed / chunks.length) * 100)}%)`
    );

    // Small delay to avoid rate limits
    if (i + BATCH_SIZE < chunks.length) {
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  console.log('\n🎉 All vectors uploaded to Pinecone!');
  console.log('\n📝 Next steps:');
  console.log('1. Set PINECONE_API_KEY secret in Cloudflare Workers:');
  console.log('   wrangler secret put PINECONE_API_KEY');
  console.log('2. Deploy the backend:');
  console.log('   wrangler deploy');
  console.log('3. Test the chat endpoint!');
}

main().catch((error) => {
  console.error('❌ Error during embedding generation:', error);
  process.exit(1);
});
