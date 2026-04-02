// packages/utils-server/src/alerting.ts
import { logger } from '@shared/utils';
export function sendErrorAlert(error, context = {}) {
    const alertPayload = {
        timestamp: new Date().toISOString(),
        errorMessage: error.message,
        origin: context.origin || 'Unknown',
        ...context,
    };
    logger.error(alertPayload, `🚨 CRITICAL ERROR ALERT 🚨`);
    // Hook for Sentry/Slack integration would go here
}
//# sourceMappingURL=alerting.js.map