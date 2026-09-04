/**
 * Shared CRM Duplicate Detection Service (P2-13)
 *
 * Implements conservative duplicate detection across Accounts, Contacts, Leads, and Opportunities.
 * Prioritises false-positive avoidance (preserves meaningful entity descriptors like Council, Shire, City,
 * Regional, Authority, Water, Group).
 *
 * Confidence levels:
 * - EXACT: identical ABN, normalized email, exact domain + exact company name
 * - HIGH CONFIDENCE: same normalized business name + same domain, or same phone + same account
 * - POSSIBLE: similar normalized business name, or lead for same company & project
 * - NONE: no significant match detected
 */

import { Account, CRMContact, CRMLead, Opportunity } from "../types/crm";

export type DuplicateConfidence = "EXACT" | "HIGH CONFIDENCE" | "POSSIBLE" | "NONE";

export interface DuplicateMatchResult<T> {
  confidence: DuplicateConfidence;
  matchReason: string;
  existingRecord: T;
}

export function normalizeCompanyName(name: string): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .trim()
    // Normalize company suffix variations safely without stripping legal distinction words (Council, Shire, Authority, etc.)
    .replace(/\bpty\.?\s*ltd\.?\b/gi, "pty ltd")
    .replace(/\blimited\b/gi, "ltd")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeEmail(email: string): string {
  if (!email) return "";
  return email.toLowerCase().trim();
}

export function normalizePhone(phone: string): string {
  if (!phone) return "";
  // Strip non-digits and normalize +61 / 0
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("61") && digits.length >= 10) {
    return "0" + digits.slice(2);
  }
  return digits;
}

export function normalizeDomain(domainOrUrl: string): string {
  if (!domainOrUrl) return "";
  let clean = domainOrUrl.toLowerCase().trim();
  clean = clean.replace(/^https?:\/\//i, "");
  clean = clean.replace(/^www\./i, "");
  clean = clean.split("/")[0].split("?")[0];
  return clean;
}

export function normalizeAbn(abn: string): string {
  if (!abn) return "";
  return abn.replace(/\D/g, "");
}

/**
 * Detect Duplicate Accounts
 */
export function detectDuplicateAccount(
  candidate: { name: string; abn?: string; website?: string; phone?: string },
  existingAccounts: Account[]
): DuplicateMatchResult<Account> | null {
  const normName = normalizeCompanyName(candidate.name);
  const normAbn = candidate.abn ? normalizeAbn(candidate.abn) : "";
  const normDomain = candidate.website ? normalizeDomain(candidate.website) : "";
  const normPhone = candidate.phone ? normalizePhone(candidate.phone) : "";

  for (const acc of existingAccounts) {
    const accNormName = normalizeCompanyName(acc.name);
    const accNormAbn = acc.abn ? normalizeAbn(acc.abn) : "";
    const accNormDomain = acc.website ? normalizeDomain(acc.website) : "";
    const accNormPhone = acc.phone ? normalizePhone(acc.phone) : (acc.mainPhone ? normalizePhone(acc.mainPhone) : "");

    // 1. EXACT: Identical valid ABN (11 digits)
    if (normAbn && normAbn.length === 11 && normAbn === accNormAbn) {
      return {
        confidence: "EXACT",
        matchReason: `Exact ABN match (${candidate.abn}) with existing account "${acc.name}"`,
        existingRecord: acc
      };
    }

    // 2. EXACT: Identical domain (if not generic web host)
    if (normDomain && normDomain === accNormDomain && !["gmail.com", "outlook.com", "hotmail.com", "yahoo.com"].includes(normDomain)) {
      return {
        confidence: "EXACT",
        matchReason: `Exact website domain match (${normDomain}) with existing account "${acc.name}"`,
        existingRecord: acc
      };
    }

    // 3. EXACT: Identical phone number
    if (normPhone && normPhone.length >= 8 && normPhone === accNormPhone) {
      return {
        confidence: "EXACT",
        matchReason: `Exact phone match (${candidate.phone}) with existing account "${acc.name}"`,
        existingRecord: acc
      };
    }

    // 4. HIGH CONFIDENCE: Identical normalized company name
    if (normName && normName === accNormName) {
      return {
        confidence: "HIGH CONFIDENCE",
        matchReason: `Matching business name with existing account "${acc.name}"`,
        existingRecord: acc
      };
    }

    // 4. HIGH CONFIDENCE: Matching domain (if specific and not generic public mail domain)
    if (normDomain && normDomain === accNormDomain && !isGenericDomain(normDomain)) {
      return {
        confidence: "HIGH CONFIDENCE",
        matchReason: `Corporate domain (${normDomain}) already belongs to account "${acc.name}"`,
        existingRecord: acc
      };
    }

    // 5. POSSIBLE: Matching landline phone number
    if (normPhone && normPhone.length >= 8 && normPhone === accNormPhone) {
      return {
        confidence: "POSSIBLE",
        matchReason: `Matching phone number with account "${acc.name}"`,
        existingRecord: acc
      };
    }
  }

  return null;
}

/**
 * Detect Duplicate Contacts
 */
export function detectDuplicateContact(
  candidate: { email: string; phone?: string; name: string; accountId?: string },
  existingContacts: CRMContact[]
): DuplicateMatchResult<CRMContact> | null {
  const normEmail = normalizeEmail(candidate.email);
  const normPhone = candidate.phone ? normalizePhone(candidate.phone) : "";
  const normName = candidate.name.toLowerCase().trim();

  for (const c of existingContacts) {
    const fullName = `${c.firstName || ""} ${c.lastName || ""}`.trim();
    const cNormEmail = normalizeEmail(c.email);
    const cNormPhone = c.phone || c.mobile ? normalizePhone(c.phone || c.mobile || "") : "";
    const cNormName = fullName.toLowerCase().trim();
    const isDifferentAccount = Boolean(candidate.accountId && c.accountId && candidate.accountId !== c.accountId);
    const accountContext = c.accountName ? `at "${c.accountName}"` : "in another account";

    // 1. EXACT: Matching normalized email
    if (normEmail && normEmail === cNormEmail) {
      return {
        confidence: "EXACT",
        matchReason: isDifferentAccount
          ? `Email address "${candidate.email}" already belongs to ${fullName} ${accountContext}. Move this contact rather than creating a duplicate?`
          : `Email address "${candidate.email}" is already registered to ${fullName}`,
        existingRecord: c
      };
    }

    // 2. HIGH CONFIDENCE: Same phone number
    if (normPhone && normPhone.length >= 8 && normPhone === cNormPhone) {
      return {
        confidence: "HIGH CONFIDENCE",
        matchReason: isDifferentAccount
          ? `Phone number matches existing contact ${fullName} ${accountContext}. Did this person change companies?`
          : `Phone number matches existing contact ${fullName}`,
        existingRecord: c
      };
    }

    // 3. HIGH CONFIDENCE / POSSIBLE: Same full name
    if (normName && normName === cNormName) {
      if (isDifferentAccount) {
        return {
          confidence: "HIGH CONFIDENCE",
          matchReason: `Contact "${fullName}" is already in the CRM ${accountContext}. If they moved employers, move the contact to preserve relationship history.`,
          existingRecord: c
        };
      } else {
        return {
          confidence: "POSSIBLE",
          matchReason: `Contact with the name "${fullName}" already exists in this account`,
          existingRecord: c
        };
      }
    }

    // 4. Check archived contact match
    if (c.isArchived && (normEmail === cNormEmail || normName === cNormName)) {
      return {
        confidence: "POSSIBLE",
        matchReason: `A matching contact "${fullName}" was previously archived ${accountContext}. Restore or move this record instead?`,
        existingRecord: c
      };
    }
  }

  return null;
}

/**
 * Detect Duplicate Leads
 */
export function detectDuplicateLead(
  candidate: { contactEmail?: string; email?: string; company?: string; companyName?: string; leadName?: string; phone?: string },
  existingLeads: CRMLead[]
): DuplicateMatchResult<CRMLead> | null {
  const rawEmail = candidate.contactEmail || candidate.email || "";
  const rawCompany = candidate.company || candidate.companyName || "";
  const rawName = candidate.leadName || "";
  const normEmail = normalizeEmail(rawEmail);
  const normCompany = normalizeCompanyName(rawCompany);
  const normProject = rawName.toLowerCase().trim();

  for (const lead of existingLeads) {
    if (lead.leadStatus === "Converted" || lead.leadStatus === "Unqualified") continue;

    const leadNormEmail = normalizeEmail(lead.contactEmail);
    const leadNormCompany = normalizeCompanyName(lead.company);
    const leadNormProject = lead.leadName.toLowerCase().trim();

    // 1. EXACT: Open lead with matching email & project
    if (normEmail && normEmail === leadNormEmail && normProject && normProject === leadNormProject) {
      return {
        confidence: "EXACT",
        matchReason: `An open lead for this contact and project already exists (${lead.leadName})`,
        existingRecord: lead
      };
    }

    // 2. HIGH CONFIDENCE: Open lead with matching email
    if (normEmail && normEmail === leadNormEmail) {
      return {
        confidence: "HIGH CONFIDENCE",
        matchReason: `Active open lead exists for contact email "${candidate.contactEmail}"`,
        existingRecord: lead
      };
    }

    // 3. POSSIBLE: Same company and project title
    if (normCompany && normCompany === leadNormCompany && normProject && normProject === leadNormProject) {
      return {
        confidence: "POSSIBLE",
        matchReason: `Similar open lead found for ${lead.company} ("${lead.leadName}")`,
        existingRecord: lead
      };
    }
  }

  return null;
}

/**
 * Detect Duplicate Opportunities / Deals
 */
export function detectDuplicateOpportunity(
  candidate: { customerCompany: string; project: string; tenderRef?: string },
  existingOpps: Opportunity[]
): DuplicateMatchResult<Opportunity> | null {
  const normCompany = normalizeCompanyName(candidate.customerCompany);
  const normProject = candidate.project.toLowerCase().trim();
  const normRef = candidate.tenderRef ? candidate.tenderRef.toLowerCase().trim() : "";

  for (const opp of existingOpps) {
    if (opp.status === "Closed Lost" || opp.stage === "Closed Lost") continue;

    const oppNormCompany = normalizeCompanyName(opp.customerCompany);
    const oppNormProject = opp.project.toLowerCase().trim();
    const oppNormRef = (opp.quoteNumber || opp.ostendoQuoteRef || "").toLowerCase().trim();

    // 1. EXACT: Same tender reference number
    if (normRef && oppNormRef && normRef === oppNormRef) {
      return {
        confidence: "EXACT",
        matchReason: `Tender / Quote reference "${candidate.tenderRef}" already exists on deal "${opp.project}"`,
        existingRecord: opp
      };
    }

    // 2. HIGH CONFIDENCE: Same account and exact project name
    if (normCompany && normCompany === oppNormCompany && normProject && normProject === oppNormProject) {
      return {
        confidence: "HIGH CONFIDENCE",
        matchReason: `Active opportunity "${opp.project}" already exists for ${opp.customerCompany}`,
        existingRecord: opp
      };
    }
  }

  return null;
}

function isGenericDomain(domain: string): boolean {
  const generics = ["gmail.com", "outlook.com", "hotmail.com", "yahoo.com", "icloud.com", "bigpond.com", "optusnet.com.au"];
  return generics.includes(domain.toLowerCase());
}
