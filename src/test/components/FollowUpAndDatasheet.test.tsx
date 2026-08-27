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
  validateOstendoItems,
  resolveProductsForDeal,
  generateTenderPackageHTML
} from '../../utils/datasheetExporter';
import { SAMPLE_PRODUCTS } from '../../data/mockData';

describe('Follow-up Generator & Ostendo Product-Only Exporter Utils', () => {
  it('formats line items strictly as product-only for Ostendo ERP CSV import (no pricing, GST or tax)', () => {
    const items = [
      { code: '50W-INTENSE', name: 'Intense Light - 50W Solar', quantity: 12, unit: 'ea', notes: 'Pole P1-P12' },
      { code: 'PLASPOLE-6M', name: 'Plaspole 6.0m Recycled Composite Light Pole', quantity: 12, unit: 'ea', notes: 'Direct burial' }
    ];

    const csv = formatOstendoCSV(items, 'OST-2025-001');
    expect(csv).toContain('"Item Code","Description","Quantity","Unit","Line Notes","Job / Quote Ref"');
    expect(csv).toContain('"50W-INTENSE","Intense Light - 50W Solar",12,"ea","Pole P1-P12","OST-2025-001"');
    expect(csv).toContain('"PLASPOLE-6M","Plaspole 6.0m Recycled Composite Light Pole",12,"ea","Direct burial","OST-2025-001"');
    // Ensure no pricing or tax codes are present
    expect(csv).not.toContain('Unit Price');
    expect(csv).not.toContain('Tax Code');
    expect(csv).not.toContain('GST');
  });

  it('formats tab-delimited grid data without prices for fast pasting into Ostendo', () => {
    const items = [
      { code: '50W-INTENSE', name: 'Intense Light - 50W Solar', quantity: 10, unit: 'ea', notes: 'Stage 1' }
    ];

    const tabDelimited = formatOstendoTabDelimited(items, 'OST-2025-001');
    expect(tabDelimited).toBe('50W-INTENSE\tIntense Light - 50W Solar\t10\tea\tStage 1\tOST-2025-001');
    expect(tabDelimited).not.toContain('GST');
  });

  it('validates Ostendo export items and rejects missing codes or zero/negative quantities', () => {
    const validItems = [
      { code: 'PB-75W', name: 'Pro Blade 75W', quantity: 5 }
    ];
    const validRes = validateOstendoItems(validItems);
    expect(validRes.valid).toBe(true);
    expect(validRes.errors).toHaveLength(0);

    const invalidItems = [
      { code: '', name: 'Missing code item', quantity: 5 },
      { code: 'PB-75W', name: 'Zero qty item', quantity: 0 },
      { code: 'PB-75W', name: 'Negative qty item', quantity: -2 }
    ];
    const invalidRes = validateOstendoItems(invalidItems);
    expect(invalidRes.valid).toBe(false);
    expect(invalidRes.errors.length).toBeGreaterThanOrEqual(3);
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
