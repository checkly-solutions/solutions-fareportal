/**
 * Bonus: Full Hotel Booking Flow (E2E)
 *
 * End-to-end check of the hotel booking journey on cheapoair.com:
 *   Hotels page -> Search widget -> Listing -> Select hotel -> Room selection -> Checkout
 *
 * NOTE: The /trip/hotels search results page requires Checkly's allowlisted IPs.
 * This test will pass on Checkly infrastructure but may be blocked locally by
 * Akamai CDN bot detection (TLS fingerprinting beyond header-level controls).
 *
 * Header handling:
 *   - user-agent and sec-ch-ua (plus sec-ch-ua-mobile, sec-ch-ua-platform) are set
 *     via test.use({ extraHTTPHeaders }) so they apply to every request from the
 *     first navigation onward.
 *   - context.route("**\/*") overrides headers on each individual request to ensure
 *     consistency across redirects and sub-resource loads.
 *   - navigator.webdriver is overridden via addInitScript to reduce headless detection.
 */
import { test, expect } from "@playwright/test";
import {
  dismissCookieBanner,
  closePopups,
  randomFrom,
  COM_DESKTOP_URL,
} from "./helpers";

test.use({
  userAgent:
    "Mozilla/5.0 (X11; Linux x86_64; Rigor) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.5304.110 Safari/537.36 Checkly/ec71f5bf",
  viewport: { width: 1366, height: 768 },
  extraHTTPHeaders: {
    "sec-ch-ua": `"Chromium";v="127", "Not:A-Brand";v="99"`,
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": `"Linux"`,
  },
});

const HOTEL_ORIGINS = [
  "YTO",
  "CHI",
  "DEN",
  "MIA",
  "PHX",
  "HOU",
  "LAS",
  "LAX",
  "ORL",
];

test("[COA.com-Desktop] STA Hotel Widget -> Listing -> Review/Payment Page", async ({
  page,
  context,
}) => {
  const SEC_CH_UA = `"Chromium";v="127", "Not:A-Brand";v="99"`;

  const UA =
    "Mozilla/5.0 (X11; Linux x86_64; Rigor) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.5304.110 Safari/537.36 Checkly/ec71f5bf";

  await context.route("**/*", async (route) => {
    await route.continue({
      headers: {
        ...route.request().headers(),
        "user-agent": UA,
        "sec-ch-ua": SEC_CH_UA,
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": `"Linux"`,
      },
    });
  });

  // Override navigator properties to avoid headless detection
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  });

  const hotelOrigin = randomFrom(HOTEL_ORIGINS);

  await page.goto(`${COM_DESKTOP_URL}/hotels`, {
    waitUntil: "domcontentloaded",
  });
  await dismissCookieBanner(page);
  await closePopups(page);
  await page.waitForTimeout(3000);

  // Use .first() to handle duplicate IDs
  const fromInput = page.locator("#hs_originCity_0").first();
  await expect(fromInput).toBeVisible({ timeout: 10000 });
  await fromInput.click({ force: true });
  await fromInput.fill(hotelOrigin);
  await page.waitForTimeout(2000);

  // Select from auto-suggest
  const suggestion = page
    .locator(
      "section.suggestion-box div ul li:nth-child(2), .suggestion-box__item",
    )
    .first();
  await expect(suggestion).toBeVisible({ timeout: 10000 });
  await suggestion.click({ force: true });

  // Calculate dynamic dates - 7 days from now for check-in, 4 days later for check-out
  const today = new Date();
  const checkInDate = new Date(today);
  checkInDate.setDate(today.getDate() + 7);
  const checkOutDate = new Date(checkInDate);
  checkOutDate.setDate(checkInDate.getDate() + 4);

  const checkInDay = checkInDate.getDate();
  const checkInMonthName = checkInDate.toLocaleDateString("en-US", {
    month: "long",
  });
  const checkInYear = checkInDate.getFullYear();
  const checkOutDay = checkOutDate.getDate();
  const checkOutMonthName = checkOutDate.toLocaleDateString("en-US", {
    month: "long",
  });
  const checkOutYear = checkOutDate.getFullYear();

  // Navigate calendar to check-in month
  await page.getByRole("button", { name: "SelectNextMonth" }).click();

  // Click check-in date: "3 April 2026" format
  await page
    .getByRole("button", {
      name: `${checkInDay} ${checkInMonthName} ${checkInYear}`,
      exact: true,
    })
    .click();

  // Click check-out date: "7 April 2026" format (with year to avoid matching partial dates like 17 April)
  await page
    .getByRole("button", {
      name: `${checkOutDay} ${checkOutMonthName} ${checkOutYear}`,
      exact: true,
    })
    .click();
  await page.locator("#closeCalendar").click();
  await page.getByRole("button", { name: "Search Hotels" }).click();
  await page
    .locator('[aria-label="animation"]')
    .waitFor({ state: "hidden", timeout: 30000 });
  await page
    .locator('button[data-test="selectButton"]')
    .first()
    .waitFor({ state: "visible", timeout: 30000 });

  if (
    await page
      .locator(".taxes-fees-primary-button")
      .isVisible({ timeout: 10000 })
  ) {
    await page.locator(".taxes-fees-primary-button").click();
  }
  const page1Promise = page.waitForEvent("popup");
  await page.locator('button[data-test="selectButton"]').first().click();
  const page1 = await page1Promise;
  await page1.getByRole("button", { name: "Select Room" }).click();
  await page1
    .locator('[data-test="reserveSelectedRoom-details"]')
    .nth(1)
    .click();
  await page1
    .getByRole("button", { name: "Continue to Checkout" })
    .first()
    .click();
  await expect(
    page1.getByRole("button", { name: "Confirm & Book Secure Payment" }),
  ).toBeVisible();
});
