import { Context } from 'hono';
import { streamText, type CoreMessage } from 'ai';
import { createWorkersAI } from 'workers-ai-provider';
import { z } from 'zod';
import * as chatService from '../services/chat.service.js';
import logger from '../utils/logger.js';

// Request validation schema
const chatRequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string(),
    })
  ),
});

/**
 * Handle chat requests with streaming responses.
 * Uses RAG to retrieve relevant Atomic Habits context before generating response.
 */
export const chat = async (c: Context) => {
  const { userId } = c.get('auth');

  try {
    const body = await c.req.json();
    const { messages } = chatRequestSchema.parse(body);

    logger.info(
      `Chat request from user ${userId} with ${messages.length} messages`
    );

    // Get RAG context from Pinecone
    const context = await chatService.retrieveContext(
      c.env.AI,
      c.env.PINECONE_API_KEY,
      messages
    );

    // Create Workers AI provider using AI SDK
    const workersai = createWorkersAI({ binding: c.env.AI });

    // Convert messages to CoreMessage format for AI SDK
    const coreMessages: CoreMessage[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // Stream response using AI SDK
    const result = streamText({
      model: workersai('@cf/meta/llama-3.1-8b-instruct'),
      system: chatService.getSystemPrompt(context),
      messages: coreMessages,
    });

    // Return streaming response with proper headers for Cloudflare Workers
    return result.toTextStreamResponse({
      headers: {
        'Content-Type': 'text/x-unknown',
        'content-encoding': 'identity',
        'transfer-encoding': 'chunked',
      },
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Chat controller error for user ${userId}: ${errorMessage}`);

    if (error instanceof z.ZodError) {
      return c.json(
        {
          error: {
            message: 'Invalid request format',
            code: 'validation_error',
            details: error.errors,
          },
        },
        400
      );
    }

    return c.json(
      {
        error: {
          message: 'Failed to process chat request',
          code: 'internal_error',
        },
      },
      500
    );
  }
};
