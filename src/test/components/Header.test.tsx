import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Header } from '../../components/Header';
import { AppProvider } from '../../context/AppContext';

describe('Header Component', () => {
  it('renders breadcrumbs and quick actions', () => {
    render(
      <AppProvider>
        <Header />
      </AppProvider>
    );

    expect(screen.getByText(/^Dashboard$/i)).toBeInTheDocument();
    expect(screen.getByText(/Search accounts, deals & contacts/i)).toBeInTheDocument();
    expect(screen.getByText(/Write AI Email/i)).toBeInTheDocument();
    expect(screen.queryByText(/Lighting terms/i)).not.toBeInTheDocument();
    expect(screen.getByText('Ask Copilot')).toBeInTheDocument();
  });

  it('triggers mobile menu toggle when hamburger clicked', () => {
    const onToggleMobileMenu = vi.fn();
    render(
      <AppProvider>
        <Header onToggleMobileMenu={onToggleMobileMenu} />
      </AppProvider>
    );

    const menuButton = screen.getByTitle('Open menu');
    fireEvent.click(menuButton);
    expect(onToggleMobileMenu).toHaveBeenCalledTimes(1);
  });
});
