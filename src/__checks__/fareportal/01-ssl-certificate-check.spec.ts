/**
 * Requirement #1: SSL Certificate Check Examples
 *
 * Checks SSL certificate expiration for Fareportal's domains via two methods:
 *   - API SSL: Uses Node's TLS module to connect and read cert expiry directly.
 *     Fails if any cert has fewer than 30 days remaining.
 *   - Browser SSL: Navigates to each domain over HTTPS via Playwright and verifies
 *     the connection is secure with no certificate errors.
 *
 * Domains checked: cheapoair.com, onetravel.com, fareportal.com
 *
 * Header handling:
 *   - user-agent and sec-ch-ua are set via test.use({ extraHTTPHeaders }) so they
 *     apply to every request from the first navigation onward.
 *   - context.route("**\/*") overrides headers on each individual request to ensure
 *     consistency across redirects and sub-resource loads.
 */
import { test, expect } from "@playwright/test";
import * as tls from "tls";
import * as net from "net";

const SEC_CH_UA = `"Chromium";v="127", "Not:A-Brand";v="99"`;
const UA =
  "Mozilla/5.0 (X11; Linux x86_64; Rigor) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.5304.110 Safari/537.36 Checkly/ec71f5bf";

test.use({
  userAgent: UA,
  viewport: { width: 1366, height: 768 },
  extraHTTPHeaders: {
    "sec-ch-ua": SEC_CH_UA,
  },
});

/**
 * Fareportal domains to check SSL certificates for.
 * Customize this list with your own domains.
 */
const FAREPORTAL_DOMAINS = [
  "www.cheapoair.com",
  "www.onetravel.com",
  "www.fareportal.com",
];

/** Minimum days before expiration to consider the cert healthy */
const MIN_DAYS_REMAINING = 30;

/**
 * Helper: connect via TLS and return the certificate expiration date
 */
function getCertExpiry(hostname: string): Promise<Date> {
  return new Promise((resolve, reject) => {
    const socket = tls.connect(
      { host: hostname, port: 443, servername: hostname },
      () => {
        const cert = socket.getPeerCertificate();
        socket.end();
        if (!cert || !cert.valid_to) {
          reject(new Error(`No certificate returned for ${hostname}`));
          return;
        }
        resolve(new Date(cert.valid_to));
      }
    );
    socket.setTimeout(10000);
    socket.on("timeout", () => {
      socket.destroy();
      reject(new Error(`TLS connection to ${hostname} timed out`));
    });
    socket.on("error", (err) => reject(err));
  });
}

for (const domain of FAREPORTAL_DOMAINS) {
  test(`[API SSL] Certificate for ${domain} is valid for at least ${MIN_DAYS_REMAINING} days`, async () => {
    const expiryDate = await getCertExpiry(domain);
    const now = new Date();
    const daysRemaining = Math.floor(
      (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    console.log(
      `${domain} SSL cert expires: ${expiryDate.toISOString()} (${daysRemaining} days remaining)`
    );

    expect(daysRemaining).toBeGreaterThan(MIN_DAYS_REMAINING);
  });

  test(`[Browser SSL] ${domain} loads securely over HTTPS`, async ({
    page,
    context,
  }) => {
    // Set custom headers for the entire context
    await context.route("**/*", async (route) => {
      await route.continue({
        headers: {
          ...route.request().headers(),
          "user-agent": UA,
          "sec-ch-ua": SEC_CH_UA,
        },
      });
    });

    // Track if any SSL/certificate errors occur
    let sslError = false;
    page.on("pageerror", (err) => {
      if (
        err.message.includes("SSL") ||
        err.message.includes("certificate") ||
        err.message.includes("ERR_CERT")
      ) {
        sslError = true;
      }
    });

    const response = await page.goto(`https://${domain}`, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    // Verify the page responded over HTTPS (any status is fine — 403 means
    // the TLS handshake succeeded but the server blocked the request)
    expect(response).not.toBeNull();
    expect(response!.url()).toMatch(/^https:\/\//);
    expect(sslError).toBe(false);

    // Verify the browser is on a secure context
    const securityState = await page.evaluate(() => {
      return window.location.protocol;
    });
    expect(securityState).toBe("https:");
  });
}
