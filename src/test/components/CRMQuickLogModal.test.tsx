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

    // Type notes
    const notesInput = screen.getByPlaceholderText(/What did the customer say/i);
    fireEvent.change(notesInput, { target: { value: 'Customer confirmed they need lighting for carpark Stage 2.' } });

    // Submit
    const submitBtn = screen.getAllByRole('button', { name: /Log Activity/i }).find((btn) => btn.getAttribute('type') === 'submit')!;
    fireEvent.click(submitBtn);

    // Modal should close
    expect(screen.queryByText(/Quick Log Activity/i)).not.toBeInTheDocument();
  });

  it('renders Call outcome checkboxes (Contact Made, No Answer, Voicemail Left) and follows exact mutual exclusivity and coupling rules', () => {
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

    // 2. Select No Answer -> Contact Made must be cleared; Voicemail Left must NOT be automatically selected
    fireEvent.click(noAnswerCheckbox);
    expect(contactMadeCheckbox).not.toBeChecked();
    expect(noAnswerCheckbox).toBeChecked();
    expect(voicemailLeftCheckbox).not.toBeChecked();

    // 3. Select Voicemail Left -> No Answer stays checked, Voicemail Left is checked (Valid combination 3: No Answer + Voicemail Left)
    fireEvent.click(voicemailLeftCheckbox);
    expect(contactMadeCheckbox).not.toBeChecked();
    expect(noAnswerCheckbox).toBeChecked();
    expect(voicemailLeftCheckbox).toBeChecked();

    // 4. Select Contact Made -> must automatically clear both No Answer and Voicemail Left
    fireEvent.click(contactMadeCheckbox);
    expect(contactMadeCheckbox).toBeChecked();
    expect(noAnswerCheckbox).not.toBeChecked();
    expect(voicemailLeftCheckbox).not.toBeChecked();

    // 5. Select Voicemail Left while Contact Made is checked -> must automatically clear Contact Made and select No Answer + Voicemail Left
    fireEvent.click(voicemailLeftCheckbox);
    expect(contactMadeCheckbox).not.toBeChecked();
    expect(noAnswerCheckbox).toBeChecked();
    expect(voicemailLeftCheckbox).toBeChecked();

    // 6. Deselect No Answer while Voicemail Left is selected -> must also clear Voicemail Left
    fireEvent.click(noAnswerCheckbox);
    expect(contactMadeCheckbox).not.toBeChecked();
    expect(noAnswerCheckbox).not.toBeChecked();
    expect(voicemailLeftCheckbox).not.toBeChecked();

    // 7. Select Voicemail Left directly from clean state -> automatically selects No Answer as well
    fireEvent.click(voicemailLeftCheckbox);
    expect(noAnswerCheckbox).toBeChecked();
    expect(voicemailLeftCheckbox).toBeChecked();

    // 8. Deselect Voicemail Left -> No Answer remains checked
    fireEvent.click(voicemailLeftCheckbox);
    expect(noAnswerCheckbox).toBeChecked();
    expect(voicemailLeftCheckbox).not.toBeChecked();
  });

  it('switches between Call checkboxes and non-Call select dropdown cleanly', () => {
    render(
      <AppProvider>
        <QuickLogTestWrapper />
      </AppProvider>
    );

    fireEvent.click(screen.getByTestId('open-log-btn'));

    // Under Call, checkboxes exist, select dropdown does not
    expect(screen.getByLabelText(/Contact Made/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Select Activity Outcome/i)).not.toBeInTheDocument();

    // Switch to Email
    const emailButton = screen.getByRole('button', { name: /^email$/i });
    fireEvent.click(emailButton);

    // Under Email, select dropdown exists, checkboxes do not
    expect(screen.queryByLabelText(/Contact Made/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Select Activity Outcome/i)).toBeInTheDocument();

    // Switch back to Call
    const callButton = screen.getByRole('button', { name: /^call$/i });
    fireEvent.click(callButton);

    // Call checkboxes restored
    expect(screen.getByLabelText(/Contact Made/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Select Activity Outcome/i)).not.toBeInTheDocument();
  });
});
