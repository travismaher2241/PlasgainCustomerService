/**
 * Quote PDF import - parser
 *
 * Reads a Plasgain quote PDF (Ostendo output) and returns the commercial facts
 * on it: quote number, dates, customer, project and line items.
 *
 * Deliberately deterministic. Ostendo lays the document out on a fixed grid, so
 * fields can be read from their column positions exactly rather than inferred.
 * A model asked to do this would occasionally return a plausible quote number
 * or a wrong dollar figure, and a wrong figure filed against a customer is a
 * commercial problem, not a formatting one. This also means the import works
 * with no API key and its behaviour is reproducible in tests.
 *
 * Where a field cannot be read, the parser says so in `warnings` and leaves the
 * value undefined. It never guesses.
 */

/** One text run from the PDF, with the position it was drawn at. */
export interface PositionedText {
  x: number;
  y: number;
  text: string;
}

export interface QuoteLineItem {
  productCode: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  extendedPrice: number;
  /** Drawing reference this item was grouped under, when the quote lists one. */
  drawingNumber?: string;
}

export interface ParsedQuote {
  quoteNumber?: string;
  /** ISO yyyy-mm-dd. Source is Australian d/m/y. */
  quoteDate?: string;
  quoteExpiryDate?: string;
  quoteTerms?: string;
  customerName?: string;
  contactName?: string;
  customerAddress?: string;
  /** The same address split for storage. Absent when the last line is not a
   *  recognisable Australian "Suburb STATE 1234" line - a half-parsed address
   *  in the wrong fields is worse than none. */
  customerAddressParts?: {
    street: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
  };
  projectName?: string;
  lineItems: QuoteLineItem[];
  /** Ex GST. This is what drives pipeline value. */
  nettTotal?: number;
  taxTotal?: number;
  /** Inc GST, as printed on the document the customer receives. */
  grossTotal?: number;
  /** Anything the parser could not read, in words a salesperson can act on. */
  warnings: string[];
}

/** Text runs whose y differs by less than this belong to the same visual row. */
const ROW_TOLERANCE = 4;

/** Left edge of the label column; values sit to the right of it. */
const LABEL_COLUMN_MAX_X = 80;

/**
 * Ostendo writes dates as d/m/y. Parsing them as m/d/y would silently shift a
 * quote by months and take the follow-up date with it, so the day-first order
 * is enforced rather than left to Date's discretion.
 */
export function parseAustralianDate(value: string): string | undefined {
  const match = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return undefined;
  const [, dd, mm, yyyy] = match;
  const day = Number(dd);
  const month = Number(mm);
  const year = Number(yyyy);
  if (month < 1 || month > 12 || day < 1 || day > 31) return undefined;

  // Reject a date the calendar does not have, such as 31/02.
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) return undefined;

  return `${yyyy}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Splits an Australian address block into parts.
 *
 * Only the final "Suburb STATE 3156" line is pattern-matched; everything above
 * it is the street. If that line does not match, nothing is returned, because
 * guessing which fragment is the suburb puts wrong data in named fields.
 */
export function splitAustralianAddress(
  lines: string[]
): ParsedQuote["customerAddressParts"] {
  if (lines.length === 0) return undefined;
  const last = lines[lines.length - 1].trim();
  const match = last.match(/^(.*?)[,\s]+([A-Za-z]{2,3})\s+(\d{4})$/);
  if (!match) return undefined;

  const [, city, state, postcode] = match;
  if (!city.trim()) return undefined;

  return {
    street: lines.slice(0, -1).join(", ").trim(),
    city: city.trim(),
    state: state.toUpperCase(),
    postcode,
    country: "Australia"
  };
}

/** "$17,625.33" -> 17625.33. Returns undefined for anything that is not money. */
export function parseMoney(value: string): number | undefined {
  const cleaned = value.replace(/[$,\s]/g, "");
  if (!/^-?\d+(?:\.\d+)?$/.test(cleaned)) return undefined;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : undefined;
}

/** Groups text runs into visual rows, each ordered left to right. */
export function groupIntoRows(items: PositionedText[]): PositionedText[][] {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const rows: PositionedText[][] = [];

  for (const item of sorted) {
    const current = rows[rows.length - 1];
    if (current && Math.abs(current[0].y - item.y) <= ROW_TOLERANCE) {
      current.push(item);
    } else {
      rows.push([item]);
    }
  }

  for (const row of rows) row.sort((a, b) => a.x - b.x);
  return rows;
}

const rowText = (row: PositionedText[]): string =>
  row.map((i) => i.text).join(" ").replace(/\s+/g, " ").trim();

/**
 * Reads the value that follows a label on the same visual row.
 *
 * The labels and their values sit in separate columns, so "QUOTE DATE:" and
 * "10/02/2026" arrive as two runs a few points apart vertically. Matching on
 * the row rather than the string is what keeps this stable when Ostendo nudges
 * the layout.
 */
function valueAfterLabel(rows: PositionedText[][], label: string): string | undefined {
  for (const row of rows) {
    const idx = row.findIndex((i) => i.text.trim().toUpperCase().startsWith(label.toUpperCase()));
    if (idx === -1) continue;
    const after = row
      .slice(idx + 1)
      .map((i) => i.text.trim())
      .filter(Boolean);
    if (after.length > 0) return after.join(" ");
  }
  return undefined;
}

/**
 * The quote number and expiry sit in the left value column, on the same row as
 * a label that is printed slightly lower. Reading them by column position
 * avoids depending on which of the two the row happens to start with.
 */
function leftColumnValueOnLabelRow(
  rows: PositionedText[][],
  label: string
): string | undefined {
  for (const row of rows) {
    const hasLabel = row.some((i) => i.text.trim().toUpperCase().startsWith(label.toUpperCase()));
    if (!hasLabel) continue;
    const value = row.find(
      (i) =>
        i.x > LABEL_COLUMN_MAX_X &&
        !/:$/.test(i.text.trim()) &&
        Boolean(i.text.trim())
    );
    if (value) return value.text.trim();
  }
  return undefined;
}

export function parseQuoteFromPositionedText(items: PositionedText[]): ParsedQuote {
  const rows = groupIntoRows(items);
  const warnings: string[] = [];

  const quoteNumber =
    leftColumnValueOnLabelRow(rows, "QUOTATION #") ||
    // The footer repeats it on every page as "Quote: PL5597".
    (rowText(rows.find((r) => /^Quote:\s/i.test(rowText(r))) || []).match(/^Quote:\s*(\S+)/i) || [])[1];
  if (!quoteNumber) warnings.push("Could not find the quote number on this PDF.");

  const rawQuoteDate = valueAfterLabel(rows, "QUOTE DATE:");
  const quoteDate = rawQuoteDate ? parseAustralianDate(rawQuoteDate) : undefined;
  if (!quoteDate) {
    warnings.push(
      rawQuoteDate
        ? `Could not read the quote date "${rawQuoteDate}" as a date.`
        : "Could not find the quote date, so no follow-up date could be worked out."
    );
  }

  const rawExpiry = leftColumnValueOnLabelRow(rows, "QUOTE EXPIRY");
  const quoteExpiryDate = rawExpiry ? parseAustralianDate(rawExpiry) : undefined;
  if (rawExpiry && !quoteExpiryDate) {
    warnings.push(`Could not read the expiry date "${rawExpiry}" as a date.`);
  }

  const quoteTerms = valueAfterLabel(rows, "QUOTE TERMS:");

  // "To:" block - first line is the person, the lines beneath are the company
  // and its address, all sharing the same left edge.
  let contactName: string | undefined;
  let customerName: string | undefined;
  let customerAddress: string | undefined;
  let customerAddressParts: ParsedQuote["customerAddressParts"];

  const toRowIndex = rows.findIndex((r) => r.some((i) => i.text.trim() === "To:"));
  if (toRowIndex >= 0) {
    const toRow = rows[toRowIndex];
    const toIdx = toRow.findIndex((i) => i.text.trim() === "To:");
    const nameX = toRow[toIdx + 1]?.x;
    contactName = toRow[toIdx + 1]?.text.trim();

    const block: string[] = [];
    for (let i = toRowIndex + 1; i < rows.length; i++) {
      const line = rows[i].filter((t) => nameX !== undefined && Math.abs(t.x - nameX) < 6);
      if (line.length === 0) break;
      block.push(line.map((t) => t.text.trim()).join(" "));
    }
    if (block.length > 0) customerName = block[0];
    if (block.length > 1) {
      const addressLines = block.slice(1);
      customerAddress = addressLines.join(", ");
      customerAddressParts = splitAustralianAddress(addressLines);
    }
  }
  if (!customerName) {
    warnings.push("Could not read the customer from the To: block - choose the account by hand.");
  }

  // "Quote For:" - the project sits on the row beneath the label.
  let projectName: string | undefined;
  const quoteForIndex = rows.findIndex((r) => rowText(r).toLowerCase().startsWith("quote for:"));
  if (quoteForIndex >= 0) {
    const sameRow = valueAfterLabel(rows, "Quote For:");
    projectName = sameRow || rowText(rows[quoteForIndex + 1] || []);
  }
  if (!projectName) warnings.push("Could not find the project description (Quote For).");

  // Line items. A priced row is: code, qty, unit, unit price, ext price - and
  // the description is the row directly beneath it.
  const lineItems: QuoteLineItem[] = [];
  let currentDrawing: string | undefined;

  for (let i = 0; i < rows.length; i++) {
    const cells = rows[i].map((c) => c.text.trim());
    const text = rowText(rows[i]);

    const drawing = text.match(/^Drawing Number:\s*(.+)$/i);
    if (drawing) {
      // Applies to the items above it, which have already been pushed.
      const ref = drawing[1].trim();
      for (let k = lineItems.length - 1; k >= 0; k--) {
        if (lineItems[k].drawingNumber) break;
        lineItems[k].drawingNumber = ref;
      }
      currentDrawing = undefined;
      continue;
    }

    if (cells.length < 5) continue;
    const [code, qty, unit, unitPrice, extPrice] = cells;
    if (!/^[A-Z0-9]{6,}$/.test(code)) continue;

    const quantity = Number(qty);
    const unitPriceNum = parseMoney(unitPrice);
    const extendedPrice = parseMoney(extPrice);
    if (!Number.isFinite(quantity) || unitPriceNum === undefined || extendedPrice === undefined) continue;

    lineItems.push({
      productCode: code,
      description: rowText(rows[i + 1] || []),
      quantity,
      unit,
      unitPrice: unitPriceNum,
      extendedPrice,
      drawingNumber: currentDrawing
    });
  }

  if (lineItems.length === 0) warnings.push("No priced line items were found on this PDF.");

  const readTotal = (label: string): number | undefined => {
    const raw = valueAfterLabel(rows, label);
    return raw ? parseMoney(raw) : undefined;
  };

  const nettTotal = readTotal("Nett Total:");
  const taxTotal = readTotal("Tax Total:");
  const grossTotal = readTotal("Total:");

  if (nettTotal === undefined) {
    warnings.push("Could not find the nett total, which is the figure used for deal value.");
  }

  // A quote whose lines do not add up to its own total usually means a row was
  // missed, and that is worth saying rather than importing a wrong figure.
  if (nettTotal !== undefined && lineItems.length > 0) {
    const summed = lineItems.reduce((acc, li) => acc + li.extendedPrice, 0);
    if (Math.abs(summed - nettTotal) > 0.02) {
      warnings.push(
        `Line items add up to $${summed.toFixed(2)} but the quote's nett total is ` +
          `$${nettTotal.toFixed(2)}. Check the line items before saving.`
      );
    }
  }

  return {
    quoteNumber,
    quoteDate,
    quoteExpiryDate,
    quoteTerms,
    customerName,
    contactName,
    customerAddress,
    customerAddressParts,
    projectName,
    lineItems,
    nettTotal,
    taxTotal,
    grossTotal,
    warnings
  };
}

/**
 * The follow-up date the import sets: two days after the quote went out, moved
 * off a weekend. A reminder nobody is at work for is a reminder that gets
 * missed, which defeats the point of setting one automatically.
 */
export function followUpDateFor(quoteDate: string, daysAfter = 2): string {
  const date = new Date(`${quoteDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + daysAfter);
  const day = date.getUTCDay();
  if (day === 6) date.setUTCDate(date.getUTCDate() + 2); // Saturday -> Monday
  if (day === 0) date.setUTCDate(date.getUTCDate() + 1); // Sunday -> Monday
  return date.toISOString().split("T")[0];
}

/** Extracts positioned text from a PDF buffer, then parses it. */
export async function parseQuotePdf(buffer: Buffer | Uint8Array): Promise<ParsedQuote> {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await getDocument({
    data: new Uint8Array(buffer),
    isEvalSupported: false,
    useSystemFonts: true
  }).promise;

  const items: PositionedText[] = [];
  // Later pages are offset downward so their rows never merge with page one's.
  const PAGE_STRIDE = 100000;

  for (let pageNo = 1; pageNo <= doc.numPages; pageNo++) {
    const page = await doc.getPage(pageNo);
    const content = await page.getTextContent();
    for (const item of content.items as any[]) {
      if (!item.str || !item.str.trim()) continue;
      items.push({
        x: Math.round(item.transform[4]),
        y: Math.round(item.transform[5]) - pageNo * PAGE_STRIDE,
        text: item.str
      });
    }
  }

  if (items.length === 0) {
    return {
      lineItems: [],
      warnings: [
        "This PDF has no readable text - it is probably a scan or an image. " +
          "Nothing could be read from it automatically."
      ]
    };
  }

  return parseQuoteFromPositionedText(items);
}
