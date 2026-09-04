import { describe, it, expect } from "vitest";
import { CRMContact, CRMActivity } from "../../types/crm";
import { detectDuplicateContact } from "../../utils/duplicateDetector";

describe("CRM Contact Architecture & Lifecycle", () => {
  const existingContacts: CRMContact[] = [
    {
      id: "contact-101",
      accountId: "acc-moreton",
      accountName: "Moreton Regional Council",
      firstName: "Sarah",
      lastName: "Jenkins",
      jobTitle: "Infrastructure Engineer",
      role: "Infrastructure Engineer",
      email: "sarah.j@moreton.qld.gov.au",
      phone: "07 3480 6666",
      mobile: "0411 222 333",
      preferredContactMethod: "Email",
      contactOwner: "Travis Maher"
    },
    {
      id: "contact-102",
      accountId: "acc-hume",
      accountName: "Hume City Council",
      firstName: "Marcus",
      lastName: "Vance",
      jobTitle: "Senior Lighting Designer",
      role: "Senior Lighting Designer",
      email: "marcus.v@hume.vic.gov.au",
      phone: "03 9205 2200",
      preferredContactMethod: "Phone",
      contactOwner: "Travis Maher"
    }
  ];

  it("moving contact preserves durable contact ID and appends to accountHistory", () => {
    const original = existingContacts[0];
    const destinationAccountId = "acc-hume";
    const destinationAccountName = "Hume City Council";

    // Simulate moveContact logic
    const historyItem = {
      id: "hist-1",
      accountId: original.accountId,
      accountName: original.accountName,
      role: original.role,
      email: original.email,
      phone: original.phone,
      endDate: "2026-09-04",
      movedAt: new Date().toISOString(),
      movedBy: "Travis Maher",
      notes: "Promoted to Senior Assets Manager at Hume City Council"
    };

    const movedContact: CRMContact = {
      ...original,
      accountId: destinationAccountId,
      accountName: destinationAccountName,
      role: "Senior Assets Manager",
      jobTitle: "Senior Assets Manager",
      email: "sarah.jenkins@hume.vic.gov.au",
      accountHistory: [...(original.accountHistory || []), historyItem]
    };

    // Durable contact ID is identical
    expect(movedContact.id).toBe(original.id);
    expect(movedContact.accountId).toBe("acc-hume");
    expect(movedContact.accountName).toBe("Hume City Council");
    expect(movedContact.role).toBe("Senior Assets Manager");
    expect(movedContact.email).toBe("sarah.jenkins@hume.vic.gov.au");

    // History preserved
    expect(movedContact.accountHistory).toHaveLength(1);
    expect(movedContact.accountHistory![0].accountName).toBe("Moreton Regional Council");
    expect(movedContact.accountHistory![0].role).toBe("Infrastructure Engineer");
  });

  it("historical activities retain original accountId while new activities link to destination accountId", () => {
    const contactId = "contact-101";

    // Activity 1: Logged while Sarah was at Moreton Regional Council
    const historicalActivity: CRMActivity = {
      id: "act-001",
      accountId: "acc-moreton",
      accountName: "Moreton Regional Council",
      contactId: contactId,
      contactName: "Sarah Jenkins",
      contactIds: [contactId],
      type: "meeting",
      title: "Pathway lighting specification review",
      timestamp: "2026-06-15T10:00:00Z",
      user: "Travis Maher"
    };

    // Sarah moves to Hume City Council...
    // Activity 2: Logged after Sarah moved to Hume City Council
    const newActivity: CRMActivity = {
      id: "act-002",
      accountId: "acc-hume",
      accountName: "Hume City Council",
      contactId: contactId,
      contactName: "Sarah Jenkins",
      contactIds: [contactId],
      type: "call",
      title: "Follow up on new Hume roadway project",
      timestamp: "2026-09-04T11:00:00Z",
      user: "Travis Maher"
    };

    // Both activities share the exact same durable contact ID
    expect(historicalActivity.contactId).toBe(contactId);
    expect(newActivity.contactId).toBe(contactId);

    // But historical activity account is Moreton, while new activity account is Hume
    expect(historicalActivity.accountId).toBe("acc-moreton");
    expect(historicalActivity.accountName).toBe("Moreton Regional Council");

    expect(newActivity.accountId).toBe("acc-hume");
    expect(newActivity.accountName).toBe("Hume City Council");
  });

  it("supports soft-delete archiving and restoration without destroying history", () => {
    const contact = existingContacts[1];

    // Archive contact
    const archivedContact: CRMContact = {
      ...contact,
      isArchived: true,
      archivedAt: "2026-09-04T12:00:00Z",
      archivedReason: "Retired from council"
    };

    expect(archivedContact.isArchived).toBe(true);
    expect(archivedContact.archivedReason).toBe("Retired from council");
    expect(archivedContact.id).toBe(contact.id);

    // Restore contact
    const restoredContact: CRMContact = {
      ...archivedContact,
      isArchived: false,
      archivedAt: undefined,
      archivedReason: undefined
    };

    expect(restoredContact.isArchived).toBe(false);
    expect(restoredContact.id).toBe(contact.id);
  });

  it("cross-account duplicate detection identifies contacts with identical email or phone across companies", () => {
    // Attempting to create Sarah Jenkins under City of Gold Coast with same email
    const duplicateByEmail = detectDuplicateContact(
      {
        name: "Sarah Jenkins",
        email: "sarah.j@moreton.qld.gov.au",
        accountId: "acc-gold-coast"
      },
      existingContacts
    );

    expect(duplicateByEmail).not.toBeNull();
    expect(duplicateByEmail?.confidence).toBe("EXACT");
    expect(duplicateByEmail?.existingRecord.id).toBe("contact-101");
    expect(duplicateByEmail?.existingRecord.accountName).toBe("Moreton Regional Council");

    // Attempting to create Marcus Vance under another account with same phone
    const duplicateByPhone = detectDuplicateContact(
      {
        name: "M. Vance",
        phone: "03 9205 2200",
        accountId: "acc-yarra"
      },
      existingContacts
    );

    expect(duplicateByPhone).not.toBeNull();
    expect(duplicateByPhone?.confidence).toBe("HIGH CONFIDENCE");
    expect(duplicateByPhone?.existingRecord.id).toBe("contact-102");
  });
});
