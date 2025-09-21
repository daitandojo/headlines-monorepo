// packages/data-access/src/actions/email.js (version 1.0)
import { getUserIdFromSession } from '../../../auth/src/index.js';
import { SynthesizedEvent, Opportunity, Article } from '../../../models/src/index.js';
import dbConnect from '../dbConnect.js';
// This import will need a proper mailer service setup, for now we mock it.
// import { sendSingleItemEmail } from '@/lib/mailer'; 

async function sendItemByEmail(itemId, itemType) {
    const userId = await getUserIdFromSession();
    if (!userId) return { success: false, error: 'Authentication required.' };
    
    try {
        await dbConnect();

        let item;
        const modelMap = {
            event: SynthesizedEvent,
            opportunity: Opportunity,
            article: Article,
        };

        const Model = modelMap[itemType];
        if (!Model) return { success: false, error: 'Invalid item type.' };

        item = await Model.findById(itemId).lean();
        if (!item) return { success: false, error: 'Item not found.' };

        // In a real implementation, you would format this into a nice HTML email.
        const emailContent = `
            <h1>Item Reminder</h1>
            <p><strong>Type:</strong> ${itemType}</p>
            <p><strong>ID:</strong> ${itemId}</p>
            <pre>${JSON.stringify(item, null, 2)}</pre>
        `;
        
        console.log(`--- SIMULATING EMAIL ---`);
        console.log(`TO: User ${userId}`);
        console.log(`SUBJECT: Your Requested Item: ${item.headline || item.reachOutTo}`);
        console.log(emailContent);
        // await sendSingleItemEmail(userId, `Your Requested Item: ${item.headline || item.reachOutTo}`, emailContent);

        return { success: true, message: 'Item has been sent to your email.' };

    } catch (e) {
        console.error('[sendItemByEmail Error]:', e);
        return { success: false, error: 'Failed to send item by email.' };
    }
}

export { sendItemByEmail };
