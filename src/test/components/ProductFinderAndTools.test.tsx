import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProductFinder } from '../../components/ProductFinder';
import { AppProvider } from '../../context/AppContext';

describe('Product Finder Suite (Step 7)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders a single search view with no mode toggle or project-matcher wizard', () => {
    render(
      <AppProvider>
        <ProductFinder />
      </AppProvider>
    );

    // Title is Product Finder
    expect(screen.getByRole('heading', { level: 1, name: "Product Finder" })).toBeInTheDocument();

    // Quick Search is present and is the only mode — no tab toggle
    expect(screen.getByPlaceholderText(/Search any product name, code/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Project Matcher/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Quick Product Search/i })).not.toBeInTheDocument();

    // The project-matcher wizard (application type, lighting standard class, autonomy
    // sizing) asked the rep to make design decisions that are already decided on the
    // plan they're given — it's gone, not just hidden behind a tab.
    expect(screen.queryByText("Shared path / pedestrian")).not.toBeInTheDocument();
    expect(screen.queryByText(/Lighting Standard Class/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Autonomy Reserve/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Find Matching Products/i })).not.toBeInTheDocument();
  });

  it('shows the honest empty-catalogue state when no products are loaded, and category filters work', () => {
    render(
      <AppProvider>
        <ProductFinder />
      </AppProvider>
    );

    // No fabricated sample products — an empty catalogue says so plainly.
    expect(screen.getByText(/Product Catalogue is Empty/i)).toBeInTheDocument();

    // Category filter chips are present and clickable even with an empty catalogue.
    const solarChip = screen.getByRole('button', { name: /Solar Luminaires & Systems/i });
    fireEvent.click(solarChip);
    expect(screen.getByText(/Product Catalogue is Empty/i)).toBeInTheDocument();
  });
});
