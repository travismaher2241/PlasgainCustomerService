import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CRMCalendarView } from '../../components/crm/CRMCalendarView';
import { AppProvider, useApp } from '../../context/AppContext';

const TestHarness: React.FC = () => {
  const { logActivity, addAccount, addContact } = useApp();

  return (
    <div>
      <button
        type="button"
        data-testid="log-meeting-btn"
        onClick={() => {
          addAccount({
            id: 'acc-test-1',
            name: 'Blacktown City Council',
            industry: 'Government',
            status: 'Active',
            territory: 'NSW',
            tier: 'Tier 1'
          });
          addContact({
            id: 'con-test-1',
            accountId: 'acc-test-1',
            accountName: 'Blacktown City Council',
            firstName: 'Sarah',
            lastName: 'Jenkins',
            email: 'sarah.jenkins@blacktown.nsw.gov.au',
            jobTitle: 'Senior Infrastructure Engineer'
          });
          logActivity({
            type: 'meeting',
            title: 'Site Meeting with Sarah Jenkins — Substation Pole Upgrade',
            description: 'Inspected 12m composite pole foundation specs and agreed to send quote rev 2.',
            accountId: 'acc-test-1',
            accountName: 'Blacktown City Council',
            contactId: 'con-test-1',
            contactName: 'Sarah Jenkins',
            outcome: 'Meeting Held',
            performedBy: 'Travis Maher'
          });
        }}
      >
        Log Meeting
      </button>

      <button
        type="button"
        data-testid="log-call-btn"
        onClick={() => {
          logActivity({
            type: 'call',
            title: 'Phone Call with John Smith',
            description: 'Quick discussion about lead times.',
            outcome: 'Contact Made'
          });
        }}
      >
        Log Call
      </button>

      <button
        type="button"
        data-testid="log-email-btn"
        onClick={() => {
          logActivity({
            type: 'email',
            title: 'Email Sent to Dave Roberts',
            description: 'Emailed technical drawing package.',
            outcome: 'Email Sent'
          });
        }}
      >
        Log Email
      </button>

      <button
        type="button"
        data-testid="log-past-meeting-btn"
        onClick={() => {
          logActivity({
            type: 'meeting',
            title: 'Previous Day Workshop — Western Distributor',
            description: 'Reviewed cable pit configurations and agreed on batch delivery dates.',
            outcome: 'Meeting Held',
            metadata: {
              meetingDate: '2026-09-02',
              meetingTime: '2:30 PM'
            }
          } as any);
        }}
      >
        Log Past Meeting
      </button>

      <CRMCalendarView />
    </div>
  );
};

describe('Logged Meeting Auto-Add to Calendar', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('automatically adds a logged meeting to the calendar and displays what was done when clicking the date', async () => {
    render(
      <AppProvider>
        <TestHarness />
      </AppProvider>
    );

    // Log a meeting
    fireEvent.click(screen.getByTestId('log-meeting-btn'));

    // The meeting should now be on the calendar for today
    await waitFor(() => {
      expect(screen.getAllByText(/Site Meeting with Sarah Jenkins — Substation Pole Upgrade/i).length).toBeGreaterThanOrEqual(1);
    });

    // Verify what was done is shown in the Selected Date drawer for today
    expect(screen.getByText(/What Was Done \/ Notes:/i)).toBeInTheDocument();
    expect(screen.getByText(/Inspected 12m composite pole foundation specs and agreed to send quote rev 2/i)).toBeInTheDocument();
    expect(screen.getByText(/Meeting Held/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Blacktown City Council/i).length).toBeGreaterThanOrEqual(1);
  });

  it('does NOT add calls or emails to the calendar', async () => {
    render(
      <AppProvider>
        <TestHarness />
      </AppProvider>
    );

    // Log a call and an email
    fireEvent.click(screen.getByTestId('log-call-btn'));
    fireEvent.click(screen.getByTestId('log-email-btn'));

    // Neither the call nor email should appear on the calendar
    expect(screen.queryByText(/Phone Call with John Smith/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Email Sent to Dave Roberts/i)).not.toBeInTheDocument();
  });

  it('accurately displays past logged meetings on their specific date', async () => {
    render(
      <AppProvider>
        <TestHarness />
      </AppProvider>
    );

    // Log a meeting with specific date 2026-09-02
    fireEvent.click(screen.getByTestId('log-past-meeting-btn'));

    // Switch to Agenda view to easily inspect all dated events
    const agendaBtn = screen.getByRole('button', { name: /^agenda$/i });
    fireEvent.click(agendaBtn);

    await waitFor(() => {
      expect(screen.getByText(/Previous Day Workshop — Western Distributor/i)).toBeInTheDocument();
      expect(screen.getByText(/Reviewed cable pit configurations and agreed on batch delivery dates/i)).toBeInTheDocument();
    });
  });
});
