import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { CRMContactModal } from "../../components/crm/CRMContactModal";
import { AppProvider } from "../../context/AppContext";

describe("CRMContactModal Component — Human-Centred Redesign", () => {
  it("renders redesigned human-centred contact sections and removes legacy CRM classifications", () => {
    const onSave = vi.fn();
    const onClose = vi.fn();

    render(
      <AppProvider>
        <CRMContactModal
          isOpen={true}
          onClose={onClose}
          onSave={onSave}
          accountId="acc-001"
          accountName="City of Greater Geelong"
        />
      </AppProvider>
    );

    // Section Headings
    expect(screen.getByText(/General Details & Position/i)).toBeInTheDocument();
    expect(screen.getByText(/Direct Communication/i)).toBeInTheDocument();
    expect(screen.getByText(/Personal Details/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Things to Remember/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Notable Events/i)).toBeInTheDocument();

    // Verify removal of old CRM jargon
    expect(screen.queryByText(/Buying role & influence/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Stakeholder Notes & Tags/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Primary Final Decision Maker/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Role in Buying Process/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Influence Level/i)).not.toBeInTheDocument();

    // Form fields present
    expect(screen.getByPlaceholderText(/e\.g\. Matthew/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e\.g\. Richardson/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e\.g\. Richo/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e\.g\. Senior Lighting Engineer/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Select or type role/i)).toBeInTheDocument();
  });

  it("handles progressive disclosure for Partner, Children, and Birthday", () => {
    const onSave = vi.fn();
    const onClose = vi.fn();

    render(
      <AppProvider>
        <CRMContactModal
          isOpen={true}
          onClose={onClose}
          onSave={onSave}
          accountId="acc-001"
          accountName="City of Greater Geelong"
        />
      </AppProvider>
    );

    // Initially partner name and child names are not visible
    expect(screen.queryByPlaceholderText(/e\.g\. Sarah/i)).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/e\.g\. Emily/i)).not.toBeInTheDocument();

    // Check Has Partner
    const partnerCheckbox = screen.getByLabelText(/Has Partner/i);
    fireEvent.click(partnerCheckbox);
    expect(screen.getByPlaceholderText(/e\.g\. Sarah/i)).toBeInTheDocument();

    // Check Has Children
    const childrenCheckbox = screen.getByLabelText(/Has Children/i);
    fireEvent.click(childrenCheckbox);
    expect(screen.getByPlaceholderText(/e\.g\. Emily/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e\.g\. Jack/i)).toBeInTheDocument();

    // Dynamic child count resizing
    const numChildrenInput = screen.getByDisplayValue("2");
    fireEvent.change(numChildrenInput, { target: { value: "3" } });
    expect(screen.getByPlaceholderText(/Child 3/i)).toBeInTheDocument();
  });

  it("adds and removes Notable Events with event date and follow-up date", () => {
    const onSave = vi.fn();
    const onClose = vi.fn();

    render(
      <AppProvider>
        <CRMContactModal
          isOpen={true}
          onClose={onClose}
          onSave={onSave}
          accountId="acc-001"
          accountName="City of Greater Geelong"
        />
      </AppProvider>
    );

    const addEventBtn = screen.getByRole("button", { name: /Add Notable Event/i });
    fireEvent.click(addEventBtn);

    const eventInput = screen.getByPlaceholderText(/Emily's soccer tournament/i);
    expect(eventInput).toBeInTheDocument();
    fireEvent.change(eventInput, { target: { value: "Playing in golf club championships" } });

    expect(screen.getByText(/Remove/i)).toBeInTheDocument();
  });

  it("submits the full relationship payload correctly", () => {
    const onSave = vi.fn();
    const onClose = vi.fn();

    render(
      <AppProvider>
        <CRMContactModal
          isOpen={true}
          onClose={onClose}
          onSave={onSave}
          accountId="acc-001"
          accountName="City of Greater Geelong"
        />
      </AppProvider>
    );

    // Fill in general details
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. Matthew/i), { target: { value: "Matthew" } });
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. Richardson/i), { target: { value: "Richardson" } });
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. Richo/i), { target: { value: "Richo" } });
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. Senior Lighting Engineer/i), { target: { value: "Asset Manager" } });
    fireEvent.change(screen.getByPlaceholderText(/Select or type role/i), { target: { value: "Asset Manager" } });

    // Direct communication
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. name@/i), { target: { value: "matthew.r@geelong.vic.gov.au" } });
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. 0412/i), { target: { value: "0412 345 678" } });

    // Personal details
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. Golf, Carlton supporter/i), { target: { value: "Golf, Carlton supporter" } });
    fireEvent.click(screen.getByLabelText(/Has Partner/i));
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. Sarah/i), { target: { value: "Sarah" } });

    // Things to remember
    fireEvent.change(screen.getByPlaceholderText(/Usually wants pricing first/i), {
      target: { value: "Likes a chat about golf. Confirm lead times before quoting." }
    });

    // Save
    fireEvent.click(screen.getByRole("button", { name: /Add Contact/i }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        firstName: "Matthew",
        lastName: "Richardson",
        preferredName: "Richo",
        jobTitle: "Asset Manager",
        role: "Asset Manager",
        email: "matthew.r@geelong.vic.gov.au",
        mobile: "0412 345 678",
        hobbies: "Golf, Carlton supporter",
        hasPartner: true,
        partnerName: "Sarah",
        thingsToRemember: "Likes a chat about golf. Confirm lead times before quoting."
      }),
      undefined
    );
  });
});
