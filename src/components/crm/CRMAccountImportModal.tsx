import React, { useState, useRef, useMemo } from "react";
import { X, Upload, AlertTriangle, CheckCircle2, Loader2, FileSpreadsheet, Users, Building2, Copy } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useDialogDismiss } from "../../utils/useDialogDismiss";
import { Account, ContactFrequency } from "../../types/crm";
import {
  AccountImportPlan,
  buildAccountImportPlan,
  decodeCsvBytes
} from "../../utils/accountCsvImport";

/**
 * Account CSV import
 *
 * Reads a customer list export, shows exactly what will be created — and what
 * will be skipped as an existing account — and writes nothing until the user
 * confirms. A bulk import that silently duplicates 500 accounts is far more
 * expensive to unpick than the preview step is to read.
 */

interface CRMAccountImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TERRITORIES: Account["territory"][] = ["National", "VIC/TAS", "NSW/ACT", "QLD/NT", "SA", "WA"];
const FREQUENCIES: ContactFrequency[] = ["As needed", "Occasional", "Opportunity"];
const PREVIEW_LIMIT = 25;

export const CRMAccountImportModal: React.FC<CRMAccountImportModalProps> = ({ isOpen, onClose }) => {
  const { accounts, importAccounts, currentUser, showToast } = useApp();

  const [fileName, setFileName] = useState("");
  const [isReading, setIsReading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [readError, setReadError] = useState("");
  const [defaultTerritory, setDefaultTerritory] = useState<Account["territory"]>("National");
  const [contactFrequency, setContactFrequency] = useState<ContactFrequency>("As needed");
  const [createContacts, setCreateContacts] = useState(true);
  const [result, setResult] = useState<{ accounts: number; contacts: number; skipped: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useDialogDismiss(isOpen, onClose);

  const plan: AccountImportPlan | null = useMemo(() => {
    // Re-planning against `accounts` is the point: the duplicate column has to
    // reflect what is in the CRM right now. Once the import has run, though,
    // every row would match what it just created — and there is nothing left to
    // preview, so stop.
    if (!csvText || result) return null;
    return buildAccountImportPlan(csvText, accounts, {
      accountOwner: currentUser.name,
      defaultTerritory,
      contactFrequency
    });
  }, [csvText, accounts, currentUser.name, defaultTerritory, contactFrequency, result]);

  const reset = () => {
    setFileName("");
    setCsvText("");
    setReadError("");
    setResult(null);
    setIsReading(false);
    setIsImporting(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFile = async (file: File) => {
    setIsReading(true);
    setReadError("");
    setResult(null);
    setFileName(file.name);
    try {
      const buffer = await file.arrayBuffer();
      setCsvText(decodeCsvBytes(new Uint8Array(buffer)));
    } catch {
      setCsvText("");
      setReadError("That file could not be read. Save it again as CSV and try once more.");
    } finally {
      setIsReading(false);
    }
  };

  const handleImport = async () => {
    if (!plan || plan.readyCount === 0 || isImporting) return;
    setIsImporting(true);

    const newAccounts = plan.readyRows.map((row) => row.account!).filter(Boolean);
    const newContacts = createContacts
      ? plan.readyRows.map((row) => row.contact).filter((c): c is NonNullable<typeof c> => Boolean(c))
      : [];
    const skipped = plan.duplicateCount + plan.invalidCount;

    try {
      const written = await importAccounts(newAccounts, newContacts, fileName || "a CSV file");
      setResult({ accounts: written.accounts, contacts: written.contacts, skipped });
      showToast(
        `Imported ${written.accounts} ${written.accounts === 1 ? "account" : "accounts"}${
          written.contacts ? ` and ${written.contacts} ${written.contacts === 1 ? "contact" : "contacts"}` : ""
        }.`,
        "success"
      );
    } finally {
      setIsImporting(false);
    }
  };

  if (!isOpen) return null;

  const previewRows = plan ? plan.rows.slice(0, PREVIEW_LIMIT) : [];

  return (
    <div className="fixed inset-0 z-50 bg-chrome/70 backdrop-blur-xs p-4 flex items-center justify-center animate-in fade-in duration-150">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-accounts-title"
        className="bg-surface rounded-panel max-w-3xl w-full border border-line shadow-2xl flex flex-col max-h-[90vh]"
      >
        <div className="flex items-center justify-between border-b border-line p-5">
          <div>
            <h3 id="import-accounts-title" className="font-bold text-body text-base">
              Import accounts from a CSV
            </h3>
            <p className="text-spec text-ink-dim mt-0.5">
              Nothing is saved until you press Import.
            </p>
          </div>
          <button onClick={handleClose} aria-label="Close" className="text-ink-dim hover:text-body cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto min-w-0 space-y-4">
          {result ? (
            <div className="space-y-3 text-center py-6">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <h4 className="font-bold text-body text-base">Import finished</h4>
              <p className="text-spec text-ink-dim">
                Added {result.accounts} {result.accounts === 1 ? "account" : "accounts"}
                {result.contacts > 0 ? ` and ${result.contacts} ${result.contacts === 1 ? "contact" : "contacts"}` : ""}.
                {result.skipped > 0 ? ` ${result.skipped} ${result.skipped === 1 ? "row was" : "rows were"} skipped.` : ""}
              </p>
            </div>
          ) : (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                aria-label="Customer list CSV file"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                  e.target.value = "";
                }}
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isReading}
                className="w-full min-h-[110px] border-2 border-dashed border-line-strong rounded-panel flex flex-col items-center justify-center gap-2 text-ink-dim hover:border-brand-deep hover:text-brand-deep transition-colors cursor-pointer disabled:cursor-wait"
              >
                {isReading ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span className="font-bold text-spec">Reading the file…</span>
                  </>
                ) : (
                  <>
                    {fileName ? <FileSpreadsheet className="w-6 h-6" /> : <Upload className="w-6 h-6" />}
                    <span className="font-bold text-spec">{fileName || "Choose a CSV file"}</span>
                    <span className="text-spec">
                      Columns: Customer Name, Customer Style, Address 1, Address 2, Contact, Phone
                    </span>
                  </>
                )}
              </button>

              {readError && (
                <p className="text-spec text-red-700 bg-red-50 border border-red-200 rounded-edge p-3 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{readError}</span>
                </p>
              )}

              {plan?.error && (
                <p className="text-spec text-red-700 bg-red-50 border border-red-200 rounded-edge p-3 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{plan.error}</span>
                </p>
              )}

              {plan && !plan.error && (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white border border-line rounded-edge p-3">
                      <div className="flex items-center gap-1.5 text-ink-dim text-spec">
                        <Building2 className="w-3.5 h-3.5" /> New accounts
                      </div>
                      <p className="text-lg font-bold text-body mt-0.5">{plan.readyCount}</p>
                    </div>
                    <div className="bg-white border border-line rounded-edge p-3">
                      <div className="flex items-center gap-1.5 text-ink-dim text-spec">
                        <Users className="w-3.5 h-3.5" /> Contacts
                      </div>
                      <p className="text-lg font-bold text-body mt-0.5">{createContacts ? plan.contactCount : 0}</p>
                    </div>
                    <div className="bg-white border border-line rounded-edge p-3">
                      <div className="flex items-center gap-1.5 text-ink-dim text-spec">
                        <Copy className="w-3.5 h-3.5" /> Skipped
                      </div>
                      <p className="text-lg font-bold text-body mt-0.5">{plan.duplicateCount + plan.invalidCount}</p>
                    </div>
                  </div>

                  {plan.duplicateCount > 0 && (
                    <p className="text-spec text-amber-800 bg-amber-50 border border-amber-200 rounded-edge p-3">
                      {plan.duplicateCount} {plan.duplicateCount === 1 ? "row matches an account" : "rows match accounts"} already
                      in the CRM and will be left alone. Existing records are never overwritten by an import.
                    </p>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="import-territory" className="block text-spec font-bold mb-1">
                        Territory when the address has no state
                      </label>
                      <select
                        id="import-territory"
                        value={defaultTerritory}
                        onChange={(e) => setDefaultTerritory(e.target.value as Account["territory"])}
                        className="w-full p-2 border border-line rounded-edge bg-white text-spec"
                      >
                        {TERRITORIES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="import-frequency" className="block text-spec font-bold mb-1">
                        Contact frequency for imported customers
                      </label>
                      <select
                        id="import-frequency"
                        value={contactFrequency}
                        onChange={(e) => setContactFrequency(e.target.value as ContactFrequency)}
                        className="w-full p-2 border border-line rounded-edge bg-white text-spec"
                      >
                        {FREQUENCIES.map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 text-spec text-body cursor-pointer">
                    <input
                      type="checkbox"
                      checked={createContacts}
                      onChange={(e) => setCreateContacts(e.target.checked)}
                      className="rounded-xs"
                    />
                    Also add the named person in each row as a contact ({plan.contactCount} of {plan.readyCount})
                  </label>

                  {plan.unmappedHeaders.length > 0 && (
                    <p className="text-spec text-ink-dim">
                      Ignored columns: {plan.unmappedHeaders.join(", ")}.
                    </p>
                  )}

                  <div className="border border-line rounded-edge overflow-hidden">
                    <div className="overflow-x-auto max-h-64 overflow-y-auto">
                      <table className="w-full text-spec">
                        <thead className="bg-paper/60 sticky top-0">
                          <tr className="text-left text-ink-dim">
                            <th className="p-2 font-bold">Account</th>
                            <th className="p-2 font-bold">Type</th>
                            <th className="p-2 font-bold">Suburb / State</th>
                            <th className="p-2 font-bold">Contact</th>
                            <th className="p-2 font-bold">Outcome</th>
                          </tr>
                        </thead>
                        <tbody>
                          {previewRows.map((row) => (
                            <tr key={row.rowNumber} className="border-t border-line align-top">
                              <td className="p-2 text-body font-medium">{row.sourceName || `Row ${row.rowNumber}`}</td>
                              <td className="p-2 text-ink-dim">{row.account?.accountType || "—"}</td>
                              <td className="p-2 text-ink-dim">
                                {[row.account?.billingAddress?.city, row.account?.billingAddress?.state]
                                  .filter(Boolean)
                                  .join(", ") || "—"}
                              </td>
                              <td className="p-2 text-ink-dim">
                                {row.contact ? `${row.contact.firstName} ${row.contact.lastName}`.trim() : "—"}
                              </td>
                              <td className="p-2">
                                {row.status === "ready" ? (
                                  <span className="text-emerald-700 font-bold">Will be added</span>
                                ) : (
                                  <span className="text-amber-800">{row.message || "Skipped"}</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {plan.totalRows > PREVIEW_LIMIT && (
                      <p className="text-spec text-ink-dim p-2 border-t border-line bg-paper/40">
                        Showing the first {PREVIEW_LIMIT} of {plan.totalRows} rows.
                      </p>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 p-5 border-t border-line">
          <button
            type="button"
            onClick={handleClose}
            className="px-3 py-1.5 border border-line rounded-edge text-spec font-medium cursor-pointer"
          >
            {result ? "Done" : "Cancel"}
          </button>
          {!result && (
            <button
              type="button"
              onClick={handleImport}
              disabled={!plan || Boolean(plan.error) || plan.readyCount === 0 || isImporting}
              className="px-4 py-1.5 bg-brand-deep hover:bg-brand text-white font-bold text-spec rounded-edge cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isImporting ? "Importing…" : plan ? `Import ${plan.readyCount} accounts` : "Import"}
            </button>
          )}
        </div>
      </section>
    </div>
  );
};
