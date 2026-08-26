import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from '../../App';

describe('Main App Component', () => {
  it('renders main layout with default home view', async () => {
    render(<App />);

    expect(screen.getAllByText(/PLASGAIN/i)[0]).toBeInTheDocument();
    expect(await screen.findByText(/Customer Service Command Centre/i, {}, { timeout: 5000 })).toBeInTheDocument();
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

    expect(await screen.findByText(/Sales Power Tools Hub/i, {}, { timeout: 5000 })).toBeInTheDocument();

    // Click Learn
    const learnNav = screen.getByText('Learn');
    fireEvent.click(learnNav);

    expect(await screen.findByText(/5-Minute Micro-Lessons/i, {}, { timeout: 5000 })).toBeInTheDocument();
  });
});
