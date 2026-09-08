import { describe, it, expect } from "vitest";
import {
  getAccountContactFrequency,
  getContactFrequencyDays,
  computeAccountContactCadence,
  computeAccountCommercialStatus,
  buildAccountCheckInTask
} from "../../utils/accountStatusUtils";
import { Account, CRMOpportunity, CRMActivity } from "../../types/crm";

describe("accountStatusUtils Suite", () => {
  const baseAccount: Account = {
    id: "acc-101",
    name: "Lowe Civil Contractors",
    status: "Customer",
    accountCommercialStatus: "Active",
    accountType: "Account",
    territory: "VIC/TAS",
    accountOwner: "Travis Maher",
    createdAt: "2026-06-01T00:00:00.000Z",
    billingAddress: {
      street: "123 Industrial Way",
      city: "Melbourne",
      state: "VIC",
      postcode: "3000",
      country: "Australia"
    }
  };

  describe("Contact Frequency Thresholds & Fallbacks", () => {
    it("maps contact frequencies to correct days", () => {
      expect(getContactFrequencyDays("Opportunity")).toBe(14);
      expect(getContactFrequencyDays("Occasional")).toBe(30);
      expect(getContactFrequencyDays("As needed")).toBe(90);
    });

    it("falls back cleanly from legacy customerRelationshipStatus", () => {
      expect(getAccountContactFrequency({ ...baseAccount, contactFrequency: "Occasional" })).toBe("Occasional");
      expect(getAccountContactFrequency({ ...baseAccount, customerRelationshipStatus: "Developing" })).toBe("Opportunity");
      expect(getAccountContactFrequency({ ...baseAccount, customerRelationshipStatus: "Occasional" })).toBe("Occasional");
      expect(getAccountContactFrequency({ ...baseAccount, customerRelationshipStatus: "At Risk" })).toBe("As needed");
      expect(getAccountContactFrequency({ ...baseAccount, customerRelationshipStatus: "Dormant" })).toBe("As needed");
      expect(getAccountContactFrequency({ ...baseAccount, customerRelationshipStatus: undefined })).toBe("Opportunity");
    });
  });

  describe("computeAccountContactCadence", () => {
    const refDate = new Date("2026-09-08T12:00:00.000Z");

    it("detects when an Opportunity account is on-track (contacted 10 days ago)", () => {
      const activities: CRMActivity[] = [
        {
          id: "act-1",
          type: "call",
          title: "Follow-up phone call",
          timestamp: "2026-08-29T12:00:00.000Z", // 10 days ago
          accountId: "acc-101",
          performedBy: "Travis Maher"
        }
      ];

      const cadence = computeAccountContactCadence(
        { ...baseAccount, contactFrequency: "Opportunity" },
        activities,
        refDate
      );

      expect(cadence.daysSinceLastContact).toBe(10);
      expect(cadence.isOverdue).toBe(false);
      expect(cadence.daysOverdue).toBe(0);
      expect(cadence.nextDueInDays).toBe(4);
    });

    it("detects when an Opportunity account is overdue (contacted 19 days ago)", () => {
      const activities: CRMActivity[] = [
        {
          id: "act-1",
          type: "email",
          title: "Pricing enquiry",
          timestamp: "2026-08-20T12:00:00.000Z", // 19 days ago
          accountId: "acc-101",
          performedBy: "Travis Maher"
        }
      ];

      const cadence = computeAccountContactCadence(
        { ...baseAccount, contactFrequency: "Opportunity" },
        activities,
        refDate
      );

      expect(cadence.daysSinceLastContact).toBe(19);
      expect(cadence.isOverdue).toBe(true);
      expect(cadence.daysOverdue).toBe(5); // 19 - 14 = 5
      expect(cadence.nextDueInDays).toBe(0);

      const task = buildAccountCheckInTask({ ...baseAccount, contactFrequency: "Opportunity" }, cadence);
      expect(task.title).toContain("Routine Check-in: Lowe Civil Contractors");
      expect(task.assignedTo).toBe("Travis Maher");
      expect(task.isCheckInTask).toBe(true);
    });

    it("evaluates Occasional (30 days) and As needed (90 days) thresholds correctly", () => {
      const activities: CRMActivity[] = [
        {
          id: "act-1",
          type: "call",
          title: "Catch up",
          timestamp: "2026-08-01T12:00:00.000Z", // 38 days ago
          accountId: "acc-101",
          performedBy: "Travis Maher"
        }
      ];

      const occasionalCadence = computeAccountContactCadence(
        { ...baseAccount, contactFrequency: "Occasional" },
        activities,
        refDate
      );
      expect(occasionalCadence.isOverdue).toBe(true);
      expect(occasionalCadence.daysOverdue).toBe(8); // 38 - 30

      const asNeededCadence = computeAccountContactCadence(
        { ...baseAccount, contactFrequency: "As needed" },
        activities,
        refDate
      );
      expect(asNeededCadence.isOverdue).toBe(false);
      expect(asNeededCadence.nextDueInDays).toBe(52); // 90 - 38
    });
  });

  describe("computeAccountCommercialStatus", () => {
    const refDate = new Date("2026-09-08T12:00:00.000Z");

    it("classifies brand new customer without sales (< 90 days) as Active", () => {
      const newAcc: Account = {
        ...baseAccount,
        createdAt: "2026-08-01T00:00:00.000Z" // ~38 days old
      };
      const status = computeAccountCommercialStatus(newAcc, [], [], refDate);
      expect(status).toBe("Active");
    });

    it("classifies account with sale in last 3 months (< 90 days) as Active", () => {
      const deals: CRMOpportunity[] = [
        {
          id: "deal-1",
          accountId: "acc-101",
          name: "Lighting Package",
          stageId: "stage-won",
          dealValue: 25000,
          actualCloseDate: "2026-07-15T00:00:00.000Z" // ~55 days ago
        } as CRMOpportunity
      ];
      const status = computeAccountCommercialStatus(baseAccount, deals, [], refDate);
      expect(status).toBe("Active");
    });

    it("classifies account with sale between 3 and 6 months ago (90-180 days) as Declining", () => {
      const deals: CRMOpportunity[] = [
        {
          id: "deal-1",
          accountId: "acc-101",
          name: "Subdivision Poles",
          stageId: "stage-won",
          dealValue: 40000,
          actualCloseDate: "2026-04-20T00:00:00.000Z" // ~141 days ago
        } as CRMOpportunity
      ];
      const status = computeAccountCommercialStatus(baseAccount, deals, [], refDate);
      expect(status).toBe("Declining");
    });

    it("classifies account with sale over 6 months ago (180-730 days) as Dormant", () => {
      const deals: CRMOpportunity[] = [
        {
          id: "deal-1",
          accountId: "acc-101",
          name: "Parkland Columns",
          stageId: "stage-won",
          dealValue: 15000,
          actualCloseDate: "2025-10-10T00:00:00.000Z" // ~333 days ago
        } as CRMOpportunity
      ];
      const status = computeAccountCommercialStatus(baseAccount, deals, [], refDate);
      expect(status).toBe("Dormant");
    });

    it("classifies account with no contact and no sale in 24 months as Inactive", () => {
      const oldAcc: Account = {
        ...baseAccount,
        createdAt: "2023-01-01T00:00:00.000Z" // > 3 years old
      };
      const oldDeals: CRMOpportunity[] = [
        {
          id: "deal-1",
          accountId: "acc-101",
          name: "Old 2023 Project",
          stageId: "stage-won",
          dealValue: 10000,
          actualCloseDate: "2023-05-01T00:00:00.000Z" // > 3 years ago
        } as CRMOpportunity
      ];
      const oldActivities: CRMActivity[] = [
        {
          id: "act-old",
          type: "call",
          title: "Initial meeting in 2023",
          timestamp: "2023-05-02T00:00:00.000Z",
          accountId: "acc-101",
          performedBy: "Travis Maher"
        }
      ];

      const status = computeAccountCommercialStatus(oldAcc, oldDeals, oldActivities, refDate);
      expect(status).toBe("Inactive");
    });
  });
});
