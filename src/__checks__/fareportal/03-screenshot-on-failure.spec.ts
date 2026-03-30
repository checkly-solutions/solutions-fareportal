/**
 * Requirement #3: Screenshot-on-Failure Examples
 *
 * Demonstrates Playwright's built-in screenshot-on-failure capability for
 * immediate debugging context when a check fails. Uses the standard
 * `screenshot: "only-on-failure"` option in test.use() — no custom hooks
 * or file system logic needed. Playwright automatically attaches a full-page
 * screenshot to the test report when any assertion fails.
 *
 * Pages checked: Hotels (/hotels), Flights (/flights), Cars (/cars)
 *
 * Header handling:
 *   - user-agent and sec-ch-ua are set via test.use({ extraHTTPHeaders }) so they
 *     apply to every request from the first navigation onward.
 *   - context.route("**\/*") overrides headers on each individual request to ensure
 *     consistency across redirects and sub-resource loads.
 */
import { test, expect } from "@playwright/test";
import {
  dismissCookieBanner,
  closePopups,
  COM_DESKTOP_URL,
} from "./helpers";

const SEC_CH_UA = `"Chromium";v="127", "Not:A-Brand";v="99"`;
const UA =
  "Mozilla/5.0 (X11; Linux x86_64; Rigor) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.5304.110 Safari/537.36 Checkly/ec71f5bf";

test.use({
  userAgent: UA,
  viewport: { width: 1366, height: 768 },
  extraHTTPHeaders: {
    "sec-ch-ua": SEC_CH_UA,
  },
  screenshot: "only-on-failure",
});

test("[COA.com-Desktop] Screenshot Demo: Hotels page loads successfully", async ({
  page,
  context,
}) => {
  await context.route("**/*", async (route) => {
    await route.continue({
      headers: {
        ...route.request().headers(),
        "user-agent": UA,
        "sec-ch-ua": SEC_CH_UA,
      },
    });
  });

  await page.goto(`${COM_DESKTOP_URL}/hotels`, {
    waitUntil: "domcontentloaded",
  });
  await dismissCookieBanner(page);
  await closePopups(page);

  await expect(page.locator("#hs_originCity_0").first()).toBeVisible({
    timeout: 15000,
  });
});

test("[COA.com-Desktop] Screenshot Demo: Flights page loads", async ({
  page,
  context,
}) => {
  await context.route("**/*", async (route) => {
    await route.continue({
      headers: {
        ...route.request().headers(),
        "user-agent": UA,
        "sec-ch-ua": SEC_CH_UA,
      },
    });
  });

  await page.goto(`${COM_DESKTOP_URL}/flights`, {
    waitUntil: "domcontentloaded",
  });
  await dismissCookieBanner(page);
  await closePopups(page);

  const bodyText = await page.locator("body").textContent();
  expect(bodyText!.length).toBeGreaterThan(100);
});

test("[COA.com-Desktop] Screenshot Demo: Cars page loads", async ({
  page,
  context,
}) => {
  await context.route("**/*", async (route) => {
    await route.continue({
      headers: {
        ...route.request().headers(),
        "user-agent": UA,
        "sec-ch-ua": SEC_CH_UA,
      },
    });
  });

  const response = await page.goto(`${COM_DESKTOP_URL}/cars`, {
    waitUntil: "domcontentloaded",
  });
  await dismissCookieBanner(page);
  await closePopups(page);

  expect(response).not.toBeNull();
  expect(response!.url()).toContain("cars");
  const bodyText = await page.locator("body").textContent();
  expect(bodyText!.length).toBeGreaterThan(100);
});
