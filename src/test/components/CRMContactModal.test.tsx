import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CRMContactModal } from '../../components/crm/CRMContactModal';
import { AppProvider } from '../../context/AppContext';

describe('CRMContactModal Component', () => {
  it('renders contact editing fields with buying committee mapping', () => {
    const onSave = vi.fn();
    const onClose = vi.fn();

    const { container } = render(
      <AppProvider>
        <CRMContactModal
          isOpen={true}
          onClose={onClose}
          onSave={onSave}
          accountId="acc-001"
          accountName="City of Greater Geelong"
        />
      </AppProvider>
    );

    expect(screen.getByText(/Add Buying Committee Stakeholder/i)).toBeInTheDocument();

    const saveBtn = screen.getByRole('button', { name: /Create Contact/i });
    expect(saveBtn).toBeInTheDocument();

    const firstNameInput = container.querySelector('input[placeholder*="Sarah"]') as HTMLInputElement;
    const lastNameInput = container.querySelector('input[placeholder*="Jenkins"]') as HTMLInputElement;
    const emailInput = container.querySelector('input[type="email"]') as HTMLInputElement;
    const form = container.querySelector('form') as HTMLFormElement;

    // Fill in required name and email then submit form
    fireEvent.change(firstNameInput, { target: { value: 'David' } });
    fireEvent.change(lastNameInput, { target: { value: 'Miller' } });
    fireEvent.change(emailInput, { target: { value: 'david.miller@geelong.vic.gov.au' } });
    fireEvent.submit(form);

    expect(onSave).toHaveBeenCalled();
  });
});
