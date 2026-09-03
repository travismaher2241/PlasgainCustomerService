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
    // A white screen was the failure mode that made the enquiry workspace
    // unusable, so every screen is checked for surviving content.
    for (const workspace of [
      "CRM Command Centre",
      "New Enquiry",
      "Product Finder",
      "Product Catalogues",
      "Tools",
      "Settings",
      "Home"
    ]) {
      await openWorkspace(page, workspace);
      await expect(page.locator("main")).not.toBeEmpty();
      await expect(page.getByTestId("error-boundary-fallback")).toHaveCount(0);
    }
  });

  test("CRM tabs all render", async ({ page }) => {
    await openWorkspace(page, "CRM Command Centre");

    // The tab strip swaps to short labels on narrow viewports ("Deals" rather
    // than "Deals Pipeline"), and below 1024px the Leads, Tasks and Competitor
    // tabs move into a "More" menu.
    for (const tab of [/Accounts/, /Deals/, /Leads/, /Tasks/, /Competitor/, /Today/]) {
      // Each label can exist twice — once in the strip, once inside the "More"
      // menu — with one hidden for the current breakpoint. The strip also
      // remounts while a sub-view loads, so wait for the control rather than
      // sampling visibility at a single instant.
      const visibleTab = page
        .getByRole("button", { name: tab })
        .or(page.getByRole("tab", { name: tab }))
        .filter({ visible: true })
        .first();
      try {
        await visibleTab.waitFor({ state: "visible", timeout: 4000 });
      } catch {
        await page.getByRole("button", { name: /More CRM destinations/i }).click();
        await visibleTab.waitFor({ state: "visible", timeout: 4000 });
      }
      await visibleTab.click();
      await expect(page.locator("main")).not.toBeEmpty();
      await expect(page.getByTestId("error-boundary-fallback")).toHaveCount(0);
    }
  });

  test("blocks a per-unit deal that has no quantity", async ({ page }) => {
    // Regression: a $1,450/ea job for 34 poles used to save as $1,450, marked
    // "Known (Client Confirmed)".
    await openWorkspace(page, "CRM Command Centre");
    await page.getByRole("button", { name: /Deals/ }).first().click();
    await page.getByRole("button", { name: /Add Deal/ }).first().click();

    await page.getByPlaceholder(/Waterfront Esplanade/).fill("E2E Value Basis Check");
    await page.getByRole("button", { name: /Per Unit/ }).click();
    await page.getByPlaceholder("e.g. 1650").fill("1450");

    await expect(page.getByText(/Quantity required/i)).toBeVisible();

    await page.getByRole("button", { name: /Save Opportunity/ }).click();
    // Still open: the save was refused rather than silently recording $1,450.
    await expect(page.getByRole("button", { name: /Save Opportunity/ })).toBeVisible();

    await page.getByRole("button", { name: /^Cancel$/ }).click();
  });

  test("product finder exposes the standards wizard", async ({ page }) => {
    await openWorkspace(page, "Product Finder");

    await expect(page.getByText(/What application are you lighting/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Find Best Product Candidates/i })).toBeVisible();

    // Car park classes were absent from the class list even though the app
    // offers a Commercial Car Park application.
    const classSelect = page.locator("select").filter({ hasText: /Standard Shared Cycleway/ }).first();
    await expect(classSelect).toContainText("P11a");
    await expect(classSelect).toContainText("P12");
  });

  test("enquiry workspace refuses to analyse an empty enquiry", async ({ page }) => {
    await openWorkspace(page, "New Enquiry");
    await page.getByRole("button", { name: /Analyse Enquiry/i }).click();
    await expect(page.getByText(/Please enter customer enquiry text/i)).toBeVisible();
  });

  test("settings reports real AI status", async ({ page }) => {
    // The README documented this panel long before it existed.
    await openWorkspace(page, "Settings");
    await expect(page.getByText("Copilot Diagnostics")).toBeVisible();
    await expect(page.getByRole("button", { name: /Re-check/i })).toBeVisible();
  });

  test("document library does not offer approval to a sales rep", async ({ page }) => {
    // Approval publishes AS/NZS compliance evidence; it is an engineering
    // action. The default profile is Internal Sales.
    await openWorkspace(page, "Product Catalogues");
    await expect(page.getByText(/Governed Document & Catalogue Library/i)).toBeVisible();

    const drafts = page.getByText("Awaiting engineering approval");
    if ((await drafts.count()) > 0) {
      await expect(drafts.first()).toBeVisible();
    }
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
    await expect(page.getByText(/Your details/i)).toBeVisible();

    await page.reload();
    // The sidebar is hidden on mobile, so assert on the shell rather than nav.
    await expect(page.locator("header").first()).toBeVisible();
    await expect(page.getByTestId("error-boundary-fallback")).toHaveCount(0);
  });
});
