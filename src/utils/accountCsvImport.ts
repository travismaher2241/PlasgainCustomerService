/**
 * Account CSV Import
 *
 * Turns an exported customer list (the Ostendo "Customer List" shape:
 * Customer Name, Customer Style, Address 1, Address 2, Contact, Phone,
 * CUSTOMERSTATUS, SALESPERSON) into Account records, plus a CRMContact for each
 * named person, owned by the rep named in the file rather than by whoever
 * happened to run the import.
 *
 * Everything here is pure so the preview the user approves is built from the
 * exact same code path that writes the records.
 */

import { Account, AccountType, AccountStatus, CRMContact, ContactFrequency, CustomerRelationshipStatus } from "../types/crm";
import { normalizeCompanyName, normalizePhone } from "./duplicateDetector";

/* ------------------------------------------------------------------ */
/* Decoding                                                            */
/* ------------------------------------------------------------------ */

// Accounting and ERP exports are routinely Windows-1252, not UTF-8. Reading
// those bytes as UTF-8 turns apostrophes in names like O'Brien into U+FFFD,
// so decode strictly first and fall back rather than corrupting the name.
const CP1252_HIGH: Record<number, string> = {
  0x80: "€", 0x82: "‚", 0x83: "ƒ", 0x84: "„", 0x85: "…",
  0x86: "†", 0x87: "‡", 0x88: "ˆ", 0x89: "‰", 0x8a: "Š",
  0x8b: "‹", 0x8c: "Œ", 0x8e: "Ž", 0x91: "‘", 0x92: "’",
  0x93: "“", 0x94: "”", 0x95: "•", 0x96: "–", 0x97: "—",
  0x98: "˜", 0x99: "™", 0x9a: "š", 0x9b: "›", 0x9c: "œ",
  0x9e: "ž", 0x9f: "Ÿ"
};

function decodeCp1252(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    out += b >= 0x80 && b <= 0x9f ? CP1252_HIGH[b] || "�" : String.fromCharCode(b);
  }
  return out;
}

/** Decodes CSV bytes as UTF-8, falling back to Windows-1252, and strips any BOM. */
export function decodeCsvBytes(bytes: Uint8Array): string {
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    text = decodeCp1252(bytes);
  }
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/* ------------------------------------------------------------------ */
/* CSV parsing (RFC 4180: quoted fields, embedded commas and newlines) */
/* ------------------------------------------------------------------ */

export interface DelimitedTable {
  headers: string[];
  rows: string[][];
}

export function parseDelimitedText(text: string): DelimitedTable {
  const records: string[][] = [];
  let field = "";
  let record: string[] = [];
  let inQuotes = false;
  let sawAnyChar = false;

  const endField = () => {
    record.push(field);
    field = "";
  };
  const endRecord = () => {
    endField();
    records.push(record);
    record = [];
    sawAnyChar = false;
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      sawAnyChar = true;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      sawAnyChar = true;
    } else if (ch === ",") {
      endField();
      sawAnyChar = true;
    } else if (ch === "\r") {
      // Swallow CR; the LF that follows closes the record.
      if (text[i + 1] !== "\n") endRecord();
    } else if (ch === "\n") {
      endRecord();
    } else {
      field += ch;
      sawAnyChar = true;
    }
  }

  if (sawAnyChar || field.length > 0 || record.length > 0) {
    endRecord();
  }

  const nonEmpty = records.filter((r) => r.some((cell) => cell.trim() !== ""));
  if (nonEmpty.length === 0) return { headers: [], rows: [] };

  return {
    headers: nonEmpty[0].map((h) => h.trim()),
    rows: nonEmpty.slice(1)
  };
}

/* ------------------------------------------------------------------ */
/* Header mapping                                                      */
/* ------------------------------------------------------------------ */

export type AccountCsvField =
  | "name"
  | "style"
  | "address1"
  | "address2"
  | "contact"
  | "phone"
  | "email"
  | "website"
  | "salesperson"
  | "customerStatus";

const HEADER_ALIASES: Record<AccountCsvField, string[]> = {
  name: ["customer name", "account name", "company name", "customer", "account", "company", "name", "business name"],
  style: ["customer style", "account type", "type", "style", "customer type", "category"],
  address1: ["address 1", "address1", "address line 1", "street", "address"],
  address2: ["address 2", "address2", "address line 2", "suburb"],
  contact: ["contact", "contact name", "primary contact", "contact person"],
  phone: ["phone", "phone number", "telephone", "main phone", "contact phone"],
  email: ["email", "email address", "general email", "contact email"],
  website: ["website", "web", "url", "web address"],
  // "SALESPERSON" is the Ostendo spelling; the rest are what the same list
  // comes back as once it has been through a spreadsheet.
  salesperson: [
    "salesperson",
    "sales person",
    "sales rep",
    "sales representative",
    "rep",
    "account manager",
    "account owner",
    "owner",
    "assigned to",
    "assigned salesperson"
  ],
  customerStatus: ["customerstatus", "customer status", "account status", "status"]
};

function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/** Maps CSV headers to canonical fields. Unmatched fields are absent. */
export function mapCsvHeaders(headers: string[]): Partial<Record<AccountCsvField, number>> {
  const normalized = headers.map(normalizeHeader);
  const mapping: Partial<Record<AccountCsvField, number>> = {};

  (Object.keys(HEADER_ALIASES) as AccountCsvField[]).forEach((field) => {
    const idx = normalized.findIndex((h, i) => HEADER_ALIASES[field].includes(h) && !Object.values(mapping).includes(i));
    if (idx >= 0) mapping[field] = idx;
  });

  return mapping;
}

/* ------------------------------------------------------------------ */
/* Address parsing                                                     */
/* ------------------------------------------------------------------ */

export interface ParsedAddress {
  street: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
}

const STATE_LOOKUP: Record<string, string> = {
  nsw: "NSW", "new south wales": "NSW",
  vic: "VIC", victoria: "VIC",
  qld: "QLD", queensland: "QLD",
  sa: "SA", "south australia": "SA",
  wa: "WA", "western australia": "WA",
  tas: "TAS", tasmania: "TAS",
  nt: "NT", "northern territory": "NT",
  act: "ACT", "australian capital territory": "ACT"
};

const STATE_PATTERN =
  /\b(new south wales|australian capital territory|northern territory|western australia|south australia|queensland|tasmania|victoria|nsw|vic|qld|sa|wa|tas|nt|act)\b/gi;

const POSTAL_BOX = /\b(po|gpo|p\.o\.|locked bag|private bag)\s*(box)?\b/i;

const STREET_SUFFIX =
  /\b(road|rd|street|st|avenue|ave|drive|dr|court|ct|lane|ln|highway|hwy|parade|pde|place|pl|boulevard|blvd|crescent|cres|terrace|tce|way|close|cl|circuit|cct|esplanade|esp|grove|gve|square|sq|track|trk|mews|rise|loop|link)\b\.?/i;

const TERRITORY_BY_STATE: Record<string, Account["territory"]> = {
  NSW: "NSW/ACT",
  ACT: "NSW/ACT",
  VIC: "VIC/TAS",
  TAS: "VIC/TAS",
  QLD: "QLD/NT",
  NT: "QLD/NT",
  WA: "WA",
  SA: "SA"
};

/** Maps an Australian state to the sales territory that covers it. */
export function territoryForState(state: string | undefined, fallback: Account["territory"] = "National"): Account["territory"] {
  if (!state) return fallback;
  return TERRITORY_BY_STATE[state.toUpperCase()] || fallback;
}

function tidy(value: string): string {
  return value
    .replace(/\s+/g, " ")
    // Trailing separators and the stray bullets these exports collect.
    .replace(/^[\s,;.·•-]+/, "")
    .replace(/[\s,;.·•]+$/, "")
    .trim();
}

/**
 * Splits a free-text Australian address into street / suburb / state / postcode.
 * Returns undefined when there is nothing to parse.
 */
export function parseAustralianAddress(address1?: string, address2?: string): ParsedAddress | undefined {
  const parts = [address1, address2].map((p) => tidy(p || "")).filter(Boolean);
  if (parts.length === 0) return undefined;

  const combined = parts.join(", ");

  // Last state mention wins: "12 Victoria St, Preston VIC" must resolve to VIC.
  let stateMatch: RegExpExecArray | null = null;
  STATE_PATTERN.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = STATE_PATTERN.exec(combined)) !== null) {
    stateMatch = m;
  }
  const state = stateMatch ? STATE_LOOKUP[stateMatch[1].toLowerCase()] : "";
  const stateStart = stateMatch ? stateMatch.index : -1;
  const stateEnd = stateMatch ? stateMatch.index + stateMatch[0].length : -1;

  // A bare 4-digit run is only a postcode when it sits beside the state or ends
  // the address; otherwise it is a street number such as "1651-1657 Centre Road".
  let postcode = "";
  let postcodeStart = -1;
  const pcPattern = /\b(\d{4})\b/g;
  let pc: RegExpExecArray | null;
  while ((pc = pcPattern.exec(combined)) !== null) {
    const before = combined[pc.index - 1];
    if (before === "-" || before === "/") continue;
    const trailing = combined.slice(pc.index + pc[0].length);
    const atEnd = /^[\s,.;]*$/.test(trailing);
    const nearState =
      stateMatch !== null &&
      (/^[\s,.;]*$/.test(combined.slice(stateEnd, pc.index)) || /^[\s,.;]*$/.test(combined.slice(pc.index + pc[0].length, stateStart)));
    if (atEnd || nearState) {
      postcode = pc[1];
      postcodeStart = pc.index;
    }
  }

  const cutCandidates = [stateStart, postcodeStart].filter((i) => i >= 0);
  const cut = cutCandidates.length ? Math.min(...cutCandidates) : combined.length;
  let body = tidy(combined.slice(0, cut));

  // Anything left after the state/postcode that we did not consume — most often a
  // malformed postcode like "306" — is kept rather than silently dropped. Single
  // and double digit remnants are truncation noise, not a postcode.
  if (!postcode) {
    const leftover = combined.slice(cut).replace(STATE_PATTERN, " ");
    const digits = leftover.match(/\d{3,4}/);
    if (digits) postcode = digits[0];
  }

  if (!body) {
    return state || postcode ? { street: "", city: "", state, postcode, country: "Australia" } : undefined;
  }

  // Split the suburb off the end. With a comma the split is explicit; without
  // one, the suburb is whatever follows the street-type word.
  const segments = body.split(",").map(tidy).filter(Boolean);
  let street = segments.join(", ");
  let city = "";

  const last = segments[segments.length - 1] || "";
  // A postal box is a delivery address, never a suburb.
  const looksLikeStreet = /^\d/.test(last) || POSTAL_BOX.test(last) || STREET_SUFFIX.test(last);

  if (segments.length > 1 && !looksLikeStreet) {
    city = last;
    street = segments.slice(0, -1).join(", ");
  } else if (looksLikeStreet) {
    const trailing = last.match(
      /^(.*\b(?:road|rd|street|st|avenue|ave|drive|dr|court|ct|lane|ln|highway|hwy|parade|pde|place|pl|boulevard|blvd|crescent|cres|terrace|tce|way|close|cl|circuit|cct|esplanade|esp|grove|gve|square|sq|track|trk|mews|rise|loop|link)\b\.?)\s+([A-Za-z][\w'’-]*(?:\s+[A-Za-z][\w'’-]*){0,2})$/i
    );
    if (trailing) {
      city = tidy(trailing[2]);
      street = [...segments.slice(0, -1), tidy(trailing[1])].filter(Boolean).join(", ");
    }
  } else if (segments.length === 1 && !looksLikeStreet) {
    // A single token with no street markers ("Ferntree Gully") is a suburb.
    city = last;
    street = "";
  }

  return { street, city, state, postcode, country: "Australia" };
}

/* ------------------------------------------------------------------ */
/* People and account type                                             */
/* ------------------------------------------------------------------ */

export interface SplitName {
  firstName: string;
  lastName: string;
}

/**
 * Splits a single "Contact" cell into first and last name.
 * Returns null when the cell is empty or holds an email address rather than a person.
 */
export function splitPersonName(raw?: string): SplitName | null {
  const value = (raw || "").trim();
  if (!value || value.includes("@")) return null;

  if (value.includes(",")) {
    const [surname, given] = value.split(",").map((p) => p.trim());
    if (surname && given) return { firstName: given, lastName: surname };
  }

  const words = value.split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;
  if (words.length === 1) return { firstName: words[0], lastName: "" };
  return { firstName: words[0], lastName: words.slice(1).join(" ") };
}

const ACCOUNT_TYPE_LOOKUP: Record<string, AccountType> = {
  account: "Account",
  customer: "Account",
  client: "Account",
  prospect: "Prospect",
  lead: "Prospect",
  council: "Council",
  shire: "Council"
};

export function normalizeAccountType(style?: string): AccountType {
  const key = (style || "").trim().toLowerCase();
  return ACCOUNT_TYPE_LOOKUP[key] || "Prospect";
}

function statusForType(type: AccountType): AccountStatus {
  return type === "Prospect" ? "Prospect" : "Customer";
}

/* ------------------------------------------------------------------ */
/* Customer status                                                     */
/* ------------------------------------------------------------------ */

// The export marks a customer's standing in the accounting system. Only the
// values that plainly mean "no longer trading with us" are treated as inactive;
// anything unrecognised is left alone rather than quietly retiring an account.
const INACTIVE_STATUSES = new Set([
  "inactive",
  "not active",
  "closed",
  "ceased",
  "suspended",
  "stopped",
  "on hold",
  "hold",
  "dormant",
  "archived",
  "deleted",
  "obsolete",
  "no"
]);

const ACTIVE_STATUSES = new Set(["active", "current", "open", "yes", "trading"]);

export type CustomerStatusFlag = "active" | "inactive" | "unknown";

/** Reads the CUSTOMERSTATUS cell. Blank or unrecognised text is "unknown". */
export function normalizeCustomerStatus(raw?: string): CustomerStatusFlag {
  const key = (raw || "").trim().toLowerCase().replace(/\s+/g, " ");
  if (!key) return "unknown";
  if (ACTIVE_STATUSES.has(key)) return "active";
  if (INACTIVE_STATUSES.has(key)) return "inactive";
  return "unknown";
}

/* ------------------------------------------------------------------ */
/* Salesperson allocation                                              */
/* ------------------------------------------------------------------ */

export interface ResolvedOwner {
  /** The name to stamp on the account. */
  name: string;
  /** True when the file named a rep; false when the fallback owner was used. */
  fromFile: boolean;
  /** True when the rep in the file matched a member of the team. */
  known: boolean;
}

/** Lower-cases and strips punctuation so "BERRYMAN, Alan" and "Alan Berryman" compare equal. */
function ownerKey(name: string): string {
  const cleaned = name
    .toLowerCase()
    .replace(/[^a-z0-9,]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  // "Surname, Given" is how some exports write the rep; compare on the name
  // itself, not on the order the export happened to use.
  if (cleaned.includes(",")) {
    const [surname, given] = cleaned.split(",").map((p) => p.trim());
    if (surname && given) return `${given} ${surname}`;
  }
  return cleaned;
}

function tidyOwnerName(raw: string): string {
  const value = raw.replace(/\s+/g, " ").trim();
  if (value.includes(",")) {
    const [surname, given] = value.split(",").map((p) => p.trim());
    if (surname && given) return `${given} ${surname}`;
  }
  return value;
}

/**
 * Works out who owns an imported row.
 *
 * A rep named in the file wins over the person running the import — that is the
 * whole point of the SALESPERSON column. When the name matches someone on the
 * team, the team's spelling is used so the CRM does not end up with "alan
 * berryman" and "Alan Berryman" as two different owners; an unrecognised rep is
 * still allocated as written, and reported in the preview.
 */
export function resolveAccountOwner(raw: string | undefined, fallbackOwner: string, knownOwners: string[] = []): ResolvedOwner {
  const value = (raw || "").trim();
  if (!value) return { name: fallbackOwner, fromFile: false, known: true };

  const key = ownerKey(value);
  const match = knownOwners.find((owner) => ownerKey(owner) === key);
  if (match) return { name: match, fromFile: true, known: true };

  return { name: tidyOwnerName(value), fromFile: true, known: false };
}

// Keeps the two fields consistent with the pairing the account editor uses.
const RELATIONSHIP_BY_FREQUENCY: Record<ContactFrequency, CustomerRelationshipStatus> = {
  Opportunity: "Developing",
  Occasional: "Occasional",
  "As needed": "Dormant"
};

/* ------------------------------------------------------------------ */
/* Import plan                                                         */
/* ------------------------------------------------------------------ */

export type ImportRowStatus = "ready" | "duplicate" | "invalid";

export interface AccountImportRow {
  rowNumber: number;
  sourceName: string;
  status: ImportRowStatus;
  message?: string;
  account?: Account;
  contact?: CRMContact;
  /** Who this row is allocated to, on a new account or an existing one. */
  owner?: string;
  /** True when the owner came from the file's SALESPERSON column. */
  ownerFromFile?: boolean;
  /** Set on a duplicate row whose file rep differs from the owner in the CRM. */
  ownerChange?: OwnerReassignment;
}

/** An owner correction for an account that is already in the CRM. */
export interface OwnerReassignment {
  accountId: string;
  accountName: string;
  from: string;
  to: string;
}

/** How many rows each rep ends up with. */
export interface OwnerAllocation {
  owner: string;
  count: number;
  /** False when the rep is named in the file but is not on the team. */
  known: boolean;
  /** True for the fallback owner used by rows with no salesperson. */
  isFallback: boolean;
}

export interface AccountImportPlan {
  rows: AccountImportRow[];
  readyRows: AccountImportRow[];
  readyCount: number;
  duplicateCount: number;
  invalidCount: number;
  contactCount: number;
  totalRows: number;
  headers: string[];
  mapping: Partial<Record<AccountCsvField, number>>;
  unmappedHeaders: string[];
  /** New accounts per owner, most rows first. */
  ownerAllocation: OwnerAllocation[];
  /** Reps named in the file who are not on the team. */
  unknownOwners: string[];
  /** New accounts with no salesperson in the file, allocated to the fallback owner. */
  unallocatedCount: number;
  /** Owner corrections available on accounts already in the CRM. */
  ownerChanges: OwnerReassignment[];
  /** True when the file has a salesperson column at all. */
  hasSalespersonColumn: boolean;
  inactiveCount: number;
  error?: string;
}

export interface AccountImportOptions {
  /** Owner for rows whose salesperson cell is empty, or when the file has no such column. */
  accountOwner: string;
  /** Team member names, used to settle on one spelling per rep. */
  knownOwners?: string[];
  defaultTerritory?: Account["territory"];
  contactFrequency?: ContactFrequency;
  /** Deterministic id seed; defaults to the current clock. */
  idSeed?: string;
  today?: string;
}

const EMPTY_PLAN = (error: string, headers: string[] = []): AccountImportPlan => ({
  rows: [],
  readyRows: [],
  readyCount: 0,
  duplicateCount: 0,
  invalidCount: 0,
  contactCount: 0,
  totalRows: 0,
  headers,
  mapping: {},
  unmappedHeaders: [],
  ownerAllocation: [],
  unknownOwners: [],
  unallocatedCount: 0,
  ownerChanges: [],
  hasSalespersonColumn: false,
  inactiveCount: 0,
  error
});

/**
 * Builds the full import plan: one row per CSV line, marked ready, duplicate or
 * invalid, with the exact records that will be written if the user confirms.
 */
export function buildAccountImportPlan(
  csvText: string,
  existingAccounts: Account[],
  options: AccountImportOptions
): AccountImportPlan {
  const { headers, rows } = parseDelimitedText(csvText);

  if (headers.length === 0) {
    return EMPTY_PLAN("That file is empty.");
  }

  const mapping = mapCsvHeaders(headers);
  if (mapping.name === undefined) {
    return EMPTY_PLAN(
      `No customer name column found. Expected a "Customer Name" column, but the file has: ${headers.filter(Boolean).join(", ") || "no headers"}.`,
      headers
    );
  }

  const seed = options.idSeed || String(Date.now());
  const today = options.today || new Date().toISOString().split("T")[0];
  const frequency: ContactFrequency = options.contactFrequency || "As needed";
  const defaultTerritory = options.defaultTerritory || "National";
  const knownOwners = options.knownOwners && options.knownOwners.length ? options.knownOwners : [options.accountOwner];

  // Names claimed earlier in this same file, so a list that repeats a customer
  // does not create it twice.
  const seenNames = new Map<string, string>();

  // Existing accounts are indexed once rather than re-normalised for every row:
  // an 800-row list against an 800-account CRM is 640,000 comparisons otherwise,
  // and the preview is rebuilt whenever an import option changes. Name and
  // landline are the two signals a customer list export carries, matched on the
  // same normalisation the shared duplicate service uses.
  const existingByName = new Map<string, Account>();
  const existingByPhone = new Map<string, Account>();
  existingAccounts.forEach((acc) => {
    const nameKey = normalizeCompanyName(acc.name);
    if (nameKey && !existingByName.has(nameKey)) existingByName.set(nameKey, acc);
    const phoneKey = normalizePhone(acc.phone || acc.mainPhone || "");
    if (phoneKey.length >= 8 && !existingByPhone.has(phoneKey)) existingByPhone.set(phoneKey, acc);
  });

  const planRows: AccountImportRow[] = rows.map((cells, index) => {
    const rowNumber = index + 2; // +1 for the header, +1 for 1-based lines
    const cell = (field: AccountCsvField): string => {
      const idx = mapping[field];
      return idx === undefined ? "" : (cells[idx] || "").trim();
    };

    const name = cell("name");
    if (!name) {
      return { rowNumber, sourceName: "", status: "invalid", message: "No customer name in this row." };
    }

    const key = normalizeCompanyName(name);
    const phone = cell("phone").replace(/\s+/g, " ").trim();
    const normalizedPhone = normalizePhone(phone);

    const owner = resolveAccountOwner(cell("salesperson"), options.accountOwner, knownOwners);

    const existingMatch =
      existingByName.get(key) || (normalizedPhone.length >= 8 ? existingByPhone.get(normalizedPhone) : undefined);
    if (existingMatch) {
      // The account stays as it is, but the file still says who works it. That
      // difference is offered separately so an import can fix the allocation on
      // a list that was loaded before the salesperson column existed.
      const ownerChange =
        owner.fromFile && owner.name !== existingMatch.accountOwner
          ? {
              accountId: existingMatch.id,
              accountName: existingMatch.name,
              from: existingMatch.accountOwner || "",
              to: owner.name
            }
          : undefined;

      return {
        rowNumber,
        sourceName: name,
        status: "duplicate",
        owner: ownerChange ? owner.name : existingMatch.accountOwner,
        ownerFromFile: owner.fromFile,
        ownerChange,
        message: ownerChange
          ? `Already in the CRM as "${existingMatch.name}" — owner ${ownerChange.from || "unset"} → ${ownerChange.to}.`
          : `Already in the CRM as "${existingMatch.name}".`
      };
    }

    const repeatedInFile = seenNames.get(key);
    if (repeatedInFile) {
      return {
        rowNumber,
        sourceName: name,
        status: "duplicate",
        message: `Listed earlier in this file as "${repeatedInFile}".`
      };
    }
    seenNames.set(key, name);

    const accountType = normalizeAccountType(cell("style"));
    const isProspect = accountType === "Prospect";
    const customerStatus = normalizeCustomerStatus(cell("customerStatus"));
    const isInactive = customerStatus === "inactive";
    const address = parseAustralianAddress(cell("address1"), cell("address2"));
    const territory = territoryForState(address?.state, defaultTerritory);

    // An email in the Contact column belongs to the business, not to a person.
    const contactCell = cell("contact");
    const generalEmail = cell("email") || (contactCell.includes("@") ? contactCell : "");
    const person = splitPersonName(contactCell);

    const accountId = `acc-imp-${seed}-${index}`;
    const account: Account = {
      id: accountId,
      name,
      accountType,
      status: isInactive ? "Former Customer" : statusForType(accountType),
      territory,
      accountOwner: owner.name,
      // No industry: a customer list says nothing about it, and defaulting
      // several hundred accounts to one industry is a claim, not a blank.
      leadSource: "Imported List",
      createdDate: today,
      customerRelationshipStatus: isProspect ? undefined : isInactive ? "Dormant" : RELATIONSHIP_BY_FREQUENCY[frequency],
      contactFrequency: isProspect ? undefined : frequency,
      prospectStage: isProspect ? "Identified" : undefined,
      tags: isInactive ? [accountType, "Imported", "Inactive"] : [accountType, "Imported"],
      metrics: {
        openPipelineValue: 0,
        totalDealsWon: 0,
        activeDealsCount: 0,
        totalEnquiries: 0
      }
    };

    if (phone) account.mainPhone = phone;
    if (generalEmail) account.generalEmail = generalEmail;
    const website = cell("website");
    if (website) account.website = website;
    if (address && (address.street || address.city || address.state || address.postcode)) {
      account.billingAddress = address;
    }

    let contact: CRMContact | undefined;
    if (person) {
      contact = {
        id: `con-imp-${seed}-${index}`,
        accountId,
        accountName: name,
        firstName: person.firstName,
        lastName: person.lastName,
        jobTitle: "",
        email: "",
        preferredContactMethod: phone ? "Phone" : "Email",
        contactOwner: owner.name
      };
      if (phone) contact.phone = phone;
    }

    return {
      rowNumber,
      sourceName: name,
      status: "ready",
      account,
      contact,
      owner: owner.name,
      ownerFromFile: owner.fromFile
    };
  });

  const readyRows = planRows.filter((r) => r.status === "ready");
  const mappedIndexes = new Set(Object.values(mapping));

  // Allocation is summarised here rather than in the dialog so the numbers the
  // user approves come from the same rows that will be written.
  const knownOwnerKeys = new Set(knownOwners.map((o) => o.toLowerCase()));
  const countsByOwner = new Map<string, number>();
  readyRows.forEach((row) => {
    const name = row.owner || options.accountOwner;
    countsByOwner.set(name, (countsByOwner.get(name) || 0) + 1);
  });

  const ownerAllocation: OwnerAllocation[] = [...countsByOwner.entries()]
    .map(([owner, count]) => ({
      owner,
      count,
      known: knownOwnerKeys.has(owner.toLowerCase()),
      isFallback: owner === options.accountOwner
    }))
    .sort((a, b) => b.count - a.count || a.owner.localeCompare(b.owner));

  const unknownOwners = [
    ...new Set(planRows.filter((r) => r.ownerFromFile && r.owner && !knownOwnerKeys.has(r.owner.toLowerCase())).map((r) => r.owner as string))
  ].sort((a, b) => a.localeCompare(b));

  return {
    rows: planRows,
    readyRows,
    readyCount: readyRows.length,
    duplicateCount: planRows.filter((r) => r.status === "duplicate").length,
    invalidCount: planRows.filter((r) => r.status === "invalid").length,
    contactCount: readyRows.filter((r) => r.contact).length,
    totalRows: planRows.length,
    headers,
    mapping,
    unmappedHeaders: headers.filter((h, i) => h && !mappedIndexes.has(i)),
    ownerAllocation,
    unknownOwners,
    unallocatedCount: readyRows.filter((r) => !r.ownerFromFile).length,
    ownerChanges: planRows.map((r) => r.ownerChange).filter((c): c is OwnerReassignment => Boolean(c)),
    hasSalespersonColumn: mapping.salesperson !== undefined,
    inactiveCount: readyRows.filter((r) => r.account?.tags?.includes("Inactive")).length
  };
}
