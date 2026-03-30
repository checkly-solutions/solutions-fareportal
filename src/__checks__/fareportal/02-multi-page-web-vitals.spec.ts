/**
 * Requirement #2: Multi-Page Web Vitals Export Examples
 *
 * Captures Web Vitals (LCP, CLS, TTFB, DOMContentLoaded, Load) for every page
 * in a user journey — not just the first page. This avoids duplicating checks
 * per page by collecting metrics across the entire flow in a single check.
 *
 * Journeys covered:
 *   - Flights: Homepage -> Flight Listing (same-tab navigation)
 *   - Hotels:  Hotels Homepage -> Hotel Listing (same-tab via search widget)
 *   - Hotels:  Listing -> Hotel Detail (new-tab/popup via context.addInitScript)
 *
 * Metrics are captured by injecting PerformanceObserver for LCP/CLS and reading
 * Navigation Timing for TTFB/DOMContentLoaded/Load on each page.
 *
 * When INTERNAL_API_ENDPOINT is set, metrics are POSTed there. Otherwise they
 * are logged to the console for review in Checkly check results.
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
  randomFrom,
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
});

/**
 * Web Vitals init script — injected via context.addInitScript() so it runs
 * automatically on EVERY page in the context, including popups and new tabs.
 * Stores metrics on window.__WEB_VITALS__ for later retrieval via page.evaluate().
 */
const WEB_VITALS_INIT_SCRIPT = `
  window.__WEB_VITALS__ = {};
  try {
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      if (entries.length > 0) {
        window.__WEB_VITALS__.LCP = entries[entries.length - 1].startTime;
      }
    }).observe({ type: 'largest-contentful-paint', buffered: true });

    new PerformanceObserver((list) => {
      let cls = 0;
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) cls += entry.value;
      }
      window.__WEB_VITALS__.CLS = cls;
    }).observe({ type: 'layout-shift', buffered: true });
  } catch (e) {}
`;

/**
 * Read the collected Web Vitals from a page (same tab or popup).
 * The init script above must have been injected via context.addInitScript().
 */
async function collectWebVitals(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    return new Promise<Record<string, number>>((resolve) => {
      setTimeout(() => {
        const metrics: Record<string, number> = {
          ...((window as any).__WEB_VITALS__ || {}),
        };
        const nav = performance.getEntriesByType(
          "navigation"
        )[0] as PerformanceNavigationTiming;
        if (nav) {
          metrics["TTFB"] = nav.responseStart - nav.requestStart;
          metrics["DOMContentLoaded"] =
            nav.domContentLoadedEventEnd - nav.startTime;
          metrics["Load"] = nav.loadEventEnd - nav.startTime;
        }
        resolve(metrics);
      }, 3000);
    });
  });
}

/**
 * Post metrics to an internal API endpoint.
 * In production, set INTERNAL_API_ENDPOINT env var to your real endpoint.
 */
async function postMetrics(
  journey: string,
  pageName: string,
  metrics: Record<string, number>
) {
  const endpoint = process.env.INTERNAL_API_ENDPOINT;
  if (endpoint) {
    await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ journey, pageName, metrics, timestamp: new Date().toISOString() }),
    });
    console.log(`Posted metrics for ${pageName} to ${endpoint}`);
  } else {
    console.log(
      `[${journey}] ${pageName} Web Vitals:`,
      JSON.stringify(metrics, null, 2)
    );
  }
}

const FLIGHT_ORIGINS = ["JFK", "LAX", "ORD", "MIA", "SFO"];
const FLIGHT_DESTINATIONS = ["LHR", "CDG", "FCO", "MAD", "FRA"];

test("[COA.com-Desktop] Multi-Page Web Vitals: Flights Homepage -> Listing", async ({
  page,
  context,
}) => {
  test.setTimeout(90000);

  // Set custom headers
  await context.route("**/*", async (route) => {
    await route.continue({
      headers: {
        ...route.request().headers(),
        "user-agent": UA,
        "sec-ch-ua": SEC_CH_UA,
      },
    });
  });

  // Inject Web Vitals observers into all pages (same tab + any new tabs)
  await context.addInitScript(WEB_VITALS_INIT_SCRIPT);

  const allMetrics: { page: string; metrics: Record<string, number> }[] = [];

  // --- Page 1: Homepage (same tab) ---
  await page.goto(COM_DESKTOP_URL, { waitUntil: "domcontentloaded" });
  await dismissCookieBanner(page);
  await closePopups(page);

  const homepageMetrics = await collectWebVitals(page);
  allMetrics.push({ page: "homepage", metrics: homepageMetrics });
  await postMetrics("flights-search", "homepage", homepageMetrics);

  // Verify homepage loaded correctly
  expect(homepageMetrics["TTFB"]).toBeDefined();
  console.log(
    `Homepage TTFB: ${homepageMetrics["TTFB"]?.toFixed(0)}ms, LCP: ${homepageMetrics["LCP"]?.toFixed(0)}ms`
  );

  // --- Page 2: Flight Listing (same tab, new navigation) ---
  const origin = randomFrom(FLIGHT_ORIGINS);
  const dest = randomFrom(FLIGHT_DESTINATIONS);
  const today = new Date();
  const departDate = new Date(today);
  departDate.setDate(today.getDate() + 14);
  const returnDate = new Date(departDate);
  returnDate.setDate(departDate.getDate() + 7);

  const formatDate = (d: Date) => {
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${m}/${day}/${d.getFullYear()}`;
  };

  const listingUrl = `${COM_DESKTOP_URL}/flights/listing?flightType=2&Adults=1&Kids=0&Infants=0&Laps=0&Seniors=0&shoppingId=&origin_0=${origin}&destination_0=${dest}&date_0=${formatDate(departDate)}&origin_1=${dest}&destination_1=${origin}&date_1=${formatDate(returnDate)}`;

  await page.goto(listingUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(5000); // Allow listing to populate

  const listingMetrics = await collectWebVitals(page);
  allMetrics.push({ page: "listing", metrics: listingMetrics });
  await postMetrics("flights-search", "listing", listingMetrics);

  console.log(
    `Listing TTFB: ${listingMetrics["TTFB"]?.toFixed(0)}ms, LCP: ${listingMetrics["LCP"]?.toFixed(0)}ms`
  );

  // Verify listing page loaded
  expect(listingMetrics["TTFB"]).toBeDefined();

  // Summary
  console.log("\n--- Web Vitals Summary ---");
  for (const entry of allMetrics) {
    console.log(`${entry.page}:`, JSON.stringify(entry.metrics));
  }
});

test("[COA.com-Desktop] Multi-Page Web Vitals: Hotels Homepage -> Listing", async ({
  page,
  context,
}) => {
  test.setTimeout(90000);

  await context.route("**/*", async (route) => {
    await route.continue({
      headers: {
        ...route.request().headers(),
        "user-agent": UA,
        "sec-ch-ua": SEC_CH_UA,
      },
    });
  });

  // Inject Web Vitals observers into all pages (same tab + any new tabs)
  await context.addInitScript(WEB_VITALS_INIT_SCRIPT);

  const allMetrics: { page: string; metrics: Record<string, number> }[] = [];

  // --- Page 1: Hotels Homepage (same tab) ---
  await page.goto(`${COM_DESKTOP_URL}/hotels`, {
    waitUntil: "domcontentloaded",
  });
  await dismissCookieBanner(page);
  await closePopups(page);

  const hotelsHomeMetrics = await collectWebVitals(page);
  allMetrics.push({ page: "hotels-home", metrics: hotelsHomeMetrics });
  await postMetrics("hotels-search", "hotels-home", hotelsHomeMetrics);

  expect(hotelsHomeMetrics["TTFB"]).toBeDefined();
  console.log(
    `Hotels Home TTFB: ${hotelsHomeMetrics["TTFB"]?.toFixed(0)}ms, LCP: ${hotelsHomeMetrics["LCP"]?.toFixed(0)}ms`
  );

  // --- Page 2: Hotel Listing (same tab, triggered by search widget) ---
  await page.waitForTimeout(2000);
  const fromInput = page.locator("#hs_originCity_0").first();
  await expect(fromInput).toBeVisible({ timeout: 10000 });
  await fromInput.click({ force: true });
  await fromInput.fill("NYC");
  await page.waitForTimeout(2000);

  const suggestion = page
    .locator(
      "section.suggestion-box div ul li:nth-child(2), .suggestion-box__item"
    )
    .first();
  await expect(suggestion).toBeVisible({ timeout: 10000 });
  await suggestion.click({ force: true });

  // Set dates via calendar
  const checkInDate = new Date();
  checkInDate.setDate(checkInDate.getDate() + 10);
  const checkOutDate = new Date(checkInDate);
  checkOutDate.setDate(checkInDate.getDate() + 3);

  await page.getByRole("button", { name: "SelectNextMonth" }).click();
  await page
    .getByRole("button", {
      name: `${checkInDate.getDate()} ${checkInDate.toLocaleDateString("en-US", { month: "long" })} ${checkInDate.getFullYear()}`,
      exact: true,
    })
    .click();
  await page
    .getByRole("button", {
      name: `${checkOutDate.getDate()} ${checkOutDate.toLocaleDateString("en-US", { month: "long" })} ${checkOutDate.getFullYear()}`,
      exact: true,
    })
    .click();
  await page.locator("#closeCalendar").click();

  await page.getByRole("button", { name: "Search Hotels" }).click();
  await page
    .locator('[aria-label="animation"]')
    .waitFor({ state: "hidden", timeout: 15000 });

  const listingMetrics = await collectWebVitals(page);
  allMetrics.push({ page: "hotels-listing", metrics: listingMetrics });
  await postMetrics("hotels-search", "hotels-listing", listingMetrics);

  console.log(
    `Hotels Listing TTFB: ${listingMetrics["TTFB"]?.toFixed(0)}ms, LCP: ${listingMetrics["LCP"]?.toFixed(0)}ms`
  );

  expect(listingMetrics["TTFB"]).toBeDefined();

  console.log("\n--- Hotels Web Vitals Summary ---");
  for (const entry of allMetrics) {
    console.log(`${entry.page}:`, JSON.stringify(entry.metrics));
  }
});

/**
 * Demonstrates capturing Web Vitals on a page that opens in a NEW TAB (popup).
 * context.addInitScript() ensures the PerformanceObserver is injected into the
 * popup automatically — no extra setup needed per tab.
 *
 * NOTE: This test navigates through the hotel search flow which requires
 * Checkly's allowlisted IPs. It will pass on Checkly infrastructure but
 * may be blocked locally by Akamai CDN.
 */
test("[COA.com-Desktop] Multi-Page Web Vitals: Hotel Listing -> Detail (new tab)", async ({
  page,
  context,
}) => {
  test.setTimeout(90000);

  await context.route("**/*", async (route) => {
    await route.continue({
      headers: {
        ...route.request().headers(),
        "user-agent": UA,
        "sec-ch-ua": SEC_CH_UA,
      },
    });
  });

  // Inject Web Vitals observers into ALL pages — including popups/new tabs
  await context.addInitScript(WEB_VITALS_INIT_SCRIPT);

  const allMetrics: { page: string; metrics: Record<string, number> }[] = [];

  // --- Page 1: Hotels Homepage (original tab) ---
  await page.goto(`${COM_DESKTOP_URL}/hotels`, {
    waitUntil: "domcontentloaded",
  });
  await dismissCookieBanner(page);
  await closePopups(page);

  const homeMetrics = await collectWebVitals(page);
  allMetrics.push({ page: "hotels-home", metrics: homeMetrics });
  await postMetrics("hotel-detail", "hotels-home", homeMetrics);
  console.log(
    `Hotels Home TTFB: ${homeMetrics["TTFB"]?.toFixed(0)}ms, LCP: ${homeMetrics["LCP"]?.toFixed(0)}ms`
  );

  // Search for hotels
  await page.waitForTimeout(2000);
  const fromInput = page.locator("#hs_originCity_0").first();
  await expect(fromInput).toBeVisible({ timeout: 10000 });
  await fromInput.click({ force: true });
  await fromInput.fill("LAX");
  await page.waitForTimeout(2000);

  const suggestion = page
    .locator(
      "section.suggestion-box div ul li:nth-child(2), .suggestion-box__item"
    )
    .first();
  await expect(suggestion).toBeVisible({ timeout: 10000 });
  await suggestion.click({ force: true });

  const checkInDate = new Date();
  checkInDate.setDate(checkInDate.getDate() + 14);
  const checkOutDate = new Date(checkInDate);
  checkOutDate.setDate(checkInDate.getDate() + 3);

  await page.getByRole("button", { name: "SelectNextMonth" }).click();
  await page
    .getByRole("button", {
      name: `${checkInDate.getDate()} ${checkInDate.toLocaleDateString("en-US", { month: "long" })} ${checkInDate.getFullYear()}`,
      exact: true,
    })
    .click();
  await page
    .getByRole("button", {
      name: `${checkOutDate.getDate()} ${checkOutDate.toLocaleDateString("en-US", { month: "long" })} ${checkOutDate.getFullYear()}`,
      exact: true,
    })
    .click();
  await page.locator("#closeCalendar").click();

  await page.getByRole("button", { name: "Search Hotels" }).click();
  await page
    .locator('[aria-label="animation"]')
    .waitFor({ state: "hidden", timeout: 30000 });

  if (
    await page
      .locator(".taxes-fees-primary-button")
      .isVisible({ timeout: 5000 })
      .catch(() => false)
  ) {
    await page.locator(".taxes-fees-primary-button").click();
  }

  await page
    .locator('button[data-test="selectButton"]')
    .first()
    .waitFor({ state: "visible", timeout: 30000 });

  const listingMetrics = await collectWebVitals(page);
  allMetrics.push({ page: "hotels-listing", metrics: listingMetrics });
  await postMetrics("hotel-detail", "hotels-listing", listingMetrics);
  console.log(
    `Hotels Listing TTFB: ${listingMetrics["TTFB"]?.toFixed(0)}ms, LCP: ${listingMetrics["LCP"]?.toFixed(0)}ms`
  );

  // --- Page 2: Hotel Detail (opens in a NEW TAB / popup) ---
  // The "Select" button opens the hotel detail page in a new tab.
  // context.addInitScript ensures Web Vitals observers are already running there.
  const popupPromise = page.waitForEvent("popup");
  await page.locator('button[data-test="selectButton"]').first().click();
  const detailPage = await popupPromise;

  await detailPage.waitForLoadState("domcontentloaded");

  // Collect Web Vitals from the NEW TAB — no extra injection needed
  const detailMetrics = await collectWebVitals(detailPage);
  allMetrics.push({ page: "hotel-detail-popup", metrics: detailMetrics });
  await postMetrics("hotel-detail", "hotel-detail-popup", detailMetrics);
  console.log(
    `Hotel Detail (new tab) TTFB: ${detailMetrics["TTFB"]?.toFixed(0)}ms, LCP: ${detailMetrics["LCP"]?.toFixed(0)}ms`
  );

  expect(detailMetrics["TTFB"]).toBeDefined();

  console.log("\n--- Hotel Detail Journey Web Vitals Summary ---");
  console.log("(includes metrics from both original tab and popup tab)");
  for (const entry of allMetrics) {
    console.log(`  ${entry.page}:`, JSON.stringify(entry.metrics));
  }
});
