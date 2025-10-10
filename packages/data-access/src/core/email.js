// packages/data-access/src/core/email.js
import { SynthesizedEvent, Opportunity, Article, Subscriber } from '@headlines/models'
import { sendGenericEmail } from '@headlines/utils-server'

async function sendItemByEmail(itemId, itemType, userId) {
  try {
    let item
    const modelMap = {
      event: SynthesizedEvent,
      opportunity: Opportunity,
      article: Article,
    }

    const Model = modelMap[itemType]
    if (!Model) return { success: false, error: 'Invalid item type.' }

    item = await Model.findById(itemId).lean()
    if (!item) return { success: false, error: 'Item not found.' }

    const user = await Subscriber.findById(userId).select('email').lean()
    if (!user) return { success: false, error: 'User not found.' }

    // In a real implementation, you would format this into a nice HTML email.
    const emailContent = `
            <h1>Item Reminder</h1>
            <p><strong>Type:</strong> ${itemType}</p>
            <p><strong>ID:</strong> ${itemId}</p>
            <p>Here is the data you requested:</p>
            <pre style="background-color: #f0f0f0; padding: 15px; border-radius: 5px; white-space: pre-wrap; word-wrap: break-word;">${JSON.stringify(
              item,
              null,
              2
            )}</pre>
        `

    await sendGenericEmail({
      to: user.email,
      subject: `Your Requested Item: ${item.headline || item.reachOutTo || 'Details'}`,
      html: emailContent,
      emailType: 'ItemSend',
    })

    return { success: true, message: 'Item has been sent to your email.' }
  } catch (e) {
    console.error('[sendItemByEmail Error]:', e)
    return { success: false, error: 'Failed to send item by email.' }
  }
}

export { sendItemByEmail }
