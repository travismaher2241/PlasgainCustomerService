import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { SettingsView } from '../../components/SettingsView';
import { Sidebar } from '../../components/Sidebar';
import { AppProvider, initialsOf } from '../../context/AppContext';

/**
 * The signed-in profile is editable and is what gets stamped on records.
 * Before this existed the sidebar said "Sarah Reed" while every created record
 * said "Marcus Vance" — two identities for the same person.
 */

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

describe('Editing your details', () => {
  it('shows the current profile in the form', () => {
    renderBoth();
    expect((screen.getByLabelText(/^Name$/i) as HTMLInputElement).value).toBe('Sarah Reed');
    expect((screen.getByLabelText(/^Role$/i) as HTMLInputElement).value).toBe('Internal Sales');
  });

  it('keeps Save disabled until something actually changes', () => {
    renderBoth();
    const save = screen.getByRole('button', { name: /Save details/i });
    expect(save).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/^Name$/i), { target: { value: 'Travis Maher' } });
    expect(save).toBeEnabled();
  });

  it('propagates a saved name to the sidebar and its avatar', () => {
    const { container } = renderBoth();
    fireEvent.change(screen.getByLabelText(/^Name$/i), { target: { value: 'Travis Maher' } });
    fireEvent.change(screen.getByLabelText(/^Role$/i), { target: { value: 'Managing Director' } });
    fireEvent.click(screen.getByRole('button', { name: /Save details/i }));

    const rail = container.querySelector('aside') as HTMLElement;
    expect(within(rail).getByText('Travis Maher')).toBeInTheDocument();
    expect(within(rail).getByText(/Managing Director/)).toBeInTheDocument();
    expect(within(rail).getByText('TM')).toBeInTheDocument();
    expect(within(rail).queryByText('Sarah Reed')).not.toBeInTheDocument();
  });

  it('persists the profile so it survives a reload', () => {
    renderBoth();
    fireEvent.change(screen.getByLabelText(/^Name$/i), { target: { value: 'Travis Maher' } });
    fireEvent.click(screen.getByRole('button', { name: /Save details/i }));

    const stored = JSON.parse(localStorage.getItem('plasgain_user_profile') || '{}');
    expect(stored.name).toBe('Travis Maher');
  });

  it('refuses to save an empty name', () => {
    renderBoth();
    fireEvent.change(screen.getByLabelText(/^Name$/i), { target: { value: '   ' } });

    expect(screen.getByText(/Your name is required/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save details/i })).toBeDisabled();
  });

  it('discards unsaved edits', () => {
    renderBoth();
    const name = screen.getByLabelText(/^Name$/i) as HTMLInputElement;
    fireEvent.change(name, { target: { value: 'Someone Else' } });
    fireEvent.click(screen.getByRole('button', { name: /^Discard$/i }));
    expect(name.value).toBe('Sarah Reed');
  });
});
