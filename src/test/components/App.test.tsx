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

    // Click Settings
    const settingsNav = screen.getByRole('button', { name: /^Settings$/i });
    fireEvent.click(settingsNav);

    expect(await screen.findByRole('heading', { level: 1, name: /^Settings$/i }, { timeout: 10000 })).toBeInTheDocument();

    // Return to Home
    const homeNav = screen.getByRole('button', { name: /^Home$/i });
    fireEvent.click(homeNav);

    expect(await screen.findByRole('heading', { level: 1 }, { timeout: 10000 })).toHaveTextContent(/Welcome|Plasgain/i);
  }, 15000);
});
