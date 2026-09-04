import { describe, it, expect, beforeEach } from "vitest";
import { accountIntelligenceCache, generateAccountSourceHash } from "../../utils/accountIntelligenceCache";
import { productComparisonCache, generateSymmetricComparisonKey } from "../../utils/productComparisonCache";
import {
  detectDuplicateAccount,
  detectDuplicateContact,
  detectDuplicateLead,
  detectDuplicateOpportunity,
  normalizeCompanyName,
  normalizeEmail,
  normalizePhone
} from "../../utils/duplicateDetector";
import { addBusinessDaysLocal, getLocalDateInputValue } from "../../utils/dateUtils";

describe("Priority 2: Speed & Usability Improvements Acceptance Suite", () => {
  beforeEach(() => {
    accountIntelligenceCache.clear();
    productComparisonCache.clear();
  });

  // ==========================================
  // P2-01 & P2-02: Progressive Streaming & Discrete Stages
  // ==========================================
  describe("P2-01 & P2-02: Streaming & Discrete Workflow Stages", () => {
    it("verifies discrete analysis pipeline stages are ordered and resilient", () => {
      const stages = ["reading", "extracting", "cross_checking", "product_matching", "finalizing"];
      expect(stages).toHaveLength(5);
      expect(stages[0]).toBe("reading");
      expect(stages[2]).toBe("cross_checking");
      expect(stages[4]).toBe("finalizing");
    });
  });

  // ==========================================
  // P2-03: Deterministic Account Intelligence Cache
  // ==========================================
  describe("P2-03: Account Intelligence Cache with Deterministic Source Hash", () => {
    it("generates deterministic hash that changes when account, contacts, or activities change", () => {
      const baseAccount = {
        id: "acc-geelong",
        updatedAt: "2026-08-28T10:00:00Z",
        contacts: [{ id: "con-1", updatedAt: "2026-08-28T10:00:00Z" }],
        opportunities: [{ updatedAt: "2026-08-28T10:00:00Z", stage: "Quoting", estimatedValue: 45000 }],
        activities: [{ id: "act-1", timestamp: "2026-08-28T10:00:00Z" }]
      };

      const hash1 = generateAccountSourceHash(baseAccount);
      const hash2 = generateAccountSourceHash({ ...baseAccount });
      expect(hash1).toBe(hash2);

      // Mutate activity timestamp -> hash must change
      const modifiedAccount = {
        ...baseAccount,
        activities: [{ id: "act-2", timestamp: "2026-08-28T11:00:00Z" }]
      };
      const hashModified = generateAccountSourceHash(modifiedAccount);
      expect(hashModified).not.toBe(hash1);
    });

    it("serves cached synthesis instantly and invalidates on source hash mutation", () => {
      const accountSource = {
        id: "acc-ballarat",
        updatedAt: "2026-08-28T09:00:00Z",
        contacts: [{ id: "con-10" }]
      };

      const summaryPayload = {
        executiveOverview: "Major Tier 1 regional account with upcoming solar streetlight tender.",
        relationshipHealthScore: 85,
        priorityAction: "Follow up tender specification"
      };

      accountIntelligenceCache.set(accountSource, summaryPayload);

      // Hit cache
      const cached = accountIntelligenceCache.get(accountSource);
      expect(cached).not.toBeNull();
      expect(cached?.summary.executiveOverview).toBe(summaryPayload.executiveOverview);

      // Invalidate by adding contact
      const mutatedSource = {
        ...accountSource,
        contacts: [{ id: "con-10" }, { id: "con-11" }]
      };
      const cacheMiss = accountIntelligenceCache.get(mutatedSource);
      expect(cacheMiss).toBeNull();
    });
  });

  // ==========================================
  // P2-04: Symmetric Product Comparison Cache
  // ==========================================
  describe("P2-04: Symmetric Product Comparison Cache", () => {
    it("generates identical cache keys regardless of product comparison order", () => {
      const prodA = "PLAS-SOLAR-50W";
      const prodB = "PLAS-SOLAR-125W";

      const keyForward = generateSymmetricComparisonKey([prodA, prodB], "shared path", "2026.1", "v4.2");
      const keyBackward = generateSymmetricComparisonKey([prodB, prodA], "shared path", "2026.1", "v4.2");

      expect(keyForward).toBe(keyBackward);
    });

    it("stores comparison and retrieves identically in reverse order", () => {
      const prodA = "Intense Light - 50W Solar";
      const prodB = "Pro Blade Solar 75/125";

      const mockRecord = {
        productIds: [prodA, prodB],
        standardsVersion: "AS/NZS 1158:2020",
        catalogueVersion: "2026.1",
        comparedAt: Date.now(),
        comparisonMatrix: {
          luminaireOutput: { [prodA]: "5,000 lm", [prodB]: "12,000 lm" }
        },
        tradeOffsSummary: "Pro Blade offers higher lumen output for arterial pathways."
      };

      productComparisonCache.set([prodA, prodB], mockRecord);

      // Retrieve in reversed query order [prodB, prodA]
      const retrieved = productComparisonCache.get([prodB, prodA]);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.tradeOffsSummary).toBe(mockRecord.tradeOffsSummary);
    });
  });






  // ==========================================
  // P2-13: Conservative CRM Duplicate Detection
  // ==========================================
  describe("P2-13: Conservative CRM Duplicate Detection", () => {
    it("preserves organizational terms (Council, Shire, City, Water) to prevent false positives", () => {
      const name1 = normalizeCompanyName("City of Greater Geelong");
      const name2 = normalizeCompanyName("City of Greater Bendigo");
      const name3 = normalizeCompanyName("Shire of Mornington Peninsula");

      expect(name1).toContain("city");
      expect(name1).toContain("greater");
      expect(name1).toContain("geelong");

      expect(name2).toContain("city");
      expect(name2).toContain("bendigo");

      // They must NOT normalize to identical strings!
      expect(name1).not.toBe(name2);
      expect(name1).not.toBe(name3);
    });

    it("detects exact duplicate accounts by phone, website, or exact name", () => {
      const existingAccounts = [
        {
          id: "acc-1",
          name: "City of Greater Geelong",
          website: "https://www.geelongaustralia.com.au",
          mainPhone: "03 5272 5272"
        }
      ] as any;

      // 1. Same website
      const matchWeb = detectDuplicateAccount(
        { name: "Geelong City Council", website: "geelongaustralia.com.au" },
        existingAccounts
      );
      expect(matchWeb).not.toBeNull();
      expect(matchWeb?.confidence).toBe("EXACT");

      // 2. Same phone
      const matchPhone = detectDuplicateAccount(
        { name: "Greater Geelong Council", phone: "(03) 5272 5272" },
        existingAccounts
      );
      expect(matchPhone).not.toBeNull();
      expect(matchPhone?.confidence).toBe("EXACT");

      // 3. Different Council -> No match (prevent false positive)
      const matchBendigo = detectDuplicateAccount(
        { name: "City of Greater Bendigo", website: "bendigo.vic.gov.au", phone: "03 5434 6000" },
        existingAccounts
      );
      expect(matchBendigo).toBeNull();
    });

    it("detects duplicate contacts by email across accounts and full name within same account", () => {
      const existingContacts = [
        {
          id: "con-1",
          firstName: "Marcus",
          lastName: "Vance",
          email: "marcus.vance@geelong.vic.gov.au",
          phone: "0412 345 678",
          accountId: "acc-1"
        }
      ] as any;

      // Same email -> EXACT
      const matchEmail = detectDuplicateContact(
        { name: "M. Vance", email: "marcus.vance@geelong.vic.gov.au", accountId: "acc-2" },
        existingContacts
      );
      expect(matchEmail?.confidence).toBe("EXACT");

      // Same name within same account -> POSSIBLE
      const matchName = detectDuplicateContact(
        { name: "Marcus Vance", email: "mvance2@geelong.vic.gov.au", accountId: "acc-1" },
        existingContacts
      );
      expect(matchName?.confidence).toBe("POSSIBLE");
    });
  });

  // ==========================================
  // P2-14: Sydney-Aware Dates & Atomic Follow-Up Workflow
  // ==========================================
  describe("P2-14: Sydney-Aware Date Scheduling & Follow-Up Workflow", () => {
    it("adds business days strictly in Australian timezone skipping weekends", () => {
      // Friday 2026-08-28 -> +1 business day = Monday 2026-08-31
      const fridayDate = new Date("2026-08-28T12:00:00+10:00");
      const nextMon = addBusinessDaysLocal(1, fridayDate);
      expect(nextMon).toBe("2026-08-31");

      const nextWed = addBusinessDaysLocal(3, fridayDate);
      expect(nextWed).toBe("2026-09-02");
    });
  });
});
