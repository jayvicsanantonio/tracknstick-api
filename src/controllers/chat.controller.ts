import { Context } from 'hono';
import { streamText, type CoreMessage } from 'ai';
import { createWorkersAI } from 'workers-ai-provider';
import { z } from 'zod';
import * as chatService from '../services/chat.service.js';
import logger from '../utils/logger.js';

// AI SDK 5.0 message part schema
const textPartSchema = z.object({
  type: z.literal('text'),
  text: z.string(),
});

// Request validation schema - handles AI SDK 5.0 format with parts array
const chatRequestSchema = z.object({
  messages: z.array(
    z.object({
      id: z.string().optional(),
      role: z.enum(['user', 'assistant', 'system']),
      // AI SDK 5.0 uses parts array instead of content
      parts: z.array(textPartSchema).optional(),
      // Keep content for backward compatibility
      content: z.string().optional(),
    })
  ),
});

/**
 * Extract text content from a message (handles both old and new formats)
 */
function getMessageContent(message: {
  parts?: { type: string; text: string }[];
  content?: string;
}): string {
  // Try parts first (AI SDK 5.0 format)
  if (message.parts && message.parts.length > 0) {
    return message.parts
      .filter((p) => p.type === 'text')
      .map((p) => p.text)
      .join('');
  }
  // Fall back to content (legacy format)
  return message.content || '';
}

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

    // Convert to simple format for RAG service
    const simpleMessages = messages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: getMessageContent(m),
    }));

    logger.info(`[Chat] Simple messages: ${JSON.stringify(simpleMessages)}`);

    // Get RAG context from Pinecone
    const context = await chatService.retrieveContext(
      c.env.AI,
      c.env.PINECONE_API_KEY,
      simpleMessages
    );

    logger.info(`[Chat] Retrieved context length: ${context.length}`);

    // Create Workers AI provider using AI SDK
    const workersai = createWorkersAI({ binding: c.env.AI });

    // Convert messages to CoreMessage format for AI SDK
    const coreMessages: CoreMessage[] = simpleMessages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const systemPrompt = chatService.getSystemPrompt(context);
    logger.info(`[Chat] System prompt length: ${systemPrompt.length}`);
    logger.info(`[Chat] Core messages: ${JSON.stringify(coreMessages)}`);

    // Stream response using AI SDK
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = streamText({
      model: workersai('@cf/meta/llama-3.1-8b-instruct' as any),
      system: systemPrompt,
      messages: coreMessages,
    });

    logger.info(`[Chat] streamText called, returning response...`);

    // Return streaming response as text stream
    return result.toTextStreamResponse();
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
