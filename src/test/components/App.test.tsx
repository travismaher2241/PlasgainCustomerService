import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from '../../App';

describe('App Component Layout and Navigation', () => {
  it('renders main layout with default home view', async () => {
    render(<App />);

    expect(screen.getAllByText(/PLASGAIN/i)[0]).toBeInTheDocument();
    const heading = await screen.findByRole('heading', { level: 1 }, { timeout: 10000 });
    expect(heading).toHaveTextContent(/Welcome|Plasgain/i);
  }, 15000);

  it('switches tabs smoothly via sidebar navigation', async () => {
    render(<App />);

    // Click CRM Command Centre
    const crmNav = screen.getByRole('button', { name: /CRM Command Centre/i });
    fireEvent.click(crmNav);

    expect(await screen.findByRole('tab', { name: /^Deals$/i }, { timeout: 10000 })).toBeInTheDocument();

    // Click Tools Hub
    const toolsNav = screen.getByRole('button', { name: /^Tools$/i });
    fireEvent.click(toolsNav);

    expect(await screen.findByRole('heading', { level: 1, name: /Plan Take-off/i }, { timeout: 10000 })).toBeInTheDocument();

    // Click Product Finder
    const prodNav = screen.getByRole('button', { name: /Product Finder/i });
    fireEvent.click(prodNav);

    expect(await screen.findByRole('heading', { level: 1, name: /^Product Finder$/i }, { timeout: 10000 })).toBeInTheDocument();

    // Verify Learn is not in sidebar
    expect(screen.queryByText('Learn')).not.toBeInTheDocument();
  }, 15000);
});
