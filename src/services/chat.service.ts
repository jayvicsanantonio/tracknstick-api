import { Pinecone } from '@pinecone-database/pinecone';
import { embed } from 'ai';
import { createWorkersAI } from 'workers-ai-provider';
import logger from '../utils/logger.js';

// Pinecone index name for Atomic Habits content
const PINECONE_INDEX_NAME = 'atomic-habits';

// Base system prompt for the habit coach
const BASE_SYSTEM_PROMPT = `You are an AI habit coach for the Track N' Stick app. 
Your knowledge is based EXCLUSIVELY on "Atomic Habits" by James Clear.

Rules:
1. ONLY answer using concepts from Atomic Habits
2. If asked about topics not in the book, politely explain you can only discuss Atomic Habits concepts
3. Reference concepts like "The Four Laws of Behavior Change", "Habit Stacking", "1% Better Every Day"
4. Be encouraging and practical
5. Keep responses concise but helpful
6. Use specific examples and actionable advice when possible`;

/**
 * Retrieves relevant context from Pinecone for a query string.
 * Takes the query directly: picking which message is the query belongs to the
 * caller that already validated the conversation.
 */
export async function retrieveContext(
  ai: Ai,
  pineconeApiKey: string,
  query: string
): Promise<string> {
  if (!query) {
    return '';
  }

  try {
    // Generate embedding for the user's query using AI SDK
    const workersai = createWorkersAI({ binding: ai });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { embedding } = await embed({
      model: workersai.textEmbeddingModel('@cf/baai/bge-base-en-v1.5' as any),
      value: query,
    });

    logger.info(
      `Generated embedding for query: "${query.substring(0, 50)}..."`
    );

    // Query Pinecone for relevant chunks
    const pinecone = new Pinecone({ apiKey: pineconeApiKey });
    const index = pinecone.index(PINECONE_INDEX_NAME);

    const searchResults = await index.query({
      vector: embedding,
      topK: 5,
      includeMetadata: true,
    });

    const context =
      searchResults.matches
        ?.map((m) => m.metadata?.text as string)
        .filter(Boolean)
        .join('\n\n---\n\n') || '';

    logger.info(
      `Retrieved ${searchResults.matches?.length || 0} context chunks from Pinecone`
    );

    return context;
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Error retrieving context from Pinecone: ${errorMessage}`);
    // Return empty context on error - the LLM can still respond but without RAG enhancement
    return '';
  }
}

/**
 * Returns the system prompt with RAG context injected.
 * If no context is available, returns the base system prompt.
 */
export function getSystemPrompt(context: string): string {
  if (!context) {
    return BASE_SYSTEM_PROMPT;
  }

  return `${BASE_SYSTEM_PROMPT}

Use the following context from Atomic Habits to inform your responses. Reference specific concepts when relevant:

${context}`;
}
