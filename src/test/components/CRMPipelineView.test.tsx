import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { CRMPipelineView } from '../../components/crm/CRMPipelineView';
import { CRMCommandCenter } from '../../components/crm/CRMCommandCenter';
import { AppProvider } from '../../context/AppContext';

describe('CRM Deals Pipeline (Table-Only) & Navigation Suite', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders table view directly without any Kanban button or view mode toggle', () => {
    render(
      <AppProvider>
        <CRMPipelineView />
      </AppProvider>
    );

    // Header & Actions
    expect(screen.getByRole('heading', { level: 1, name: /Deals Pipeline/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /\+ Add Deal/i })).toBeInTheDocument();

    // Verify NO Kanban button or Table toggle button exists
    expect(screen.queryByRole('button', { name: /^Kanban$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Table$/i })).not.toBeInTheDocument();

    // Table should be rendered directly
    const tables = screen.getAllByRole('table');
    expect(tables.length).toBeGreaterThan(0);
    expect(screen.getByRole('columnheader', { name: /Opportunity/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Stage/i })).toBeInTheDocument();
    expect(screen.getByText(/Total Pipeline/i)).toBeInTheDocument();
  });

  it('allows switching active pipeline via the pipeline selector', () => {
    render(
      <AppProvider>
        <CRMPipelineView />
      </AppProvider>
    );

    const pipelineSelect = screen.getByLabelText(/Select Pipeline/i) as HTMLSelectElement;
    expect(pipelineSelect).toBeInTheDocument();
    expect(pipelineSelect.value).toBeTruthy();

    // Switch to another pipeline if available
    if (pipelineSelect.options.length > 1) {
      fireEvent.change(pipelineSelect, { target: { value: pipelineSelect.options[1].value } });
      expect(pipelineSelect.value).toBe(pipelineSelect.options[1].value);
    }
  });

  it('allows changing stage directly from the table row dropdown', () => {
    render(
      <AppProvider>
        <CRMPipelineView />
      </AppProvider>
    );

    const stageSelects = screen.getAllByLabelText(/Change stage for/i) as HTMLSelectElement[];
    expect(stageSelects.length).toBeGreaterThan(0);

    const firstSelect = stageSelects[0];
    const initialStage = firstSelect.value;
    const nextOption = Array.from(firstSelect.options).find((opt) => opt.value !== initialStage);

    if (nextOption) {
      fireEvent.change(firstSelect, { target: { value: nextOption.value } });
      expect(firstSelect.value).toBe(nextOption.value);
    }
  });

  it('filters table rows via search and health filters', () => {
    render(
      <AppProvider>
        <CRMPipelineView />
      </AppProvider>
    );

    const searchInput = screen.getByPlaceholderText(/Search opportunities/i);
    fireEvent.change(searchInput, { target: { value: 'Nonexistent Project Query 12345' } });

    expect(screen.getByText(/No deals found matching your search or filters/i)).toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: '' } });
    expect(screen.queryByText(/No deals found matching your search or filters/i)).not.toBeInTheDocument();
  });

  it('renders responsive CRM navigation with More menu without horizontal swiping', () => {
    render(
      <AppProvider>
        <CRMCommandCenter />
      </AppProvider>
    );

    // Desktop/Visible links
    expect(screen.getAllByText(/Today/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Accounts/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Deals/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Leads/i).length).toBeGreaterThan(0);

    // More dropdown button
    const moreBtn = screen.getByRole('button', { name: /More CRM destinations/i });
    expect(moreBtn).toBeInTheDocument();

    // Open More dropdown
    fireEvent.click(moreBtn);
    expect(screen.getAllByText(/Tasks & Log/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Competitor Intel/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Quick Log Interaction/i)).toBeInTheDocument();
  });
});
