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

  it('renders clean plan takeoff header, upload dropzone and honest empty state without premature results', () => {
    renderWorkspace();

    // 1. One clear page title
    expect(screen.getByRole('heading', { level: 1, name: /Plan Take-off/i })).toBeInTheDocument();
    
    // 2. Upload Plan near top
    expect(screen.getByText(/Upload Plan & Project Details/i)).toBeInTheDocument();
    expect(screen.getByText(/Drop Engineering PDF, CAD Drawing/i)).toBeInTheDocument();

    // 3. Honest empty state in preview
    expect(screen.getByText(/No plan uploaded/i)).toBeInTheDocument();

    // 4. Initial action should be "Analyse plan", not "Re-analyse"
    expect(screen.getByRole('button', { name: /Analyse plan/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Re-analyse/i })).not.toBeInTheDocument();

    // 5. Result export actions should remain hidden before results exist
    expect(screen.queryByRole('button', { name: /Save to deal/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Export/i })).not.toBeInTheDocument();
  });

  it('loads example demo plan when selected with explicit demo badge and line items', () => {
    renderWorkspace();

    // Open demo dropdown
    const demoDropdownBtn = screen.getByRole('button', { name: /Load Example Plan/i });
    fireEvent.click(demoDropdownBtn);

    const ballaratOption = screen.getByText(/Ballarat 1.2km Shared Path Upgrade/i);
    fireEvent.click(ballaratOption);

    // Explicit demo badge appears
    expect(screen.getByText(/Example Demo Plan/i)).toBeInTheDocument();

    // Line items rendered with traceability
    expect(screen.getAllByText(/BCC-2025-E02-REV-B/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Plasgain Pro Blade 75 Solar Luminaire/i)).toBeInTheDocument();
    expect(screen.getByText(/Plaspole 6.0m Recycled Composite Light Pole/i)).toBeInTheDocument();
    expect(screen.getByText(/Plasgain Polymeric Cable Cover Slabs/i)).toBeInTheDocument();
    expect(screen.getByText(/Tree Canopy Shading Alert/i)).toBeInTheDocument();

    // Verification summary counters instead of blanket "verified"
    expect(screen.getByText(/4 items/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Reviewed/i).length).toBeGreaterThanOrEqual(1);

    // Action buttons now visible
    expect(screen.getByRole('button', { name: /Save to deal/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Export/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Re-analyse plan/i })).toBeInTheDocument();
  });

  it('switches between sample plans dynamically', () => {
    renderWorkspace();

    const demoDropdownBtn = screen.getByRole('button', { name: /Load Example Plan/i });
    fireEvent.click(demoDropdownBtn);

    const geelongOption = screen.getByText(/Geelong Commercial Business Park/i);
    fireEvent.click(geelongOption);

    expect(screen.getAllByText(/GBP-2025-E101/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Plasgain Intense 50W Solar Luminaire/i)).toBeInTheDocument();
    expect(screen.getByText(/8.0m Galvanised Mild Steel Baseplate Pole/i)).toBeInTheDocument();
  });

  it('allows adding, editing and removing line items after loading a plan', () => {
    renderWorkspace();

    const demoDropdownBtn = screen.getByRole('button', { name: /Load Example Plan/i });
    fireEvent.click(demoDropdownBtn);
    fireEvent.click(screen.getByText(/Ballarat 1.2km Shared Path Upgrade/i));

    const addButton = screen.getByRole('button', { name: /Add Item/i });
    fireEvent.click(addButton);

    expect(screen.getByText(/Plasgain Additional Luminaire/i)).toBeInTheDocument();

    const deleteButtons = screen.getAllByTitle(/Remove line item/i);
    fireEvent.click(deleteButtons[deleteButtons.length - 1]);
    expect(screen.queryByText(/Plasgain Additional Luminaire/i)).not.toBeInTheDocument();
  });

  it('opens export menu with Ostendo CSV, Copy Product List, and Schedule CSV', () => {
    renderWorkspace();

    const demoDropdownBtn = screen.getByRole('button', { name: /Load Example Plan/i });
    fireEvent.click(demoDropdownBtn);
    fireEvent.click(screen.getByText(/Ballarat 1.2km Shared Path Upgrade/i));

    const exportBtn = screen.getByRole('button', { name: /Export/i });
    fireEvent.click(exportBtn);

    expect(screen.getByText(/Download Ostendo CSV/i)).toBeInTheDocument();
    expect(screen.getByText(/Copy Product List/i)).toBeInTheDocument();
    expect(screen.getByText(/Export Schedule CSV/i)).toBeInTheDocument();
  });

  it('triggers Save to CRM Deals modal with product lines preserved', () => {
    renderWorkspace();

    const demoDropdownBtn = screen.getByRole('button', { name: /Load Example Plan/i });
    fireEvent.click(demoDropdownBtn);
    fireEvent.click(screen.getByText(/Ballarat 1.2km Shared Path Upgrade/i));

    const saveDealBtn = screen.getByRole('button', { name: /Save to deal/i });
    fireEvent.click(saveDealBtn);

    expect(screen.getByText(/Save Take-off to CRM Pipeline/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Confirm & Save Deal/i })).toBeInTheDocument();
  });
});
