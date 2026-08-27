import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from '../../App';

describe('Main App Component', () => {
  it('renders main layout with default home view', async () => {
    render(<App />);

    expect(screen.getAllByText(/PLASGAIN/i)[0]).toBeInTheDocument();
    expect(await screen.findByRole(`heading`, { name: /need you today|clear, Sarah/i }, { timeout: 5000 })).toBeInTheDocument();
  });

  it('switches tabs smoothly via sidebar navigation', async () => {
    render(<App />);

    // Click CRM Command Centre
    const crmNav = screen.getByText('CRM Command Centre');
    fireEvent.click(crmNav);

    expect(await screen.findByText(/Today \/ Focus/i, {}, { timeout: 5000 })).toBeInTheDocument();

    // Click Tools Hub
    const toolsNav = screen.getByText('Tools');
    fireEvent.click(toolsNav);

    expect(await screen.findByText(/Engineering & Sales Calculators/i, {}, { timeout: 5000 })).toBeInTheDocument();
    expect(await screen.findByText(/AI Drawing & Plan Deciphering/i, {}, { timeout: 5000 })).toBeInTheDocument();

    // Click New Enquiry
    const enquiryNav = screen.getByText('New Enquiry');
    fireEvent.click(enquiryNav);

    expect(await screen.findByText(/Enquiry Analysis Workspace/i, {}, { timeout: 5000 })).toBeInTheDocument();

    // Verify Learn is not in sidebar
    expect(screen.queryByText('Learn')).not.toBeInTheDocument();
  });
});
