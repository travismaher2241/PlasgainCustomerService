import { describe, it, expect } from "vitest";
import {
  extractCandidateNotableEvents,
  extractCrmKnowledge,
  deduplicateOrMergeKnowledge
} from "../../utils/crmKnowledgeEngine";
import { generateCallPreparationBriefing } from "../../utils/crmCallPreparation";
import { CRMActivity, CRMContact, CRMKnowledgeItem, CRMOpportunity, Account } from "../../types/crm";

describe("CRM AI Knowledge Capture & Call Preparation", () => {
  const dummyAccount: Account = {
    id: "acc-1",
    name: "Moreton Regional Council",
    accountType: "Council",
    status: "Customer",
    customerRelationshipStatus: "Active",
    territory: "QLD/NT",
    mainPhone: "07 3480 6666",
    accountOwner: "Travis Maher",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z"
  };

  const dummyContact: CRMContact = {
    id: "con-1",
    accountId: "acc-1",
    accountName: "Moreton Regional Council",
    firstName: "David",
    lastName: "Walker",
    jobTitle: "Senior Infrastructure Engineer",
    role: "Senior Infrastructure Engineer",
    email: "dwalker@moreton.qld.gov.au",
    phone: "07 3480 6666",
    preferredContactMethod: "Email",
    contactOwner: "Travis Maher"
  };

  const dummyActivity: CRMActivity = {
    id: "act-1",
    accountId: "acc-1",
    accountName: "Moreton Regional Council",
    contactId: "con-1",
    contactName: "David Walker",
    contactIds: ["con-1"],
    type: "meeting",
    title: "Project scoping discussion",
    timestamp: "2026-09-04T10:00:00Z",
    description: `David mentioned he prefers hinged base poles for all coastal installations due to ease of maintenance during cyclonic weather.
Plasgain promised to send revised photometric calculations by next Friday.
Customer asked: Will the lithium battery pack require replacement before the 10-year design life?
David also stated that the council tender committee meets on October 15th to make the final vendor decision.
He mentioned he was recently promoted to Head of Asset Maintenance.`,
    performedBy: "Travis Maher"
  };

  it("extracts structured knowledge items across categories from activity notes", () => {
    const knowledgeItems = extractCrmKnowledge(dummyActivity, [dummyContact]);

    expect(knowledgeItems.length).toBeGreaterThan(0);

    const categories = knowledgeItems.map((k) => k.category);
    expect(categories).toContain("Product & Pole Preference");
    expect(categories).toContain("Commitment");
    expect(categories).toContain("Unresolved Question");
    expect(categories).toContain("Decision Criteria & Timeline");

    // Check pole preference statement
    const polePref = knowledgeItems.find((k) => k.category === "Product & Pole Preference");
    expect(polePref?.statement.toLowerCase()).toContain("hinged base");

    // Check commitment statement
    const commitment = knowledgeItems.find((k) => k.category === "Commitment");
    expect(commitment?.statement.toLowerCase()).toContain("photometric");

    // Check contact attribution
    expect(polePref?.contactIds).toContain("con-1");
  });

  it("stages candidate notable events with source attribution and candidate status", () => {
    const candidateEvents = extractCandidateNotableEvents(dummyActivity, [dummyContact]);

    expect(candidateEvents.length).toBeGreaterThan(0);

    const promotionEvent = candidateEvents.find((e) => e.title.toLowerCase().includes("promoted") || e.title.toLowerCase().includes("head of asset"));
    expect(promotionEvent).toBeDefined();
    expect(promotionEvent?.status).toBe("candidate");
    expect(promotionEvent?.isAiGenerated).toBe(true);
    expect(promotionEvent?.sourceActivityId).toBe("act-1");
    expect(promotionEvent?.contactId).toBe("con-1");
  });

  it("deduplicates existing knowledge by updating lastConfirmedAt instead of duplicating", () => {
    const existingKnowledge: CRMKnowledgeItem[] = [
      {
        id: "k-existing-1",
        accountId: "acc-1",
        contactIds: ["con-1"],
        category: "Product & Pole Preference",
        statement: "Prefers hinged base poles for all coastal installations due to ease of maintenance.",
        sourceActivityId: "act-old",
        sourceActivityDate: "2026-05-01T10:00:00Z",
        createdAt: "2026-05-01T10:00:00Z",
        lastConfirmedAt: "2026-05-01T10:00:00Z",
        status: "active"
      }
    ];

    const newlyExtracted: CRMKnowledgeItem[] = [
      {
        id: "k-new-1",
        accountId: "acc-1",
        contactIds: ["con-1"],
        category: "Product & Pole Preference",
        statement: "Prefers hinged base poles for coastal installations due to cyclone season.",
        sourceActivityId: "act-1",
        sourceActivityDate: "2026-09-04T10:00:00Z",
        createdAt: "2026-09-04T10:00:00Z",
        lastConfirmedAt: "2026-09-04T10:00:00Z",
        status: "active"
      }
    ];

    const { toAdd, toUpdate } = deduplicateOrMergeKnowledge(
      existingKnowledge,
      newlyExtracted
    );

    // Should NOT create a second item
    expect(toAdd.length).toBe(0);
    expect(toUpdate.length).toBe(1);

    // Existing item should have its confirmation date refreshed
    expect(toUpdate[0].id).toBe("k-existing-1");
    expect(toUpdate[0].lastConfirmedAt).toBe("2026-09-04T10:00:00Z");
  });

  it("generates natural language Call Preparation briefing with honest uncertainty", () => {
    const openOpportunity: CRMOpportunity = {
      id: "opp-1",
      accountId: "acc-1",
      accountName: "Moreton Regional Council",
      name: "Bribie Island Foreshore Solar Lighting",
      stage: "Quote Submitted",
      quoteNumber: "Q-2026-8821",
      dealValue: 74500,
      quoteStatus: "Sent",
      quoteSentDate: "2026-08-20",
      assignedTo: "Travis Maher"
    };

    const briefing = generateCallPreparationBriefing({
      account: dummyAccount,
      contact: dummyContact,
      opportunity: openOpportunity,
      activities: [], // No response activity recorded
      knowledge: [
        {
          id: "k-1",
          accountId: "acc-1",
          contactIds: ["con-1"],
          category: "Product & Pole Preference",
          statement: "Prefers hinged base poles for all coastal installations",
          sourceActivityId: "act-0",
          sourceActivityDate: "2026-08-01",
          createdAt: "2026-08-01",
          lastConfirmedAt: "2026-08-01",
          status: "active"
        }
      ],
      tasks: []
    });

    // Validates natural language briefing tone
    expect(briefing.executiveBriefing).toContain("David Walker");
    expect(briefing.executiveBriefing).toContain("Moreton Regional Council");
    expect(briefing.executiveBriefing).toContain("Q-2026-8821");
    expect(briefing.executiveBriefing).toContain("74,500");

    // Honest uncertainty requirement: clearly states when CRM does not have confirmation
    expect(briefing.executiveBriefing.toLowerCase()).toContain("does not currently show whether david walker has confirmed or responded");

    // Validates talking points and accumulated knowledge inclusion
    expect(briefing.talkingPoints.length).toBeGreaterThan(0);
    expect(briefing.relevantKnowledge.length).toBe(1);
    expect(briefing.relevantKnowledge[0].statement).toContain("hinged base poles");
  });
});
