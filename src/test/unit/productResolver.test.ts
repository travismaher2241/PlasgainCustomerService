import { describe, it, expect } from 'vitest';
import {
  resolveSingleProduct,
  preflightProductPackage
} from '../../utils/productResolver';

describe('Canonical Product Resolution & Package Preflight (P0-12, P0-13, P0-14)', () => {
  it('resolves exact product codes reliably into verified PlasgainProducts (P0-12)', () => {
    const res1 = resolveSingleProduct('50W-INTENSE');
    expect(res1.status).toBe('EXACT_MATCH');
    expect(res1.product?.id).toBe('prod-intense-50w');
    expect(res1.product?.name).toContain('Intense Light');

    const res2 = resolveSingleProduct('PBS-75 / PBS-125');
    expect(res2.status).toBe('EXACT_MATCH');
    expect(res2.product?.id).toBe('prod-pro-blade');
  });

  it('resolves approved product aliases and common drawing text variants', () => {
    const alias1 = resolveSingleProduct('Pro Blade Solar 75W Area Luminaire');
    expect(['EXACT_MATCH', 'ALIAS_MATCH']).toContain(alias1.status);
    expect(alias1.product?.id).toBe('prod-pro-blade');

    const alias2 = resolveSingleProduct('Polymeric Cable Protection Roll 150mm');
    expect(['EXACT_MATCH', 'ALIAS_MATCH']).toContain(alias2.status);
    expect(alias2.product?.id).toBe('prod-cable-cover');

    const alias3 = resolveSingleProduct('6m Plaspole Composite Light Pole');
    expect(['EXACT_MATCH', 'ALIAS_MATCH']).toContain(alias3.status);
    expect(alias3.product?.id).toBe('prod-plaspole');
  });

  it('preflights deal products and correctly reports match counters', () => {
    const dealItems = [
      '50W-INTENSE',
      'Plaspole 4.5m Direct Burial Composite Pole',
      'Superlux 60W Solar'
    ];

    const preflight = preflightProductPackage(dealItems);
    expect(preflight.totalItems).toBe(3);
    expect(preflight.matchedCount).toBe(3);
    expect(preflight.unmatchedCount).toBe(0);
    expect(preflight.allResolved).toBe(true);
    expect(preflight.resolvedProducts.length).toBe(3);
  });

  it('flags unverified or proprietary customer line items for manual mapping (P0-14)', () => {
    const mixedItems = [
      '50W-INTENSE',
      'Unknown Custom Decorative Post Top 24V'
    ];

    const preflight = preflightProductPackage(mixedItems);
    expect(preflight.totalItems).toBe(2);
    expect(preflight.matchedCount).toBe(1);
    expect(preflight.unmatchedCount).toBe(1);
    expect(preflight.allResolved).toBe(false);

    // Apply manual mapping override
    const preflightAfterMapping = preflightProductPackage(mixedItems, {
      'Unknown Custom Decorative Post Top 24V': 'prod-intense-50w'
    });

    expect(preflightAfterMapping.unmatchedCount).toBe(0);
    expect(preflightAfterMapping.allResolved).toBe(true);
    expect(preflightAfterMapping.items[1].status).toBe('MANUALLY_MAPPED');
    expect(preflightAfterMapping.items[1].product?.id).toBe('prod-intense-50w');
  });
});
