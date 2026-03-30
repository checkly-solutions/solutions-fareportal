Here's a refined repository structure and LLM instructions for creating the Fareportal examples using Checkly:

───

:file_folder: Repository Structure

fareportal-checkly-examples/
├── README.md # Main instructions
├── ssl-certificate-checks/ # SSL cert examples
│ ├── api-ssl-check.js # API SSL expiration
│ ├── browser-ssl-check.js # Browser SSL expiration
│ └── package.json # Dependencies
│
├── web-vitals-multi-page/ # Multi-page Web Vitals
│ ├── checkout-flow.js # Example: listing → payment journey
│ ├── package.json # Dependencies
│ └── README.md # Setup instructions
│
└── screenshots-on-failure/ # Screenshot examples
├── failure-screenshot.js # Screenshot on failure
├── package.json # Dependencies
└── README.md # Setup instructions
───

:book: LLM Instructions (Copy-Paste Ready)

System Prompt:

You are a Checkly expert helping a customer implement monitoring for Fareportal. Your task is to create working examples of Checkly checks that Fareportal needs. Follow these instructions exactly.

IMPORTANT:

- Use Checkly CLI (not the UI)
- Write Playwright-based checks
- Include proper error handling
- Document custom configuration
- Assume the user has basic Node.js knowledge
  ───

:closed_lock_with_key: SSL Certificate Check Instructions

User Prompt:

Create a Checkly CLI project with examples for checking SSL certificate expiration for Fareportal's APIs and browser flows.

Requirements:

1. Check SSL expiration for API endpoints (HTTPS)
2. Check SSL expiration for browser flows (Playwright)
3. Include proper error handling for expired certificates
4. Document how to customize for Fareportal's domains
5. Use Checkly CLI commands to deploy

Expected output:

- A working Checkly project in the `ssl-certificate-checks/` directory
- Proper package.json with dependencies
- README.md with setup and customization instructions
  ───

:bar_chart: Multi-Page Web Vitals Instructions

User Prompt:

Create a Checkly CLI project that captures Web Vitals for all pages in a user journey (not just the first page) and posts metrics to an internal API.

Requirements:

1. Capture LCP, FID, CLS for all pages in a journey
2. Post metrics to an internal API endpoint
3. Include example journey: listing → payment
4. Document how Fareportal can customize the API endpoint
5. Use Checkly CLI commands to deploy

Expected output:

- A working Checkly project in the `web-vitals-multi-page/` directory
- Proper package.json with dependencies
- README.md with setup and customization instructions
  ───

:camera_with_flash: Screenshot-on-Failure Instructions

User Prompt:

Create a Checkly CLI project that takes screenshots when checks fail and stores them in Fareportal's debugging system.

Requirements:

1. Take screenshot on check failure
2. Store screenshot in Fareportal's debugging system
3. Include example check that will fail (for testing)
4. Document how to customize screenshot storage
5. Use Checkly CLI commands to deploy

Expected output:

- A working Checkly project in the `screenshots-on-failure/` directory
- Proper package.json with dependencies
- README.md with setup and customization instructions
  ───

:rocket: Quick Start Commands (For LLM to Include in README)

# Install Checkly CLI globally

npm install -g @checkly/cli

# Initialize new project

npx checkly init fareportal-ssl-checks --template playwright
cd fareportal-ssl-checks

# Install dependencies

npm install

# Run locally (for testing)

npx checkly test

# Deploy to Checkly

npx checkly deploy
───

:clipboard: Customization Guide (For README)

For Fareportal's SSL Checks:

```
// In api-ssl-check.js
const apiUrl = process.env.FAREPORTAL_API_URL || 'https://api.fareportal.com';
const check = new ApiCheck('SSL Expiration - API', {
  name: 'SSL Expiration Check',
  activated: true,
  request: {
    method: 'GET',
    url: ${apiUrl}/health,
    assertions: [[11:58 PM]Assertion.forResponseTime('< 5000'),
      Assertion.forStatusCode('== 200')
    ]
  },
  alertChannels: ['#fareportal-alerts']
});

// Add SSL expiration logic
check.addAssertion(Assertion.forResponseProperty(
  'sslExpiration',
  '> 2592000000' // 30 days in milliseconds
));*For Fareportal's Web Vitals:*

// In checkout-flow.js
const journey = new BrowserCheck('Checkout Flow - Web Vitals', {
  name: 'Checkout Journey with Web Vitals',
  activated: true,
  script: async (page, { variables }) => {
    await page.goto('https://fareportal.com/listing');

    // Capture Web Vitals for listing page
    const listingMetrics = await page.metrics();

    await page.click('#checkout-button');
    await page.waitForNavigation();

    // Capture Web Vitals for payment page
    const paymentMetrics = await page.metrics();

    // Post to internal API
    await fetch(process.env.INTERNAL_API_ENDPOINT, {
      method: 'POST',
      body: JSON.stringify({
        journey: 'listing-to-payment',
        metrics: [...listingMetrics, ...paymentMetrics]
      })
    });
  }
});*For Fareportal's Screenshots:*

// In failure-screenshot.js
const check = new BrowserCheck('Example Check with Screenshot', {
  name: 'Check that fails and takes screenshot',
  activated: true,
  script: async (page) => {
    await page.goto('https://fareportal.com/nonexistent-page');
    // This will fail and trigger screenshot
  }
});

// Configure screenshot storage
check.setScreenshotConfig({
  onFailure: true,
  storage: 'https://debug.fareportal.com/screenshots'
});
```

───

:dart: LLM Output Requirements

When generating these examples, the LLM should:

1. Create working code that can be deployed immediately
2. Include proper error handling for edge cases
3. Document customization points clearly
4. Use environment variables for configurable values
5. Include deployment commands in the README
6. Add troubleshooting section for common issues

Would you like me to generate the actual code files for any of these examples?
