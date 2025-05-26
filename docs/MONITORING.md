# Monitoring and Observability for TrackNStick API

This document outlines the monitoring and observability strategy and tools for the TrackNStick API, which runs on Cloudflare Workers and utilizes Cloudflare D1.

## 1. Cloudflare Native Monitoring Tools

Cloudflare provides a suite of tools for monitoring Workers and associated services like D1.

### 1.1. Cloudflare Workers Analytics
The Cloudflare dashboard offers built-in analytics for your deployed Workers, providing insights into:

- **Request Metrics:** Volume of requests, success/error rates (e.g., 2xx, 4xx, 5xx status codes).
- **Performance Metrics:** CPU time per request, invocation latency.
- **Invocation Logs:** Detailed logs for each Worker invocation, including any `console.log` statements from your code.
- **Errors:** Breakdown of errors encountered by the Worker.
- **Geographic Distribution:** Insights into where requests are originating.

**Access:** Cloudflare Dashboard -> Workers & Pages -> [Your Worker Service] -> Analytics / Logs.

### 1.2. Wrangler CLI for Real-time Logs
For real-time log streaming during development or for live troubleshooting:
```bash
wrangler tail <YOUR_WORKER_NAME>
# Add --env <environment_name> for specific environments (e.g., production)
# Add --format pretty (or json) for output formatting
```
This command streams logs directly from your Worker, including `console.log` outputs and error messages.

### 1.3. Cloudflare D1 Analytics
The Cloudflare dashboard also provides analytics for D1 databases:
- **Query Performance:** Insights into read/write operations, query latency.
- **Storage Metrics:** Database size, row counts.

**Access:** Cloudflare Dashboard -> D1 -> [Your Database] -> Insights.

### 1.4. Cloudflare Alerts
Configure alerts based on Worker metrics or logs to get notified of issues:
- **Metric-based Alerts:** e.g., high error rates, increased CPU time, high latency.
- **Log-based Alerts (via Logpush):** If logs are pushed to a supported storage/analytics service, alerts can be configured there.
- **Health Check Alerts:** If using Cloudflare Health Checks against your API endpoints.

**Configuration:** Cloudflare Dashboard -> Notifications. You can set up notifications for various services, including Workers errors and Health Check status changes.

## 2. Application-Level Logging & Monitoring

Our API implements custom logging for more detailed insights.

### 2.1. Structured Logging
- **Implementation:** The API uses a custom logger (e.g., `src/utils/logger.ts`) that outputs structured JSON logs. This is crucial for effective parsing and analysis in a log management system.
- **Key Logged Information:**
    - Request ID for tracing individual requests through the system.
    - Request details (method, URL, headers, processed body if safe).
    - Response details (status code, duration).
    - Errors with stack traces and relevant context (e.g., user ID if applicable and safe, input parameters).
    - Important business logic steps or decisions.
- **Sensitive Data:** Care is taken to ensure sensitive data (e.g., full PII from Clerk, raw tokens) is **not** logged.

### 2.2. Custom Metrics (Conceptual)
While Cloudflare provides core metrics, the application can be instrumented to track business-specific metrics.
- **Examples:**
    - Number of habits created/completed per user.
    - Active user counts based on API interaction.
    - Performance of specific service functions or critical code paths (e.g., using `console.time` and logging the duration).
- **Implementation:** These are typically logged as structured log messages with specific metric names and values, which can then be aggregated by a log management/analytics platform.
    ```typescript
    // Example of logging a custom business metric
    // In a service function, after a successful operation:
    // logger.info('habit_created', { userId: '...', habitId: '...' }); 
    ```

## 3. Error Tracking
- **Global Error Handler:** The `errorHandler.ts` middleware catches unhandled errors, logs them with details (including stack trace in development/staging), and sends a standardized error response to the client.
- **External Services (Optional but Recommended):** For more robust error tracking, consider integrating a service like Sentry.
    - **Sentry:** Can capture unhandled exceptions, provide detailed error reports with context, and manage error workflows. Integration would involve adding Sentry's SDK to the Worker.

## 4. Synthetic Monitoring & Health Checks
- **`/health` Endpoint:** The API includes a `/api/v1/health` endpoint (or similar) that can be used by external services to monitor basic API availability.
- **Scheduled Tests (External):**
    - Use an external uptime monitoring service (e.g., UptimeRobot, Better Uptime, Checkly) to periodically hit the `/health` endpoint and key API endpoints.
    - This verifies not only that the Worker is running but also that essential functionalities are operational.
- **Integration Tests as Health Checks:** A subset of integration tests can be run on a schedule against a staging or even production environment (carefully) to ensure end-to-end functionality.

## 5. Dashboards & Visualization (Conceptual)
- **Cloudflare Dashboard:** Provides default dashboards for Worker and D1 metrics.
- **Custom Dashboards (External):** If logs are pushed to a log management system (e.g., Grafana Loki, Datadog Logs, Logflare), custom dashboards can be created to visualize:
    - API health and error rates over time.
    - Performance trends (latency, request duration).
    - Usage patterns and user activity.
    - Business-specific metrics derived from logs.

## 6. Cold Start Monitoring
Cloudflare Workers generally have very low cold start times. However, it's good to be aware:
- **Observation:** Monitor P90/P95/P99 latencies in Cloudflare Workers Analytics. Significant spikes might indicate cold starts or other performance issues.
- **Mitigation:** For critical paths, consider strategies like provisioned concurrency (if available/necessary) or warming requests (though the latter is less common and often not needed with Workers' performance).

## 7. Incident Response (General Outline)
A basic incident response plan:
1.  **Alerting:** Critical alerts (high error rate, service unavailability) notify the development team (e.g., via Slack, email, PagerDuty).
2.  **Assessment:** Quickly assess the impact and scope of the issue using Cloudflare logs, analytics, and any external monitoring tools.
3.  **Communication:** If user-impacting, update any relevant status page or communication channels.
4.  **Resolution:** Identify the root cause and deploy a fix.
5.  **Post-Mortem:** For significant incidents, conduct a post-mortem to understand the cause and prevent recurrence.

## 8. Setting Up & Best Practices

### 8.1. Effective Logging in Code
```typescript
// src/utils/logger.ts - Ensure your logger is set up
import logger from './logger'; // Assuming you have a configured logger

// In a controller or service:
export const someFunction = async (c: Context) => {
  const userId = c.get('userId');
  logger.info('Starting operation for user', { userId, operation: 'someFunction' });
  try {
    // ... business logic ...
    if (somethingUnexpected) {
      logger.warn('Unexpected condition met', { userId, details: '...' });
    }
    // ...
    logger.info('Operation successful for user', { userId, operation: 'someFunction' });
  } catch (error) {
    logger.error('Error during operation for user', { 
      userId, 
      operation: 'someFunction', 
      errorMessage: error.message,
      stack: error.stack, // Be cautious logging full stacks in production logs depending on verbosity and PII
      errorDetails: error.details // If using custom errors with a details property
    });
    throw error; // Re-throw for global error handler
  }
};
```

### 8.2. Reviewing Cloudflare Settings
- Regularly review the analytics and logs in the Cloudflare dashboard.
- Configure alerts in Cloudflare for key metrics (e.g., Worker error rates > X%).
- Set up Logpush from Cloudflare to a dedicated log management system for long-term storage, advanced querying, and dashboarding if needed.

### 8.3. Recommended External Services (Optional)
If Cloudflare's built-in tools are insufficient for your needs, consider these:
- **Log Management & Analytics:**
    - **Logflare:** Good integration with Cloudflare.
    - **Datadog, New Relic, Dynatrace:** Comprehensive observability platforms (can be expensive).
    - **Grafana Cloud (Loki):** Open-source based, flexible.
- **Error Tracking:**
    - **Sentry:** Popular for error tracking and performance monitoring.
- **Uptime/Synthetic Monitoring:**
    - **Better Uptime, UptimeRobot, Checkly.**
