import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { CRMQuickLogModal } from '../../components/crm/CRMQuickLogModal';
import { AppProvider, useApp } from '../../context/AppContext';

const QuickLogTestWrapper: React.FC = () => {
  const { openQuickLog, activities, tasks } = useApp();
  return (
    <div>
      <button onClick={() => openQuickLog('call', 'acc-001', 'opp-001')} data-testid="open-log-btn">
        Open Log
      </button>
      <div data-testid="activities-count">{activities.length}</div>
      <div data-testid="tasks-count">{tasks.length}</div>
      <CRMQuickLogModal />
    </div>
  );
};

describe('CRMQuickLogModal Component', () => {
  it('opens and updates activity title dynamically when switching activity types', async () => {
    render(
      <AppProvider>
        <QuickLogTestWrapper />
      </AppProvider>
    );

    // Open modal
    fireEvent.click(screen.getByTestId('open-log-btn'));
    expect(screen.getByText(/Quick Log Activity/i)).toBeInTheDocument();

    const titleInput = await screen.findByDisplayValue(/Call with City of Moreton Bay/i);
    expect(titleInput).toBeInTheDocument();

    // Switch to Email
    const emailButton = screen.getByRole('button', { name: /^email$/i });
    fireEvent.click(emailButton);

    expect(await screen.findByDisplayValue(/Email sent to City of Moreton Bay/i)).toBeInTheDocument();

    // Switch to Meeting
    const meetingButton = screen.getByRole('button', { name: /^meeting$/i });
    fireEvent.click(meetingButton);
    expect(await screen.findByDisplayValue(/Meeting with City of Moreton Bay/i)).toBeInTheDocument();
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

    // Check follow-up controls
    expect(screen.getByLabelText(/Schedule follow-up/i)).toBeChecked();
    expect(screen.getByLabelText(/Follow-up due date/i)).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /Tomorrow/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /In 2 days/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /In 1 week/i })).toBeInTheDocument();

    // Toggle follow-up off
    fireEvent.click(screen.getByLabelText(/Schedule follow-up/i));
    expect(screen.queryByLabelText(/Follow-up due date/i)).not.toBeInTheDocument();
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
});
