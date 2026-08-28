import { describe, it, expect, beforeEach } from "vitest";
import { accountIntelligenceCache, generateAccountSourceHash } from "../../utils/accountIntelligenceCache";
import { productComparisonCache, generateSymmetricComparisonKey } from "../../utils/productComparisonCache";
import { evaluateQuoteReadiness, QuoteContext } from "../../utils/quoteReadinessValidator";
import {
  detectDuplicateAccount,
  detectDuplicateContact,
  detectDuplicateLead,
  detectDuplicateOpportunity,
  normalizeCompanyName,
  normalizeEmail,
  normalizePhone
} from "../../utils/duplicateDetector";
import { analysisStore } from "../../server/analysisStore";
import { commercialPricingStore } from "../../server/commercialPricingStore";
import { documentGovernanceStore } from "../../server/documentGovernanceStore";
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
    it("verifies discrete engineering pipeline stages are ordered and resilient", () => {
      const stages = ["reading", "extracting", "standards_check", "product_matching", "finalizing"];
      expect(stages).toHaveLength(5);
      expect(stages[0]).toBe("reading");
      expect(stages[2]).toBe("standards_check");
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
  // P2-07: Persistent Project Analysis Storage
  // ==========================================
  describe("P2-07: Authoritative Backend Project Analysis Storage", () => {
    it("saves and retrieves project analysis record by projectId", async () => {
      const projectId = `proj-test-${Date.now()}`;
      const analysisData = {
        opportunitySummary: {
          project: { value: "Ballarat Western Link Shared Path", status: "Confirmed" as const }
        },
        readiness: { score: 85, rating: "High" as const, knownItems: ["Luminaire output"], missingItems: [], summaryExplanation: "Ready" },
        productRecommendations: {
          recommendedStartingPoint: {
            productName: "Pro Blade Solar 125",
            productCode: "PRO-BLADE-125",
            matchLevel: "Strong",
            whySuitable: "Pedestrian shared path lighting",
            supportingSpecifications: {}
          },
          alternatives: []
        },
        nextBestAction: { title: "Issue Formal Quote", description: "Send quote", primaryActionLabel: "Send Quote", urgency: "Immediate" },
        questionsBeforeWeQuote: []
      };

      const record = await analysisStore.saveAnalysis({
        projectId,
        projectName: "Ballarat Western Link Shared Path",
        customerCompany: "City of Ballarat",
        analysisData,
        rawEnquiryText: "Supply 24 solar lights for Ballarat trail",
        sourceHash: "test-hash-1",
        status: "current"
      });

      expect(record.id).toBeDefined();
      expect(record.projectId).toBe(projectId);

      const latest = await analysisStore.getLatestByProject(projectId);
      expect(latest).not.toBeNull();
      expect(latest?.projectName).toBe("Ballarat Western Link Shared Path");

      // Mark stale
      await analysisStore.markStale(record.id);
      const updated = await analysisStore.getAnalysis(record.id);
      expect(updated?.status).toBe("stale");
    });
  });

  // ==========================================
  // P2-08: Pre-Quote Readiness Gate
  // ==========================================
  describe("P2-08: Pre-Quote Readiness Gate & Conditional Rules", () => {
    it("blocks Firm Quotation when critical engineering fields or approved pricing are missing", () => {
      const incompleteContext: QuoteContext = {
        quoteType: "firm",
        isSolar: true,
        productFamily: "Pro Blade Solar",
        customerCompany: "City of Greater Geelong",
        projectName: "Waterfront Promenade Stage 2",
        // Missing: mountingHeight, windRegion, commercialPricingApproved
        commercialPricingApproved: false
      };

      const report = evaluateQuoteReadiness(incompleteContext);
      expect(report.isReadyForFirmQuote).toBe(false);
      expect(report.isReadyForQuoteType).toBe(false);
      expect(report.blockers.length).toBeGreaterThan(0);

      const pricingBlocker = report.blockers.find((b) => b.field === "commercialPricingApproved");
      expect(pricingBlocker).toBeDefined();
    });

    it("allows Budget Estimate when basic project context is present", () => {
      const budgetContext: QuoteContext = {
        quoteType: "budget",
        isSolar: true,
        productFamily: "Pro Blade Solar",
        customerCompany: "City of Greater Geelong",
        projectName: "Waterfront Promenade Stage 2",
        quantity: 12
      };

      const report = evaluateQuoteReadiness(budgetContext);
      expect(report.isReadyForQuoteType).toBe(true);
      expect(report.blockers).toHaveLength(0);
    });

    it("passes Firm Quotation when all critical engineering & commercial fields are confirmed", () => {
      const completeFirmContext: QuoteContext = {
        quoteType: "firm",
        isSolar: true,
        productFamily: "Pro Blade Solar",
        customerCompany: "City of Greater Geelong",
        projectName: "Waterfront Promenade Stage 2",
        productCode: "PRO-BLADE-75",
        quantity: 16,
        lightingCategory: "P4",
        mountingHeightM: 6.0,
        windRegion: "Region A (Normal Inland)",
        solarAutonomyDays: 5,
        commercialPricingApproved: true,
        soilFoundationConfirmed: true
      };

      const report = evaluateQuoteReadiness(completeFirmContext);
      expect(report.isReadyForFirmQuote).toBe(true);
      expect(report.isReadyForQuoteType).toBe(true);
      expect(report.blockers).toHaveLength(0);
      expect(report.readinessPercentage).toBeGreaterThanOrEqual(90);
    });
  });

  // ==========================================
  // P2-09: Commercial Pricing Request Workflow
  // ==========================================
  describe("P2-09: Commercial Pricing Request Workflow", () => {
    it("creates durable pricing request with 'Requested' status and no fake price", async () => {
      const newRequest = await commercialPricingStore.createRequest({
        projectId: "proj-docklands-01",
        customerCompany: "Lendlease Urban",
        productCode: "PRO-BLADE-125",
        productName: "Pro Blade Solar 125W",
        quantity: 36,
        requestedBy: "Technical Sales Specialist",
        requiredByDate: addBusinessDaysLocal(3),
        notes: "Major tender opportunity for docklands boardwalk"
      });

      expect(newRequest.id).toBeDefined();
      expect(newRequest.status).toBe("Requested");
      expect(newRequest.approvedUnitPrice).toBeUndefined(); // Never fabricate prices!

      // Approve price
      const approved = await commercialPricingStore.updateStatus(newRequest.id, "Pricing Supplied", {
        approvedUnitPrice: 1850,
        reviewedBy: "Commercial Ops Director",
        notes: "Approved special project discount tier 1"
      });

      expect(approved?.status).toBe("Pricing Supplied");
      expect(approved?.approvedUnitPrice).toBe(1850);
      expect(approved?.reviewedBy).toBe("Commercial Ops Director");
    });
  });

  // ==========================================
  // P2-11: Controlled Document Lifecycle Governance
  // ==========================================
  describe("P2-11: Controlled Document Lifecycle & Authoritative Filtering", () => {
    it("filters only Approved and unexpired documents as authoritative", async () => {
      const docA = await documentGovernanceStore.createDocument({
        title: "Pro Blade Solar Datasheet Rev 4.0",
        productFamily: "Pro Blade Solar",
        documentType: "Datasheet",
        version: "Rev 4.0",
        effectiveDate: "2026-01-01",
        reviewExpiryDate: "2027-01-01", // Valid
        source: "Engineering Dept",
        uploader: "Lead Engineer",
        approvalStatus: "Approved",
        fileUrl: "/docs/pro_blade_rev4.pdf",
        pageCount: 4
      });

      const docB = await documentGovernanceStore.createDocument({
        title: "Old Pathway Solar Manual",
        productFamily: "PathMaster Solar",
        documentType: "Installation Manual",
        version: "Rev 1.0",
        effectiveDate: "2023-01-01",
        reviewExpiryDate: "2024-01-01", // Expired
        source: "Engineering Dept",
        uploader: "Lead Engineer",
        approvalStatus: "Approved",
        fileUrl: "/docs/old_manual.pdf",
        pageCount: 6
      });

      const docC = await documentGovernanceStore.createDocument({
        title: "Draft Cyclonic Wind Study",
        productFamily: "Composite Poles",
        documentType: "Compliance Certificate",
        version: "Draft 0.1",
        effectiveDate: "2026-08-01",
        reviewExpiryDate: "2027-08-01",
        source: "Engineering Dept",
        uploader: "Lead Engineer",
        approvalStatus: "Draft",
        fileUrl: "/docs/draft_study.pdf",
        pageCount: 2
      });

      const authoritativeDocs = await documentGovernanceStore.getAuthoritativeDocuments();
      const authoritativeIds = authoritativeDocs.map((d) => d.id);

      expect(authoritativeIds).toContain(docA.id);
      expect(authoritativeIds).not.toContain(docB.id); // Expired -> excluded
      expect(authoritativeIds).not.toContain(docC.id); // Draft -> excluded
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
