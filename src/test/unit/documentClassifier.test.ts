import { describe, it, expect } from 'vitest';
import { inferDocumentMetadata } from '../../utils/documentClassifier';

describe('Document Classifier & Product Family Auto-Inference', () => {
  it('correctly classifies Public Lighting Specifications & Standards', () => {
    const result = inferDocumentMetadata('Public Lighting Specifications - Designers 2.pdf');
    expect(result.productFamily).toBe('Public Lighting Specifications & Standards');
    expect(result.documentType).toBe('Specification');
    expect(result.title).toBe('Public Lighting Specifications Designers 2');
    expect(result.version).toBe('Rev 2.0');
    expect(result.confidence).toBe('high');
  });

  it('correctly classifies Pro Blade Solar documents', () => {
    const result = inferDocumentMetadata('Pro Blade Solar 75W Technical Datasheet 2026.pdf');
    expect(result.productFamily).toBe('Pro Blade Solar');
    expect(result.documentType).toBe('Datasheet');
    expect(result.version).toBe('Edition 2026');
  });

  it('correctly classifies Intense Light Solar documents', () => {
    const result = inferDocumentMetadata('50W Intense Light Solar Pathway Luminaire Specification.pdf');
    expect(result.productFamily).toBe('Intense Light Solar');
    expect(result.documentType).toBe('Specification');
  });

  it('correctly classifies Plaspole Composite Columns documents', () => {
    const result = inferDocumentMetadata('Plaspole Direct Burial Composite Pole Drawing v3.2.pdf');
    expect(result.productFamily).toBe('Plaspole Composite Columns');
    expect(result.documentType).toBe('Engineering Drawing');
    expect(result.version).toBe('Rev 3.2');
  });

  it('correctly classifies AS 4702 Polymeric Cable Cover documents', () => {
    const result = inferDocumentMetadata('Plasgain AS 4702 Polymeric Cable Cover Compliance Cert.pdf');
    expect(result.productFamily).toBe('AS 4702 Polymeric Cable Cover');
    expect(result.documentType).toBe('Compliance Certificate');
  });

  it('correctly classifies general or standards guides with fallback', () => {
    const result = inferDocumentMetadata('AS NZS 1158.3.1 Lighting Design Guidelines.pdf');
    expect(result.productFamily).toBe('Public Lighting Specifications & Standards');
    expect(result.documentType).toBe('Standard / Guide');
  });
});
