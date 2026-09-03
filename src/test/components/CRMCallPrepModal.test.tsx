import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { CRMCallPrepModal } from '../../components/crm/CRMCallPrepModal';
import { CRMQuickLogModal } from '../../components/crm/CRMQuickLogModal';
import { AppProvider, useApp } from '../../context/AppContext';
import { makeOpportunity, makeContact, makeAccount } from '../factories';

const CallPrepTestWrapper: React.FC = () => {
  const { openCallPrep, addAccount, addCrmOpportunity, addContact, activities } = useApp();

  React.useEffect(() => {
    addAccount(
      makeAccount({
        id: 'acc-test-99',
        name: 'Moreton Regional Council',
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

    addCrmOpportunity(makeOpportunity({
      id: 'opp-test-99',
      name: 'Bribie Island Foreshore Solar Lighting',
      accountId: 'acc-test-99',
      accountName: 'Moreton Regional Council',
      stageId: 'stage-quote',
      stageName: 'Quote / Proposal Submitted',
      dealValue: 74500,
      probability: 65,
      expectedCloseDate: '2026-09-30',
      quoteNumber: 'Q-2026-8821',
      quoteExpiryDate: '2026-09-28',
      primaryContactName: 'David Walker',
      projectApplication: 'Public Parks & Shared Paths'
    }));

    addContact(makeContact({
      id: 'con-test-99',
      firstName: 'David',
      lastName: 'Walker',
      accountId: 'acc-test-99',
      accountName: 'Moreton Regional Council',
      jobTitle: 'Senior Infrastructure Engineer',
      mobile: '0412 345 678',
      email: 'dwalker@moreton.qld.gov.au'
    }));
  }, []);

  return (
    <div>
      <button
        data-testid="open-prep-btn"
        onClick={() => openCallPrep({
          accountId: 'acc-test-99',
          opportunityId: 'opp-test-99',
          contactId: 'con-test-99'
        })}
      >
        Prep Call
      </button>
      <div data-testid="activities-count">{activities.length}</div>
      <CRMCallPrepModal />
      <CRMQuickLogModal />
    </div>
  );
};

describe('CRMCallPrepModal Component', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders call briefing with account, deal, contact context and objectives', async () => {
    render(
      <AppProvider>
        <CallPrepTestWrapper />
      </AppProvider>
    );

    // Open Prep Call
    fireEvent.click(screen.getByTestId('open-prep-btn'));

    expect(screen.getByText(/Call Briefing/i)).toBeInTheDocument();
    expect(screen.getByText(/Moreton Regional Council/i)).toBeInTheDocument();
    expect(screen.getByText(/Bribie Island Foreshore Solar Lighting/i)).toBeInTheDocument();
    expect(screen.getByText(/\$74,500/i)).toBeInTheDocument();
    expect(screen.getByText(/David Walker/i)).toBeInTheDocument();
    expect(screen.getByText(/0412 345 678/i)).toBeInTheDocument();
    expect(screen.getByText(/dwalker@moreton.qld.gov.au/i)).toBeInTheDocument();

    // Recommended objectives
    expect(screen.getByText(/Recommended Call Objectives/i)).toBeInTheDocument();
    expect(screen.getByText(/Verify required AS\/NZS 1158 Category/i)).toBeInTheDocument();
  });

  it('closing call briefing creates NO activities or tasks', async () => {
    render(
      <AppProvider>
        <CallPrepTestWrapper />
      </AppProvider>
    );

    expect(screen.getByTestId('activities-count')).toHaveTextContent('0');

    fireEvent.click(screen.getByTestId('open-prep-btn'));
    expect(screen.getByText(/Call Briefing/i)).toBeInTheDocument();

    // Close briefing
    fireEvent.click(screen.getByRole('button', { name: /^close$/i }));
    expect(screen.queryByText(/Call Briefing/i)).not.toBeInTheDocument();

    // Activities remain 0
    expect(screen.getByTestId('activities-count')).toHaveTextContent('0');
  });

  it('clicking Log Call from Call Briefing transitions to Quick Log with prefilled context', async () => {
    render(
      <AppProvider>
        <CallPrepTestWrapper />
      </AppProvider>
    );

    fireEvent.click(screen.getByTestId('open-prep-btn'));
    expect(screen.getByText(/Call Briefing/i)).toBeInTheDocument();

    // Click Log Call
    fireEvent.click(screen.getByRole('button', { name: /Log Call/i }));

    // Call Briefing closes, Quick Log opens
    expect(screen.queryByText(/Call Briefing/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Quick Log Activity/i)).toBeInTheDocument();

    // Quick Log does NOT have mode/tab switcher
    expect(screen.queryByRole('button', { name: /Pre-Call Briefing/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();

    // Context is preserved
    expect(screen.getByText(/Moreton Regional Council/i)).toBeInTheDocument();
    expect(screen.getByText(/Bribie Island Foreshore Solar Lighting/i)).toBeInTheDocument();
  });
});
