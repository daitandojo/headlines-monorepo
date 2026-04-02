// packages/utils-server/src/pusher.ts
import Pusher from 'pusher';
import { logger } from '@shared/utils';
let pusher = null;
export function configurePusher(env = process.env) {
    if (pusher)
        return;
    const { PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET, PUSHER_CLUSTER } = env;
    if (PUSHER_APP_ID && PUSHER_KEY && PUSHER_SECRET && PUSHER_CLUSTER) {
        pusher = new Pusher({
            appId: PUSHER_APP_ID,
            key: PUSHER_KEY,
            secret: PUSHER_SECRET,
            cluster: PUSHER_CLUSTER,
            useTLS: true,
        });
        logger.info('✅ [Pusher] Real-time service configured.');
    }
    else {
        logger.warn('⚠️ [Pusher] Credentials missing. Real-time updates disabled.');
    }
}
export async function triggerRealtimeEvent(channel, event, data) {
    if (!pusher) {
        configurePusher();
        if (!pusher)
            return;
    }
    try {
        await pusher.trigger(channel, event, data);
    }
    catch (error) {
        logger.error({ err: error.message, channel, event }, 'Failed to trigger Pusher event.');
    }
}
//# sourceMappingURL=pusher.js.map