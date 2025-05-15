/**
 * Database operations for habits
 */
const HabitsDB = {
  /**
   * Get all habits
   * @param {D1Database} db - D1 database instance
   * @returns {Promise<Array>} List of habits
   */
  async list(db) {
    const result = await db.prepare('SELECT * FROM habits').all();
    return result.results;
  },

  /**
   * Get a habit by ID
   * @param {D1Database} db - D1 database instance
   * @param {string|number} id - Habit ID
   * @returns {Promise<Object|null>} Habit object or null
   */
  async get(db, id) {
    const result = await db
      .prepare('SELECT * FROM habits WHERE id = ?')
      .bind(id)
      .first();
    return result;
  },

  /**
   * Create a new habit
   * @param {D1Database} db - D1 database instance
   * @param {Object} data - Habit data
   * @returns {Promise<Object>} Created habit
   */
  async create(db, data) {
    const { name, icon, frequency, userId } = data;

    // Convert frequency array to string for D1 storage
    const frequencyString = Array.isArray(frequency)
      ? frequency.join(',')
      : frequency;

    const result = await db
      .prepare(
        'INSERT INTO habits (name, icon, frequency, user_id, streak, total_completions) VALUES (?, ?, ?, ?, 0, 0)'
      )
      .bind(name, icon, frequencyString, userId)
      .run();

    return {
      id: result.meta.last_row_id,
      ...data,
      streak: 0,
      total_completions: 0,
    };
  },

  /**
   * Update a habit
   * @param {D1Database} db - D1 database instance
   * @param {string|number} id - Habit ID
   * @param {Object} data - Updated habit data
   * @returns {Promise<Object|null>} Updated habit or null
   */
  async update(db, id, data) {
    // Process frequency if it exists in the data
    const processedData = { ...data };
    if (processedData.frequency && Array.isArray(processedData.frequency)) {
      processedData.frequency = processedData.frequency.join(',');
    }

    // Build SET part of query dynamically
    const fields = Object.keys(processedData);
    const values = Object.values(processedData);

    if (fields.length === 0) return null;

    const setClause = fields.map((field) => `${field} = ?`).join(', ');
    const query = `UPDATE habits SET ${setClause} WHERE id = ?`;

    const result = await db
      .prepare(query)
      .bind(...values, id)
      .run();

    if (result.meta.changes === 0) return null;

    return this.get(db, id);
  },

  /**
   * Delete a habit
   * @param {D1Database} db - D1 database instance
   * @param {string|number} id - Habit ID
   * @returns {Promise<boolean>} Whether the habit was deleted
   */
  async delete(db, id) {
    const result = await db
      .prepare('DELETE FROM habits WHERE id = ?')
      .bind(id)
      .run();

    return result.meta.changes > 0;
  },
};

/**
 * Handle habits API routes
 * @param {Request} request - The request object
 * @param {Object} env - Environment including DB
 * @param {Object} headers - Headers to include in response
 * @returns {Promise<Response>} The response
 */
async function handleHabitsRoutes(request, env, headers) {
  const url = new URL(request.url);
  const path = url.pathname;
  const habitId = path.match(/\/api\/v1\/habits\/(\d+)/)?.[1];

  try {
    // GET /api/v1/habits
    if (request.method === 'GET' && path === '/api/v1/habits') {
      const habits = await HabitsDB.list(env.DB);
      // Transform frequency string back to array for consistent API
      const processedHabits = habits.map((habit) => ({
        ...habit,
        frequency: habit.frequency ? habit.frequency.split(',') : [],
      }));
      return new Response(JSON.stringify(processedHabits), { headers });
    }

    // GET /api/v1/habits/:id
    if (request.method === 'GET' && habitId) {
      const habit = await HabitsDB.get(env.DB, habitId);
      if (!habit) {
        return new Response(JSON.stringify({ error: 'Habit not found' }), {
          status: 404,
          headers,
        });
      }
      // Transform frequency string back to array
      const processedHabit = {
        ...habit,
        frequency: habit.frequency ? habit.frequency.split(',') : [],
      };
      return new Response(JSON.stringify(processedHabit), { headers });
    }

    // POST /api/v1/habits
    if (request.method === 'POST' && path === '/api/v1/habits') {
      const data = await request.json();
      const newHabit = await HabitsDB.create(env.DB, data);

      // Make sure frequency is returned as array for consistent API
      let frequencyArray = [];
      if (Array.isArray(newHabit.frequency)) {
        frequencyArray = newHabit.frequency;
      } else if (newHabit.frequency) {
        frequencyArray = newHabit.frequency.split(',');
      }

      const processedHabit = {
        ...newHabit,
        frequency: frequencyArray,
      };

      return new Response(JSON.stringify(processedHabit), {
        status: 201,
        headers,
      });
    }

    // PUT /api/v1/habits/:id
    if (request.method === 'PUT' && habitId) {
      const data = await request.json();
      const updated = await HabitsDB.update(env.DB, habitId, data);
      if (!updated) {
        return new Response(JSON.stringify({ error: 'Habit not found' }), {
          status: 404,
          headers,
        });
      }
      // Make sure frequency is returned as array
      const processedHabit = {
        ...updated,
        frequency: updated.frequency ? updated.frequency.split(',') : [],
      };
      return new Response(JSON.stringify(processedHabit), { headers });
    }

    // DELETE /api/v1/habits/:id
    if (request.method === 'DELETE' && habitId) {
      const deleted = await HabitsDB.delete(env.DB, habitId);
      if (!deleted) {
        return new Response(JSON.stringify({ error: 'Habit not found' }), {
          status: 404,
          headers,
        });
      }
      return new Response(
        JSON.stringify({ message: 'Habit deleted successfully' }),
        { headers }
      );
    }

    // Route not found
    return new Response(
      JSON.stringify({ error: `Cannot ${request.method} ${path}` }),
      {
        status: 404,
        headers,
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers,
    });
  }
}

/**
 * Handle incoming requests to the worker
 * @param {Request} request - The incoming request
 * @param {Object} env - Environment variables including D1 database
 * @returns {Promise<Response>} The response
 */
async function handleRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;

  // Set up CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  // Handle OPTIONS preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  // Common response headers
  const headers = {
    'Content-Type': 'application/json',
    ...corsHeaders,
  };

  // API Routes
  if (path.startsWith('/api/v1/habits')) {
    return handleHabitsRoutes(request, env, headers);
  }

  // Default 404 response
  return new Response(
    JSON.stringify({ error: `Cannot ${request.method} ${path}` }),
    {
      status: 404,
      headers,
    }
  );
}

export default {
  async fetch(request, env) {
    return handleRequest(request, env);
  },
};
