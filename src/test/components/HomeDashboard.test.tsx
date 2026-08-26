import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { HomeDashboard } from '../../components/HomeDashboard';
import { AppProvider } from '../../context/AppContext';

describe('HomeDashboard Component', () => {
  it('renders compact greeting, role switcher, and attention section', () => {
    render(
      <AppProvider>
        <HomeDashboard />
      </AppProvider>
    );

    expect(screen.getByText(/Customer Service Command Centre/i)).toBeInTheDocument();
    expect(screen.getByText(/Needs Attention/i)).toBeInTheDocument();
    expect(screen.getByText(/Your Priority Actions/i)).toBeInTheDocument();
    expect(screen.getByText(/Quick Actions/i)).toBeInTheDocument();
    expect(screen.getByText(/Pipeline & Workload Overview/i)).toBeInTheDocument();
  });

  it('allows switching role views between Customer Service, Sales, Technical, and Manager', () => {
    render(
      <AppProvider>
        <HomeDashboard />
      </AppProvider>
    );

    const salesRoleBtn = screen.getByRole('button', { name: /^Sales$/i });
    fireEvent.click(salesRoleBtn);
    expect(salesRoleBtn).toHaveClass('font-semibold');

    const techRoleBtn = screen.getByRole('button', { name: /^Technical$/i });
    fireEvent.click(techRoleBtn);
    expect(techRoleBtn).toHaveClass('font-semibold');
  });

  it('filters priority items when an attention category is clicked', () => {
    render(
      <AppProvider>
        <HomeDashboard />
      </AppProvider>
    );

    // Look for category button in the Needs Attention section
    const techReviewBtn = screen.getByRole('button', { name: /Technical review/i });
    fireEvent.click(techReviewBtn);

    // The filter button should be active and a clear filter option should appear
    expect(screen.getByText(/\(Clear filter\)/i)).toBeInTheDocument();

    // Clicking clear filter resets the list
    fireEvent.click(screen.getByText(/\(Clear filter\)/i));
    expect(screen.queryByText(/\(Clear filter\)/i)).not.toBeInTheDocument();
  });

  it('opens More Tools menu when clicked', () => {
    render(
      <AppProvider>
        <HomeDashboard />
      </AppProvider>
    );

    const moreToolsBtn = screen.getByText(/More Tools/i);
    fireEvent.click(moreToolsBtn);

    expect(screen.getByText(/Product Catalogues & PDFs/i)).toBeInTheDocument();
    expect(screen.getByText(/Review Quote Accuracy/i)).toBeInTheDocument();
    expect(screen.getByText(/Customer Intelligence/i)).toBeInTheDocument();
    expect(screen.getByText(/Product Comparison/i)).toBeInTheDocument();
  });

  it('renders priority action cards with primary Open and Prep Call buttons', () => {
    render(
      <AppProvider>
        <HomeDashboard />
      </AppProvider>
    );

    // Verify Ballarat or Geelong project cards are rendered with details
    expect(screen.getByText(/Ballarat 1.2km Shared Path Upgrade/i)).toBeInTheDocument();
    expect(screen.getByText(/ABC Civil Pty Ltd/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Prep Call/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Open/i).length).toBeGreaterThan(0);
  });
});
