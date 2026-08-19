import { Context } from 'hono';
import { streamText, type CoreMessage } from 'ai';
import { createWorkersAI } from 'workers-ai-provider';
import { z } from 'zod';
import * as chatService from '../services/chat.service.js';
import logger from '../utils/logger.js';

// AI SDK 5 sends message parts. Non-text parts (step-start, reasoning,
// tool-*) are dropped rather than rejected, so a well-formed assistant turn
// does not 400 the whole request.
const partSchema = z
  .object({ type: z.string(), text: z.string().optional() })
  .passthrough();

/**
 * Produces the exact shape the rest of the pipeline consumes, so there is one
 * message type rather than three successive near-copies of it.
 *
 * 'system' is not accepted: the system prompt is owned by the server, and
 * laundering a client-supplied system turn into 'user' let any authenticated
 * caller inject one.
 */
const chatRequestSchema = z.object({
  messages: z
    .array(
      z
        .object({
          id: z.string().optional(),
          role: z.enum(['user', 'assistant']),
          parts: z.array(partSchema).optional(),
          // Legacy shape, still sent by the current web client
          content: z.string().optional(),
        })
        .transform((m) => ({
          role: m.role,
          content: m.parts?.length
            ? m.parts
                .filter((p) => p.type === 'text' && typeof p.text === 'string')
                .map((p) => p.text as string)
                .join('')
            : (m.content ?? ''),
        }))
        .refine((m) => m.content.trim().length > 0, {
          message: 'Message must contain non-empty text',
        })
    )
    .min(1, 'At least one message is required'),
});

/**
 * Handle chat requests with streaming responses.
 * Uses RAG to retrieve relevant Atomic Habits context before generating response.
 */
export const chat = async (c: Context) => {
  const { userId } = c.get('auth');

  // Phase 1: fallible. Nothing has been committed to the wire yet, so this
  // is the only region where a status code is still negotiable.
  let systemPrompt: string;
  let coreMessages: CoreMessage[];
  let workersai: ReturnType<typeof createWorkersAI>;

  try {
    const body = await c.req.json();
    const { messages } = chatRequestSchema.parse(body);

    logger.info(
      `Chat request from user ${userId} with ${messages.length} messages`
    );

    const lastUserMessage = [...messages]
      .reverse()
      .find((m) => m.role === 'user');

    const context = await chatService.retrieveContext(
      c.env.AI,
      c.env.PINECONE_API_KEY,
      lastUserMessage?.content ?? ''
    );

    logger.info(`Retrieved RAG context of ${context.length} characters`);

    workersai = createWorkersAI({ binding: c.env.AI });
    systemPrompt = chatService.getSystemPrompt(context);
    coreMessages = messages as CoreMessage[];
  } catch (error: unknown) {
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

    logger.error(
      `Chat request could not be prepared for user ${userId}`,
      error as Error
    );

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

  // Phase 2: committed. Once the stream response is returned the status is
  // fixed, so a mid-stream failure cannot become a JSON error -- it can only
  // be logged. onError gives that failure a destination other than the AI
  // SDK's default console.error.
  const result = streamText({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    model: workersai('@cf/meta/llama-3.1-8b-instruct' as any),
    system: systemPrompt,
    messages: coreMessages,
    onError: ({ error }) => {
      logger.error(
        `Chat stream failed mid-response for user ${userId}`,
        error as Error
      );
    },
  });

  return result.toTextStreamResponse();
};
