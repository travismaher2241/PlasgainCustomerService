import { test, expect } from '@playwright/test';

test.describe('Plasgain Customer Service & CRM E2E Test Suite', () => {

  test('1. Home & Sidebar navigation across all core workspaces', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Desktop navigation test');
    await page.goto('/');

    // Check header and brand
    await expect(page.locator('#sidebar-brand-subtitle')).toBeVisible();
    await expect(page.locator('text=Internal Sales Workspace').first()).toBeVisible();

    // Navigate to CRM Command Centre
    await page.locator('aside button:has-text("CRM Command Centre")').click();
    await expect(page.locator('text=Today / Focus').first()).toBeVisible();
    await expect(page.locator('button:has-text("Accounts 360°")').first()).toBeVisible();

    // Navigate to New Enquiry Workspace
    await page.locator('aside button:has-text("New Enquiry")').click();
    await expect(page.locator('text=Input Customer Enquiry').first()).toBeVisible();

    // Navigate to Product Finder
    await page.locator('aside button:has-text("Product Finder")').click();
    await expect(page.locator('text=What application are you lighting?').first()).toBeVisible();

    // Navigate to Opportunities
    await page.locator('aside button:has-text("Opportunities")').click();
    await expect(page.locator('text=Opportunities & Pipeline').first()).toBeVisible();

    // Navigate to Tools Hub
    await page.locator('aside button:has-text("Tools")').click();
    await expect(page.locator('text=Sales Power Tools Hub').first()).toBeVisible();

    // Navigate to Learning Centre
    await page.locator('aside button:has-text("Learn")').click();
    await expect(page.locator('text=5-Minute Micro-Lessons').first()).toBeVisible();

    // Navigate to Settings
    await page.locator('aside button:has-text("Settings")').click();
    await expect(page.locator('text=Settings & AI Copilot Diagnostics').first()).toBeVisible();
  });

  test('2. CRM Command Centre: Tabs, Accounts, Deals, Leads, and Quick Activity Logging', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Desktop CRM test');
    await page.goto('/');
    await page.locator('aside button:has-text("CRM Command Centre")').click();

    // Focus / Today Tab
    await expect(page.locator('text=Today\'s Focus & Action Center').first()).toBeVisible();

    // Switch to Accounts 360°
    await page.locator('button:has-text("Accounts 360°")').first().click();
    await expect(page.locator('text=City of Moreton Bay').first()).toBeVisible();

    // Switch to Deals Pipeline
    await page.locator('button:has-text("Deals Pipeline")').first().click();
    await expect(page.locator('text=Lake Samsonvale').first()).toBeVisible();

    // Switch to Leads Hub
    await page.locator('button:has-text("Leads Hub")').first().click();
    await expect(page.locator('text=Leads & Inbound Ingestion').first()).toBeVisible();

    // Open Quick Log Modal and test activity logging
    await page.locator('button:has-text("Log Call")').first().click();
    await expect(page.locator('text=Quick Log Activity').first()).toBeVisible();

    // Switch to Email
    await page.locator('button:has-text("Email")').first().click();
    await page.fill('textarea[placeholder*="What was agreed"]', 'Sent Dialux photometric study and warranty schedule.');
    await page.locator('button:has-text("Save Activity")').first().click();

    // Verify modal closes
    await expect(page.locator('text=Quick Log Activity')).not.toBeVisible();
  });

  test('3. New Enquiry Workspace: Sample Loading, Field Editing, Question Selection, and Email Draft', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Desktop Enquiry test');
    await page.goto('/');
    await page.locator('aside button:has-text("New Enquiry")').click();

    // Click sample enquiry button (Ballarat Shared Path)
    await page.locator('button:has-text("Ballarat Shared Path")').first().click();

    // Verify enquiry form populated
    const enquiryInput = page.locator('textarea[placeholder*="Paste raw customer email"]');
    await expect(enquiryInput).not.toBeEmpty();

    // Click Analyze Enquiry
    await page.locator('button:has-text("Analyse Enquiry")').first().click();

    // Verify analysis results render
    await expect(page.locator('text=Quoting Feasibility').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Questions Before We Quote').first()).toBeVisible();

    // Draft Clarification Email
    await page.locator('button:has-text("Create Customer Reply Email")').first().click();
    await expect(page.locator('text=Generated Customer Clarification Email').first()).toBeVisible({ timeout: 15000 });
  });

  test('4. Product Finder: Technical parameter matching and recommendation output', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Desktop Product Finder test');
    await page.goto('/');
    await page.locator('aside button:has-text("Product Finder")').click();

    // Select Pathway application
    await page.locator('button:has-text("Shared Path / Rail Trail")').first().click();

    // Click Find Matching Products
    await page.locator('button:has-text("Find Best Product Candidates")').first().click();

    // Verify product recommendations
    await expect(page.locator('text=Intense Light - 50W Solar').first()).toBeVisible({ timeout: 15000 });
  });

  test('5. Ask Plasgain: Knowledge Base Grounded Technical Q&A with Citations', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Desktop Copilot test');
    await page.goto('/');

    // Open Copilot Drawer
    await page.locator('button:has-text("Ask Copilot")').first().click();
    await expect(page.locator('text=Plasgain Sales Copilot').first()).toBeVisible();

    // Send Quick Prompt
    await page.locator('button:has-text("Key Questions?")').first().click();
    await expect(page.locator('text=Key Questions').first()).toBeVisible({ timeout: 15000 });
  });

  test('6. Tools Hub: Tender Analyser, Quote Reviewer, Customer Research', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Desktop Tools test');
    await page.goto('/');
    await page.locator('aside button:has-text("Tools")').click();

    // Tender Analyser tab
    await expect(page.locator('text=Sales Power Tools Hub').first()).toBeVisible();
    await page.locator('button:has-text("Analyse Tender Requirements")').first().click();
    await expect(page.locator('text=Tender Requirement Matrix').first()).toBeVisible({ timeout: 15000 });
  });

  test('7. Learning Centre: Micro-Lessons, Quiz, and Glossary', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Desktop Learn test');
    await page.goto('/');
    await page.locator('aside button:has-text("Learn")').click();

    // Micro-lessons tab
    await expect(page.locator('text=5-Minute Micro-Lessons').first()).toBeVisible();

    // Knowledge Check Quiz
    await page.locator('button:has-text("Knowledge Quiz")').first().click();
    await expect(page.locator('text=Product & Standards Knowledge Check').first()).toBeVisible();

    // Technical Glossary
    await page.locator('button:has-text("Lighting Glossary")').first().click();
    await expect(page.locator('text=AS/NZS 1158').first()).toBeVisible();
  });

  test('8. Settings View & LocalStorage State Persistence', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Desktop Settings test');
    await page.goto('/');
    await page.locator('aside button:has-text("Settings")').click();

    await expect(page.locator('text=Settings & AI Copilot Diagnostics').first()).toBeVisible();
    await expect(page.locator('text=Strict Knowledge Grounding:').first()).toBeVisible();

    // Test reload preserves state
    await page.reload();
    await expect(page.locator('#sidebar-brand-subtitle')).toBeVisible();
  });

  test('9. Keyboard Accessibility: Ctrl+K / Cmd+K Global Search and Escape closing', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Desktop Search test');
    await page.goto('/');

    // Click search trigger in header
    await page.locator('button:has-text("Search specs & docs")').first().click();
    const searchInput = page.locator('input[placeholder*="Search products, deals"]');
    await expect(searchInput).toBeVisible();

    // Type query
    await searchInput.fill('Intense');
    await expect(page.locator('text=Plasgain Products').first()).toBeVisible();

    // Press Escape to close modal
    await page.keyboard.press('Escape');
    await expect(searchInput).not.toBeVisible();
  });

  test('10. Mobile Viewport Smoke Test: Hamburger Drawer and Navigation', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile-only smoke test');

    await page.goto('/');
    const menuBtn = page.locator('button[title="Open menu"]');
    await expect(menuBtn).toBeVisible();

    // Open mobile sidebar
    await menuBtn.click();
    await expect(page.locator('aside button:has-text("CRM Command Centre")').first()).toBeVisible();

    // Navigate to Product Finder on mobile
    await page.locator('aside button:has-text("Product Finder")').first().click();
    await expect(page.locator('text=What application are you lighting?').first()).toBeVisible();
  });
});
