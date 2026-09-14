import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AppProvider } from '../../context/AppContext';
import { CustomerFollowUpModal } from '../../components/CustomerFollowUpModal';
import { generateCustomerFollowUpEmail } from '../../utils/ostendoExporter';

describe('Follow-up Email Generator', () => {
  /**
   * These emails go to customers under a rep's name, so they have to read like
   * the rep wrote them. The previous versions opened with "I hope your week is
   * going well" and then recited the quote's product lines — "featuring
   * Boulevard Gooseneck 5.5m MH, 0.9m Outreach, 7.6m OL, IGM, Painted..." —
   * which no rep would type and which marked the mail as machine-written.
   */
  it('names the quote and asks where it stands, without reciting the products', () => {
    const email = generateCustomerFollowUpEmail({
      cadence: 'day7',
      contactName: 'Rob Mitchell',
      companyName: 'Ballarat Council',
      projectName: 'Ballarat Shared Trail',
      quoteRef: 'OST-8924',
      senderName: 'Sarah Jenkins'
    });

    expect(email.subject).toBe('Checking in on quote OST-8924');
    expect(email.body).toContain('Hi Rob Mitchell');
    expect(email.body).toContain('quickly check in on quote OST-8924 for Ballarat Shared Trail');
    expect(email.body).toContain('Sarah Jenkins');
    expect(email.mailtoUrl).toContain('mailto:?subject=');
  });

  it('keeps every cadence short and free of filler', () => {
    for (const cadence of ['day7', 'day14', 'urgent'] as const) {
      const email = generateCustomerFollowUpEmail({
        cadence,
        contactName: 'Rob Mitchell',
        projectName: 'Ballarat Shared Trail',
        quoteRef: 'OST-8924',
        senderName: 'Sarah Jenkins'
      });

      // Everything above the sign-off, which is where the padding used to sit.
      const message = email.body.split('Kind regards')[0];
      const sentences = message.split(/[.?]\s/).filter((s) => s.trim().length > 0);
      expect(sentences.length).toBeLessThanOrEqual(5);

      expect(email.body).not.toMatch(/hope your week|hope this finds you|featuring/i);
      expect(email.body).toContain('OST-8924');
    }
  });

  it('offers commercial help, never engineering work', () => {
    const email = generateCustomerFollowUpEmail({
      cadence: 'day14',
      contactName: 'David Evans',
      companyName: 'Geelong City',
      projectName: 'Foreshore Upgrade',
      quoteRef: 'OST-9100',
      senderName: 'Sarah Jenkins'
    });

    expect(email.subject).toBe('Following up on quote OST-9100');
    expect(email.body).toContain('Is this still going ahead at your end?');
    expect(email.body).not.toMatch(/photometric|Dialux|AS\/NZS|engineering/i);
  });

  it('asks what the customer still needs before a tender closes', () => {
    const email = generateCustomerFollowUpEmail({
      cadence: 'urgent',
      contactName: 'Megan Taylor',
      projectName: 'Highway Rest Area Solar',
      quoteRef: 'OST-7744'
    });

    expect(email.subject).toBe('Quote OST-7744 - before you submit');
    expect(email.body).toContain('anything you still need from us');
    expect(email.body).not.toMatch(/photometric|Dialux|AS\/NZS|datasheet|spec sheet/i);
  });

  it('drops the project clause rather than inventing a generic one', () => {
    // "your public lighting project" is filler a rep would never write to
    // someone they deal with, so an unknown project is simply left out.
    const email = generateCustomerFollowUpEmail({
      cadence: 'day7',
      contactName: 'Rob Mitchell',
      quoteRef: 'OST-8924'
    });

    expect(email.body).toContain('check in on quote OST-8924.');
    expect(email.body).not.toMatch(/your public lighting project|for \./i);
  });

  it('still reads properly when the quote number is missing', () => {
    const email = generateCustomerFollowUpEmail({
      cadence: 'day7',
      contactName: 'Rob Mitchell',
      projectName: 'Ballarat Shared Trail'
    });

    expect(email.body).toContain('check in on our recent quote for Ballarat Shared Trail');
    expect(email.body).not.toContain('undefined');
  });
});

describe('CustomerFollowUpModal Component', () => {
  it('renders follow-up modal with cadence presets and editable email text', () => {
    render(
      <AppProvider>
        <CustomerFollowUpModal
          isOpen={true}
          onClose={() => {}}
          initialContactName="Rob Mitchell"
          initialCompanyName="Ballarat City Council"
          initialProjectName="Shared Trail Solar Upgrade"
          initialQuoteRef="OST-8924"
          initialProducts={['Pro Blade 75W', 'Plaspole 6m']}
        />
      </AppProvider>
    );

    expect(screen.getByText(/Follow up on this quote/i)).toBeInTheDocument();
    expect(screen.getByText(/In one week/i)).toBeInTheDocument();
    expect(screen.getByText(/In two weeks/i)).toBeInTheDocument();
    expect(screen.getByText(/Tender Closing/i)).toBeInTheDocument();

    // Switch to Day 14
    const day14Button = screen.getByText(/In two weeks/i);
    fireEvent.click(day14Button);
    expect(screen.getByDisplayValue("Following up on quote OST-8924")).toBeInTheDocument();

    // Actions
    expect(screen.getByText(/Copy Email Text/i)).toBeInTheDocument();
    expect(screen.getByText(/Open in Outlook/i)).toBeInTheDocument();
  });
});
