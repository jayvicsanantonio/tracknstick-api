/**
 * Performance Test Script using k6
 *
 * This script tests the performance of the TrackNStick API
 * Run with: k6 run scripts/performance-test.js
 *
 * Install k6: https://k6.io/docs/getting-started/installation/
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 20 }, // Ramp up to 20 users
    { duration: '1m', target: 20 }, // Stay at 20 users for 1 minute
    { duration: '30s', target: 0 }, // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    errors: ['rate<0.1'], // Error rate should be less than 10%
  },
};

// API configuration - adjust to match your environment
const API_BASE_URL = __ENV.API_URL || 'https://api.tracknstick.com';

// Authentication token - replace with a valid token for testing
const AUTH_TOKEN = __ENV.AUTH_TOKEN || 'your-test-auth-token';

// Get headers with authentication
function getHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${AUTH_TOKEN}`,
  };
}

// Main test function
export default function () {
  // GET /api/v1/habits
  let response = http.get(`${API_BASE_URL}/api/v1/habits`, {
    headers: getHeaders(),
  });

  // Check response
  const getSuccess = check(response, {
    'get habits status is 200': (r) => r.status === 200,
    'get habits response has habits array': (r) => {
      const body = JSON.parse(r.body);
      return Array.isArray(body.habits);
    },
  });

  if (!getSuccess) {
    errorRate.add(1);
    console.log(`Get habits failed: ${response.status} ${response.body}`);
  }

  // Sleep to simulate real user behavior
  sleep(1);

  // Test habit creation (optional, lower rate to avoid creating too many records)
  if (Math.random() < 0.2) {
    // Only 20% of iterations create a habit
    const habitPayload = JSON.stringify({
      name: `Test Habit ${Date.now()}`,
      icon: '🏃',
      frequency: {
        type: 'daily',
      },
      startDate: '2023-01-01',
    });

    response = http.post(`${API_BASE_URL}/api/v1/habits`, habitPayload, {
      headers: getHeaders(),
    });

    // Check creation
    const createSuccess = check(response, {
      'create habit status is 201': (r) => r.status === 201,
      'create habit returns id': (r) => {
        const body = JSON.parse(r.body);
        return body.id !== undefined;
      },
    });

    if (!createSuccess) {
      errorRate.add(1);
      console.log(`Create habit failed: ${response.status} ${response.body}`);
    }

    // If created successfully, test getting this specific habit
    if (response.status === 201) {
      const body = JSON.parse(response.body);
      const habitId = body.id;

      response = http.get(`${API_BASE_URL}/api/v1/habits/${habitId}`, {
        headers: getHeaders(),
      });

      // Check get single habit
      const getOneSuccess = check(response, {
        'get single habit status is 200': (r) => r.status === 200,
        'get single habit returns correct id': (r) => {
          const body = JSON.parse(r.body);
          return body.id === habitId;
        },
      });

      if (!getOneSuccess) {
        errorRate.add(1);
        console.log(
          `Get habit ${habitId} failed: ${response.status} ${response.body}`
        );
      }
    }
  }

  // Sleep to simulate real user behavior
  sleep(1);
}
