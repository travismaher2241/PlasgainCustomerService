/**
 * Plasgain Document Intelligence & Classification Engine
 * 
 * Automatically infers Product Family, Document Type, Canonical Title,
 * and Version from file names and document content without requiring
 * manual user entry.
 */

/**
 * The one list of document types the whole app agrees on.
 *
 * The upload form's dropdown, the server's accepted values, and whatever this
 * classifier can infer must never drift apart: when they did, a file the
 * classifier read as an "Engineering Drawing" was rejected on submit as an
 * invalid type, while the dropdown showed nothing wrong because the value had
 * no matching option. Add new types here and nowhere else.
 */
export const DOCUMENT_TYPES = [
  "Specification",
  "Standard / Guide",
  "Datasheet",
  "Catalogue",
  "Engineering Drawing",
  "Compliance Certificate",
  "Installation Manual",
  "Warranty Doc"
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export interface InferredDocumentMetadata {
  productFamily: string;
  documentType: DocumentType;
  title: string;
  version: string;
  source: string;
  confidence: "high" | "medium" | "inferred";
  explanation: string;
}

export function inferDocumentMetadata(
  fileName: string,
  rawSnippet?: string
): InferredDocumentMetadata {
  const cleanName = (fileName || "").replace(/\.[^/.]+$/, ""); // remove extension
  const combinedText = `${cleanName} ${rawSnippet || ""}`.toLowerCase();

  // 1. Infer Product Family
  let productFamily = "General / Public Lighting";
  let explanation = "General Plasgain public lighting documentation";
  let confidence: "high" | "medium" | "inferred" = "inferred";

  if (
    /pro\s*blade|problade|\bpbs\b|pbs-75|pbs-125|blade\s*solar/i.test(combinedText)
  ) {
    productFamily = "Pro Blade Solar";
    explanation = "Matched Pro Blade Solar luminaire & PV system";
    confidence = "high";
  } else if (
    /intense\s*light|50w-intense|50w\s*intense|intense\s*solar|\bintense\b/i.test(combinedText)
  ) {
    productFamily = "Intense Light Solar";
    explanation = "Matched Intense Light integrated pathway solar system";
    confidence = "high";
  } else if (
    /plaspole|composite\s*pole|composite\s*column|direct\s*burial\s*pole|frp\s*pole|filament\s*wound|non-conductive/i.test(
      combinedText
    )
  ) {
    productFamily = "Plaspole Composite Columns";
    explanation = "Matched Plaspole direct-burial composite columns";
    confidence = "high";
  } else if (
    /cable\s*cover|polymeric\s*cover|polymeric\s*slab|utility\s*slab|trench\s*protection|as\s*4702|as4702|pcc-300|cc-poly|energex|ergon|ausgrid/i.test(
      combinedText
    )
  ) {
    productFamily = "AS 4702 Polymeric Cable Cover";
    explanation = "Matched AS 4702 civil cable mechanical protection";
    confidence = "high";
  } else if (
    /public\s*lighting|lighting\s*specification|street\s*lighting|pathway\s*lighting|designers|lighting\s*design|as\/?nzs\s*1158|as\s*1158|category\s*p|category\s*v|\bcat\s*p\b|\bcat\s*v\b/i.test(
      combinedText
    )
  ) {
    productFamily = "Public Lighting Specifications & Standards";
    explanation = "Matched Public Lighting engineering & council design specifications";
    confidence = "high";
  } else if (
    /solar\s*and\s*battery|off-?grid\s*solar|lifepo4|solar\s*sizing|as\/?nzs\s*4509|as\s*4509|autonomy/i.test(
      combinedText
    )
  ) {
    productFamily = "Commercial Solar & Battery Systems";
    explanation = "Matched Clean Energy solar generation & battery storage standards";
    confidence = "medium";
  } else if (
    /sub-?mains|conduit|civil\s*trenching|electrical\s*infrastructure/i.test(combinedText)
  ) {
    productFamily = "Civil & Electrical Infrastructure";
    explanation = "Matched Civil & electrical utility infrastructure";
    confidence = "medium";
  }

  // 2. Infer Document Type
  let documentType: DocumentType = "Specification";
  if (/datasheet|data\s*sheet|cut\s*sheet|product\s*sheet/i.test(combinedText)) {
    documentType = "Datasheet";
  } else if (/specification|specifications|\bspec\b|\bspecs\b|designers|technical\s*req/i.test(combinedText)) {
    documentType = "Specification";
    // "cad" needs its boundaries: unanchored it also matched cascade, decade and cadastral.
  } else if (/drawing|\bcad\b|\bga\b|schematic|dimensional|elevation|cross\s*section/i.test(combinedText)) {
    documentType = "Engineering Drawing";
  } else if (/installation|install\s*guide|mounting\s*guide|assembly\s*manual/i.test(combinedText)) {
    documentType = "Installation Manual";
  } else if (/compliance|certificate|cert\b|test\s*report|structural\s*test|impact\s*test/i.test(combinedText)) {
    documentType = "Compliance Certificate";
  } else if (/standard|standards|guideline|guidelines|handbook|as\/?nzs/i.test(combinedText)) {
    documentType = "Standard / Guide";
  } else if (/catalogue|catalog|brochure|overview/i.test(combinedText)) {
    documentType = "Catalogue";
  }

  // 3. Infer Clean Title
  const formattedTitle = cleanName
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // 4. Infer Version / Revision
  let version = "Rev 1.0";
  const revMatch = cleanName.match(/(?:rev(?:ision)?|v(?:er(?:sion)?)?)[\s._-]*([0-9]+(?:\.[0-9]+)*)/i);
  const yearMatch = cleanName.match(/\b(202[4-9](?:\.[0-9]+)?)\b/);
  const numSuffixMatch = cleanName.match(/(?:designers|release|draft|edition|part|issue)[\s._-]*([0-9]+)/i);

  if (revMatch) {
    version = `Rev ${revMatch[1]}`;
  } else if (yearMatch) {
    version = `Edition ${yearMatch[1]}`;
  } else if (numSuffixMatch) {
    version = `Rev ${numSuffixMatch[1]}.0`;
  }

  // 5. Infer Author / Source
  let source = "Plasgain Engineering Dept";
  if (/council|local\s*gov/i.test(combinedText)) {
    source = "Local Government Engineering Standard";
  } else if (/ausgrid|energex|ergon|powercor|essential|western\s*power|sapn/i.test(combinedText)) {
    source = "Electrical Utility Authority Standard";
  } else if (/standards\s*australia|as\/?nzs/i.test(combinedText)) {
    source = "Standards Australia / NZ";
  }

  return {
    productFamily,
    documentType,
    title: formattedTitle || "Plasgain Engineering Document",
    version,
    source,
    confidence,
    explanation
  };
}
