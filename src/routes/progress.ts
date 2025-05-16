import { Hono } from 'hono';
import { clerkMiddleware } from '../middlewares/clerkMiddleware.js';
import * as progressController from '../controllers/progress.controller.js';

const app = new Hono();

// Apply Clerk auth middleware to all routes
app.use('*', clerkMiddleware());

/**
 * @route GET /history
 * @description Get user's progress history showing completion rates by day
 * @query startDate - Optional start date in YYYY-MM-DD format
 * @query endDate - Optional end date in YYYY-MM-DD format
 * @returns {Object} - History of daily completion rates
 */
app.get('/history', progressController.getProgressHistory);

/**
 * @route GET /streaks
 * @description Get user's current and longest streaks
 * @returns {Object} - Current streak and longest streak information
 */
app.get('/streaks', progressController.getStreaks);

/**
 * @route GET /overview
 * @description Get user's complete progress overview including history and streaks
 * @query startDate - Optional start date in YYYY-MM-DD format
 * @query endDate - Optional end date in YYYY-MM-DD format
 * @returns {Object} - Combined history and streak information
 */
app.get('/overview', progressController.getProgressOverview);

export default app;
