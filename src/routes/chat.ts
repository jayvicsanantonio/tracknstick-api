import { Hono } from 'hono';
import { clerkMiddleware } from '../middlewares/clerkMiddleware.js';
import { withClerkFailureHandling } from '../middlewares/middlewareFailureHandler.js';
import * as chatController from '../controllers/chat.controller.js';

// Create a sub-application for chat
const app = new Hono();

// Apply Clerk auth middleware to all routes with failure handling
app.use('*', withClerkFailureHandling(clerkMiddleware()));

// POST /api/v1/chat - Streaming chat endpoint
app.post('/', chatController.chat);

export { app as chatRoutes };
