import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Sidebar } from '../../components/Sidebar';
import { AppProvider } from '../../context/AppContext';

describe('Sidebar Component', () => {
  it('renders all core workspace navigation items', () => {
    render(
      <AppProvider>
        <Sidebar />
      </AppProvider>
    );

    expect(screen.getByText(/PLASGAIN/i)).toBeInTheDocument();
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('CRM Command Centre')).toBeInTheDocument();
    expect(screen.getByText('New Enquiry')).toBeInTheDocument();
    expect(screen.getByText('Product Finder')).toBeInTheDocument();
    expect(screen.getByText('Opportunities')).toBeInTheDocument();
    expect(screen.getByText('Product Catalogues')).toBeInTheDocument();
    expect(screen.getByText('Tools')).toBeInTheDocument();
    expect(screen.getByText('Learn')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('handles navigation item click and closes mobile menu if callback provided', () => {
    const setMobileOpen = vi.fn();
    render(
      <AppProvider>
        <Sidebar mobileOpen={true} setMobileOpen={setMobileOpen} />
      </AppProvider>
    );

    const crmButton = screen.getByText('CRM Command Centre');
    fireEvent.click(crmButton);
    expect(setMobileOpen).toHaveBeenCalledWith(false);
  });
});
