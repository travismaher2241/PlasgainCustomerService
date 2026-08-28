import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { CRMTodayWorkspace } from '../../components/crm/CRMTodayWorkspace';
import { CRMCommandCenter } from '../../components/crm/CRMCommandCenter';
import { AppProvider } from '../../context/AppContext';

describe("CRM Today's Focus & Action Workspace Suite", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders compact header, Needs Attention strip, and Hero Next Best Action at the top", () => {
    render(
      <AppProvider>
        <CRMTodayWorkspace />
      </AppProvider>
    );

    // 1. Compact Header
    expect(screen.getByRole('heading', { level: 1, name: /Today's Focus/i })).toBeInTheDocument();
    expect(screen.getByText(/Here's what needs your attention/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /\+ Task/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /View Pipeline/i })).toBeInTheDocument();

    // 2. Needs Attention Filter Strip
    expect(screen.getByText(/Follow-ups Due/i)).toBeInTheDocument();
    expect(screen.getByText(/Quotes Awaiting Response/i)).toBeInTheDocument();

    // 3. Hero Next Best Action
    expect(screen.getByText(/NEXT BEST ACTION/i)).toBeInTheDocument();
    expect(screen.getByText(/Why this matters:/i)).toBeInTheDocument();

    // 4. Unified Work Queue Header
    expect(screen.getByText(/Your Work Today/i)).toBeInTheDocument();

    // 5. Today's Snapshot at the bottom
    expect(screen.getByText(/TODAY'S SNAPSHOT/i)).toBeInTheDocument();
    expect(screen.getByText(/Open Pipeline:/i)).toBeInTheDocument();
  });

  it("allows filtering work queue using the Needs Attention pills", () => {
    render(
      <AppProvider>
        <CRMTodayWorkspace />
      </AppProvider>
    );

    // Find and click the Quotes filter button
    const quotesBtn = screen.getByRole('button', { name: /Quotes Awaiting Response/i });
    expect(quotesBtn).toBeInTheDocument();
    fireEvent.click(quotesBtn);

    // Clear filter button should now be visible
    expect(screen.getByRole('button', { name: /Clear filter/i })).toBeInTheDocument();

    // Click Clear filter
    fireEvent.click(screen.getByRole('button', { name: /Clear filter/i }));
    expect(screen.queryByRole('button', { name: /Clear filter/i })).not.toBeInTheDocument();
  });

  it("renders fast-scanning work items with primary action buttons", () => {
    render(
      <AppProvider>
        <CRMTodayWorkspace />
      </AppProvider>
    );

    // Verify presence of primary actionable buttons
    const actionButtons = screen.getAllByRole('button', { name: /Follow Up|Open Deal|Log Call|Write Email|Complete|Action/i });
    expect(actionButtons.length).toBeGreaterThan(0);
  });

  it("renders CRMCommandCenter with streamlined compact tabs", () => {
    render(
      <AppProvider>
        <CRMCommandCenter />
      </AppProvider>
    );

    expect(screen.getByRole('button', { name: /Today's Focus/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Accounts/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Deals Pipeline/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Leads Hub/i })).toBeInTheDocument();
  });
});
