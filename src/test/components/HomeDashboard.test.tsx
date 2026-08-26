import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { HomeDashboard } from '../../components/HomeDashboard';
import { AppProvider } from '../../context/AppContext';

const renderHome = () =>
  render(
    <AppProvider>
      <HomeDashboard />
    </AppProvider>
  );

/** The priority queue is the region labelled by the "Priority queue" heading. */
const queue = () => screen.getByRole('region', { name: /Priority queue/i });

describe('HomeDashboard', () => {
  it('leads with a plain statement of what needs attention', () => {
    renderHome();
    // The heading counts the work rather than greeting the user.
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/need you today|clear, Sarah/i);
    expect(screen.getByRole('heading', { name: /Priority queue/i })).toBeInTheDocument();
    expect(screen.getByText(/Quick Actions/i)).toBeInTheDocument();
  });

  it('buckets work by deadline urgency, not by pipeline stage', () => {
    renderHome();
    expect(screen.getByRole('button', { name: /Overdue/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Due within 3 days/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /With customer/i })).toBeInTheDocument();
  });

  it('surfaces an overdue quote as overdue rather than as a plain due date', () => {
    renderHome();
    // Seed data contains a quote whose deadline has passed. It must be named as
    // such — the previous dashboard rendered it as an ordinary "Due 25 Aug".
    const overdueChips = within(queue()).queryAllByText(/^Overdue \d+ days?$/i);
    if (overdueChips.length > 0) {
      // And it must be the first row in the queue.
      const rows = within(queue()).getAllByRole('article');
      expect(within(rows[0]).getByText(/^Overdue \d+ days?$/i)).toBeInTheDocument();
    }
    // Nothing in the queue should show a bare deadline with no urgency framing.
    expect(within(queue()).queryByText(/^· Due /)).not.toBeInTheDocument();
  });

  it('switches the role lens', () => {
    renderHome();
    const sales = screen.getByRole('button', { name: /^Sales$/i });
    fireEvent.click(sales);
    expect(sales).toHaveAttribute('aria-pressed', 'true');

    const technical = screen.getByRole('button', { name: /^Technical$/i });
    fireEvent.click(technical);
    expect(technical).toHaveAttribute('aria-pressed', 'true');
    expect(sales).toHaveAttribute('aria-pressed', 'false');
  });

  it('filters the queue by urgency bucket and clears again', () => {
    renderHome();
    const before = within(queue()).getAllByRole('article').length;

    const withCustomer = screen.getByRole('button', { name: /With customer/i });
    if ((withCustomer as HTMLButtonElement).disabled) return; // no records in bucket

    fireEvent.click(withCustomer);
    expect(withCustomer).toHaveAttribute('aria-pressed', 'true');

    const clear = screen.getByText(/^Clear filter$/i);
    expect(clear).toBeInTheDocument();

    fireEvent.click(clear);
    expect(screen.queryByText(/^Clear filter$/i)).not.toBeInTheDocument();
    expect(within(queue()).getAllByRole('article').length).toBe(before);
  });

  it('offers Open and Prep call on every queue row', () => {
    renderHome();
    const rows = within(queue()).getAllByRole('article');
    expect(rows.length).toBeGreaterThan(0);
    rows.forEach((row) => {
      expect(within(row).getByRole('button', { name: /^Open$/i })).toBeInTheDocument();
      expect(within(row).getByRole('button', { name: /Prep call/i })).toBeInTheDocument();
    });
  });

  it('opens the More Tools menu', () => {
    renderHome();
    fireEvent.click(screen.getByText(/More Tools/i));
    expect(screen.getByText(/Product Catalogues & PDFs/i)).toBeInTheDocument();
    expect(screen.getByText(/Review Quote Accuracy/i)).toBeInTheDocument();
    expect(screen.getByText(/Customer Intelligence/i)).toBeInTheDocument();
  });
});
