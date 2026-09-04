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

  describe("Product Supply Cycles & Cross-Contact Intelligence", () => {
    const atecAccount: Account = {
      id: "acc-atec",
      name: "ATEC Group",
      accountType: "Customer",
      status: "Customer",
      customerRelationshipStatus: "Active",
      territory: "SA",
      accountOwner: "Travis Maher",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-09-04T00:00:00Z"
    };

    const gordonContact: CRMContact = {
      id: "con-gordon",
      accountId: "acc-atec",
      accountName: "ATEC Group",
      firstName: "Gordon",
      lastName: "Tian",
      jobTitle: "Operations Manager",
      email: "gtian@atecgroup.com.au",
      preferredContactMethod: "Mobile",
      contactOwner: "Travis Maher"
    };

    const ziaContact: CRMContact = {
      id: "con-zia",
      accountId: "acc-atec",
      accountName: "ATEC Group",
      firstName: "Zia",
      lastName: "Hakim",
      jobTitle: "Director",
      email: "zhakim@atecgroup.com.au",
      preferredContactMethod: "Phone",
      contactOwner: "Travis Maher"
    };

    const atecMeetingActivity: CRMActivity = {
      id: "act-atec-1",
      accountId: "acc-atec",
      accountName: "ATEC Group",
      contactId: "con-gordon",
      contactName: "Gordon Tian",
      contactIds: ["con-gordon"],
      type: "meeting",
      title: "Meeting with Gordon Tian",
      timestamp: "2026-09-04T10:00:00Z",
      description: "Met Gordon for the first time. They had ordered 600 of the PLASSLAB, which he mentioned would last them around 3 months. These are mostly sent to SA. Zia was over in Perth at his property as he had a water leak and had to rush over to get it fixed.",
      performedBy: "Travis Maher"
    };

    it("extracts supply and replenishment knowledge items for PLASSLAB", () => {
      const knowledge = extractCrmKnowledge(atecMeetingActivity, [gordonContact, ziaContact]);
      const supplyItem = knowledge.find((k) => k.category === "Supply & Replenishment Cycle");

      expect(supplyItem).toBeDefined();
      expect(supplyItem?.statement).toContain("600");
      expect(supplyItem?.statement).toContain("PLASSLAB");
      expect(supplyItem?.statement).toContain("3 months supply");
      expect(supplyItem?.statement).toContain("SA");
      expect(supplyItem?.statement).toContain("December 2026");
    });

    it("extracts cross-contact notable events for Zia's property leak and Gordon's first meeting", () => {
      const notableEvents = extractCandidateNotableEvents(atecMeetingActivity, [gordonContact, ziaContact]);

      // Check Gordon's event
      const gordonEvent = notableEvents.find((e) => e.contactId === "con-gordon");
      expect(gordonEvent).toBeDefined();
      expect(gordonEvent?.title.toLowerCase()).toContain("first meeting");

      // Check Zia's cross-contact event
      const ziaEvent = notableEvents.find((e) => e.contactId === "con-zia");
      expect(ziaEvent).toBeDefined();
      expect(ziaEvent?.title).toContain("Property water leak in Perth");
      expect(ziaEvent?.description).toContain("water leak");
    });

    it("calculates replenishment status: recognises '1 month out from requiring more' when meeting in 2 months", () => {
      const extractedKnowledge = extractCrmKnowledge(atecMeetingActivity, [gordonContact, ziaContact]);

      // 1. Briefing prepared for a meeting in 2 months (Nov 4, 2026)
      const futureBriefing = generateCallPreparationBriefing({
        account: atecAccount,
        contact: gordonContact,
        opportunity: null,
        activities: [atecMeetingActivity],
        knowledge: extractedKnowledge,
        tasks: [],
        targetDate: "2026-11-04"
      });

      expect(futureBriefing.supplyCycles.length).toBeGreaterThan(0);
      const cycle = futureBriefing.supplyCycles[0];
      expect(cycle.product).toBe("PLASSLAB");
      expect(cycle.monthsRemaining).toBeLessThanOrEqual(1);
      expect(cycle.statusText.toLowerCase()).toContain("1 month out from requiring more plasslab");

      // Verify the narrative briefing and talking points highlight the 1-month-out milestone
      expect(futureBriefing.executiveBriefing.toLowerCase()).toContain("1 month out from requiring more plasslab");
      const commercialTp = futureBriefing.talkingPoints.find((tp) => tp.category === "Commercial");
      expect(commercialTp?.text.toLowerCase()).toContain("1 month out");

      // 2. Briefing prepared for today (Sep 4, 2026)
      const todayBriefing = generateCallPreparationBriefing({
        account: atecAccount,
        contact: gordonContact,
        opportunity: null,
        activities: [atecMeetingActivity],
        knowledge: extractedKnowledge,
        tasks: [],
        targetDate: "2026-09-04"
      });

      const todayCycle = todayBriefing.supplyCycles[0];
      expect(todayCycle.monthsRemaining).toBe(3);
      expect(todayCycle.statusText.toLowerCase()).toContain("3 months of plasslab stock remaining");
    });

    it("accurately handles participant attribution and personal context for Zia Hakim", () => {
      const extractedKnowledge = extractCrmKnowledge(atecMeetingActivity, [gordonContact, ziaContact]);

      const ziaBriefing = generateCallPreparationBriefing({
        account: atecAccount,
        contact: ziaContact,
        opportunity: null,
        activities: [atecMeetingActivity],
        knowledge: extractedKnowledge,
        tasks: []
      });

      // Must NOT falsely claim user had a direct interaction with Zia
      expect(ziaBriefing.executiveBriefing).not.toContain("Your last recorded direct interaction with Zia Hakim was");
      expect(ziaBriefing.executiveBriefing).toContain("There is no direct interaction recorded with Zia Hakim yet");
      expect(ziaBriefing.executiveBriefing).toContain("Zia was over in Perth dealing with an urgent water leak");

      // Must include a rapport talking point to ask how the water leak repairs went
      const contextPoint = ziaBriefing.talkingPoints.find((tp) => tp.category === "Context");
      expect(contextPoint).toBeDefined();
      expect(contextPoint?.text).toContain("water leak repairs went at his property in Perth");

      // No engineering rubbish boilerplate in executive briefing
      expect(ziaBriefing.executiveBriefing).not.toContain("AS/NZS 1158");
      expect(ziaBriefing.executiveBriefing).not.toContain("technical submittals are required");
    });
  });
});
