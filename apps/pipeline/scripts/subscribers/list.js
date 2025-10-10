// apps/pipeline/scripts/subscribers/list.js
/**
 * @command subscribers:list
 * @group Subscribers
 * @description List all subscribers in the database with detailed status and engagement metrics.
 */
import { initializeScriptEnv } from '../seed/lib/script-init.js'
import { findSubscribers } from '@headlines/data-access'
import { logger } from '@headlines/utils-shared'
import colors from 'ansi-colors'
import { format, formatDistanceToNow } from 'date-fns'

/**
 * A simple utility to create formatted rows for the custom table output.
 * @param {string} label - The label for the row.
 * @param {string} value - The value for the row.
 * @param {number} labelWidth - The fixed width for the label column.
 * @returns {string} A formatted string for a single row.
 */
function formatRow(label, value, labelWidth) {
  const paddedLabel = `${label}:`.padEnd(labelWidth)
  return `  ${colors.gray(paddedLabel)} ${value}`
}

async function listSubscribers() {
  await initializeScriptEnv()
  try {
    const subscribersResult = await findSubscribers({ sort: { email: 1 } })

    if (!subscribersResult.success) {
      throw new Error(subscribersResult.error)
    }

    const subscribers = subscribersResult.data

    if (subscribers.length === 0) {
      console.log('No subscribers found.')
      return
    }

    console.log(
      colors.bold.cyan(`\n--- Displaying ${subscribers.length} Subscribers ---\n`)
    )

    subscribers.forEach((s, index) => {
      const profile = {
        Name: `${s.firstName} ${s.lastName || ''}`,
        Status: s.isActive ? colors.green('Active') : colors.red('Inactive'),
        Role: s.role === 'admin' ? colors.yellow('Admin') : s.role,
        Tier: s.subscriptionTier || 'N/A',
        Expires: s.subscriptionExpiresAt
          ? format(new Date(s.subscriptionExpiresAt), 'yyyy-MM-dd')
          : colors.gray('N/A'),
        'Last Login': s.lastLoginAt
          ? `${formatDistanceToNow(new Date(s.lastLoginAt))} ago`
          : colors.gray('Never'),
      }

      const engagement = {
        'Email Notifications': s.emailNotificationsEnabled
          ? colors.green('On')
          : colors.red('Off'),
        'Push Notifications': s.pushNotificationsEnabled
          ? colors.green('On')
          : colors.red('Off'),
        'Emails Sent': colors.cyan((s.emailSentCount || 0).toString()),
        'Events Received': colors.cyan((s.eventsReceivedCount || 0).toString()),
      }

      const activeCountries = (s.countries || [])
        .filter((c) => c.active)
        .map((c) => c.name)

      console.log(colors.bold.white(`👤 ${s.email}`))
      console.log(colors.gray(''.padEnd(80, '─')))

      const labelWidth = 22 // Set a fixed width for labels for alignment

      // Print Profile Info
      console.log(formatRow('Name', profile.Name, labelWidth))
      console.log(formatRow('Status', profile.Status, labelWidth))
      console.log(formatRow('Role', profile.Role, labelWidth))
      console.log(formatRow('Tier', profile.Tier, labelWidth))
      console.log(formatRow('Expires', profile.Expires, labelWidth))
      console.log(formatRow('Last Login', profile['Last Login'], labelWidth))

      console.log('') // Spacer

      // Print Engagement Info
      console.log(
        formatRow('Email Notifications', engagement['Email Notifications'], labelWidth)
      )
      console.log(
        formatRow('Push Notifications', engagement['Push Notifications'], labelWidth)
      )
      console.log(formatRow('Emails Sent', engagement['Emails Sent'], labelWidth))
      console.log(formatRow('Events Received', engagement['Events Received'], labelWidth))

      // Print Country Subscriptions in a multi-line format
      const countryLabel = 'Country Subscriptions:'
      if (activeCountries.length > 0) {
        console.log(`  ${colors.gray(countryLabel.padEnd(labelWidth))}`)
        activeCountries.forEach((country) => {
          console.log(`  ${''.padEnd(labelWidth)} - ${country}`)
        })
      } else {
        console.log(formatRow('Country Subscriptions', colors.gray('None'), labelWidth))
      }

      if (index < subscribers.length - 1) {
        console.log('\n')
      }
    })
  } catch (e) {
    logger.error({ err: e }, 'Error listing subscribers')
  }
}

listSubscribers()
