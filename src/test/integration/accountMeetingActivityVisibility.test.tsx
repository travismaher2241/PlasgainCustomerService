import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AppProvider, useApp } from '../../context/AppContext';
import { CRMCalendarView } from '../../components/crm/CRMCalendarView';
import { CRMAccountsView } from '../../components/crm/CRMAccountsView';

const TestMeetingActivityHarness: React.FC = () => {
  const { addAccount, addContact, logActivity, setSelectedAccountId, scheduleCustomerMeeting } = useApp();

  return (
    <div>
      <button
        type="button"
        data-testid="seed-overhead-btn"
        onClick={() => {
          addAccount({
            id: 'acc-overhead-1',
            name: 'Over Head Maintenance Services',
            industry: 'Electrical Contracting',
            status: 'Customer',
            territory: 'VIC/TAS',
            accountType: 'Account',
            accountOwner: 'Alan Berryman'
          });
          addContact({
            id: 'con-gary-1',
            accountId: 'acc-overhead-1',
            accountName: 'Over Head Maintenance Services',
            firstName: 'Gary',
            lastName: 'Rayner',
            email: 'gary@overhead.com.au',
            jobTitle: 'Estimator',
            preferredContactMethod: 'Phone',
            contactOwner: 'Alan Berryman'
          });
          setSelectedAccountId('acc-overhead-1');
        }}
      >
        Seed Account
      </button>

      <button
        type="button"
        data-testid="log-meeting-activity-btn"
        onClick={() => {
          logActivity({
            type: 'meeting',
            title: 'First meeting - Introduction',
            description: 'Introduced to Gary, Ross and Abhi. Had a good chat with Ross and Abhi about my background.',
            accountId: 'acc-overhead-1',
            accountName: 'Over Head Maintenance Services',
            contactId: 'con-gary-1',
            contactName: 'Gary Rayner',
            outcome: 'Meeting Held — follow-up needed',
            performedBy: 'Travis Maher'
          });
        }}
      >
        Log Meeting Activity
      </button>

      <button
        type="button"
        data-testid="log-meeting-by-name-only-btn"
        onClick={() => {
          // Log where accountId is missing or different, but accountName and contact match
          logActivity({
            type: 'meeting',
            title: 'Second meeting - Product review',
            description: 'Discussed composite light poles with Gary Rayner.',
            accountName: 'Over Head Maintenance Services',
            contactId: 'con-gary-1',
            contactName: 'Gary Rayner',
            outcome: 'Meeting Held — no further action',
            performedBy: 'Travis Maher'
          });
        }}
      >
        Log Meeting By Name Only
      </button>

      <button
        type="button"
        data-testid="schedule-meeting-task-btn"
        onClick={() => {
          scheduleCustomerMeeting({
            title: 'On-site technical review',
            type: 'Meeting',
            priority: 'High',
            dueDate: '2026-09-11',
            dueTime: '10:00 AM',
            accountId: 'acc-overhead-1',
            accountName: 'Over Head Maintenance Services',
            contactId: 'con-gary-1',
            contactName: 'Gary Rayner',
            notes: 'Inspected overhead pole clearance.'
          });
        }}
      >
        Schedule Meeting Task
      </button>

      <div data-testid="calendar-container">
        <CRMCalendarView />
      </div>
      <div data-testid="accounts-container">
        <CRMAccountsView />
      </div>
    </div>
  );
};

describe('Meeting Activity Visibility on Account and Calendar', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('displays logged meeting in both Calendar and Account Activity tab with correct counter', async () => {
    render(
      <AppProvider>
        <TestMeetingActivityHarness />
      </AppProvider>
    );

    // 1. Seed account & contact
    fireEvent.click(screen.getByTestId('seed-overhead-btn'));

    // Verify account is loaded
    expect(screen.getAllByText('Over Head Maintenance Services').length).toBeGreaterThanOrEqual(1);

    // 2. Log meeting activity
    fireEvent.click(screen.getByTestId('log-meeting-activity-btn'));

    // 3. Check Calendar has the meeting
    expect(screen.getAllByText(/First meeting - Introduction/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Gary Rayner/i).length).toBeGreaterThanOrEqual(1);

    // 4. Click Activity tab in CRMAccountsView
    const activityTab = screen.getByRole('tab', { name: /activity tab/i });
    expect(activityTab).toBeInTheDocument();
    // The activity counter badge inside the tab should now be 1, not 0
    expect(activityTab).toHaveTextContent('1');

    fireEvent.click(activityTab);

    // 5. Customer Discussion Timeline must show the meeting and NOT the empty state
    expect(screen.queryByText(/No customer discussions logged yet/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Customer Discussion Timeline/i)).toBeInTheDocument();
    expect(screen.getAllByText(/First meeting - Introduction/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Meeting Held — follow-up needed/i).length).toBeGreaterThanOrEqual(1);
  });

  it('associates activity by accountName or contact even if accountId is omitted or different', async () => {
    render(
      <AppProvider>
        <TestMeetingActivityHarness />
      </AppProvider>
    );

    fireEvent.click(screen.getByTestId('seed-overhead-btn'));
    fireEvent.click(screen.getByTestId('log-meeting-by-name-only-btn'));

    const activityTab = screen.getByRole('tab', { name: /activity tab/i });
    expect(activityTab).toHaveTextContent('1');
    fireEvent.click(activityTab);

    expect(screen.queryByText(/No customer discussions logged yet/i)).not.toBeInTheDocument();
    expect(screen.getAllByText(/Second meeting - Product review/i).length).toBeGreaterThanOrEqual(1);
  });

  it('displays meetings created via task scheduling in Account Activity tab', async () => {
    render(
      <AppProvider>
        <TestMeetingActivityHarness />
      </AppProvider>
    );

    fireEvent.click(screen.getByTestId('seed-overhead-btn'));
    fireEvent.click(screen.getByTestId('schedule-meeting-task-btn'));

    const activityTab = screen.getByRole('tab', { name: /activity tab/i });
    expect(activityTab).toHaveTextContent('1');
    fireEvent.click(activityTab);

    expect(screen.queryByText(/No customer discussions logged yet/i)).not.toBeInTheDocument();
    expect(screen.getAllByText(/On-site technical review/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Inspected overhead pole clearance/i).length).toBeGreaterThanOrEqual(1);
  });
});
