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

      // The single capture entry point on a phone
      expect(screen.getByRole('button', { name: /log or capture something/i })).toBeInTheDocument();

      // There is no "More" dropdown any more. Every destination lives in the
      // workspace sidebar, which has room for all of them, instead of being
      // hidden behind a control in a bar too narrow to hold them.
      expect(screen.queryByRole('button', { name: /more crm destinations/i })).not.toBeInTheDocument();

      // The capture actions collapse into a single Log menu on a phone.
      const logBtn = screen.getByRole('button', { name: /log or capture something/i });
      fireEvent.click(logBtn);
      expect(screen.getByRole('button', { name: /record a voice debrief/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /turn an enquiry into a lead/i })).toBeInTheDocument();

      // The menu mirrors the desktop capture bar. Quote import is not a capture
      // action and belongs to the screens that own quotes, so a second door to
      // it here would sit right beside the Quotes page's own import button.
      expect(screen.queryByRole('button', { name: /import a quote pdf/i })).not.toBeInTheDocument();
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
