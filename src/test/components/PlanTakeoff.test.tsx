import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PlanTakeoffWorkspace } from '../../components/PlanTakeoffWorkspace';
import { AppProvider } from '../../context/AppContext';

describe('PlanTakeoffWorkspace Component', () => {
  const renderWorkspace = () =>
    render(
      <AppProvider>
        <PlanTakeoffWorkspace />
      </AppProvider>
    );

  it('renders plan takeoff header, dropzone and sample plan selectors', () => {
    renderWorkspace();

    expect(screen.getByText(/AI Drawing & Plan Deciphering/i)).toBeInTheDocument();
    expect(screen.getByText(/Gemini Multimodal Vision/i)).toBeInTheDocument();
    expect(screen.getByText(/Drop Engineering PDF, CAD Drawing/i)).toBeInTheDocument();
    expect(screen.getByText(/Ballarat Plan/i)).toBeInTheDocument();
    expect(screen.getByText(/Geelong Plan/i)).toBeInTheDocument();
  });

  it('loads sample plan data with deciphered BOM line items and metadata', () => {
    renderWorkspace();

    // Default Ballarat sample plan
    expect(screen.getAllByText(/BCC-2025-E02-REV-B/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Plasgain Pro Blade 75 Solar Luminaire/i)).toBeInTheDocument();
    expect(screen.getByText(/Plaspole 6.0m Recycled Composite Light Pole/i)).toBeInTheDocument();
    expect(screen.getByText(/Plasgain Polymeric Cable Cover Slabs/i)).toBeInTheDocument();
    expect(screen.getByText(/Tree Canopy Shading Alert/i)).toBeInTheDocument();
  });

  it('switches between sample plans dynamically', () => {
    renderWorkspace();

    const geelongButton = screen.getByText(/Geelong Plan/i);
    fireEvent.click(geelongButton);

    expect(screen.getAllByText(/GBP-2025-E101/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Plasgain Intense 50W Solar Luminaire/i)).toBeInTheDocument();
    expect(screen.getByText(/8.0m Galvanised Mild Steel Baseplate Pole/i)).toBeInTheDocument();
  });

  it('allows adding and removing BOM line items', () => {
    renderWorkspace();

    const addButton = screen.getByRole('button', { name: /Add Item/i });
    fireEvent.click(addButton);

    expect(screen.getByText(/Plasgain Additional Luminaire/i)).toBeInTheDocument();

    const deleteButtons = screen.getAllByTitle(/Remove line item/i);
    fireEvent.click(deleteButtons[deleteButtons.length - 1]);
    expect(screen.queryByText(/Plasgain Additional Luminaire/i)).not.toBeInTheDocument();
  });

  it('opens and closes the Draft Customer Quotation modal', () => {
    renderWorkspace();

    const draftQuoteButton = screen.getByRole('button', { name: /Draft Quote/i });
    fireEvent.click(draftQuoteButton);

    expect(screen.getByText(/Draft Customer Quotation Document/i)).toBeInTheDocument();
    expect(screen.getByText(/Formal Quotation Schedule/i)).toBeInTheDocument();
    expect(screen.getByText(/Copy Quote Text/i)).toBeInTheDocument();

    const closeButton = screen.getByRole('button', { name: /Close/i });
    fireEvent.click(closeButton);

    expect(screen.queryByText(/Draft Customer Quotation Document/i)).not.toBeInTheDocument();
  });

  it('triggers Save to CRM Deals Pipeline', () => {
    renderWorkspace();

    const saveCrmButton = screen.getByRole('button', { name: /Save to CRM Deal/i });
    fireEvent.click(saveCrmButton);

    // Should complete successfully without throwing
    expect(saveCrmButton).toBeInTheDocument();
  });
});
