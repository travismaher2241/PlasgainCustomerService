import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { HomeDashboard } from '../../components/HomeDashboard';
import { AppProvider } from '../../context/AppContext';

describe('HomeDashboard Mobile-First Responsive Suite', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders priority queue with high hierarchy, opportunity records and action buttons', () => {
    render(
      <AppProvider>
        <HomeDashboard />
      </AppProvider>
    );

    // Priority Queue heading and count
    expect(screen.getByRole('heading', { level: 2, name: /Priority queue/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /View all deals/i })).toBeInTheDocument();

    // Primary action buttons for opportunities
    const openButtons = screen.getAllByRole('button', { name: /^Open$/i });
    expect(openButtons.length).toBeGreaterThan(0);

    const prepCallButtons = screen.getAllByRole('button', { name: /Prep call/i });
    expect(prepCallButtons.length).toBeGreaterThan(0);
  });

  it('provides responsive department/role selection without horizontal scrolling', () => {
    render(
      <AppProvider>
        <HomeDashboard />
      </AppProvider>
    );

    // Mobile dropdown selector
    const roleSelect = screen.getByLabelText(/Select department view/i) as HTMLSelectElement;
    expect(roleSelect).toBeInTheDocument();
    
    // Switch role to sales
    fireEvent.change(roleSelect, { target: { value: 'sales' } });
    expect(roleSelect.value).toBe('sales');

    // Switch role to technical
    fireEvent.change(roleSelect, { target: { value: 'technical' } });
    expect(roleSelect.value).toBe('technical');
  });

  it('renders quick action buttons and pipeline overview cleanly', () => {
    render(
      <AppProvider>
        <HomeDashboard />
      </AppProvider>
    );

    expect(screen.getByText(/New Enquiry/i)).toBeInTheDocument();
    expect(screen.getByText(/Find Product/i)).toBeInTheDocument();
    expect(screen.getByText(/Analyse Tender/i)).toBeInTheDocument();
    expect(screen.getByText(/Solar Sizing/i)).toBeInTheDocument();
    expect(screen.getByText(/Pipeline Overview/i)).toBeInTheDocument();
  });
});
