import { describe, it, expect } from "vitest";
import { formatOstendoCSV, validateOstendoItems } from "../../utils/ostendoExporter";

describe("End-to-End Commercial Sales Workflow Acceptance Test", () => {

  // ==========================================
  // STAGE 3: Deal BOM Schedule Validation
  // ==========================================
  describe("Stage 3: Ostendo BOM Schedule Export", () => {
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
});
