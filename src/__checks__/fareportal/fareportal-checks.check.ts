/**
 * Fareportal BrowserCheck constructs
 *
 * Maps each customer requirement to a Checkly BrowserCheck:
 *   #1 SSL Certificate Checks      -> 01-ssl-certificate-check.spec.ts
 *   #2 Multi-Page Web Vitals       -> 02-multi-page-web-vitals.spec.ts
 *   #3 Screenshot on Failure        -> 03-screenshot-on-failure.spec.ts
 *   Bonus: Hotel Booking E2E Flow  -> 04-hotel-booking-flow.spec.ts
 */
import * as path from 'path'
import { BrowserCheck, Frequency, RetryStrategyBuilder } from 'checkly/constructs'
import { fareportalGroup } from './fareportal-group.check'

// Requirement #1: SSL Certificate Check
// Verifies SSL certs for cheapoair.com, onetravel.com, fareportal.com
// are valid and have 30+ days before expiration
new BrowserCheck('fareportal-ssl-certificate-check', {
  name: 'Fareportal - SSL Certificate Expiration',
  group: fareportalGroup,
  code: {
    entrypoint: path.join(__dirname, '01-ssl-certificate-check.spec.ts'),
  },
  frequency: Frequency.EVERY_24H,
  runParallel: true,
})

// Requirement #2: Multi-Page Web Vitals
// Captures LCP, CLS, TTFB across all pages in a journey (not just the first)
// Avoids check duplication by collecting metrics for the entire flow in one check
new BrowserCheck('fareportal-web-vitals-check', {
  name: 'Fareportal - Multi-Page Web Vitals',
  group: fareportalGroup,
  code: {
    entrypoint: path.join(__dirname, '02-multi-page-web-vitals.spec.ts'),
  },
  frequency: Frequency.EVERY_30M,
  retryStrategy: RetryStrategyBuilder.fixedStrategy({
    baseBackoffSeconds: 60,
    maxRetries: 2,
    sameRegion: true,
  }),
  runParallel: true,
})

// Requirement #3: Screenshot on Failure
// Uses Playwright's built-in screenshot: "only-on-failure" for immediate debugging context
// Automatically attaches full-page screenshots to test reports when assertions fail
new BrowserCheck('fareportal-screenshot-on-failure-check', {
  name: 'Fareportal - Screenshot on Failure',
  group: fareportalGroup,
  code: {
    entrypoint: path.join(__dirname, '03-screenshot-on-failure.spec.ts'),
  },
  runParallel: true,
})

// Bonus: Hotel Booking E2E Flow
// Full end-to-end check of the hotel booking journey on cheapoair.com
// Requires Checkly's allowlisted IPs for the /trip/hotels search results page
new BrowserCheck('fareportal-hotel-booking-check', {
  name: 'Fareportal - Hotel Booking Flow',
  group: fareportalGroup,
  code: {
    entrypoint: path.join(__dirname, '04-hotel-booking-flow.spec.ts'),
  },
  frequency: Frequency.EVERY_30M,
  retryStrategy: RetryStrategyBuilder.fixedStrategy({
    baseBackoffSeconds: 60,
    maxRetries: 4,
    sameRegion: true,
  }),
  runParallel: true,
})
