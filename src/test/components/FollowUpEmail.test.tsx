import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AppProvider } from '../../context/AppContext';
import { CustomerFollowUpModal } from '../../components/CustomerFollowUpModal';
import { generateCustomerFollowUpEmail } from '../../utils/ostendoExporter';

describe('Follow-up Email Generator', () => {
  it('generates Day 7 follow-up email sequence with Ostendo reference and product details', () => {
    const email = generateCustomerFollowUpEmail({
      cadence: 'day7',
      contactName: 'Rob Mitchell',
      companyName: 'Ballarat Council',
      projectName: 'Ballarat Shared Trail',
      quoteRef: 'OST-8924',
      productsList: ['Pro Blade 75W', 'Plaspole 6m'],
      senderName: 'Sarah Jenkins'
    });

    expect(email.subject).toContain('Following up: Plasgain Quotation [OST-8924] - Ballarat Shared Trail');
    expect(email.body).toContain('Hi Rob Mitchell');
    expect(email.body).toContain('featuring Pro Blade 75W, Plaspole 6m');
    expect(email.body).toContain('Ref: OST-8924');
    expect(email.body).toContain('Sarah Jenkins');
    expect(email.mailtoUrl).toContain('mailto:?subject=');
  });

  it('generates Day 14 follow-up offering commercial help, not engineering work', () => {
    const email = generateCustomerFollowUpEmail({
      cadence: 'day14',
      contactName: 'David Evans',
      companyName: 'Geelong City',
      projectName: 'Foreshore Upgrade',
      quoteRef: 'OST-9100',
      productsList: ['Intense 50W Solar'],
      senderName: 'Sarah Jenkins'
    });

    expect(email.subject).toContain('Checking in on your quote');
    expect(email.body).toContain('revising quantities, confirming delivery staging');
    expect(email.body).toContain('lead times');
    // The app must never offer design, photometric or compliance work.
    expect(email.body).not.toMatch(/photometric|Dialux|AS\/NZS|engineering/i);
  });

  it('generates Urgent Tender Closing check-in email', () => {
    const email = generateCustomerFollowUpEmail({
      cadence: 'urgent',
      contactName: 'Megan Taylor',
      projectName: 'Highway Rest Area Solar',
      quoteRef: 'OST-7744',
      productsList: ['Roadway V-LED 70W']
    });

    expect(email.subject).toContain('Tender Closing Check-in');
    expect(email.body).toContain('pricing, quantities, lead times and local support');
    expect(email.body).not.toMatch(/photometric|Dialux|AS\/NZS|datasheet|spec sheet/i);
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
    expect(screen.getByDisplayValue(/Checking in on your quote/i)).toBeInTheDocument();

    // Actions
    expect(screen.getByText(/Copy Email Text/i)).toBeInTheDocument();
    expect(screen.getByText(/Open in Outlook/i)).toBeInTheDocument();
  });
});
