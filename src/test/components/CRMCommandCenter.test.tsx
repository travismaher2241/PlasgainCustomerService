import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { CRMCommandCenter } from '../../components/crm/CRMCommandCenter';
import { AppProvider } from '../../context/AppContext';

describe('CRM Command Center Navigation Suite (Step 6)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const mobileWidths = [320, 360, 375, 390, 430];

  mobileWidths.forEach((width) => {
    it(`renders standard CRM navigation on mobile viewport (${width}px)`, async () => {
      window.innerWidth = width;
      window.dispatchEvent(new Event('resize'));

      const { container } = render(
        <AppProvider>
          <CRMCommandCenter />
        </AppProvider>
      );

      // Root shell
      const rootShell = container.querySelector('.min-h-screen');
      expect(rootShell).toBeInTheDocument();

      // Navigation tabs for Today, Accounts, Deals
      expect(screen.getByRole('tab', { name: /today/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /accounts/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /outstanding quotes|deals/i })).toBeInTheDocument();

      // Quick Log action is present
      expect(screen.getByRole('button', { name: /quick log/i })).toBeInTheDocument();

      // More menu on mobile
      const moreBtn = screen.getByRole('button', { name: /more crm destinations/i });
      expect(moreBtn).toBeInTheDocument();

      fireEvent.click(moreBtn);

      const moreMenu = container.querySelector('.absolute.right-0') as HTMLElement;
      expect(moreMenu).toBeInTheDocument();

      const moreMenuScope = within(moreMenu);
      expect(moreMenuScope.getByRole('button', { name: /^leads/i })).toBeInTheDocument();
      expect(moreMenuScope.getByRole('button', { name: /^tasks/i })).toBeInTheDocument();
      expect(moreMenuScope.getByRole('button', { name: /^competitors/i })).toBeInTheDocument();
    });
  });

  it('renders direct desktop tabs for Leads, Tasks, and Competitors at large screen widths', () => {
    window.innerWidth = 1200;
    render(
      <AppProvider>
        <CRMCommandCenter />
      </AppProvider>
    );

    expect(screen.getByRole('tab', { name: /today/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /accounts/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /outstanding quotes|deals/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /leads/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /tasks/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /competitors/i })).toBeInTheDocument();
  });
});
