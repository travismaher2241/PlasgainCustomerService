import React, { useState, useMemo, useRef } from "react";
import { X, FileText, Upload, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { apiPost } from "../../utils/apiClient";
import { useDialogDismiss } from "../../utils/useDialogDismiss";
import { addDaysLocal, formatAuDate, getLocalDateInputValue } from "../../utils/dateUtils";
import { resolveQuotingStage } from "../../data/crmMockData";
import { Account, CRMOpportunity } from "../../types/crm";

/**
 * Quote PDF import
 *
 * Reads a quote PDF, shows everything it found, and only writes to the CRM once
 * the rep has confirmed it. Nothing here applies silently: a $19k quote filed
 * against the wrong customer costs more than the minute this step takes.
 */

interface ParsedLineItem {
  productCode: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  extendedPrice: number;
  drawingNumber?: string;
}

interface ParsedQuote {
  quoteNumber?: string;
  quoteDate?: string;
  quoteExpiryDate?: string;
  customerName?: string;
  contactName?: string;
  customerAddress?: string;
  customerAddressParts?: {
    street: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
  };
  projectName?: string;
  lineItems: ParsedLineItem[];
  nettTotal?: number;
  taxTotal?: number;
  grossTotal?: number;
  warnings: string[];
}

interface ImportResponse {
  document: { id: string; fileName: string; sizeBytes: number };
  parsed: ParsedQuote;
  suggestedFollowUpDate?: string;
}

const money = (n?: number) =>
  n === undefined ? "—" : `$${n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const followUpDateFromSentDate = (sentDate: string) => {
  let result = addDaysLocal(2, sentDate);
  const day = new Date(`${result}T12:00:00`).getDay();
  if (day === 6) result = addDaysLocal(2, result);
  if (day === 0) result = addDaysLocal(1, result);
  return result;
};

/** Loose match on name, so "Example Shire Council" finds "Example Shire". */
function findMatchingAccount(accounts: Account[], name?: string): Account | undefined {
  if (!name) return undefined;
  const needle = name.toLowerCase().replace(/\b(pty|ltd|group|council|shire|the)\b/g, "").replace(/[^a-z0-9]/g, "");
  if (!needle) return undefined;
  return accounts.find((a) => {
    const hay = a.name.toLowerCase().replace(/\b(pty|ltd|group|council|shire|the)\b/g, "").replace(/[^a-z0-9]/g, "");
    return hay === needle || hay.includes(needle) || needle.includes(hay);
  });
}

export const CRMQuoteImportModal: React.FC = () => {
  const {
    quoteImportModal,
    closeQuoteImport,
    accounts,
    addAccount,
    crmOpportunities,
    addCrmOpportunity,
    updateCrmOpportunity,
    logActivity,
    showToast,
    currentUser,
    navigateToCRM
  } = useApp();

  const isOpen = Boolean(quoteImportModal?.isOpen);

  const [step, setStep] = useState<"choose" | "review">("choose");
  const [isReading, setIsReading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResponse | null>(null);
  const [accountChoice, setAccountChoice] = useState<string>("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [sentDate, setSentDate] = useState("");
  const [isAlreadySent, setIsAlreadySent] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep("choose");
    setResult(null);
    setError(null);
    setIsReading(false);
    setAccountChoice("");
    setFollowUpDate("");
    setSentDate("");
    setIsAlreadySent(true);
  };

  const handleClose = () => {
    reset();
    closeQuoteImport();
  };

  useDialogDismiss(isOpen, handleClose);

  const parsed = result?.parsed;

  const matchedAccount = useMemo(
    () => findMatchingAccount(accounts, parsed?.customerName),
    [accounts, parsed?.customerName]
  );

  /** A quote number already in the CRM means this is a revision, not a new deal. */
  const existingDeal = useMemo(() => {
    if (!parsed?.quoteNumber) return undefined;
    const ref = parsed.quoteNumber.toLowerCase();
    return crmOpportunities.find(
      (d) =>
        (d.quoteNumber || "").toLowerCase() === ref ||
        (d.ostendoQuoteRef || "").toLowerCase() === ref
    );
  }, [crmOpportunities, parsed?.quoteNumber]);

  const handleFile = async (file: File) => {
    setError(null);
    setIsReading(true);
    try {
      const fileBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const res = reader.result as string;
          const base64 = res.includes(",") ? res.split(",")[1] : res;
          resolve(base64);
        };
        reader.onerror = () => reject(new Error("Could not read the selected file."));
        reader.readAsDataURL(file);
      });

      const response = await apiPost<ImportResponse>("/api/quotes/import-pdf", {
        fileName: file.name,
        fileBase64
      });

      setResult(response);
      setAccountChoice(findMatchingAccount(accounts, response.parsed.customerName)?.id || "");
      const effectiveSentDate = response.parsed.quoteDate || getLocalDateInputValue();
      setSentDate(effectiveSentDate);
      setFollowUpDate(followUpDateFromSentDate(effectiveSentDate));
      setStep("review");
    } catch (err: any) {
      const errorMsg = err?.detail
        ? `${err.message} (${err.detail})`
        : (err?.message || "That quote could not be read. Try again, or enter it by hand.");
      setError(errorMsg);
    } finally {
      setIsReading(false);
    }
  };

  const handleConfirm = async () => {
    if (!result || !parsed) return;

    // Account: an existing one, or a new record built from the quote's To: block.
    let accountId = accountChoice;
    let accountName = accounts.find((a) => a.id === accountId)?.name || parsed.customerName || "Unknown customer";

    if (!accountId) {
      const newAccount: Account = {
        id: `acc-${Date.now()}`,
        name: parsed.customerName || "Unknown customer",
        accountType: "Account",
        // "Active" is a member of AccountCommercialStatus, not AccountStatus —
        // the two were being conflated. An account created from an imported
        // Ostendo quote is someone we have formally quoted, so the lifecycle
        // status is Customer; "Active" belongs on the commercial field.
        status: "Customer",
        accountCommercialStatus: "Active",
        contactFrequency: "Opportunity",
        customerRelationshipStatus: "Active",
        territory: "VIC/TAS",
        accountOwner: currentUser.name,
        billingAddress: parsed.customerAddressParts,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as Account;
      addAccount(newAccount);
      accountId = newAccount.id;
      accountName = newAccount.name;
    }

    const stage = resolveQuotingStage();
    const dealValue = parsed.nettTotal ?? 0;
    const products = parsed.lineItems.map((li, idx) => ({
      id: `prod-${Date.now()}-${idx}`,
      productCode: li.productCode,
      productName: li.description || li.productCode,
      category: "Quoted line",
      quantity: li.quantity,
      unitPrice: li.unitPrice,
      lineTotal: li.extendedPrice
    }));

    const nextAction = isAlreadySent ? `Follow up on quote ${parsed.quoteNumber || ""}`.trim() : undefined;
    let opportunityId: string;

    const stageId = isAlreadySent ? "stage-submitted" : "stage-not-submitted";
    const stageName = isAlreadySent ? "Submitted" : "Not Submitted";
    const probability = isAlreadySent ? 40 : 10;
    const submittedAt = isAlreadySent
      ? new Date(`${sentDate || getLocalDateInputValue()}T12:00:00`).toISOString()
      : undefined;

    if (existingDeal) {
      // A revision: update the deal in place and restart the follow-up clock.
      opportunityId = existingDeal.id;
      updateCrmOpportunity(existingDeal.id, {
        dealValue,
        stageId,
        stageName,
        probability,
        submittedAt: isAlreadySent ? (submittedAt || existingDeal.submittedAt) : null,
        quoteStatus: isAlreadySent ? "Sent" : "Draft",
        quoteSentDate: isAlreadySent ? (sentDate || getLocalDateInputValue()) : null,
        quoteExpiryDate: parsed.quoteExpiryDate,
        products,
        nextAction: isAlreadySent ? nextAction : null,
        nextActionDate: isAlreadySent ? (followUpDate || undefined) : null,
        latestActivity: `Revised quote ${parsed.quoteNumber} imported (${stageName})`,
        latestActivityDate: new Date().toISOString().split("T")[0]
      } as Partial<CRMOpportunity>);
    } else {
      opportunityId = `deal-${Date.now()}`;
      addCrmOpportunity({
        id: opportunityId,
        name: parsed.projectName || `Quote ${parsed.quoteNumber || ""}`.trim(),
        accountId,
        accountName,
        primaryContactName: parsed.contactName,
        opportunityOwner: currentUser.name,
        pipelineId: "pipe-major-projects",
        stageId,
        stageName,
        dealValue,
        dealValueBasis: "Known",
        probability,
        quoteNumber: parsed.quoteNumber,
        ostendoQuoteRef: parsed.quoteNumber,
        quoteStatus: isAlreadySent ? "Sent" : "Draft",
        quoteValue: dealValue,
        quoteSentDate: isAlreadySent ? (sentDate || getLocalDateInputValue()) : undefined,
        submittedAt,
        quoteExpiryDate: parsed.quoteExpiryDate,
        products,
        nextAction,
        nextActionDate: isAlreadySent ? (followUpDate || undefined) : undefined,
        latestActivity: `Quote ${parsed.quoteNumber} imported from PDF (${stageName})`,
        latestActivityDate: new Date().toISOString().split("T")[0],
        daysInCurrentStage: 0,
        attachedDocumentIds: []
      } as CRMOpportunity);
    }

    // Link the stored file to the deal so it can be opened from the quote tab.
    try {
      await apiPost(`/api/quotes/${result.document.id}/attach`, { opportunityId, accountId });
    } catch {
      showToast("The quote was saved, but the PDF could not be linked to it.", "error");
    }

    logActivity({
      type: isAlreadySent ? "quote_sent" : "note",
      title: `Quote ${parsed.quoteNumber || ""} ${isAlreadySent ? "sent and imported" : "draft imported"}`.trim(),
      description: `${money(parsed.nettTotal)} ex GST${parsed.projectName ? ` — ${parsed.projectName}` : ""}${isAlreadySent ? ` · follow-up due ${formatAuDate(followUpDate)}` : ""}`,
      accountId,
      accountName,
      opportunityId,
      performedBy: currentUser.name,
      ...(isAlreadySent && sentDate ? { timestamp: `${sentDate}T12:00:00.000Z` } : {})
    } as any);

    showToast(
      existingDeal
        ? `Quote ${parsed.quoteNumber} updated.${isAlreadySent ? ` Follow up on ${formatAuDate(followUpDate)}.` : ""}`
        : `Quote ${parsed.quoteNumber} saved to ${accountName}.${isAlreadySent ? ` Follow up on ${formatAuDate(followUpDate)}.` : ""}`,
      "success"
    );

    handleClose();
    navigateToCRM("pipeline", opportunityId);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-chrome/60 backdrop-blur-xs p-0 sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Import a quote PDF"
        className="bg-white w-full sm:max-w-2xl sm:rounded-panel rounded-t-panel shadow-xl max-h-[92vh] flex flex-col min-w-0"
      >
        <div className="p-4 border-b border-line flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-4 h-4 text-brand-deep shrink-0" />
            <h2 className="font-bold text-body truncate">Import a quote PDF</h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-ink-dim hover:text-ink rounded-edge hover:bg-paper cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto min-w-0">
          {step === "choose" && (
            <div className="space-y-3">
              <p className="text-body text-ink-dim">
                Choose a quote PDF. It will be read and shown here before anything is saved.
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isReading}
                className="w-full min-h-[120px] border-2 border-dashed border-line-strong rounded-panel flex flex-col items-center justify-center gap-2 text-ink-dim hover:border-brand-deep hover:text-brand-deep transition-colors cursor-pointer disabled:cursor-wait"
              >
                {isReading ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span className="font-bold">Reading the quote…</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-6 h-6" />
                    <span className="font-bold">Choose a PDF</span>
                  </>
                )}
              </button>

              {error && (
                <p className="text-spec text-red-700 flex items-start gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </p>
              )}
            </div>
          )}

          {step === "review" && parsed && (
            <div className="space-y-4">
              {parsed.warnings.length > 0 && (
                <div className="border border-amber-300 bg-amber-50 rounded-edge p-3">
                  <p className="font-bold text-amber-900 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Check these before saving</span>
                  </p>
                  <ul className="mt-1.5 space-y-1 text-spec text-amber-900 list-disc pl-5">
                    {parsed.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {existingDeal && (
                <div className="border border-brand-edge bg-brand-wash rounded-edge p-3 text-spec text-brand-deep">
                  Quote <strong>{parsed.quoteNumber}</strong> is already on “{existingDeal.name}”. Saving will
                  update that quote and keep both PDFs, rather than adding a second one to the pipeline.
                </div>
              )}

              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  ["Quote number", parsed.quoteNumber || "—"],
                  ["Quote date", parsed.quoteDate ? formatAuDate(parsed.quoteDate) : "—"],
                  ["Expires", parsed.quoteExpiryDate ? formatAuDate(parsed.quoteExpiryDate) : "—"],
                  ["Project", parsed.projectName || "—"],
                  ["Contact", parsed.contactName || "—"],
                  ["Customer on the quote", parsed.customerName || "—"]
                ].map(([label, value]) => (
                  <div key={label} className="bg-paper border border-line rounded-edge px-3 py-2 min-w-0">
                    <dt className="text-spec text-ink-dim">{label}</dt>
                    <dd className="font-bold text-ink break-words">{value}</dd>
                  </div>
                ))}
              </dl>

              <div className="bg-paper border border-line rounded-edge px-3 py-2">
                <p className="text-spec text-ink-dim">Value</p>
                <p className="font-bold text-ink text-lg tabular-nums">{money(parsed.nettTotal)} ex GST</p>
                <p className="text-spec text-ink-dim tabular-nums">
                  GST {money(parsed.taxTotal)} · {money(parsed.grossTotal)} inc GST on the document
                </p>
              </div>

              <div>
                <label htmlFor="quote-account" className="block text-spec font-bold text-ink mb-1">
                  Save against
                </label>
                <select
                  id="quote-account"
                  value={accountChoice}
                  onChange={(e) => setAccountChoice(e.target.value)}
                  className="w-full min-h-[44px] p-2 border border-line rounded-edge bg-white text-body"
                >
                  <option value="">
                    Create a new account: {parsed.customerName || "Unknown customer"}
                  </option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
                {matchedAccount && accountChoice === matchedAccount.id && (
                  <p className="mt-1 text-spec text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Matched to an existing account by name.</span>
                  </p>
                )}
                {!accountChoice && (
                  <p className="mt-1 text-spec text-ink-dim">
                    A new account will be created from the quote:{" "}
                    {parsed.customerAddress || "no address on the quote"}.
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="quote-sent-date" className="block text-spec font-bold text-ink mb-1">
                  Date sent to customer
                </label>
                <input
                  id="quote-sent-date"
                  type="date"
                  value={sentDate}
                  disabled={!isAlreadySent}
                  onChange={(e) => {
                    setSentDate(e.target.value);
                    if (e.target.value) setFollowUpDate(followUpDateFromSentDate(e.target.value));
                  }}
                  className="w-full min-h-[44px] p-2 border border-line rounded-edge bg-white text-body disabled:bg-paper disabled:text-ink-faint"
                />
                <p className="mt-1 text-spec text-ink-dim">
                  Confirm when the customer received it. This starts the follow-up clock.
                </p>
              </div>

              <div>
                <label htmlFor="quote-followup" className="block text-spec font-bold text-ink mb-1">
                  Follow up on
                </label>
                <input
                  id="quote-followup"
                  type="date"
                  value={followUpDate}
                  disabled={!isAlreadySent}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="w-full min-h-[44px] p-2 border border-line rounded-edge bg-white text-body disabled:bg-paper disabled:text-ink-faint"
                />
                <p className="mt-1 text-spec text-ink-dim">
                  Two days after the date sent, moved to Monday if it falls on a weekend.
                </p>
              </div>

              <div className="p-3 bg-paper/60 rounded-edge border border-line">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isAlreadySent}
                    onChange={(e) => setIsAlreadySent(e.target.checked)}
                    className="rounded border-line text-brand-deep focus:ring-brand w-4 h-4"
                  />
                  <div>
                    <span className="text-spec font-bold text-body block">Already sent to client</span>
                    <span className="text-xs text-ink-dim block">
                      Adds it to the follow-up queue. Uncheck only when storing a draft that has not reached the customer.
                    </span>
                  </div>
                </label>
              </div>

              {parsed.lineItems.length > 0 && (
                <details className="border border-line rounded-edge">
                  <summary className="px-3 py-2 cursor-pointer text-spec font-bold text-ink">
                    {parsed.lineItems.length} line {parsed.lineItems.length === 1 ? "item" : "items"}
                  </summary>
                  <ul className="divide-y divide-line border-t border-line">
                    {parsed.lineItems.map((li, i) => (
                      <li key={i} className="px-3 py-2 flex items-start justify-between gap-3">
                        <span className="min-w-0">
                          <span className="font-bold text-ink block truncate">{li.productCode}</span>
                          <span className="text-spec text-ink-dim block break-words">{li.description}</span>
                        </span>
                        <span className="shrink-0 text-spec text-ink-dim tabular-nums text-right">
                          {li.quantity} × {money(li.unitPrice)}
                          <br />
                          <strong className="text-ink">{money(li.extendedPrice)}</strong>
                        </span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
        </div>

        {step === "review" && (
          <div className="p-4 border-t border-line flex flex-col-reverse sm:flex-row sm:justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={reset}
              className="min-h-[44px] px-4 rounded-edge border border-line text-body font-bold hover:bg-paper cursor-pointer"
            >
              Choose a different file
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="min-h-[44px] px-4 rounded-edge bg-brand-deep hover:bg-brand text-white font-bold cursor-pointer"
            >
              {existingDeal ? "Update the quote" : "Save the quote"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
