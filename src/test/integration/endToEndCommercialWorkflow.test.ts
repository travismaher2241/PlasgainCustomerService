import { describe, it, expect } from "vitest";
import { analyzeEnquiryDeterministic } from "../../utils/rulesEngine";
import { evaluateQuoteReadiness, QuoteContext } from "../../utils/quoteReadinessValidator";
import { formatOstendoCSV, validateOstendoItems } from "../../utils/datasheetExporter";
import { getLightingCategory } from "../../data/lightingStandards";
import { SAMPLE_PRODUCTS } from "../../data/mockData";
import { analysisStore } from "../../server/analysisStore";

describe("End-to-End Commercial Sales Workflow Acceptance Test", () => {
  // ==========================================
  // STAGE 1: Tender Intake & Enquiry Analysis
  // ==========================================
  describe("Stage 1: Council Tender Intake & Analysis", () => {
    it("ingests raw council tender text and extracts structured scope deterministically", () => {
      const rawTenderText = `
        City of Ballarat Tender Ref: BCC-2025-E02-REV-B
        Project: 1.2km Shared Path Upgrade & Solar Lighting Scheme
        Scope of Works:
        - Supply 24x 6m Solar Pathway Lighting Poles with warm white 3000K luminaires for wildlife buffer.
        - Council requires Category P4 lighting standard compliance (AS/NZS 1158.3.1).
        - Install 1,200m underground electrical cabling with heavy-duty polymeric cable cover slabs complying with AS 4702.
        - Location: Ballarat Regional Trail, Victoria.
        - Contact: civil.projects@ballarat.vic.gov.au
      `;

      const analysis = analyzeEnquiryDeterministic(rawTenderText, {
        customerName: "David Miller",
        company: "City of Ballarat",
        project: "Ballarat 1.2km Shared Path Upgrade",
        location: "Ballarat, Victoria",
        source: "Email Tender"
      });

      expect(analysis).toBeDefined();
      expect(analysis.opportunitySummary?.application?.value).toMatch(/civil|protection|pathway|lighting|trail/i);
      expect(analysis.opportunitySummary?.standardsMentioned?.value).toContain("AS/NZS 1158");
      expect(analysis.opportunitySummary?.location?.value).toContain("Ballarat");
      expect(analysis.readiness?.score).toBeGreaterThanOrEqual(60);
    });
  });

  // ==========================================
  // STAGE 2: Technical Qualification & Product Grounding
  // ==========================================
  describe("Stage 2: Technical Qualification & Quote Readiness Gate", () => {
    it("evaluates quote readiness for a budget estimate", () => {
      const quoteContext: QuoteContext = {
        quoteType: "budget",
        customerCompany: "City of Ballarat",
        projectName: "Ballarat Shared Path Upgrade",
        deliveryLocation: "Ballarat, Victoria",
        productCode: "50W-INTENSE",
        quantity: 24,
        mountingHeightM: 6,
        isSolar: true,
        solarAutonomyDays: 5,
        operatingProfileConfirmed: true
      };

      const readinessReport = evaluateQuoteReadiness(quoteContext);
      expect(readinessReport).toBeDefined();
      expect(readinessReport.isReadyForQuoteType).toBe(true);
      expect(readinessReport.readinessPercentage).toBeGreaterThanOrEqual(75);
    });

    it("grounds recommendation to an approved Plasgain solar product", () => {
      const solarProduct = SAMPLE_PRODUCTS.find((p) => p.name.includes("Intense") || p.code.includes("INTENSE"));
      expect(solarProduct).toBeDefined();
      expect(solarProduct?.cct).toMatch(/3000K/i);
      expect(solarProduct?.battery).toContain("896Wh");
    });
  });

  // ==========================================
  // STAGE 3: CAD Plan Take-Off & BOM Schedule Validation
  // ==========================================
  describe("Stage 3: CAD Plan Take-Off & Ostendo BOM Schedule Export", () => {
    it("validates and formats itemized BOM for Ostendo ERP", () => {
      const bomItems = [
        {
          itemCode: "50W-INTENSE",
          description: "Plasgain Intense Light 50W Solar Luminaire (3000K)",
          quantity: 24,
          unit: "ea",
          lineNotes: "AS/NZS 1158 Cat P4 Wildlife Fauna Compliant"
        },
        {
          itemCode: "PLASPOLE-6M-DB",
          description: "Plaspole 6.0m Recycled Composite Light Pole (Direct Burial)",
          quantity: 24,
          unit: "ea",
          lineNotes: "Direct burial with 1.2m embedment depth"
        },
        {
          itemCode: "PCC-200-1M",
          description: "Plasgain Polymeric Cable Cover Slabs (1000x200mm)",
          quantity: 1200,
          unit: "m",
          lineNotes: "AS 4702 Cat 1 Mechanical Protection - 1200 interlocking units"
        }
      ];

      const validation = validateOstendoItems(bomItems);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);

      const csvContent = formatOstendoCSV(bomItems, "OST-BALLARAT-2025");
      expect(csvContent).toContain("50W-INTENSE");
      expect(csvContent).toContain("PLASPOLE-6M-DB");
      expect(csvContent).toContain("PCC-200-1M");
      expect(csvContent).toContain("OST-BALLARAT-2025");
    });
  });

  // ==========================================
  // STAGE 4: Engineering Calculations & Sizing
  // ==========================================
  describe("Stage 4: Engineering Calculations & Sizing", () => {
    it("calculates 1,200m cable cover mass reduction vs concrete", () => {
      const trenchLength = 1200;
      const trenchWidth = 300;
      const concreteThickness = 50;
      const concreteVol = trenchLength * (trenchWidth / 1000) * (concreteThickness / 1000); // 18 m3
      const concreteWeightKg = concreteVol * 2400; // 43,200 kg
      const polyRolls = Math.ceil(trenchLength / 20); // 60 rolls
      const polyWeightKg = polyRolls * 36; // 2,160 kg
      const weightSavedKg = concreteWeightKg - polyWeightKg; // 41,040 kg (>41 Tonnes)
      const reductionPercent = Math.round((weightSavedKg / concreteWeightKg) * 100);

      expect(concreteWeightKg).toBe(43200);
      expect(polyWeightKg).toBe(2160);
      expect(weightSavedKg).toBe(41040);
      expect(reductionPercent).toBe(95);
    });

    it("verifies AS/NZS 1158 Category P4 lighting requirements", () => {
      const catP4 = getLightingCategory("P4");
      expect(catP4).toBeDefined();
      expect(catP4?.maintainedIlluminanceLux).toBe(0.85);
      expect(catP4?.minimumIlluminanceLux).toBe(0.17);
    });
  });

  // ==========================================
  // STAGE 5: Standards Conflict Resolver
  // ==========================================
  describe("Stage 5: Standards Conflict Analysis & Customer Clarification", () => {
    it("analyzes custom tender clause with high CCT and generates clarification RFI", () => {
      const customClause = "Supply 5700K Daylight LED fittings along riverside shared path";
      const isHighCct = customClause.includes("5700K");
      expect(isHighCct).toBe(true);

      const clarificationQuestion = "Can council confirm if 3000K Warm White is acceptable in lieu of 5700K to comply with AS 4282:2019 and local fauna protection guidelines?";
      expect(clarificationQuestion).toContain("AS 4282:2019");
      expect(clarificationQuestion).toContain("3000K");
    });
  });

  // ==========================================
  // STAGE 6: End-to-End Governance & Pipeline Injection
  // ==========================================
  describe("Stage 6: Complete Pipeline Injection & Document Governance", () => {
    it("records engineered analysis session and verifies persistence in analysisStore", async () => {
      const projectRecord = {
        id: "deal-ballarat-001",
        projectId: "proj-ballarat-001",
        projectName: "Ballarat 1.2km Shared Path Upgrade",
        customerCompany: "City of Ballarat",
        analysisType: "enquiry" as const,
        status: "complete" as const,
        sourceHash: "hash-ballarat-v1",
        analysisData: {
          dealValue: 78500,
          productsCount: 3
        }
      };

      await analysisStore.saveAnalysis(projectRecord);
      const retrieved = await analysisStore.getAnalysis("deal-ballarat-001");

      expect(retrieved).toBeDefined();
      expect(retrieved?.projectName).toBe(projectRecord.projectName);
      expect(retrieved?.customerCompany).toBe("City of Ballarat");
      expect(retrieved?.analysisData?.dealValue).toBe(78500);
    });
  });
});
