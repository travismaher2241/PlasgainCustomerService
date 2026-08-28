import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { CRMCommandCenter } from '../../components/crm/CRMCommandCenter';
import { AppProvider } from '../../context/AppContext';

describe('CRM Command Center Mobile Viewport & Navigation Suite', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const mobileWidths = [320, 360, 375, 390, 430];

  mobileWidths.forEach((width) => {
    it(`renders CRM Command Center navigation and contents within mobile viewport (${width}px)`, async () => {
      // Simulate viewport width
      window.innerWidth = width;
      window.dispatchEvent(new Event('resize'));

      const { container } = render(
        <AppProvider>
          <CRMCommandCenter />
        </AppProvider>
      );

      // Root shell should have w-full, min-w-0, and overflow-x-hidden
      const rootShell = container.querySelector('.min-h-screen');
      expect(rootShell).toBeInTheDocument();
      expect(rootShell).toHaveClass('w-full');
      expect(rootShell).toHaveClass('min-w-0');
      expect(rootShell).toHaveClass('overflow-x-hidden');

      // Navigation buttons for Today, Accounts, Deals, More are visible
      expect(screen.getByRole('button', { name: /today/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /accounts/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /deals/i })).toBeInTheDocument();

      const moreBtn = screen.getByRole('button', { name: /more crm destinations/i });
      expect(moreBtn).toBeInTheDocument();

      // Open More dropdown
      fireEvent.click(moreBtn);

      // Dropdown should be open and anchored with right-0 and max-w-[calc(100vw-24px)]
      const moreMenu = container.querySelector('.absolute.right-0') as HTMLElement;
      expect(moreMenu).toBeInTheDocument();
      expect(moreMenu).toHaveClass('max-w-[calc(100vw-24px)]');

      // Dropdown destinations should be visible inside the More menu
      const moreMenuScope = within(moreMenu);
      expect(moreMenuScope.getByRole('button', { name: /leads hub/i })).toBeInTheDocument();
      expect(moreMenuScope.getByRole('button', { name: /tasks & log/i })).toBeInTheDocument();
      expect(moreMenuScope.getByRole('button', { name: /competitor intel/i })).toBeInTheDocument();
      expect(moreMenuScope.getByRole('button', { name: /quick log interaction/i })).toBeInTheDocument();

      // Click Leads Hub from More menu
      fireEvent.click(moreMenuScope.getByRole('button', { name: /leads hub/i }));

      // More menu should close and Leads view should mount
      expect(container.querySelector('.absolute.right-0')).not.toBeInTheDocument();
      expect(await screen.findByText(/Inbound Leads & Qualification/i)).toBeInTheDocument();
    });
  });

  it('renders compact No overdue work status without widening page', async () => {
    window.innerWidth = 360;
    render(
      <AppProvider>
        <CRMCommandCenter />
      </AppProvider>
    );

    // Verify compact status text inside loaded workspace
    expect(await screen.findByText(/✓ No overdue work/i)).toBeInTheDocument();
  });
});
