import { describe, it, expect } from "vitest";
import {
  decodeCsvBytes,
  parseDelimitedText,
  mapCsvHeaders,
  parseAustralianAddress,
  territoryForState,
  splitPersonName,
  normalizeAccountType,
  buildAccountImportPlan
} from "../../utils/accountCsvImport";
import { Account } from "../../types/crm";

const HEADER = "Customer Name,Customer Style,Address 1,Address 2,Contact,Phone";

const makeCsv = (...lines: string[]) => [HEADER, ...lines].join("\n");

const baseOptions = { accountOwner: "Travis Maher", idSeed: "seed", today: "2026-09-08" };

describe("decodeCsvBytes", () => {
  it("decodes UTF-8 and strips the BOM", () => {
    const bytes = new TextEncoder().encode("﻿Customer Name\nO’Brien Pty Ltd");
    expect(decodeCsvBytes(bytes)).toBe("Customer Name\nO’Brien Pty Ltd");
  });

  it("falls back to Windows-1252 rather than corrupting an apostrophe", () => {
    // "Michael D<0x92>Angelo" — the curly apostrophe ERP exports emit.
    const bytes = new Uint8Array([77, 105, 99, 104, 97, 101, 108, 32, 68, 0x92, 65, 110, 103, 101, 108, 111]);
    expect(decodeCsvBytes(bytes)).toBe("Michael D’Angelo");
  });
});

describe("parseDelimitedText", () => {
  it("keeps commas inside quoted fields", () => {
    const table = parseDelimitedText('A,B\n"266 Glen Osmond Road, Fullarton SA 5063",x');
    expect(table.headers).toEqual(["A", "B"]);
    expect(table.rows).toEqual([["266 Glen Osmond Road, Fullarton SA 5063", "x"]]);
  });

  it("handles escaped quotes, CRLF endings and blank lines", () => {
    const table = parseDelimitedText('A,B\r\n"He said ""hi""",2\r\n\r\n');
    expect(table.rows).toEqual([['He said "hi"', "2"]]);
  });

  it("handles a newline inside a quoted field", () => {
    const table = parseDelimitedText('A,B\n"line1\nline2",2');
    expect(table.rows).toEqual([["line1\nline2", "2"]]);
  });
});

describe("mapCsvHeaders", () => {
  it("maps the Ostendo customer list headers", () => {
    expect(mapCsvHeaders(HEADER.split(","))).toEqual({
      name: 0,
      style: 1,
      address1: 2,
      address2: 3,
      contact: 4,
      phone: 5
    });
  });

  it("accepts common aliases and reports nothing for unknown columns", () => {
    const mapping = mapCsvHeaders(["Company Name", "Type", "Email Address", "Revenue"]);
    expect(mapping.name).toBe(0);
    expect(mapping.style).toBe(1);
    expect(mapping.email).toBe(2);
    expect(mapping.website).toBeUndefined();
  });
});

describe("parseAustralianAddress", () => {
  it("splits a single-line address on the comma", () => {
    expect(parseAustralianAddress("266 Glen Osmond Road, Fullarton SA 5063", "")).toEqual({
      street: "266 Glen Osmond Road",
      city: "Fullarton",
      state: "SA",
      postcode: "5063",
      country: "Australia"
    });
  });

  it("joins Address 1 and Address 2", () => {
    expect(parseAustralianAddress("1651-1657 Centre Road", "Springvale VIC 3171")).toEqual({
      street: "1651-1657 Centre Road",
      city: "Springvale",
      state: "VIC",
      postcode: "3171",
      country: "Australia"
    });
  });

  it("reads a postcode written before the state", () => {
    expect(parseAustralianAddress("1593-1597 Dandenong Rd", "Oakleigh 3166, VIC")).toMatchObject({
      street: "1593-1597 Dandenong Rd",
      city: "Oakleigh",
      state: "VIC",
      postcode: "3166"
    });
  });

  it("takes the suburb off the end when there is no separating comma", () => {
    expect(parseAustralianAddress("243 - 245 Thompson Road North Geelong, VIC 3215", "")).toMatchObject({
      street: "243 - 245 Thompson Road",
      city: "North Geelong",
      state: "VIC"
    });
  });

  it("keeps a level and street number together", () => {
    expect(parseAustralianAddress(" Level 22, 8 Exhibition St Melbourne, VIC 3000", "")).toMatchObject({
      street: "Level 22, 8 Exhibition St",
      city: "Melbourne",
      state: "VIC",
      postcode: "3000"
    });
  });

  it("does not mistake a four-digit street number for a postcode", () => {
    expect(parseAustralianAddress("1651-1657 Centre Road", "")).toMatchObject({
      street: "1651-1657 Centre Road",
      city: "",
      state: "",
      postcode: ""
    });
  });

  it("treats a postal box as the street, not a suburb", () => {
    expect(parseAustralianAddress("PO Box 590", "")).toMatchObject({ street: "PO Box 590", city: "" });
  });

  it("strips the stray bullets these exports collect", () => {
    expect(parseAustralianAddress("19-21 Brenock Park Drive ·", " Ferntree Gully VIC 3156")).toMatchObject({
      street: "19-21 Brenock Park Drive",
      city: "Ferntree Gully",
      state: "VIC",
      postcode: "3156"
    });
  });

  it("recognises a full state name", () => {
    expect(parseAustralianAddress("10 Smith Street, Fitzroy Victoria 3065", "")).toMatchObject({
      city: "Fitzroy",
      state: "VIC"
    });
  });

  it("returns undefined for an empty address", () => {
    expect(parseAustralianAddress("", "")).toBeUndefined();
    expect(parseAustralianAddress(undefined, undefined)).toBeUndefined();
  });
});

describe("territoryForState", () => {
  it("maps each state to its territory", () => {
    expect(territoryForState("VIC")).toBe("VIC/TAS");
    expect(territoryForState("TAS")).toBe("VIC/TAS");
    expect(territoryForState("nsw")).toBe("NSW/ACT");
    expect(territoryForState("ACT")).toBe("NSW/ACT");
    expect(territoryForState("QLD")).toBe("QLD/NT");
    expect(territoryForState("NT")).toBe("QLD/NT");
    expect(territoryForState("SA")).toBe("SA");
    expect(territoryForState("WA")).toBe("WA");
  });

  it("uses the fallback when the state is unknown or missing", () => {
    expect(territoryForState(undefined)).toBe("National");
    expect(territoryForState("", "VIC/TAS")).toBe("VIC/TAS");
  });
});

describe("splitPersonName", () => {
  it("splits first and last name", () => {
    expect(splitPersonName("Jim Apostolou")).toEqual({ firstName: "Jim", lastName: "Apostolou" });
  });

  it("keeps multi-word surnames together", () => {
    expect(splitPersonName("Susana Yunda Rivera")).toEqual({ firstName: "Susana", lastName: "Yunda Rivera" });
  });

  it("handles a single given name", () => {
    expect(splitPersonName("Tony")).toEqual({ firstName: "Tony", lastName: "" });
  });

  it("handles Surname, Given order", () => {
    expect(splitPersonName("Jones, Robert")).toEqual({ firstName: "Robert", lastName: "Jones" });
  });

  it("rejects an email address and an empty cell", () => {
    expect(splitPersonName("albury@jonesplumbingplus.com.au")).toBeNull();
    expect(splitPersonName("   ")).toBeNull();
    expect(splitPersonName(undefined)).toBeNull();
  });
});

describe("normalizeAccountType", () => {
  it("maps the customer styles used by the export", () => {
    expect(normalizeAccountType("Account")).toBe("Account");
    expect(normalizeAccountType("Prospect")).toBe("Prospect");
    expect(normalizeAccountType("Council")).toBe("Council");
    expect(normalizeAccountType("customer")).toBe("Account");
  });

  it("defaults an unknown or missing style to Prospect", () => {
    expect(normalizeAccountType("Something Else")).toBe("Prospect");
    expect(normalizeAccountType(undefined)).toBe("Prospect");
  });
});

describe("buildAccountImportPlan", () => {
  it("builds an account and a contact from a customer row", () => {
    const plan = buildAccountImportPlan(
      makeCsv('Acrow,Account,1651-1657 Centre Road,Springvale VIC 3171,Giancarlo Tigani,03 9582 2777'),
      [],
      baseOptions
    );

    expect(plan.error).toBeUndefined();
    expect(plan.readyCount).toBe(1);
    expect(plan.contactCount).toBe(1);

    const account = plan.readyRows[0].account!;
    expect(account).toMatchObject({
      name: "Acrow",
      accountType: "Account",
      status: "Customer",
      territory: "VIC/TAS",
      accountOwner: "Travis Maher",
      mainPhone: "03 9582 2777",
      leadSource: "Imported List",
      createdDate: "2026-09-08"
    });
    expect(account.billingAddress).toMatchObject({ city: "Springvale", state: "VIC", postcode: "3171" });
    expect(account.tags).toContain("Imported");
    // A customer list says nothing about industry; it must not invent one.
    expect(account.industry).toBeUndefined();

    const contact = plan.readyRows[0].contact!;
    expect(contact).toMatchObject({
      accountId: account.id,
      accountName: "Acrow",
      firstName: "Giancarlo",
      lastName: "Tigani",
      phone: "03 9582 2777",
      contactOwner: "Travis Maher"
    });
  });

  it("marks a prospect row as a prospect and gives it a starting stage", () => {
    const plan = buildAccountImportPlan(makeCsv("A&A Building Services Pty Ltd,Prospect,,,Jamie Winship,"), [], baseOptions);
    const account = plan.readyRows[0].account!;
    expect(account).toMatchObject({ accountType: "Prospect", status: "Prospect", prospectStage: "Identified" });
    expect(account.contactFrequency).toBeUndefined();
    expect(account.customerRelationshipStatus).toBeUndefined();
  });

  it("pairs contact frequency with the matching relationship status for customers", () => {
    const plan = buildAccountImportPlan(makeCsv("Acrow,Account,,,,"), [], {
      ...baseOptions,
      contactFrequency: "Occasional"
    });
    expect(plan.readyRows[0].account).toMatchObject({
      contactFrequency: "Occasional",
      customerRelationshipStatus: "Occasional"
    });
  });

  it("skips a row that matches an account already in the CRM", () => {
    const existing = [{ id: "acc-1", name: "Acrow Pty. Ltd." } as Account];
    const plan = buildAccountImportPlan(makeCsv("Acrow Pty Ltd,Account,,,,", "Fresh Co,Account,,,,"), existing, baseOptions);

    expect(plan.duplicateCount).toBe(1);
    expect(plan.readyCount).toBe(1);
    expect(plan.rows[0].status).toBe("duplicate");
    expect(plan.rows[0].message).toContain("Acrow Pty. Ltd.");
    expect(plan.readyRows[0].sourceName).toBe("Fresh Co");
  });

  it("only creates a repeated name once within the same file", () => {
    const plan = buildAccountImportPlan(makeCsv("Acrow,Account,,,,", "ACROW,Account,,,,"), [], baseOptions);
    expect(plan.readyCount).toBe(1);
    expect(plan.duplicateCount).toBe(1);
    expect(plan.rows[1].message).toContain("Listed earlier in this file");
  });

  it("skips a renamed account that shares a landline with an existing one", () => {
    const existing = [{ id: "acc-1", name: "Allelec", mainPhone: "(02) 9678 9400" } as Account];
    const plan = buildAccountImportPlan(makeCsv("Allelec Services Australia,Account,,,,02 9678 9400"), existing, baseOptions);
    expect(plan.duplicateCount).toBe(1);
    expect(plan.rows[0].message).toContain("Allelec");
  });

  it("flags a row with no customer name instead of creating a blank account", () => {
    const plan = buildAccountImportPlan(makeCsv(",Account,10 Smith St,,Bob Jones,"), [], baseOptions);
    expect(plan.invalidCount).toBe(1);
    expect(plan.readyCount).toBe(0);
    expect(plan.rows[0].message).toContain("No customer name");
  });

  it("treats an email in the Contact column as the account email, not a person", () => {
    const plan = buildAccountImportPlan(
      makeCsv("Jones Plumbing Plus,Account,,,albury@jonesplumbingplus.com.au,"),
      [],
      baseOptions
    );
    expect(plan.readyRows[0].account!.generalEmail).toBe("albury@jonesplumbingplus.com.au");
    expect(plan.readyRows[0].contact).toBeUndefined();
    expect(plan.contactCount).toBe(0);
  });

  it("gives every row its own account and contact id", () => {
    const plan = buildAccountImportPlan(makeCsv("One,Account,,,Ann Smith,", "Two,Account,,,Bob Brown,"), [], baseOptions);
    const ids = plan.readyRows.map((r) => r.account!.id).concat(plan.readyRows.map((r) => r.contact!.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("applies the fallback territory when the address has no state", () => {
    const plan = buildAccountImportPlan(makeCsv("No State Co,Account,174 Turner Street,,,"), [], {
      ...baseOptions,
      defaultTerritory: "VIC/TAS"
    });
    expect(plan.readyRows[0].account!.territory).toBe("VIC/TAS");
  });

  it("reports the columns it ignored", () => {
    const plan = buildAccountImportPlan("Customer Name,Credit Limit\nAcrow,5000", [], baseOptions);
    expect(plan.unmappedHeaders).toEqual(["Credit Limit"]);
    expect(plan.readyCount).toBe(1);
  });

  it("refuses a file with no customer name column", () => {
    const plan = buildAccountImportPlan("Widget,Price\nBollard,10", [], baseOptions);
    expect(plan.error).toContain("No customer name column");
    expect(plan.readyCount).toBe(0);
  });

  it("maps owner column and allocates accounts and contacts to specified rep", () => {
    const csv = [
      "Customer Name,Customer Style,Sales Rep,Contact",
      "Alpha Civil,Account,Bilal Akhtar,John Doe",
      "Beta Pipe,Account,Travis Maher,Jane Smith",
      "Gamma Ltd,Account,,Bob White"
    ].join("\n");

    const plan = buildAccountImportPlan(csv, [], {
      ...baseOptions,
      accountOwner: "Default Owner",
      teamMembers: [
        { name: "Bilal Akhtar" },
        { name: "Travis Maher" }
      ]
    });

    expect(plan.readyRows[0].account!.accountOwner).toBe("Bilal Akhtar");
    expect(plan.readyRows[0].contact!.contactOwner).toBe("Bilal Akhtar");

    expect(plan.readyRows[1].account!.accountOwner).toBe("Travis Maher");
    expect(plan.readyRows[1].contact!.contactOwner).toBe("Travis Maher");

    // Falls back to default owner when column is empty
    expect(plan.readyRows[2].account!.accountOwner).toBe("Default Owner");
    expect(plan.readyRows[2].contact!.contactOwner).toBe("Default Owner");
  });

  it("fuzzy matches first names in owner column to team members", () => {
    const csv = [
      "Customer Name,Customer Style,Owner",
      "Alpha Civil,Account,Bilal",
      "Beta Pipe,Account,Travis"
    ].join("\n");

    const plan = buildAccountImportPlan(csv, [], {
      ...baseOptions,
      teamMembers: [
        { name: "Bilal Akhtar" },
        { name: "Travis Maher" }
      ]
    });

    expect(plan.readyRows[0].account!.accountOwner).toBe("Bilal Akhtar");
    expect(plan.readyRows[1].account!.accountOwner).toBe("Travis Maher");
  });

  it("refuses an empty file", () => {
    expect(buildAccountImportPlan("", [], baseOptions).error).toBe("That file is empty.");
  });
});
