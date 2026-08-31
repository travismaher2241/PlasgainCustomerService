import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { SettingsView } from '../../components/SettingsView';
import { Sidebar } from '../../components/Sidebar';
import { AppProvider, initialsOf } from '../../context/AppContext';

const renderBoth = () =>
  render(
    <AppProvider>
      <Sidebar />
      <SettingsView />
    </AppProvider>
  );

beforeEach(() => {
  localStorage.clear();
});

describe('initialsOf', () => {
  it('takes first and last initial', () => {
    expect(initialsOf('Travis Maher')).toBe('TM');
    expect(initialsOf('Sarah Jane Reed')).toBe('SR');
  });

  it('handles a single name and stray whitespace', () => {
    expect(initialsOf('Cher')).toBe('CH');
    expect(initialsOf('  Ada  Lovelace  ')).toBe('AL');
  });

  it('never renders empty', () => {
    expect(initialsOf('')).toBe('?');
    expect(initialsOf('   ')).toBe('?');
  });
});

describe('Editing your details in Settings', () => {
  it('shows the current profile summary by default and opens edit mode', () => {
    renderBoth();
    expect(screen.getAllByText('Travis Maher').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /Edit profile/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Edit profile/i }));
    expect((screen.getByDisplayValue('Travis Maher') as HTMLInputElement)).toBeInTheDocument();
  });

  it('propagates a saved name to the sidebar and its avatar', () => {
    const { container } = renderBoth();
    fireEvent.click(screen.getByRole('button', { name: /Edit profile/i }));

    const nameInput = screen.getByDisplayValue('Travis Maher');
    const roleInput = screen.getByDisplayValue('Internal Sales & Technical Lead');

    fireEvent.change(nameInput, { target: { value: 'Alex Morgan' } });
    fireEvent.change(roleInput, { target: { value: 'Managing Director' } });
    fireEvent.click(screen.getByRole('button', { name: /Save profile/i }));

    const rail = container.querySelector('aside') as HTMLElement;
    expect(within(rail).getByText('Alex Morgan')).toBeInTheDocument();
    expect(within(rail).getByText(/Managing Director/)).toBeInTheDocument();
    expect(within(rail).getByText('AM')).toBeInTheDocument();
  });

  it('persists the profile so it survives a reload', () => {
    renderBoth();
    fireEvent.click(screen.getByRole('button', { name: /Edit profile/i }));

    const nameInput = screen.getByDisplayValue('Travis Maher');
    fireEvent.change(nameInput, { target: { value: 'Alex Morgan' } });
    fireEvent.click(screen.getByRole('button', { name: /Save profile/i }));

    const stored = JSON.parse(localStorage.getItem('plasgain_user_profile') || '{}');
    expect(stored.name).toBe('Alex Morgan');
  });

  it('refuses to save an empty name', () => {
    renderBoth();
    fireEvent.click(screen.getByRole('button', { name: /Edit profile/i }));

    const nameInput = screen.getByDisplayValue('Travis Maher');
    fireEvent.change(nameInput, { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: /Save profile/i }));

    expect(screen.getByText(/Your name is required/i)).toBeInTheDocument();
  });

  it('discards unsaved edits when cancelled', () => {
    renderBoth();
    fireEvent.click(screen.getByRole('button', { name: /Edit profile/i }));

    const nameInput = screen.getByDisplayValue('Travis Maher') as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'Someone Else' } });
    fireEvent.click(screen.getByRole('button', { name: /^Cancel$/i }));

    expect(screen.getAllByText('Travis Maher').length).toBeGreaterThan(0);
    expect(screen.queryByText('Someone Else')).not.toBeInTheDocument();
  });
});
