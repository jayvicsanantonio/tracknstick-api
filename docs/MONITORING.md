# Monitoring and Observability for TrackNStick API

This document outlines the monitoring and observability setup for the TrackNStick API running on Cloudflare Workers.

## Monitoring Tools

### Cloudflare Analytics

Cloudflare Workers provides built-in analytics that offer insights into:

- Request volume
- CPU time consumption
- Request success/error rates
- Geographic distribution of requests
- Status code distribution

Access this dashboard in the Cloudflare Workers dashboard under the Analytics tab.

### Custom Metrics

Our API collects and tracks additional metrics:

1. **Request Duration**: Tracked through request logging middleware
2. **Database Query Times**: Monitored for performance optimization
3. **Error Rates**: Categorized by endpoint and error type
4. **Authentication Failures**: Security monitoring

## Alerting

Alerts are configured for the following conditions:

| Metric                  | Threshold           | Alert Channel |
| ----------------------- | ------------------- | ------------- |
| Error Rate              | > 5% over 5 minutes | Slack + Email |
| P95 Response Time       | > 1000ms            | Slack         |
| Worker CPU Time         | > 40ms avg          | Slack         |
| Authentication Failures | > 10 in 1 minute    | Slack + Email |
| Database Errors         | Any                 | Slack + Email |

## Logging

Logs are structured for easy parsing and analysis:

- All logs include request ID for tracing
- Error logs include stack traces and context
- Request logs include duration, status, and path
- Sensitive data is never logged

## Dashboards

Custom dashboards have been created to monitor:

1. **API Health**: Overall health metrics
2. **Performance**: Response times by endpoint
3. **Usage**: Request patterns and user activity
4. **Errors**: Error trends and details

## Cold Start Tracking

Cloudflare Workers may experience cold starts that can affect performance. We track:

- Cold start frequency
- Cold start duration
- Impact on overall response times

## Synthetic Monitoring

We use scheduled tests to verify API health:

- Health check endpoint called every minute
- Full API test suite run hourly
- Simulated user flows tested daily

## Incident Response

When monitoring detects issues:

1. On-call engineer receives alert
2. Initial assessment within 15 minutes
3. Status page updated if user-impacting
4. Post-mortem conducted for all incidents

## Setup Instructions

### Adding New Metrics

To add a new metric to track:

```typescript
// In your middleware or controller
c.get('logger').info('Custom metric', {
  metricName: 'endpoint_performance',
  value: duration,
  endpoint: '/api/v1/habits',
  metadata: { ... }
});
```

### Configuring Alerts

Configure new alerts in the Cloudflare dashboard:

1. Navigate to Workers > [Your Worker] > Settings > Notifications
2. Set up conditions and notification channels

### Recommended Monitoring Services

For enhanced monitoring beyond Cloudflare's built-in tools:

- [New Relic](https://newrelic.com/) - For detailed performance monitoring
- [Datadog](https://www.datadoghq.com/) - For comprehensive observability
- [Honeycomb](https://www.honeycomb.io/) - For distributed tracing
