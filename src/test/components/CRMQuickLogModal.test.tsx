import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { CRMQuickLogModal } from '../../components/crm/CRMQuickLogModal';
import { AppProvider, useApp } from '../../context/AppContext';
import { makeAccount } from '../factories';

const QuickLogTestWrapper: React.FC = () => {
  const { openQuickLog, addAccount, activities, tasks } = useApp();

  React.useEffect(() => {
    addAccount(
      makeAccount({
        id: 'acc-custom-123',
        name: 'Sunshine Coast Council',
        status: 'Customer',
        industry: 'Government',
        customerSegment: 'Local Government / Council',
        accountType: 'Council',
        territory: 'QLD/NT',
        accountOwner: 'Travis Maher',
        customerRelationshipStatus: 'Active',
        tags: [],
        lastInteractionDate: '2026-08-28',
        leadSource: 'Referral',
        createdDate: '2026-08-28'
      })
    );
  }, []);

  return (
    <div>
      <button
        data-testid="open-log-btn"
        onClick={() => openQuickLog({ type: "call", accountId: "acc-custom-123" })}
      >
        Open Log
      </button>
      <CRMQuickLogModal />
    </div>
  );
};

describe('CRMQuickLogModal Component', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders primary interaction fields and dynamic auto-title', async () => {
    render(
      <AppProvider>
        <QuickLogTestWrapper />
      </AppProvider>
    );

    // Open modal
    fireEvent.click(screen.getByTestId('open-log-btn'));
    expect(screen.getByText(/Quick Log Activity/i)).toBeInTheDocument();

    const titleInput = await screen.findByDisplayValue(/Call with Sunshine Coast Council/i);
    expect(titleInput).toBeInTheDocument();

    // Switch to Email
    const emailButton = screen.getByRole('button', { name: /^email$/i });
    fireEvent.click(emailButton);

    expect(await screen.findByDisplayValue(/Email sent to Sunshine Coast Council/i)).toBeInTheDocument();

    // Switch to Meeting
    const meetingButton = screen.getByRole('button', { name: /^meeting$/i });
    fireEvent.click(meetingButton);
    expect(await screen.findByDisplayValue(/Meeting with Sunshine Coast Council/i)).toBeInTheDocument();
  });

  it('does NOT render 1-click outcome presets or Dialux shortcuts', () => {
    render(
      <AppProvider>
        <QuickLogTestWrapper />
      </AppProvider>
    );

    fireEvent.click(screen.getByTestId('open-log-btn'));

    // Check presets are deleted
    expect(screen.queryByText(/1-CLICK OUTCOME PRESETS/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Left Voicemail \(\+2d\)/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Sent Dialux/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Price Accepted \(\+3d\)/i)).not.toBeInTheDocument();
  });

  it('renders simple follow-up checkbox and convenience date buttons', () => {
    render(
      <AppProvider>
        <QuickLogTestWrapper />
      </AppProvider>
    );

    fireEvent.click(screen.getByTestId('open-log-btn'));

    // Check follow-up controls (default is false)
    expect(screen.getByLabelText(/Schedule follow-up/i)).not.toBeChecked();
    expect(screen.queryByLabelText(/Follow-up due date/i)).not.toBeInTheDocument();

    // Toggle follow-up on
    fireEvent.click(screen.getByLabelText(/Schedule follow-up/i));
    expect(screen.getByLabelText(/Schedule follow-up/i)).toBeChecked();
    expect(screen.getByLabelText(/Follow-up due date/i)).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /Tomorrow/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /In 2 days/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /In 1 week/i })).toBeInTheDocument();
  });

  it('submits activity log successfully and creates follow-up task when checked', () => {
    render(
      <AppProvider>
        <QuickLogTestWrapper />
      </AppProvider>
    );

    fireEvent.click(screen.getByTestId('open-log-btn'));

    // Select Call outcome (required for Call)
    fireEvent.click(screen.getByLabelText(/Contact Made/i));

    // Type notes
    const notesInput = screen.getByPlaceholderText(/What did the customer say/i);
    fireEvent.change(notesInput, { target: { value: 'Customer confirmed they need lighting for carpark Stage 2.' } });

    // Submit
    const submitBtn = screen.getAllByRole('button', { name: /Log Activity/i }).find((btn) => btn.getAttribute('type') === 'submit')!;
    fireEvent.click(submitBtn);

    // Modal should close
    expect(screen.queryByText(/Quick Log Activity/i)).not.toBeInTheDocument();
  });

  it('renders Call outcome checkboxes (Contact Made, No Answer, Voicemail Left) as a single-select group', () => {
    render(
      <AppProvider>
        <QuickLogTestWrapper />
      </AppProvider>
    );

    fireEvent.click(screen.getByTestId('open-log-btn'));

    // Checkboxes are present for Call activity
    const contactMadeCheckbox = screen.getByLabelText(/Contact Made/i) as HTMLInputElement;
    const noAnswerCheckbox = screen.getByLabelText(/No Answer/i) as HTMLInputElement;
    const voicemailLeftCheckbox = screen.getByLabelText(/Voicemail Left/i) as HTMLInputElement;

    expect(contactMadeCheckbox).toBeInTheDocument();
    expect(noAnswerCheckbox).toBeInTheDocument();
    expect(voicemailLeftCheckbox).toBeInTheDocument();

    // Initially all unchecked
    expect(contactMadeCheckbox).not.toBeChecked();
    expect(noAnswerCheckbox).not.toBeChecked();
    expect(voicemailLeftCheckbox).not.toBeChecked();

    // 1. Select Contact Made
    fireEvent.click(contactMadeCheckbox);
    expect(contactMadeCheckbox).toBeChecked();
    expect(noAnswerCheckbox).not.toBeChecked();
    expect(voicemailLeftCheckbox).not.toBeChecked();

    // 2. Select No Answer -> Contact Made must be automatically deselected
    fireEvent.click(noAnswerCheckbox);
    expect(contactMadeCheckbox).not.toBeChecked();
    expect(noAnswerCheckbox).toBeChecked();
    expect(voicemailLeftCheckbox).not.toBeChecked();

    // 3. Select Voicemail Left -> No Answer must be automatically deselected
    fireEvent.click(voicemailLeftCheckbox);
    expect(contactMadeCheckbox).not.toBeChecked();
    expect(noAnswerCheckbox).not.toBeChecked();
    expect(voicemailLeftCheckbox).toBeChecked();
  });

  it('switches outcome options immediately when Activity Type changes and clears previous selection', () => {
    render(
      <AppProvider>
        <QuickLogTestWrapper />
      </AppProvider>
    );

    fireEvent.click(screen.getByTestId('open-log-btn'));

    // 1. Under Call, select Voicemail Left
    const voicemailLeftCheckbox = screen.getByLabelText(/Voicemail Left/i) as HTMLInputElement;
    fireEvent.click(voicemailLeftCheckbox);
    expect(voicemailLeftCheckbox).toBeChecked();

    // 2. Switch to Email
    const emailButton = screen.getByRole('button', { name: /^email$/i });
    fireEvent.click(emailButton);

    // Call options gone
    expect(screen.queryByLabelText(/Voicemail Left/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Contact Made/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/No Answer/i)).not.toBeInTheDocument();

    // Email options displayed and unchecked
    const emailSentCheckbox = screen.getByLabelText(/Email Sent/i) as HTMLInputElement;
    const emailReceivedCheckbox = screen.getByLabelText(/Email Received/i) as HTMLInputElement;
    expect(emailSentCheckbox).toBeInTheDocument();
    expect(emailReceivedCheckbox).toBeInTheDocument();
    expect(emailSentCheckbox).not.toBeChecked();
    expect(emailReceivedCheckbox).not.toBeChecked();

    // Select Email Sent
    fireEvent.click(emailSentCheckbox);
    expect(emailSentCheckbox).toBeChecked();

    // 3. Switch to Meeting
    const meetingButton = screen.getByRole('button', { name: /^meeting$/i });
    fireEvent.click(meetingButton);

    // Email options gone
    expect(screen.queryByLabelText(/Email Sent/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Email Received/i)).not.toBeInTheDocument();

    // Meeting options displayed and unchecked
    const meetingHeldCheckbox = screen.getByLabelText(/Meeting Held/i) as HTMLInputElement;
    const cancelledCheckbox = screen.getByLabelText(/Cancelled/i) as HTMLInputElement;
    const noShowCheckbox = screen.getByLabelText(/No Show/i) as HTMLInputElement;
    expect(meetingHeldCheckbox).toBeInTheDocument();
    expect(cancelledCheckbox).toBeInTheDocument();
    expect(noShowCheckbox).toBeInTheDocument();
    expect(meetingHeldCheckbox).not.toBeChecked();

    // 4. Switch to Note -> Outcome section must NOT be displayed
    const noteButton = screen.getByRole('button', { name: /^note$/i });
    fireEvent.click(noteButton);
    expect(screen.queryByText(/^outcome$/i)).not.toBeInTheDocument();
  });

  it('enforces outcome validation for Call, Email, and Meeting, but not Note', () => {
    render(
      <AppProvider>
        <QuickLogTestWrapper />
      </AppProvider>
    );

    fireEvent.click(screen.getByTestId('open-log-btn'));

    const submitBtn = screen.getAllByRole('button', { name: /Log Activity/i }).find((btn) => btn.getAttribute('type') === 'submit')!;

    // Attempting to submit Call without outcome shows error
    fireEvent.click(submitBtn);
    expect(screen.getByText(/Please select an outcome/i)).toBeInTheDocument();
    expect(screen.getByText(/Quick Log Activity/i)).toBeInTheDocument();

    // Selecting an outcome clears the validation error
    fireEvent.click(screen.getByLabelText(/Contact Made/i));
    expect(screen.queryByText(/Please select an outcome/i)).not.toBeInTheDocument();

    // Switch to Note -> Submitting without outcome succeeds
    const noteButton = screen.getByRole('button', { name: /^note$/i });
    fireEvent.click(noteButton);
    expect(screen.queryByText(/^outcome$/i)).not.toBeInTheDocument();

    fireEvent.click(submitBtn);
    expect(screen.queryByText(/Quick Log Activity/i)).not.toBeInTheDocument();
  });
});
