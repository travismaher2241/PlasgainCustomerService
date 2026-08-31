import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProductFinder } from '../../components/ProductFinder';
import { ToolsHub } from '../../components/ToolsHub';
import { AppProvider, useApp } from '../../context/AppContext';

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

describe('Product Finder & Technical Calculators Suite (Step 7)', () => {
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

    // Compact application options
    expect(screen.getByText("Shared path / pedestrian")).toBeInTheDocument();
    expect(screen.getByText("Road / subdivision street")).toBeInTheDocument();
    expect(screen.getByText("Council park / reserve")).toBeInTheDocument();

    // Default (Unconfirmed) badges on preloaded values
    expect(screen.getAllByText("Default (Unconfirmed)").length).toBeGreaterThanOrEqual(1);

    // Advanced inputs are collapsible
    expect(screen.getByRole('button', { name: /Show advanced conditions/i })).toBeInTheDocument();
    expect(screen.queryByText("Wind Region (AS 1170.2)")).not.toBeInTheDocument();

    // Expand advanced conditions
    fireEvent.click(screen.getByRole('button', { name: /Show advanced conditions/i }));
    expect(screen.getByText("Wind Region (AS 1170.2)")).toBeInTheDocument();
  });

  it('Test 2 — Product Finder results lead with Product, Exact SKU, Suitability, and Limitations', async () => {
    render(
      <AppProvider>
        <ProductFinder />
      </AppProvider>
    );

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

  // -------------------------------------------------------------
  // Cable Cover Tests (PART H & I)
  // -------------------------------------------------------------
  it('Test 3 — Cable Cover leads with Product, Arrangement, Rolls, and Coverage', () => {
    const ToolsWrapper: React.FC = () => {
      const { setActiveToolTab } = useApp();
      React.useEffect(() => {
        setActiveToolTab("cable-cover-calc");
      }, []);
      return <ToolsHub />;
    };

    render(
      <AppProvider>
        <ToolsWrapper />
      </AppProvider>
    );

    // Primary 4 results
    expect(screen.getByText("Required Rolls")).toBeInTheDocument();
    expect(screen.getByText("Strip Arrangement")).toBeInTheDocument();
    expect(screen.getByText("Strip Coverage")).toBeInTheDocument();
    expect(screen.getByText("Total Weight")).toBeInTheDocument();

    // Authority & Overlap notice visible
    expect(screen.getByText(/Authority & Overlap Requirements/i)).toBeInTheDocument();

    // Weight/carbon comparison is secondary & expandable
    const compareBtn = screen.getByRole('button', { name: /View weight reduction & carbon comparison/i });
    expect(compareBtn).toBeInTheDocument();
    fireEvent.click(compareBtn);
    expect(screen.getByText(/Weight Reduction vs Concrete/i)).toBeInTheDocument();

    // Add to deal action
    expect(screen.getByRole('button', { name: /Add to deal/i })).toBeInTheDocument();
  });

  // -------------------------------------------------------------
  // Pole Spacing Tests (PART J)
  // -------------------------------------------------------------
  it('Test 4 — Pole Spacing includes explicit project length, leads with spacing & quantity, and prominent warning', () => {
    const ToolsWrapper: React.FC = () => {
      const { setActiveToolTab } = useApp();
      React.useEffect(() => {
        setActiveToolTab("pole-spacing-calc");
      }, []);
      return <ToolsHub />;
    };

    render(
      <AppProvider>
        <ToolsWrapper />
      </AppProvider>
    );

    // Explicit project length input
    expect(screen.getByText("Project Length (Metres)")).toBeInTheDocument();

    // Primary results
    expect(screen.getByText("Estimated Pole Spacing")).toBeInTheDocument();
    expect(screen.getByText("Estimated Pole Quantity")).toBeInTheDocument();

    // Compact recommended package
    expect(screen.getByText(/Recommended Luminaire & Pole Package/i)).toBeInTheDocument();

    // Prominent preliminary warning
    expect(screen.getByText(/Preliminary estimate only/i)).toBeInTheDocument();
  });

  // -------------------------------------------------------------
  // Foundations Tests (PART K)
  // -------------------------------------------------------------
  it('Test 5 — Foundations tool is clearly separated into Site inputs, Estimate, and Hardware', () => {
    const ToolsWrapper: React.FC = () => {
      const { setActiveToolTab } = useApp();
      React.useEffect(() => {
        setActiveToolTab("wind-foundation-calc");
      }, []);
      return <ToolsHub />;
    };

    render(
      <AppProvider>
        <ToolsWrapper />
      </AppProvider>
    );

    // Section 1: Site Inputs
    expect(screen.getByText("Site & Structural Inputs")).toBeInTheDocument();

    // Section 2: Foundation Estimate with distinct PER FOOTING vs PROJECT TOTAL
    expect(screen.getByText("PER FOOTING")).toBeInTheDocument();
    expect(screen.getByText(/PROJECT TOTAL — 18 FOOTINGS/i)).toBeInTheDocument();

    // Section 3: Hardware & Freight
    expect(screen.getByText("Hardware & Freight Schedule")).toBeInTheDocument();
    expect(screen.getByText(/Anti-Rotation Foam Collar Kit/i)).toBeInTheDocument();
  });

  // -------------------------------------------------------------
  // Solar Sizing Tests (PART L)
  // -------------------------------------------------------------
  it('Test 6 — Solar Sizing displays required vs available capacity together with top-level suitability', () => {
    const ToolsWrapper: React.FC = () => {
      const { setActiveToolTab } = useApp();
      React.useEffect(() => {
        setActiveToolTab("solar-autonomy");
      }, []);
      return <ToolsHub />;
    };

    render(
      <AppProvider>
        <ToolsWrapper />
      </AppProvider>
    );

    // Required vs Available capacity together
    expect(screen.getByText("Required Battery Capacity")).toBeInTheDocument();
    expect(screen.getByText("Selected Package Capacity")).toBeInTheDocument();
    expect(screen.getByText("Capacity Margin / Shortfall")).toBeInTheDocument();

    // With 5 days autonomy, package has shortfall -> Engineering review required & Add to deal is blocked
    expect(screen.getByText("Engineering review required")).toBeInTheDocument();
    expect(screen.getByText(/Shortfall:/i)).toBeInTheDocument();
    expect(screen.getByText(/Add to deal is blocked: battery capacity shortfall/i)).toBeInTheDocument();

    // Compact operating profile table
    expect(screen.getByText("Operating Profile Breakdown")).toBeInTheDocument();
    expect(screen.getByText("Dusk to Midnight")).toBeInTheDocument();
    expect(screen.getByText("Midnight to Dawn")).toBeInTheDocument();

    // Change autonomy to 1 day -> becomes Suitable candidate & Add to deal is enabled
    const autonomyInput = screen.getByDisplayValue(5);
    fireEvent.change(autonomyInput, { target: { value: "1" } });
    expect(screen.getByText("Suitable candidate")).toBeInTheDocument();
  });

  // -------------------------------------------------------------
  // Specification Review Tests (PART M, N, O)
  // -------------------------------------------------------------
  it('Test 7 — Specification Review opens ready for input and formats results as Clause, Concern, Source, Response', () => {
    const ToolsWrapper: React.FC = () => {
      const { setActiveToolTab } = useApp();
      React.useEffect(() => {
        setActiveToolTab("conflict-resolver");
      }, []);
      return <ToolsHub />;
    };

    render(
      <AppProvider>
        <ToolsWrapper />
      </AppProvider>
    );

    // Title is Specification Review
    expect(screen.getByRole('heading', { level: 2, name: "Specification Review" })).toBeInTheDocument();

    // Real input ready
    expect(screen.getByText("Paste or Enter Specification Clause")).toBeInTheDocument();

    // View examples button
    const viewExBtn = screen.getByRole('button', { name: /View examples/i });
    expect(viewExBtn).toBeInTheDocument();
    fireEvent.click(viewExBtn);
    expect(screen.getAllByText("Example").length).toBeGreaterThanOrEqual(1);

    // Select an example and analyze
    const exampleCard = screen.getByText("5700K Daylight LED vs Fauna Dark-Sky Overlay");
    fireEvent.click(exampleCard);

    const analyzeBtn = screen.getByRole('button', { name: /Analyze Specification/i });
    fireEvent.click(analyzeBtn);

    // Result structure: Clause -> Concern -> Source -> Suggested response
    expect(screen.getByText("Supplied Clause")).toBeInTheDocument();
    expect(screen.getByText("Identified Concern / Conflict")).toBeInTheDocument();
    expect(screen.getByText("Source & Standard Reference")).toBeInTheDocument();
    expect(screen.getByText("Suggested Technical Response / RFI")).toBeInTheDocument();
  });
});
