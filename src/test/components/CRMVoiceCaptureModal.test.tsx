import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CRMVoiceCaptureModal } from '../../components/crm/CRMVoiceCaptureModal';
import { AppProvider, useApp } from '../../context/AppContext';

const VoiceCaptureHarness: React.FC = () => {
  const { openVoiceCapture } = useApp();

  return (
    <div>
      <button
        type="button"
        data-testid="open-voice-modal-btn"
        onClick={() => openVoiceCapture()}
      >
        Open Voice Modal
      </button>
      <CRMVoiceCaptureModal />
    </div>
  );
};

describe('CRMVoiceCaptureModal Component', () => {
  const mockExtraction = {
    rawTranscript: "Just left Cardinia, spoke to David, they want 16 columns on the shared trail, needs pricing before the 20th.",
    matchedAccount: {
      id: "acc-1",
      name: "Cardinia Shire Council",
      confidence: 0.95,
      sourcePhrase: "Just left Cardinia"
    },
    matchedContact: {
      id: "c-1",
      name: "David",
      confidence: 0.9,
      sourcePhrase: "spoke to David"
    },
    activity: {
      type: "meeting",
      outcome: "Meeting Held",
      title: "Site Visit: Cardinia Debrief",
      notes: "Met with David regarding 16 columns for shared trail project. Needs pricing before the 20th.",
      sourcePhrase: "sixteen columns on the shared trail"
    },
    nextAction: {
      action: "Send formal pricing for 16 columns",
      date: "2026-09-20",
      sourcePhrase: "needs pricing before the 20th"
    },
    proposedTask: {
      title: "Send pricing for 16 columns",
      dueDate: "2026-09-20",
      priority: "high",
      sourcePhrase: "needs pricing before the 20th"
    }
  };

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();

    // Mock fetch for all API routes so AppProvider calls don't consume voice parse mock
    global.fetch = vi.fn().mockImplementation(async (input: any) => {
      const url = typeof input === 'string' ? input : input?.url || '';
      if (url.includes('/api/crm/voice-log-parse')) {
        return {
          ok: true,
          status: 200,
          json: async () => mockExtraction
        } as Response;
      }
      return {
        ok: true,
        status: 200,
        json: async () => []
      } as Response;
    });
  });

  it('renders record step with ute mode badge, mic button, and transcript textarea when opened', () => {
    render(
      <AppProvider>
        <VoiceCaptureHarness />
      </AppProvider>
    );

    fireEvent.click(screen.getByTestId('open-voice-modal-btn'));

    expect(screen.getByText(/voice capture/i)).toBeInTheDocument();
    expect(screen.getByText(/ute mode/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start recording|tap to speak/i })).toBeInTheDocument();

    const generateBtn = screen.getByRole('button', { name: /generate proposed diff/i });
    expect(generateBtn).toBeInTheDocument();
    expect(generateBtn).toBeDisabled();
  });

  it('enables generate diff button when transcript is provided and transitions to step 2 diff review', async () => {
    render(
      <AppProvider>
        <VoiceCaptureHarness />
      </AppProvider>
    );

    fireEvent.click(screen.getByTestId('open-voice-modal-btn'));

    const textarea = screen.getByPlaceholderText(/spoken words appear here automatically/i);
    fireEvent.change(textarea, { target: { value: mockExtraction.rawTranscript } });

    const generateBtn = screen.getByRole('button', { name: /generate proposed diff/i });
    expect(generateBtn).not.toBeDisabled();

    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(screen.getAllByText(/proposed changes diff/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Original Spoken Transcript/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/From: "Just left Cardinia"/i)).toBeInTheDocument();
    expect(screen.getByText(/From: "spoke to David"/i)).toBeInTheDocument();
    expect(screen.getByText(/From: "needs pricing before the 20th"/i)).toBeInTheDocument();

    expect(screen.getByDisplayValue("Send formal pricing for 16 columns")).toBeInTheDocument();
    expect(screen.getByDisplayValue("2026-09-20")).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /confirm & apply changes/i })).toBeInTheDocument();
  });

  it('allows editing next action and applies changes successfully on confirmation', async () => {
    render(
      <AppProvider>
        <VoiceCaptureHarness />
      </AppProvider>
    );

    fireEvent.click(screen.getByTestId('open-voice-modal-btn'));

    const textarea = screen.getByPlaceholderText(/spoken words appear here automatically/i);
    fireEvent.change(textarea, { target: { value: mockExtraction.rawTranscript } });

    fireEvent.click(screen.getByRole('button', { name: /generate proposed diff/i }));

    await waitFor(() => {
      expect(screen.getAllByText(/proposed changes diff/i).length).toBeGreaterThanOrEqual(1);
    });

    const nextActionInput = screen.getByDisplayValue("Send formal pricing for 16 columns");
    fireEvent.change(nextActionInput, { target: { value: "Send revised formal proposal" } });
    expect(screen.getByDisplayValue("Send revised formal proposal")).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: /confirm & apply changes/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(screen.queryAllByText(/proposed changes diff/i).length).toBe(0);
    });
  });
});
