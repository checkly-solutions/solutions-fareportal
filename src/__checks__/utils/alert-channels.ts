import { URL } from 'node:url'
import {
  EmailAlertChannel,
  SlackAlertChannel,
  WebhookAlertChannel
} from 'checkly/constructs'

// Defines the settings for our alert channels. 
// Not every channel is used in the rest of this demo project.
// Note that you can create multiple channels of a type:
// e.g. "prodEmailChannel" "frontendTeamEmailChannel" etc.
// See all the options at https://www.checklyhq.com/docs/alerting-and-retries/alert-channels/


const sendDefaults = {
  sendFailure: true,
  sendRecovery: true,
  sendDegraded: false,
  sslExpiry: true,
  sslExpiryThreshold: 30
}

export const emailChannel = new EmailAlertChannel('email-channel-1', {
  address: 'alerts@acme.com',
  ...sendDefaults
})

export const slackChannel = new SlackAlertChannel('slack-channel-1', {
  url: new URL(process.env.SLACK_WEBHOOK_URL || 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK'),
  channel: '#ops',
  ...sendDefaults
})

export const webhookChannel = new WebhookAlertChannel('webhook-channel-1', {
  name: 'Pushover webhook',
  method: 'POST',
  url: new URL(process.env.WEBHOOK_URL || 'https://webhook.site/YOUR-WEBHOOK-ID'),
  template: `{
    "token":"FILL_IN_YOUR_SECRET_TOKEN_FROM_PUSHOVER",
    "user":"FILL_IN_YOUR_USER_FROM_PUSHOVER",
    "title":"{{ALERT_TITLE}}",
    "html":1,
    "priority":2,
    "retry":30,
    "expire":10800,
    "message":"{{ALERT_TYPE}} {{STARTED_AT}} ({{RESPONSE_TIME}}ms) {{RESULT_LINK}}"
  }`,
  ...sendDefaults
})
