import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProductFinder } from '../../components/ProductFinder';
import { AppProvider } from '../../context/AppContext';

// Mock API client for Product Finder
vi.mock('../../utils/apiClient', async () => {
  const actual = await vi.importActual<any>('../../utils/apiClient');
  return {
    ...actual,
    apiPost: vi.fn().mockImplementation((url, body) => {
      if (url === '/api/product-finder') {
        return Promise.resolve({
          recommendedProduct: {
            name: "Plasgain Pro Blade Solar 75",
            code: "PBS-75W-SOLAR",
            category: "Solar Pathway Luminaire"
          },
          suitabilityStatus: "Suitable candidate",
          technicalRationale: "Engineered composite housing with integrated LiFePO4 battery pack, Monocrystalline solar panel, and Type 2 pathway distribution lens.",
          engineeringConsiderations: "Complies with AS/NZS 1158.3.1 Category P4 illuminance standards.",
          alternatives: [
            {
              name: "Plasgain Intense Light 50W Solar",
              code: "INTENSE-50W-3K",
              wattage: "50W",
              lumens: "5,000 lm",
              poleHeight: "4.5m",
              reason: "Budget pathway candidate"
            }
          ]
        });
      }
      return Promise.resolve({});
    })
  };
});

describe('Product Finder Suite (Step 7)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------
  // Product Finder Tests (PART A - G)
  // -------------------------------------------------------------
  it('Test 1 — Product Finder uses single name, compact selector, and essential/advanced inputs', () => {
    render(
      <AppProvider>
        <ProductFinder />
      </AppProvider>
    );

    // Title is Product Finder
    expect(screen.getByRole('heading', { level: 1, name: "Product Finder" })).toBeInTheDocument();
    expect(screen.queryByText("Intelligent Product Finder")).not.toBeInTheDocument();
    expect(screen.queryByText("Application Matcher")).not.toBeInTheDocument();

    // Quick Search is present
    expect(screen.getByPlaceholderText(/Search any product name, code/i)).toBeInTheDocument();

    // Switch to Project Matcher tab
    const matcherTab = screen.getByRole('button', { name: /Project Matcher/i });
    fireEvent.click(matcherTab);

    // Compact application options
    expect(screen.getByText("Shared path / pedestrian")).toBeInTheDocument();
    expect(screen.getByText("Road / subdivision street")).toBeInTheDocument();
    expect(screen.getByText("Council park / reserve")).toBeInTheDocument();

    // Default (Unconfirmed) badges on preloaded values
    expect(screen.getAllByText("Default (Unconfirmed)").length).toBeGreaterThanOrEqual(1);

    // Advanced inputs are collapsible
    expect(screen.getByRole('button', { name: /Show advanced conditions/i })).toBeInTheDocument();
    expect(screen.queryByText("Site Conditions")).not.toBeInTheDocument();

    // Expand advanced conditions
    fireEvent.click(screen.getByRole('button', { name: /Show advanced conditions/i }));
    expect(screen.getByText("Site Conditions")).toBeInTheDocument();
  });

  it('Test 2 — Product Finder results lead with Product, Exact SKU, Suitability, and Limitations', async () => {
    render(
      <AppProvider>
        <ProductFinder />
      </AppProvider>
    );

    // Switch to Project Matcher tab
    const matcherTab = screen.getByRole('button', { name: /Project Matcher/i });
    fireEvent.click(matcherTab);

    const findBtn = screen.getByRole('button', { name: /Find Matching Products/i });
    fireEvent.click(findBtn);

    // Primary Recommendation
    expect(await screen.findByText("Plasgain Pro Blade Solar 75")).toBeInTheDocument();
    expect(screen.getByText(/PBS-75W-SOLAR/i)).toBeInTheDocument();
    expect(screen.getByText("Suitable candidate")).toBeInTheDocument();

    // Suitability fits & limitations
    expect(screen.getByText("Matches Project Scope")).toBeInTheDocument();
    expect(screen.getByText("Still to Confirm Before Sign-off")).toBeInTheDocument();

    // Alternatives in comparison table
    expect(screen.getByText("Alternative Candidates")).toBeInTheDocument();
    expect(screen.getByText("Plasgain Intense Light 50W Solar")).toBeInTheDocument();
    expect(screen.getByText("INTENSE-50W-3K")).toBeInTheDocument();

    // Add to deal action
    expect(screen.getAllByRole('button', { name: /Add to deal/i }).length).toBeGreaterThanOrEqual(1);
  });

});
