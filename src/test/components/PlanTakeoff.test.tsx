import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlanTakeoffWorkspace } from '../../components/PlanTakeoffWorkspace';
import { AppProvider } from '../../context/AppContext';
import { apiPost } from '../../utils/apiClient';

vi.mock('../../utils/apiClient', () => ({
  apiPost: vi.fn(),
  AIUnavailableError: class extends Error {
    detail: string;
    guidance?: string;
    constructor(detail: string, guidance?: string) {
      super(detail);
      this.name = 'AIUnavailableError';
      this.detail = detail;
      this.guidance = guidance;
    }
  },
  toUserMessage: vi.fn((err) => err?.message || 'Error')
}));

const mockTakeoffResult = {
  drawingMetadata: {
    sheetTitle: "Public Lighting & Trenching Layout - Sheet E-02",
    drawingNumber: "BCC-2025-E02-REV-B",
    scale: "1:500 @ A1",
    revision: "Rev B"
  },
  legendAndSchedules: [
    { symbol: "Type S1", description: "Solar LED Pathway Luminaire (3000K Warm White)", scheduleRef: "Luminaire Schedule Type S1" },
    { symbol: "P-6M", description: "6.0m Recycled Composite Light Pole (Direct Burial)", scheduleRef: "Pole Schedule Detail 3" },
    { symbol: "CC-200", description: "Plasgain Polymeric Cable Cover Slab (200mm width)", scheduleRef: "Civil Trenching Spec 4.2" }
  ],
  billOfMaterials: [
    {
      id: "bom-1",
      category: "Solar Luminaire & Fitting",
      itemDescription: "Plasgain Pro Blade 75 Solar Luminaire (3000K Warm White, 75W PV, 460Wh LiFePO4)",
      quantity: 24,
      unit: "ea",
      recommendedProductCode: "PB-75W-3K",
      drawingReference: "Poles P1 to P24 along shared path alignment",
      confidence: "High",
      notes: "3000K specified in drawing notes for wildlife preservation buffer"
    },
    {
      id: "bom-2",
      category: "Pole & Structural Foundation",
      itemDescription: "Plaspole 6.0m Recycled Composite Light Pole (Direct Burial, Heritage Green finish)",
      quantity: 24,
      unit: "ea",
      recommendedProductCode: "PLASPOLE-6M-DB-GRN",
      drawingReference: "P1–P24 (1.2m embedment depth per detail 3/E02)",
      confidence: "High",
      notes: "Non-conductive composite suitable for riverbank salinity"
    },
    {
      id: "bom-3",
      category: "Civil & Trenching Protection",
      itemDescription: "Plasgain Polymeric Cable Cover Slabs (1000mm x 200mm x 6mm AS 4702 Cat 1)",
      quantity: 1200,
      unit: "m",
      recommendedProductCode: "PCC-200-1M",
      drawingReference: "Submains trench run T-01 to T-04 (1,200 linear metres)",
      confidence: "High",
      notes: "Replaces 31.8 Tonnes of heavy concrete slabs; 1200 interlocking units"
    }
  ],
  notes: [
    "eucalyptus canopy noted along riverbank"
  ],
  summary: "Deciphered 24x 6m Solar Pathway Poles and 1,200m civil trenching."
};

describe('PlanTakeoffWorkspace Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiPost).mockResolvedValue(mockTakeoffResult);
  });

  const renderWorkspace = () =>
    render(
      <AppProvider>
        <PlanTakeoffWorkspace />
      </AppProvider>
    );

  const uploadAndAnalysePlan = async () => {
    const file = new File(['dummy content'], 'BCC-2025-E02-REV-B.pdf', { type: 'application/pdf' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('BCC-2025-E02-REV-B.pdf')).toBeInTheDocument();
    });

    const analyseBtn = screen.getByRole('button', { name: /Analyse plan/i });
    fireEvent.click(analyseBtn);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Save to deal/i })).toBeInTheDocument();
    });
  };

  it('renders clean plan takeoff header, upload dropzone and honest empty state without example plans', () => {
    renderWorkspace();

    // 1. One clear page title
    expect(screen.getByRole('heading', { level: 1, name: /Plan Take-off/i })).toBeInTheDocument();
    
    // 2. Upload Plan near top
    expect(screen.getByText(/Upload Plan & Project Details/i)).toBeInTheDocument();
    expect(screen.getByText(/Drop Engineering PDF, CAD Drawing/i)).toBeInTheDocument();

    // 3. Example / demo plans are completely removed from UI
    expect(screen.queryByRole('button', { name: /Load Example Plan/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/Select Demo Plan/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Ballarat 1.2km Shared Path Upgrade/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Example Demo Plan/i)).not.toBeInTheDocument();

    // 4. Honest empty state in preview
    expect(screen.getByText(/No plan uploaded/i)).toBeInTheDocument();

    // 5. Initial action should be "Analyse plan", not "Re-analyse"
    expect(screen.getByRole('button', { name: /Analyse plan/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Re-analyse/i })).not.toBeInTheDocument();

    // 6. Result export actions should remain hidden before results exist
    expect(screen.queryByRole('button', { name: /Save to deal/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Export/i })).not.toBeInTheDocument();
  });

  it('analyses uploaded plan and displays extracted schedule line items with traceability', async () => {
    renderWorkspace();
    await uploadAndAnalysePlan();

    // Line items rendered with traceability
    expect(screen.getAllByText(/BCC-2025-E02-REV-B/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Plasgain Pro Blade 75 Solar Luminaire/i)).toBeInTheDocument();
    expect(screen.getByText(/Plaspole 6.0m Recycled Composite Light Pole/i)).toBeInTheDocument();
    expect(screen.getByText(/Plasgain Polymeric Cable Cover Slabs/i)).toBeInTheDocument();

    // Action buttons now visible
    expect(screen.getByRole('button', { name: /Save to deal/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Export/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Re-analyse plan/i })).toBeInTheDocument();
  });

  it('allows adding, editing and removing line items after analysing a plan', async () => {
    renderWorkspace();
    await uploadAndAnalysePlan();

    const addButton = screen.getByRole('button', { name: /Add Item/i });
    fireEvent.click(addButton);

    expect(screen.getByText(/Plasgain Additional Luminaire/i)).toBeInTheDocument();

    const deleteButtons = screen.getAllByTitle(/Remove line item/i);
    fireEvent.click(deleteButtons[deleteButtons.length - 1]);
    expect(screen.queryByText(/Plasgain Additional Luminaire/i)).not.toBeInTheDocument();
  });

  it('opens export menu with Ostendo CSV, Copy Product List, and Schedule CSV', async () => {
    renderWorkspace();
    await uploadAndAnalysePlan();

    const exportBtn = screen.getByRole('button', { name: /Export/i });
    fireEvent.click(exportBtn);

    expect(screen.getByText(/Download Ostendo CSV/i)).toBeInTheDocument();
    expect(screen.getByText(/Copy Product List/i)).toBeInTheDocument();
    expect(screen.getByText(/Export Schedule CSV/i)).toBeInTheDocument();
  });

  it('triggers Save to CRM Deals modal with product lines preserved', async () => {
    renderWorkspace();
    await uploadAndAnalysePlan();

    const saveDealBtn = screen.getByRole('button', { name: /Save to deal/i });
    fireEvent.click(saveDealBtn);

    expect(screen.getByText(/Save Take-off to CRM Pipeline/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Confirm & Save Deal/i })).toBeInTheDocument();
  });
});
