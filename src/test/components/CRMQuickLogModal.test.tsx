import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { CRMQuickLogModal } from '../../components/crm/CRMQuickLogModal';
import { AppProvider, useApp } from '../../context/AppContext';

const QuickLogTestWrapper: React.FC = () => {
  const { openQuickLog } = useApp();
  return (
    <div>
      <button onClick={() => openQuickLog('call', 'acc-001', 'opp-001')} data-testid="open-log-btn">
        Open Log
      </button>
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
});
