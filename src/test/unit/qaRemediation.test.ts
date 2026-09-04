// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { validateDealValue } from '../../utils/dealValueValidator';
import { resolveSingleProduct } from '../../utils/productResolver';

describe('Deal value basis (understated pipeline)', () => {
  // Per-unit with a blank quantity used to save the unit price as the whole
  // project: a $1,450/ea job for 34 poles booked as $1,450, marked "Known".
  it('rejects a per-unit price with no quantity', () => {
    const result = validateDealValue({ enteredValue: 1450, basis: 'PER_UNIT' });

    expect(result.isValid).toBe(false);
    expect(result.severity).toBe('error');
    expect(result.warningMessage).toMatch(/quantity required/i);
    expect(result.suggestedCorrection?.basis).toBe('TOTAL');
  });

  it('accepts a per-unit price once the quantity is supplied', () => {
    const result = validateDealValue({ enteredValue: 1450, basis: 'PER_UNIT', quantity: 34 });

    expect(result.isValid).toBe(true);
    expect(result.effectiveTotal).toBe(49300);
    expect(result.effectiveUnitPrice).toBe(1450);
  });

  it('still accepts a project total with no quantity', () => {
    const result = validateDealValue({ enteredValue: 49300, basis: 'TOTAL' });

    expect(result.isValid).toBe(true);
    expect(result.effectiveTotal).toBe(49300);
  });

  it('keeps catching the order-of-magnitude slip it already caught', () => {
    const result = validateDealValue({ enteredValue: 1600, basis: 'TOTAL', quantity: 30 });

    expect(result.isOutlier).toBe(true);
    expect(result.suggestedCorrection?.basis).toBe('PER_UNIT');
  });
});

describe('Product resolution (invented SKUs)', () => {
  const TEST_CATALOGUE = [
    { id: 'prod-enlighten-zorro-2', code: 'ZAL15S / ZAL40S / ZAL60S', name: 'enLighten Zorro 2 Area Luminaire' },
    { id: 'prod-solar-blade-sonaray', code: 'SS-2020 / SS-2030 / SS-2060', name: 'Sonaray Solar Blade Platform' },
    { id: 'prod-roadway-vled-70w', code: 'V-LED-70W', name: 'Roadway V-LED 70W Luminaire' },
    { id: 'prod-pro-blade', code: 'PBS-75 / PBS-125', name: 'Pro Blade Solar 75/125' },
    { id: 'prod-intense-50w', code: '50W-INTENSE', name: 'Intense Light - 50W Solar' },
    { id: 'prod-plaspole', code: 'PLASPOLE-SERIES', name: 'Plaspole Composite Pole' }
  ] as any;

  // Real families must pass; invented ones must not.
  const realFamilies: Array<[string, string]> = [
    ['ZAL40S-T3-4K-B', 'enLighten Zorro 2 (40W)'],
    ['SS-2060', 'Sonaray Solar Blade SS-2060'],
    ['V-LED-70W', 'Roadway V-LED 70W'],
    ['PBS-125', 'Pro Blade Solar 125'],
    ['50W-INTENSE', 'Intense Light - 50W Solar'],
    ['PLASPOLE-SERIES', 'Plaspole Composite Pole']
  ];

  it.each(realFamilies)('resolves %s to a catalogue product', (productCode, productName) => {
    const result = resolveSingleProduct({ productCode, productName }, TEST_CATALOGUE);

    expect(result.status).not.toBe('UNMATCHED');
    expect(result.product).toBeDefined();
  });

  it.each([
    ['TOTALLY-MADE-UP-9000', 'Fictional Megalight 9000'],
    ['XYZ-1', 'Northern Lights Ultra Beam']
  ])('rejects %s, which corresponds to nothing in the catalogue', (productCode, productName) => {
    const result = resolveSingleProduct({ productCode, productName }, TEST_CATALOGUE);

    expect(result.product).toBeUndefined();
    expect(result.status).toBe('UNMATCHED');
  });

  it('resolves a family alias to the real catalogue entry, not the quoted string', () => {
    const result = resolveSingleProduct({
      productCode: 'ROADWAY-VLED-150W',
      productName: 'Plasgain Roadway V-LED 150W Luminaire'
    }, TEST_CATALOGUE);

    expect(result.status).toBe('ALIAS_MATCH');
    expect(result.product?.code).toBe('V-LED-70W');
  });

  it('matches a single SKU inside a compound catalogue code', () => {
    const result = resolveSingleProduct({ productCode: 'SS-2030', productName: 'Solar Blade' }, TEST_CATALOGUE);

    expect(result.product?.code).toBe('SS-2020 / SS-2030 / SS-2060');
  });
});
