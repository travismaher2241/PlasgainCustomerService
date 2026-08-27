import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AppProvider } from '../../context/AppContext';
import { CustomerFollowUpModal } from '../../components/CustomerFollowUpModal';
import { DatasheetPackageModal } from '../../components/DatasheetPackageModal';
import {
  generateCustomerFollowUpEmail,
  formatOstendoCSV,
  formatOstendoTabDelimited,
  resolveProductsForDeal,
  generateTenderPackageHTML
} from '../../utils/datasheetExporter';
import { SAMPLE_PRODUCTS } from '../../data/mockData';

describe('Follow-up Generator & Ostendo Exporter Utils', () => {
  it('formats line items correctly for Ostendo ERP CSV import', () => {
    const items = [
      { code: '50W-INTENSE', name: 'Intense Light - 50W Solar', quantity: 12, unitPrice: 1650 },
      { code: 'PLASPOLE-6M', name: 'Plaspole 6.0m Recycled Composite Light Pole', quantity: 12, unitPrice: 620 }
    ];

    const csv = formatOstendoCSV(items, 'OST-2025-001');
    expect(csv).toContain('Item Code,Description,Quantity,Unit Price (AUD),Tax Code,Job / Quote Ref');
    expect(csv).toContain('"50W-INTENSE","Intense Light - 50W Solar",12,1650.00,"GST","OST-2025-001"');
    expect(csv).toContain('"PLASPOLE-6M","Plaspole 6.0m Recycled Composite Light Pole",12,620.00,"GST","OST-2025-001"');
  });

  it('formats tab-delimited grid data for direct clipboard pasting into Ostendo', () => {
    const items = [
      { code: '50W-INTENSE', name: 'Intense Light - 50W Solar', quantity: 10, unitPrice: 1500 }
    ];

    const tabDelimited = formatOstendoTabDelimited(items);
    expect(tabDelimited).toBe('50W-INTENSE\tIntense Light - 50W Solar\t10\t1500.00\tGST');
  });

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

  it('generates Day 14 technical follow-up offering Dialux engineering calculations', () => {
    const email = generateCustomerFollowUpEmail({
      cadence: 'day14',
      contactName: 'David Evans',
      companyName: 'Geelong City',
      projectName: 'Foreshore Upgrade',
      quoteRef: 'OST-9100',
      productsList: ['Intense 50W Solar'],
      senderName: 'Sarah Jenkins'
    });

    expect(email.subject).toContain('Technical Review & Engineering Support');
    expect(email.body).toContain('Dialux photometric engineering support');
    expect(email.body).toContain('lead times');
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
    expect(email.body).toContain('AS/NZS 1158 Category P/V compliance declaration');
  });

  it('resolves product names against SAMPLE_PRODUCTS correctly', () => {
    const resolved = resolveProductsForDeal(['Intense 50W', 'Plaspole']);
    expect(resolved.length).toBeGreaterThanOrEqual(1);
    expect(resolved.some((p) => p.name.includes('Intense') || p.name.includes('Plaspole'))).toBe(true);
  });

  it('generates branded HTML Tender Spec Package with cover sheet and datasheets', () => {
    const html = generateTenderPackageHTML({
      projectName: 'Ballarat Shared Path Upgrade',
      customerName: 'Ballarat City Council',
      quoteRef: 'OST-8924',
      products: [SAMPLE_PRODUCTS[0], SAMPLE_PRODUCTS[1]]
    });

    expect(html).toContain('TECHNICAL TENDER SPECIFICATION BUNDLE');
    expect(html).toContain('Ballarat Shared Path Upgrade');
    expect(html).toContain('Ballarat City Council');
    expect(html).toContain('OST-8924');
    expect(html).toContain('AS/NZS 1158');
    expect(html).toContain('AS 4702');
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

    expect(screen.getByText(/Customer Follow-Up Generator/i)).toBeInTheDocument();
    expect(screen.getByText(/Day 7 Check-in/i)).toBeInTheDocument();
    expect(screen.getByText(/Day 14 Technical/i)).toBeInTheDocument();
    expect(screen.getByText(/Tender Closing/i)).toBeInTheDocument();

    // Switch to Day 14
    const day14Button = screen.getByText(/Day 14 Technical/i);
    fireEvent.click(day14Button);
    expect(screen.getByDisplayValue(/Technical Review & Engineering Support/i)).toBeInTheDocument();

    // Actions
    expect(screen.getByText(/Copy Email Text/i)).toBeInTheDocument();
    expect(screen.getByText(/Open in Outlook/i)).toBeInTheDocument();
    expect(screen.getByText(/Log Activity to CRM/i)).toBeInTheDocument();
  });
});

describe('DatasheetPackageModal Component', () => {
  it('renders tender package modal with product checklist and preview', () => {
    render(
      <AppProvider>
        <DatasheetPackageModal
          isOpen={true}
          onClose={() => {}}
          projectName="Ballarat Shared Trail"
          customerName="Ballarat City Council"
          quoteRef="OST-8924"
          initialProductNames={['Intense Light - 50W Solar', 'Plaspole 6.0m Recycled Composite Light Pole']}
        />
      </AppProvider>
    );

    expect(screen.getByText(/Export Datasheet & Tender Spec Package/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Ballarat Shared Trail/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/OST-8924/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Download Tender Package/i)).toBeInTheDocument();
    expect(screen.getByText(/Copy Spec Text/i)).toBeInTheDocument();
  });
});
