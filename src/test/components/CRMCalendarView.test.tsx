import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CRMCalendarView } from '../../components/crm/CRMCalendarView';
import { AppProvider, useApp } from '../../context/AppContext';

// Test harness that seeds a meeting via scheduleCustomerMeeting
const CalendarTestHarness: React.FC<{ seedTomorrowMeeting?: boolean }> = ({ seedTomorrowMeeting }) => {
  const app = useApp();

  return (
    <div>
      {seedTomorrowMeeting && (
        <button
          type="button"
          data-testid="seed-btn"
          onClick={() => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowStr = tomorrow.toISOString().split('T')[0];

            app.scheduleCustomerMeeting({
              title: 'Strategic Account Review & Product Replenishment',
              type: 'Meeting',
              dueDate: tomorrowStr,
              dueTime: '10:00 AM',
              status: 'pending',
              priority: 'high',
              accountName: 'ATEC Group',
              meetingFormat: 'In Person',
              location: 'ATEC Head Office, Brisbane',
              durationMinutes: 60,
              agenda: 'Review 3-month PLASSLAB usage and upcoming replenishment.',
            });
          }}
        >
          Seed
        </button>
      )}
      <CRMCalendarView />
    </div>
  );
};

describe('CRMCalendarView Component', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders calendar title, controls, and schedule meeting button', () => {
    render(
      <AppProvider>
        <CRMCalendarView />
      </AppProvider>
    );

    // Title and subtext
    expect(screen.getByText(/sales & customer calendar/i)).toBeInTheDocument();
    
    // Exact Schedule Meeting CTA
    const scheduleBtn = screen.getByRole('button', { name: /^schedule meeting$/i });
    expect(scheduleBtn).toBeInTheDocument();

    // View mode switch with exact names
    expect(screen.getByRole('button', { name: /^month$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^agenda$/i })).toBeInTheDocument();

    // Filters
    expect(screen.getByRole('button', { name: /^all$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^meetings$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^follow-ups$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^quotes$/i })).toBeInTheDocument();
  });

  it('switches between Month view and Agenda view', () => {
    render(
      <AppProvider>
        <CRMCalendarView />
      </AppProvider>
    );

    const agendaBtn = screen.getByRole('button', { name: /^agenda$/i });
    fireEvent.click(agendaBtn);

    // In agenda view, the schedule header is shown
    expect(screen.getByText(/upcoming schedule/i)).toBeInTheDocument();

    const monthBtn = screen.getByRole('button', { name: /^month$/i });
    fireEvent.click(monthBtn);

    // In month view, weekday headers (Mon, Tue, Wed...) are visible
    expect(screen.getByText('Mon')).toBeInTheDocument();
    expect(screen.getByText('Fri')).toBeInTheDocument();
  });

  it('displays Next-Day Meeting Preparation alert banner when meetings are scheduled for tomorrow', async () => {
    render(
      <AppProvider>
        <CalendarTestHarness seedTomorrowMeeting={true} />
      </AppProvider>
    );

    // Click the seed button to schedule tomorrow's meeting
    const seedBtn = screen.getByTestId('seed-btn');
    fireEvent.click(seedBtn);

    // Banner and meeting should be visible
    await waitFor(() => {
      expect(screen.getByText(/next-day meeting preparation ready/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Strategic Account Review & Product Replenishment/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/ATEC Group/i).length).toBeGreaterThanOrEqual(1);
    });

    // Preparation plan button inside the banner
    const prepBtns = screen.getAllByRole('button', { name: /view prep plan/i });
    expect(prepBtns.length).toBeGreaterThanOrEqual(1);
  });

  it('allows filtering by event type', () => {
    render(
      <AppProvider>
        <CRMCalendarView />
      </AppProvider>
    );

    const meetingsFilterBtn = screen.getByRole('button', { name: /^meetings$/i });
    fireEvent.click(meetingsFilterBtn);

    expect(meetingsFilterBtn.className).toContain('text-brand-deep');
  });
});
