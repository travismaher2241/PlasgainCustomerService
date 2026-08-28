import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AppProvider, useApp } from '../../context/AppContext';
import { AIEmailComposerModal } from '../../components/AIEmailComposerModal';
import { Header } from '../../components/Header';

// Helper component to trigger modal programmatically for testing
const TestLauncher: React.FC<{
  onLaunch?: (openFn: (ctx?: any) => void) => void;
}> = ({ onLaunch }) => {
  const { openEmailComposer } = useApp();
  return (
    <button
      data-testid="test-launch-btn"
      onClick={() => {
        if (onLaunch) onLaunch(openEmailComposer);
      }}
    >
      Launch Composer
    </button>
  );
};

describe('AI Email Composer Modal Suite', () => {
  const mockClipboard = {
    writeText: vi.fn().mockResolvedValue(undefined)
  };

  let mockResearchHandler: () => any = () => ({});
  let mockRefineHandler: () => any = () => ({});

  beforeEach(() => {
    vi.stubGlobal('navigator', {
      ...navigator,
      clipboard: mockClipboard
    });

    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url: string | URL) => {
      const urlStr = String(url);
      if (urlStr.includes('/api/email/research-and-draft')) {
        return {
          ok: true,
          status: 200,
          json: async () => mockResearchHandler()
        };
      }
      if (urlStr.includes('/api/email/refine-draft')) {
        return {
          ok: true,
          status: 200,
          json: async () => mockRefineHandler()
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ records: [], alerts: [] })
      };
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders "Write AI Email" button in Header and opens modal on click', async () => {
    render(
      <AppProvider>
        <Header />
        <AIEmailComposerModal />
      </AppProvider>
    );

    const writeEmailBtn = screen.getByRole('button', { name: /Write AI Email/i });
    expect(writeEmailBtn).toBeInTheDocument();

    fireEvent.click(writeEmailBtn);

    expect(screen.getByText('AI Sales Email Composer')).toBeInTheDocument();
    expect(screen.getByText(/Who or what should AI research\?/i)).toBeInTheDocument();
    expect(screen.getByText(/Cold Outreach/i)).toBeInTheDocument();
    expect(screen.getByText(/Upcoming Project Enquiry/i)).toBeInTheDocument();
  });

  it('prefills Account CRM context correctly for Cold Outreach', async () => {
    render(
      <AppProvider>
        <TestLauncher
          onLaunch={(openFn) =>
            openFn({
              defaultMode: 'cold-outreach',
              accountId: 'acc-1',
              companyName: 'BMD Constructions',
              companyWebsite: 'https://bmd.com.au',
              contactName: 'Sarah Jenkins',
              contactEmail: 'sjenkins@bmd.com.au',
              customerSegment: 'Civil Contractor',
              territory: 'QLD/NT'
            })
          }
        />
        <AIEmailComposerModal />
      </AppProvider>
    );

    fireEvent.click(screen.getByTestId('test-launch-btn'));

    expect(screen.getByText(/Using CRM Context:/i)).toBeInTheDocument();
    expect(screen.getByText('BMD Constructions')).toBeInTheDocument();
    expect(screen.getByText('QLD/NT')).toBeInTheDocument();

    const subjectInput = screen.getByLabelText(/Who or what should AI research\?/i) as HTMLInputElement;
    expect(subjectInput.value).toBe('BMD Constructions');
  });

  it('prefills Project Enquiry CRM context correctly for Pipeline Deal', async () => {
    render(
      <AppProvider>
        <TestLauncher
          onLaunch={(openFn) =>
            openFn({
              defaultMode: 'project-enquiry',
              opportunityId: 'opp-101',
              companyName: 'Seymour Whyte',
              projectName: 'M1 Pacific Motorway Upgrade',
              projectLocation: 'Gold Coast, QLD',
              contactName: 'Michael Chang',
              contactEmail: 'm.chang@seymourwhyte.com.au',
              desiredOutcome: 'Ask about the lighting package'
            })
          }
        />
        <AIEmailComposerModal />
      </AppProvider>
    );

    fireEvent.click(screen.getByTestId('test-launch-btn'));

    expect(screen.getByText(/Using CRM Context:/i)).toBeInTheDocument();
    expect(screen.getByText('M1 Pacific Motorway Upgrade')).toBeInTheDocument();

    const subjectInput = screen.getByLabelText(/Who or what should AI research\?/i) as HTMLInputElement;
    expect(subjectInput.value).toBe('M1 Pacific Motorway Upgrade');

    const outcomeSelect = screen.getByLabelText(/Desired Outcome/i) as HTMLSelectElement;
    expect(outcomeSelect.value).toBe('Ask about the lighting package');
  });

  it('performs live research and renders confirmed facts, inferences, and editable draft', async () => {
    const mockResearchResponse = {
      researchStatus: 'complete',
      researchSummary: {
        confirmedFacts: [
          { text: 'Major infrastructure contractor with civil packages in Victoria and NSW.', sourceIds: ['source-1'] }
        ],
        inferences: [
          { text: 'Likely requires frangible composite poles and solar pathway lighting for regional sections.', reason: 'Regional arterial scope', confidence: 'high' }
        ],
        unknowns: ['Electrical subcontractor appointment status'],
        plasgainRelevance: [
          { text: 'Category V and P compliant solar systems eliminate grid connection costs.', basis: 'Plasgain Knowledge Base' }
        ],
        recommendedSalesAngle: 'Lead with zero-trenching frangible composite pole savings for arterial corridor',
        confidence: 'high'
      },
      sources: [
        { id: 'source-1', title: 'BMD Group Projects', url: 'https://bmd.com.au/projects', publisher: 'bmd.com.au' }
      ],
      draft: {
        subjectOptions: [
          'Plasgain Solar Lighting — BMD Infrastructure Package',
          'Preliminary lighting support for upcoming regional corridor'
        ],
        selectedSubject: 'Plasgain Solar Lighting — BMD Infrastructure Package',
        body: 'Hi Sarah,\n\nI noticed BMD is delivering key regional infrastructure packages across Victoria. Plasgain manufactures frangible composite poles and high-autonomy solar systems compliant with AS/NZS 1158.\n\nCould we arrange a brief 5-minute introductory call this week?\n\nKind regards,\nTravis Maher\nSales Director | Plasgain Australia',
        recommendedOutcome: 'Introduce Plasgain'
      }
    };

    mockResearchHandler = () => mockResearchResponse;

    render(
      <AppProvider>
        <TestLauncher
          onLaunch={(openFn) =>
            openFn({
              defaultMode: 'cold-outreach',
              companyName: 'BMD Group'
            })
          }
        />
        <AIEmailComposerModal />
      </AppProvider>
    );

    fireEvent.click(screen.getByTestId('test-launch-btn'));

    const researchBtn = screen.getByTestId('research-and-draft-btn');
    fireEvent.click(researchBtn);

    await waitFor(() => {
      expect(screen.getByText(/What AI Found & Strategic Sales Angle/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Major infrastructure contractor with civil packages/i)).toBeInTheDocument();
    expect(screen.getAllByText(/\[source-1\]/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Lead with zero-trenching frangible composite pole savings/i)).toBeInTheDocument();

    // Verify draft editable fields
    expect(screen.getByText('Editable Email Draft')).toBeInTheDocument();
    const emailBodyTextarea = screen.getByPlaceholderText(/Email body draft\.\.\./i) as HTMLTextAreaElement;
    expect(emailBodyTextarea.value).toContain('Plasgain manufactures frangible composite poles');

    // Verify copy button
    const copyBtn = screen.getByRole('button', { name: /Copy Email/i });
    fireEvent.click(copyBtn);
    expect(mockClipboard.writeText).toHaveBeenCalled();
  });

  it('handles refine actions (Make Shorter) seamlessly without repeating search', async () => {
    const mockResearchResponse = {
      researchStatus: 'complete',
      researchSummary: {
        confirmedFacts: [{ text: 'Civil contractor', sourceIds: [] }],
        inferences: [],
        unknowns: [],
        plasgainRelevance: [],
        recommendedSalesAngle: 'Solar savings',
        confidence: 'high'
      },
      sources: [],
      draft: {
        subjectOptions: ['Subject 1'],
        selectedSubject: 'Subject 1',
        body: 'Long draft body text...',
        recommendedOutcome: 'Introduce Plasgain'
      }
    };

    const mockRefineResponse = {
      subjectOptions: ['Concise Subject'],
      selectedSubject: 'Concise Subject',
      body: 'Short concise punchy body text.'
    };

    mockResearchHandler = () => mockResearchResponse;
    mockRefineHandler = () => mockRefineResponse;

    render(
      <AppProvider>
        <TestLauncher
          onLaunch={(openFn) =>
            openFn({
              companyName: 'Acme Civils'
            })
          }
        />
        <AIEmailComposerModal />
      </AppProvider>
    );

    fireEvent.click(screen.getByTestId('test-launch-btn'));
    fireEvent.click(screen.getByTestId('research-and-draft-btn'));

    await waitFor(() => {
      expect(screen.getByText('Editable Email Draft')).toBeInTheDocument();
    });

    const shorterBtn = screen.getByRole('button', { name: /Make Shorter/i });
    fireEvent.click(shorterBtn);

    await waitFor(() => {
      const textarea = screen.getByPlaceholderText(/Email body draft\.\.\./i) as HTMLTextAreaElement;
      expect(textarea.value).toBe('Short concise punchy body text.');
    });
  });

  it('displays research unavailable status gracefully without fake data', async () => {
    const mockUnavailableResponse = {
      researchStatus: 'unavailable',
      researchSummary: {
        confirmedFacts: [],
        inferences: [{ text: 'Potential lighting contractor based on CRM industry', reason: 'Internal CRM category', confidence: 'medium' }],
        unknowns: ['No live public records found for this query'],
        plasgainRelevance: [{ text: 'Direct manufacturer supply of AS/NZS 1158 solar lighting', basis: 'Plasgain Knowledge Base' }],
        recommendedSalesAngle: 'General capability overview',
        confidence: 'medium'
      },
      sources: [],
      draft: {
        subjectOptions: ['Plasgain Lighting Solutions'],
        selectedSubject: 'Plasgain Lighting Solutions',
        body: 'Hi Team,\n\nPlasgain provides Australian-engineered solar lighting systems.\n\nKind regards,\nPlasgain Team',
        recommendedOutcome: 'Introduce Plasgain'
      }
    };

    mockResearchHandler = () => mockUnavailableResponse;

    render(
      <AppProvider>
        <TestLauncher
          onLaunch={(openFn) =>
            openFn({
              companyName: 'Unknown Local Entity'
            })
          }
        />
        <AIEmailComposerModal />
      </AppProvider>
    );

    fireEvent.click(screen.getByTestId('test-launch-btn'));
    fireEvent.click(screen.getByTestId('research-and-draft-btn'));

    await waitFor(() => {
      expect(screen.getByText(/Research: unavailable/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/No specific public facts verified/i)).toBeInTheDocument();
    expect(screen.getByText(/Direct manufacturer supply of AS\/NZS 1158 solar lighting/i)).toBeInTheDocument();
  });
});
