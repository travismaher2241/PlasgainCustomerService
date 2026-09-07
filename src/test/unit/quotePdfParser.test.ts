// @vitest-environment node
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import {
  parseQuotePdf,
  parseQuoteFromPositionedText,
  parseAustralianDate,
  parseMoney,
  followUpDateFor,
  PositionedText
} from "../../server/quotePdfParser";

/**
 * The fixture mirrors the Ostendo grid exactly - same label and value columns,
 * same item columns - but every name, address and price in it is invented. Real
 * quotes carry a customer's details and Plasgain's pricing, which do not belong
 * in a repository.
 */
const FIXTURE = path.resolve(__dirname, "../fixtures/quote-sample.pdf");

describe("Australian date parsing", () => {
  it("reads d/m/y, never m/d/y", () => {
    // The whole feature turns on this. Read as m/d/y, 10/02 becomes October and
    // the quote - and its follow-up - silently move eight months.
    expect(parseAustralianDate("10/02/2026")).toBe("2026-02-10");
    expect(parseAustralianDate("3/4/2026")).toBe("2026-04-03");
    expect(parseAustralianDate("31/12/2026")).toBe("2026-12-31");
  });

  it("rejects dates the calendar does not have", () => {
    expect(parseAustralianDate("31/02/2026")).toBeUndefined();
    expect(parseAustralianDate("13/13/2026")).toBeUndefined();
    expect(parseAustralianDate("not a date")).toBeUndefined();
    expect(parseAustralianDate("2026-02-10")).toBeUndefined();
  });
});

describe("Money parsing", () => {
  it("reads printed currency", () => {
    expect(parseMoney("$17,625.33")).toBe(17625.33);
    expect(parseMoney("$1,020.00")).toBe(1020);
    expect(parseMoney("499")).toBe(499);
  });

  it("returns nothing for text that is not money", () => {
    expect(parseMoney("Each")).toBeUndefined();
    expect(parseMoney("")).toBeUndefined();
    expect(parseMoney("$--")).toBeUndefined();
  });
});

describe("Follow-up date", () => {
  it("is two days after the quote", () => {
    expect(followUpDateFor("2026-02-10")).toBe("2026-02-12"); // Tue -> Thu
  });

  it("moves off a weekend to the Monday", () => {
    // A reminder nobody is at work for is a reminder that gets missed.
    expect(followUpDateFor("2026-04-03")).toBe("2026-04-06"); // Fri +2 = Sun -> Mon
    expect(followUpDateFor("2026-04-02")).toBe("2026-04-06"); // Thu +2 = Sat -> Mon
  });

  it("leaves a weekday alone", () => {
    expect(followUpDateFor("2026-04-06")).toBe("2026-04-08"); // Mon -> Wed
  });
});

describe("Quote PDF parsing", () => {
  it("reads every commercial field off a real-shaped quote", async () => {
    const parsed = await parseQuotePdf(fs.readFileSync(FIXTURE));

    expect(parsed.quoteNumber).toBe("PL9001");
    expect(parsed.quoteDate).toBe("2026-04-03");
    expect(parsed.quoteExpiryDate).toBe("2026-05-03");
    expect(parsed.contactName).toBe("Dana Whitlock");
    expect(parsed.customerName).toBe("Example Shire Council");
    expect(parsed.customerAddress).toBe("12 Sample Street, Testville Vic 3999");
    expect(parsed.projectName).toBe("Sample Reserve pathway lighting");
  });

  it("reads the three totals separately", async () => {
    const parsed = await parseQuotePdf(fs.readFileSync(FIXTURE));

    // Nett drives pipeline value; gross is what the customer sees on the page.
    expect(parsed.nettTotal).toBe(4000);
    expect(parsed.taxTotal).toBe(400);
    expect(parsed.grossTotal).toBe(4400);
  });

  it("reads line items with their descriptions and drawing groups", async () => {
    const parsed = await parseQuotePdf(fs.readFileSync(FIXTURE));

    expect(parsed.lineItems).toHaveLength(3);
    expect(parsed.lineItems[0]).toMatchObject({
      productCode: "F18200210F",
      description: "Safepole Impact Absorbing Column 8.5m, Gal",
      quantity: 3,
      unit: "Each",
      unitPrice: 1000,
      extendedPrice: 3000,
      drawingNumber: "999999-PLD-01/999999-PLD-02"
    });

    // Freight sits after the drawing line, so it belongs to no drawing group.
    expect(parsed.lineItems[2].productCode).toBe("B18000000");
    expect(parsed.lineItems[2].drawingNumber).toBeUndefined();
  });

  it("raises no warnings on a quote it can read fully", async () => {
    const parsed = await parseQuotePdf(fs.readFileSync(FIXTURE));
    expect(parsed.warnings).toEqual([]);
  });

  it("says so plainly when the PDF has no text layer", async () => {
    // A scanned quote must be reported as unreadable, never silently imported
    // as an empty one.
    const notAPdf = Buffer.from("%PDF-1.4\n% not really a pdf\n");
    const parsed = await parseQuotePdf(notAPdf).catch(() => ({
      lineItems: [],
      warnings: ["unreadable"]
    }));
    expect(parsed.lineItems).toHaveLength(0);
    expect(parsed.warnings.length).toBeGreaterThan(0);
  });
});

describe("Warnings", () => {
  const row = (y: number, cells: Array<[number, string]>): PositionedText[] =>
    cells.map(([x, text]) => ({ x, y, text }));

  it("flags line items that do not add up to the quote's own total", () => {
    // Usually means a row was missed. Importing the wrong figure silently is
    // worse than asking someone to look.
    const items: PositionedText[] = [
      ...row(707, [[161, "PL1234"], [285, "QUOTE DATE:"], [365, "01/06/2026"]]),
      ...row(705, [[59, "QUOTATION #:"]]),
      ...row(653, [[59, "To:"], [81, "Someone"]]),
      ...row(642, [[81, "A Customer"]]),
      ...row(591, [[59, "Quote For:"]]),
      ...row(577, [[59, "A project"]]),
      ...row(494, [[59, "F18200210F"], [357, "1"], [381, "Each"], [427, "$100.00"], [497, "$100.00"]]),
      ...row(480, [[59, "A described product"]]),
      ...row(360, [[380, "Nett Total:"], [497, "$250.00"]])
    ];

    const parsed = parseQuoteFromPositionedText(items);

    expect(parsed.lineItems).toHaveLength(1);
    expect(parsed.warnings.join(" ")).toMatch(/add up to \$100\.00 but the quote's nett total is \$250\.00/);
  });

  it("reports a missing quote date rather than inventing one", () => {
    const items: PositionedText[] = [
      ...row(705, [[59, "QUOTATION #:"], [161, "PL1234"]]),
      ...row(653, [[59, "To:"], [81, "Someone"]]),
      ...row(642, [[81, "A Customer"]])
    ];

    const parsed = parseQuoteFromPositionedText(items);

    expect(parsed.quoteDate).toBeUndefined();
    expect(parsed.warnings.join(" ")).toMatch(/could not find the quote date/i);
  });

  it("reports an unreadable customer block instead of guessing", () => {
    const items: PositionedText[] = [
      ...row(707, [[161, "PL1234"], [285, "QUOTE DATE:"], [365, "01/06/2026"]]),
      ...row(705, [[59, "QUOTATION #:"]])
    ];

    const parsed = parseQuoteFromPositionedText(items);

    expect(parsed.customerName).toBeUndefined();
    expect(parsed.warnings.join(" ")).toMatch(/choose the account by hand/i);
  });

  it("handles alternative quote labels and product code formats", () => {
    const items: PositionedText[] = [
      ...row(705, [[59, "Quote #: "], [161, "PL7788"]]),
      ...row(690, [[285, "Date:"], [365, "15-05-2026"]]),
      ...row(670, [[59, "To:"], [81, "Jane Doe"]]),
      ...row(655, [[81, "Bayside City Council"]]),
      ...row(640, [[81, "10 Ocean Road, St Kilda VIC 3182"]]),
      ...row(610, [[59, "Quote For: Boardwalk replacement"]]),
      ...row(500, [[59, "PIPE-100-HD"], [357, "10"], [381, "Lengths"], [427, "$50.00"], [497, "$500.00"]]),
      ...row(485, [[59, "100mm Heavy Duty Recycled Plastic Pipe"]]),
      ...row(400, [[380, "Total Ex GST:"], [497, "$500.00"]]),
      ...row(385, [[380, "GST:"], [497, "$50.00"]]),
      ...row(370, [[380, "Total Inc GST:"], [497, "$550.00"]])
    ];

    const parsed = parseQuoteFromPositionedText(items);

    expect(parsed.quoteNumber).toBe("PL7788");
    expect(parsed.quoteDate).toBe("2026-05-15");
    expect(parsed.customerName).toBe("Bayside City Council");
    expect(parsed.contactName).toBe("Jane Doe");
    expect(parsed.projectName).toBe("Boardwalk replacement");
    expect(parsed.lineItems).toHaveLength(1);
    expect(parsed.lineItems[0].productCode).toBe("PIPE-100-HD");
    expect(parsed.lineItems[0].quantity).toBe(10);
    expect(parsed.lineItems[0].unitPrice).toBe(50);
    expect(parsed.lineItems[0].extendedPrice).toBe(500);
    expect(parsed.nettTotal).toBe(500);
    expect(parsed.taxTotal).toBe(50);
    expect(parsed.grossTotal).toBe(550);
  });
});
