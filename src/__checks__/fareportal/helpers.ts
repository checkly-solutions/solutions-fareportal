import { Page } from "@playwright/test";

/**
 * Dismiss cookie consent / GDPR banners (Osano) commonly seen on cheapoair.com
 */
export async function dismissCookieBanner(page: Page) {
  try {
    const acceptBtn = page.locator(".osano-cm-accept-all");
    await acceptBtn.click({ timeout: 5000 }).catch(() => {});
  } catch {
    // no cookie banner
  }
  try {
    const closeBtn = page.locator(
      "button.osano-cm-dialog__close.osano-cm-close",
    );
    await closeBtn.click({ timeout: 2000 }).catch(() => {});
  } catch {
    // no preference popup
  }
}

/**
 * Close exit-intent or idle popups
 */
export async function closePopups(page: Page) {
  try {
    await page
      .locator("#closepopup")
      .click({ timeout: 2000 })
      .catch(() => {});
  } catch {
    // no popup
  }
}

/**
 * Pick a random item from an array
 */
export function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Generate a future date string in MM/DD/YYYY format
 */
export function futureDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${month}/${day}/${d.getFullYear()}`;
}

/**
 * Generate a future date string in YYYYMMDD format for URL segments
 */
export function futureDateCompact(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

/** Base URLs */

export const COM_DESKTOP_URL = "https://www.cheapoair.com";
export const COM_MOBILE_URL = "https://m.cheapoair.com";
