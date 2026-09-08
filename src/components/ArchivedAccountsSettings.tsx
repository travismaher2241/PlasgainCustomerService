import React, { useMemo, useState } from "react";
import { Archive, ArchiveRestore, Trash2, Search, AlertCircle } from "lucide-react";
import { useApp } from "../context/AppContext";
import { Account } from "../types/crm";
import { formatAuDate } from "../utils/dateUtils";

export const ArchivedAccountsSettings: React.FC = () => {
  const { accounts, updateAccount, deleteAccount, showToast } = useApp();
  const [searchQuery, setSearchQuery] = useState("");
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const archivedAccounts = useMemo(
    () => accounts.filter((a) => Boolean(a.isArchived || a.status === "Archived")),
    [accounts]
  );

  const filteredArchived = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return archivedAccounts;
    return archivedAccounts.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        (a.tradingName && a.tradingName.toLowerCase().includes(q)) ||
        (a.territory && a.territory.toLowerCase().includes(q)) ||
        (a.accountOwner && a.accountOwner.toLowerCase().includes(q))
    );
  }, [archivedAccounts, searchQuery]);

  const handleRestore = async (account: Account) => {
    setIsProcessing(account.id);
    try {
      await updateAccount(account.id, {
        isArchived: false,
        status: account.accountType === "Prospect" ? "Prospect" : "Customer",
        archivedDate: undefined,
        archivedReason: undefined
      });
      showToast(`Account "${account.name}" restored to active accounts.`, "success");
    } catch (err) {
      showToast(
        `Failed to restore account: ${err instanceof Error ? err.message : String(err)}`,
        "error"
      );
    } finally {
      setIsProcessing(null);
    }
  };

  const handlePermanentDelete = async (account: Account) => {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete "${account.name}"?\n\nThis will permanently delete the account, its contacts, and attached records. This action cannot be undone.`
    );
    if (!confirmed) return;

    setIsProcessing(account.id);
    try {
      await deleteAccount(account.id, "Permanently deleted by user from Settings");
      showToast(`Account "${account.name}" permanently deleted.`, "success");
    } catch (err) {
      showToast(
        `Failed to delete account: ${err instanceof Error ? err.message : String(err)}`,
        "error"
      );
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <section className="bg-white p-5 rounded-panel border border-line shadow-2xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-3">
        <div className="flex items-center gap-2">
          <Archive className="w-4 h-4 text-brand-deep" />
          <h2 className="text-base font-bold text-body">Archived Accounts</h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-paper border border-line text-ink-dim font-bold">
            {archivedAccounts.length}
          </span>
        </div>

        {archivedAccounts.length > 0 && (
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-dim" />
            <input
              type="text"
              aria-label="Search archived accounts"
              placeholder="Search archived..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-line rounded-edge bg-white focus:outline-none focus:border-brand-deep"
            />
          </div>
        )}
      </div>

      {archivedAccounts.length === 0 ? (
        <div className="py-12 text-center text-ink-dim space-y-2">
          <Archive className="w-10 h-10 mx-auto text-ink-faint" />
          <h3 className="font-bold text-body text-base">No archived accounts</h3>
          <p className="text-xs text-ink-dim max-w-md mx-auto">
            Accounts archived from the CRM directory are safely stored here. You can restore them
            back to the active directory anytime or permanently delete them.
          </p>
        </div>
      ) : filteredArchived.length === 0 ? (
        <div className="py-8 text-center text-ink-dim space-y-1 text-xs">
          <AlertCircle className="w-6 h-6 mx-auto text-ink-faint mb-1" />
          <p className="font-semibold text-body">No matching archived accounts</p>
          <p>No archived accounts matched "{searchQuery}".</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-spec">
            <thead>
              <tr className="border-b border-line text-ink-dim text-xs font-semibold bg-paper/50">
                <th className="py-2.5 px-3">Account Name</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Territory</th>
                <th className="py-2.5 px-3">Rep / Owner</th>
                <th className="py-2.5 px-3">Archived Details</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filteredArchived.map((acc) => {
                const disabled = isProcessing === acc.id;
                return (
                  <tr key={acc.id} className="hover:bg-raised/50 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-bold text-body truncate max-w-xs" title={acc.name}>
                        {acc.name}
                      </div>
                      {acc.tradingName && (
                        <div className="text-xs text-ink-dim truncate max-w-xs">
                          Trading as: {acc.tradingName}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        {acc.accountType || "Account"}
                      </span>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap text-xs text-ink-dim">
                      {acc.territory || "—"}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap text-xs text-body font-medium">
                      {acc.accountOwner || "—"}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap text-xs text-ink-dim">
                      <div>{acc.archivedDate ? formatAuDate(acc.archivedDate) : "Archived"}</div>
                      {acc.archivedReason && (
                        <div
                          className="text-[11px] text-ink-faint italic truncate max-w-[180px]"
                          title={acc.archivedReason}
                        >
                          {acc.archivedReason}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          aria-label={`Restore ${acc.name}`}
                          disabled={disabled}
                          onClick={() => handleRestore(acc)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-edge transition-colors cursor-pointer disabled:opacity-50"
                          title="Restore account to active list"
                        >
                          <ArchiveRestore className="w-3.5 h-3.5" />
                          <span>Restore</span>
                        </button>
                        <button
                          type="button"
                          aria-label={`Permanently delete ${acc.name}`}
                          disabled={disabled}
                          onClick={() => handlePermanentDelete(acc)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-edge transition-colors cursor-pointer disabled:opacity-50"
                          title="Permanently delete account"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete Permanently</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
