import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AppProvider, useApp } from "../../context/AppContext";
import { CRMQuickLogModal } from "../../components/crm/CRMQuickLogModal";
import { Account, CRMContact } from "../../types/crm";

const dummyAccountWithContacts: Account = {
  id: "acc-geelong",
  name: "City of Greater Geelong",
  accountType: "Council",
  status: "Customer",
  customerRelationshipStatus: "Active",
  territory: "VIC/TAS",
  mainPhone: "03 5272 5272",
  accountOwner: "Travis Maher",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z"
};

const dummyAccountNoContacts: Account = {
  id: "acc-empty",
  name: "Empty Shire Council",
  accountType: "Council",
  status: "Prospect",
  prospectStage: "Identified",
  territory: "VIC/TAS",
  accountOwner: "Travis Maher",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z"
};

const dummyContacts: CRMContact[] = [
  {
    id: "con-geelong-1",
    accountId: "acc-geelong",
    accountName: "City of Greater Geelong",
    firstName: "Brian",
    lastName: "O'Connor",
    jobTitle: "Senior Electrical Engineer",
    role: "Senior Electrical Engineer",
    email: "brian.o@geelong.vic.gov.au",
    preferredContactMethod: "Email",
    contactOwner: "Travis Maher"
  },
  {
    id: "con-geelong-2",
    accountId: "acc-geelong",
    accountName: "City of Greater Geelong",
    firstName: "Emma",
    lastName: "Taylor",
    jobTitle: "Assets Coordinator",
    role: "Assets Coordinator",
    email: "emma.t@geelong.vic.gov.au",
    preferredContactMethod: "Phone",
    contactOwner: "Travis Maher"
  }
];

const QuickLogTestWrapper: React.FC<{ initialAccount: Account }> = ({ initialAccount }) => {
  const { setAccounts, setContacts, openQuickLog } = useApp();

  React.useEffect(() => {
    setAccounts([dummyAccountWithContacts, dummyAccountNoContacts]);
    setContacts(dummyContacts);
  }, []);

  return (
    <div>
      <button
        data-testid="open-call-btn"
        onClick={() => openQuickLog({ accountId: initialAccount.id, type: "call" })}
      >
        Open Call Log
      </button>
      <button
        data-testid="open-meeting-btn"
        onClick={() => openQuickLog({ accountId: initialAccount.id, type: "meeting" })}
      >
        Open Meeting Log
      </button>
      <button
        data-testid="open-email-btn"
        onClick={() => openQuickLog({ accountId: initialAccount.id, type: "email" })}
      >
        Open Email Log
      </button>
      <button
        data-testid="open-note-btn"
        onClick={() => openQuickLog({ accountId: initialAccount.id, type: "note" })}
      >
        Open Note Log
      </button>
      <CRMQuickLogModal />
    </div>
  );
};

describe("CRMQuickLogModal Contact Participants & Inline Creation", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("displays WHO WAS ON THE CALL? and multiple participant checkboxes for calls", async () => {
    render(
      <AppProvider>
        <QuickLogTestWrapper initialAccount={dummyAccountWithContacts} />
      </AppProvider>
    );

    fireEvent.click(screen.getByTestId("open-call-btn"));

    expect(screen.getByText(/WHO WAS ON THE CALL\?/i)).toBeInTheDocument();
    expect(screen.getByText(/Brian O'Connor/i)).toBeInTheDocument();
    expect(screen.getByText(/Emma Taylor/i)).toBeInTheDocument();

    // Checkboxes are interactive
    const brianCheckbox = screen.getByRole("checkbox", { name: /Brian O'Connor/i });
    const emmaCheckbox = screen.getByRole("checkbox", { name: /Emma Taylor/i });

    expect(brianCheckbox).not.toBeChecked();
    fireEvent.click(brianCheckbox);
    expect(brianCheckbox).toBeChecked();

    fireEvent.click(emmaCheckbox);
    expect(emmaCheckbox).toBeChecked();
  });

  it("displays WHO WAS AT THE MEETING? for meetings and EMAIL TO for emails", async () => {
    const { unmount } = render(
      <AppProvider>
        <QuickLogTestWrapper initialAccount={dummyAccountWithContacts} />
      </AppProvider>
    );

    fireEvent.click(screen.getByTestId("open-meeting-btn"));
    expect(screen.getByText(/WHO WAS AT THE MEETING\?/i)).toBeInTheDocument();
    unmount();

    render(
      <AppProvider>
        <QuickLogTestWrapper initialAccount={dummyAccountWithContacts} />
      </AppProvider>
    );

    fireEvent.click(screen.getByTestId("open-email-btn"));
    expect(screen.getByText(/EMAIL TO/i)).toBeInTheDocument();
  });

  it("displays empty state when account has no contacts with + New Contact button", async () => {
    render(
      <AppProvider>
        <QuickLogTestWrapper initialAccount={dummyAccountNoContacts} />
      </AppProvider>
    );

    fireEvent.click(screen.getByTestId("open-call-btn"));

    expect(screen.getByText(/No contacts recorded for this customer yet/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /\+ New Contact/i })).toBeInTheDocument();
  });

  it("inline + New Contact preserves activity form state and auto-selects newly created contact", async () => {
    render(
      <AppProvider>
        <QuickLogTestWrapper initialAccount={dummyAccountWithContacts} />
      </AppProvider>
    );

    fireEvent.click(screen.getByTestId("open-call-btn"));

    // Enter notes in activity log form
    const notesInput = screen.getByPlaceholderText(/What did the customer say/i);
    fireEvent.change(notesInput, { target: { value: "Discussed hinged base pole delivery dates" } });

    // Toggle Contact Made outcome
    const contactMadeCheckbox = screen.getByRole("checkbox", { name: /Contact Made/i });
    fireEvent.click(contactMadeCheckbox);
    expect(contactMadeCheckbox).toBeChecked();

    // Open inline New Contact form
    const newContactBtn = screen.getByRole("button", { name: /\+ New Contact/i });
    fireEvent.click(newContactBtn);

    expect(screen.getByText(/New Contact for City of Greater Geelong/i)).toBeInTheDocument();

    // Fill inline contact form
    const firstNameInput = screen.getByPlaceholderText("e.g. Sarah");
    const lastNameInput = screen.getByPlaceholderText("e.g. Jenkins");
    const emailInput = screen.getByPlaceholderText("e.g. sarah@company.com.au");
    const titleInput = screen.getByPlaceholderText("e.g. Project Manager");

    fireEvent.change(firstNameInput, { target: { value: "Alice" } });
    fireEvent.change(lastNameInput, { target: { value: "Cooper" } });
    fireEvent.change(emailInput, { target: { value: "alice.c@geelong.vic.gov.au" } });
    fireEvent.change(titleInput, { target: { value: "Project Manager" } });

    // Save inline contact
    const saveBtn = screen.getByRole("button", { name: /Save & Select Contact/i });
    fireEvent.click(saveBtn);

    // Verify activity form state was preserved
    expect(notesInput).toHaveValue("Discussed hinged base pole delivery dates");
    expect(contactMadeCheckbox).toBeChecked();

    // Verify newly created contact appears in the list and is checked
    await waitFor(() => {
      expect(screen.getByText(/Alice Cooper/i)).toBeInTheDocument();
    });

    const aliceCheckbox = screen.getByRole("checkbox", { name: /Alice Cooper/i });
    expect(aliceCheckbox).toBeChecked();
  });
});
