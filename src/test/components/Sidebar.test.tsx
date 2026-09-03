import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Sidebar } from '../../components/Sidebar';
import { Header } from '../../components/Header';
import { AppProvider } from '../../context/AppContext';

describe('Sidebar Component', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders all core workspace navigation items', () => {
    render(
      <AppProvider>
        <Sidebar />
      </AppProvider>
    );

    // The wordmark is split so GAIN can carry the brand green: PLAS<span>GAIN</span>.
    expect(
      screen.getByText((_t, el) => el?.textContent?.replace(/\s/g, "") === "PLASGAIN" && el.children.length === 1)
    ).toBeInTheDocument();
    expect(screen.getByText(/Customer Service Sidekick/i)).toBeInTheDocument();
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('CRM Command Centre')).toBeInTheDocument();
    expect(screen.getByText('New Enquiry')).toBeInTheDocument();
    expect(screen.getByText('Product Finder')).toBeInTheDocument();
    expect(screen.getByText('Documents')).toBeInTheDocument();
    expect(screen.queryByText('Product Catalogues')).not.toBeInTheDocument();
    expect(screen.getByText('Tools')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.queryByText('Opportunities')).not.toBeInTheDocument();
    expect(screen.queryByText('Learn')).not.toBeInTheDocument();
  });

  it('handles navigation item click and closes mobile menu if callback provided', () => {
    const setMobileOpen = vi.fn();
    render(
      <AppProvider>
        <Sidebar mobileOpen={true} setMobileOpen={setMobileOpen} />
      </AppProvider>
    );

    const aside = screen.getByRole('dialog', { name: /Main Navigation/i });
    expect(aside.className).toContain('w-72');

    const closeBtn = screen.getByRole('button', { name: /Close navigation menu/i });
    expect(closeBtn).toBeInTheDocument();
    fireEvent.click(closeBtn);
    expect(setMobileOpen).toHaveBeenCalledWith(false);

    const crmButton = screen.getByText('CRM Command Centre');
    fireEvent.click(crmButton);
    expect(setMobileOpen).toHaveBeenCalledWith(false);
  });

  it('toggles sidebar collapse on desktop button click and Ctrl+B shortcut', () => {
    render(
      <AppProvider>
        <Sidebar />
        <Header />
      </AppProvider>
    );

    const collapseBtn = screen.getByRole('button', { name: /Collapse sidebar menu/i });
    expect(collapseBtn).toBeInTheDocument();

    // Click collapse
    fireEvent.click(collapseBtn);

    // Sidebar should be collapsed
    const aside = screen.getByRole('navigation', { name: /Main Navigation/i });
    expect(aside.className).toContain('w-16');

    // Press Ctrl+B to expand
    fireEvent.keyDown(window, { key: 'b', ctrlKey: true });
    expect(aside.className).toContain('w-58');
  });
});
