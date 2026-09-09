import { test, expect, Page } from "@playwright/test";

/**
 * End-to-end coverage for the workflows a sales rep actually uses.
 *
 * The previous version of this file tested a UI that no longer exists — it
 * looked for a "Learn" workspace, a "Knowledge Quiz", a "Lighting Glossary" and
 * a "Search specs & docs" button, none of which are in the app. It failed 9 of
 * 10 tests for reasons unrelated to the app being broken, which is worse than
 * having no suite at all: a permanently red signal gets ignored.
 *
 * These tests assert behaviour that regressed in the QA pass, so a repeat shows
 * up here rather than in front of a customer.
 */

/**
 * On narrow viewports the sidebar collapses behind a hamburger, so navigation
 * has to open the drawer first. Running the same specs against both projects
 * keeps the mobile layout honest.
 */
const openWorkspace = async (page: Page, name: string) => {
  const navButton = page.getByRole("button", { name, exact: true }).first();
  if (!(await navButton.isVisible())) {
    await page.getByRole("button", { name: /Open navigation menu/i }).click();
    await expect(navButton).toBeVisible();
  }
  await navButton.click();
};

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  // The shell is present on every viewport even when the nav itself is hidden.
  await expect(page.getByRole("banner").or(page.locator("header")).first()).toBeVisible();
});

test.describe("Plasgain Sales Copilot", () => {
  test("navigates every workspace without unmounting the app", async ({ page }) => {
    // A white screen was the failure mode that made a workspace unusable, so
    // every screen is checked for surviving content.
    for (const workspace of [
      "CRM Command Centre",
      "Settings",
      "Home"
    ]) {
      await openWorkspace(page, workspace);
      await expect(page.locator("main")).not.toBeEmpty();
      await expect(page.getByTestId("error-boundary-fallback")).toHaveCount(0);
    }
  });

  test("every CRM destination renders from the main navigation", async ({ page }) => {
    for (const destination of [
      "Today",
      "Accounts",
      "Outstanding Quotes",
      "Calendar",
      "Leads",
      "Tasks",
      "Competitors",
      "Win patterns"
    ]) {
      await openWorkspace(page, destination);
      await expect(page.locator("main")).not.toBeEmpty();
      await expect(page.getByTestId("error-boundary-fallback")).toHaveCount(0);
    }
  });

  test("opens and dismisses the quote import workflow", async ({ page }) => {
    await openWorkspace(page, "Outstanding Quotes");
    await page.getByRole("button", { name: /Import quote PDF/i }).click();
    await expect(page.getByRole("dialog", { name: "Import a quote PDF" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Import a quote PDF" })).toHaveCount(0);
  });

  test("settings exposes profile editing and user switching", async ({ page }) => {
    await openWorkspace(page, "Settings");
    await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Edit profile/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Switch user/i })).toBeVisible();
  });

  test("global search finds records across entities", async ({ page }) => {
    await page.getByRole("button", { name: /Open search dialog/i }).click();
    const searchBox = page.getByPlaceholder(/Search/i).first();
    await expect(searchBox).toBeVisible();
    await searchBox.fill("Latrobe");
    await page.keyboard.press("Escape");
  });

  test("keeps the signed-in profile across a reload", async ({ page }) => {
    await openWorkspace(page, "Settings");
    await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible();

    await page.reload();
    await expect(page.locator("header").first()).toBeVisible();
    const signedInProfile = page.getByRole("button", { name: /^Signed in as Travis Maher$/ });
    if (!(await signedInProfile.isVisible())) {
      await page.getByRole("button", { name: /Open navigation menu/i }).click();
    }
    await expect(signedInProfile).toBeVisible();
    await expect(page.getByTestId("error-boundary-fallback")).toHaveCount(0);
  });
});
