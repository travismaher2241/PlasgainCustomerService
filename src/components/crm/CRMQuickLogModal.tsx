import React, { useState, useEffect } from "react";
import {
  X,
  Phone,
  Mail,
  Calendar,
  FileText,
  CheckCircle2,
  Clock,
  User,
  Building2,
  Zap
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { ActivityType } from "../../types/crm";

export const CRMQuickLogModal: React.FC = () => {
  const {
    quickLogModal,
    closeQuickLog,
    accounts,
    crmOpportunities,
    contacts,
    logActivity,
    addTask,
    currentUser
  } = useApp();

  const [type, setType] = useState<ActivityType>("call");
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [selectedOppId, setSelectedOppId] = useState("");
  const [selectedContactId, setSelectedContactId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [outcome, setOutcome] = useState("Connected / Positive");
  const [scheduleFollowUp, setScheduleFollowUp] = useState(true);
  const [followUpDate, setFollowUpDate] = useState(
    new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );

  const applyPreset = (presetType: "voicemail" | "dialux" | "price-accepted") => {
    const acc = accounts.find((a) => a.id === selectedAccountId);
    const accName = acc?.name || "Client";

    if (presetType === "voicemail") {
      setType("call");
      setTitle(`Left Voicemail for ${accName}`);
      setDescription("Left voicemail message regarding tender quote follow-up and delivery schedule.");
      setOutcome("Left Voicemail");
      setScheduleFollowUp(true);
      setFollowUpDate(new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);
    } else if (presetType === "dialux") {
      setType("email");
      setTitle(`Sent Dialux & Datasheet Package to ${accName}`);
      setDescription("Issued AS/NZS 1158 Dialux photometric simulation report and product datasheet package for council review.");
      setOutcome("Sent Technical Package");
      setScheduleFollowUp(true);
      setFollowUpDate(new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);
    } else if (presetType === "price-accepted") {
      setType("call");
      setTitle(`Price Acceptance Confirmed with ${accName}`);
      setDescription("Customer verbally confirmed price acceptance. Awaiting formal Purchase Order / tender award.");
      setOutcome("Price Accepted");
      setScheduleFollowUp(true);
      setFollowUpDate(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);
    }
  };

  useEffect(() => {
    if (quickLogModal?.isOpen) {
      const initialType = quickLogModal.type === "task" ? "call" : (quickLogModal.type as ActivityType) || "call";
      const accId = quickLogModal.accountId || accounts[0]?.id || "";
      const acc = accounts.find((a) => a.id === accId);
      const accName = acc?.name || "Client";
      const defaultTitle = initialType === "call" ? `Call with ${accName}` : initialType === "email" ? `Email sent to ${accName}` : initialType === "meeting" ? `Meeting with ${accName}` : `Account Note: ${accName}`;

      setType(initialType);
      setSelectedAccountId(accId);
      setSelectedOppId(quickLogModal.opportunityId || "");
      setSelectedContactId(quickLogModal.contactId || "");
      setTitle(defaultTitle);
      setDescription("");
      setOutcome("Connected / Positive");
    }
  }, [quickLogModal?.isOpen, quickLogModal?.accountId, quickLogModal?.opportunityId, quickLogModal?.contactId, quickLogModal?.type, accounts]);

  const targetAccount = accounts.find((a) => a.id === selectedAccountId);
  const targetOpp = crmOpportunities.find((d) => d.id === selectedOppId);
  const targetContact = contacts.find((c) => c.id === selectedContactId);

  const handleTypeChange = (newType: ActivityType) => {
    setType(newType);
    const prefixes = ["Call with", "Email sent to", "Meeting with", "Account Note:"];
    const isAutoTitle = !title || prefixes.some((p) => title.startsWith(p));
    if (isAutoTitle) {
      const acc = accounts.find((a) => a.id === selectedAccountId);
      const accName = acc?.name || "Client";
      if (newType === "call") setTitle(`Call with ${accName}`);
      else if (newType === "email") setTitle(`Email sent to ${accName}`);
      else if (newType === "meeting") setTitle(`Meeting with ${accName}`);
      else if (newType === "note") setTitle(`Account Note: ${accName}`);
    }
  };

  useEffect(() => {
    if (!title && quickLogModal?.isOpen) {
      if (type === "call") setTitle(`Call with ${targetAccount?.name || "Client"}`);
      else if (type === "email") setTitle(`Email sent to ${targetAccount?.name || "Client"}`);
      else if (type === "meeting") setTitle(`Meeting with ${targetAccount?.name || "Client"}`);
      else if (type === "note") setTitle(`Account Note: ${targetAccount?.name || "Client"}`);
    }
  }, [type, targetAccount, quickLogModal?.isOpen, title]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    logActivity({
      type,
      title,
      description,
      accountId: targetAccount?.id,
      accountName: targetAccount?.name,
      opportunityId: targetOpp?.id,
      opportunityName: targetOpp?.name,
      contactId: targetContact?.id,
      contactName: targetContact ? `${targetContact.firstName} ${targetContact.lastName}` : undefined,
      performedBy: currentUser.name,
      metadata: {
        outcome
      }
    });

    if (scheduleFollowUp && followUpDate) {
      addTask({
        title: `Follow-up: ${title}`,
        type: "Follow-up",
        status: "To Do",
        priority: "High",
        dueDate: followUpDate,
        dueTime: "10:00 AM",
        accountId: targetAccount?.id,
        accountName: targetAccount?.name,
        opportunityId: targetOpp?.id,
        opportunityName: targetOpp?.name,
        assignedTo: currentUser.name,
        createdBy: currentUser.name,
        notes: `Automated follow-up created from activity log.`
      });
    }

    closeQuickLog();
  };

  // Condition checked AFTER all hooks have executed unconditionally
  if (!quickLogModal || !quickLogModal.isOpen) return null;

  return (
    <div className="fixed inset-0 bg-chrome/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-brand-wash text-brand-deep rounded-edge">
              <Phone className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-body">Quick Log Activity &amp; Next Step</h3>
          </div>
          <button onClick={closeQuickLog} className="text-ink-faint hover:text-ink-dim">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-meta">
          {/* STRM-01: 1-Click Call Outcome Presets */}
          <div className="p-2.5 bg-brand-wash/60 rounded-edge border border-brand-edge space-y-1.5">
            <div className="flex items-center justify-between text-spec font-bold text-brand-deep uppercase">
              <span className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" /> 1-Click Outcome Presets:
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => applyPreset("voicemail")}
                className="px-2.5 py-1 bg-white hover:bg-brand-wash border border-brand-edge text-body hover:text-brand-deep rounded text-spec font-semibold cursor-pointer shadow-2xs transition-colors"
                title="Fill: Left voice message & auto-schedule follow-up task in 2 days"
              >
                📞 Left Voice Msg (+2d)
              </button>
              <button
                type="button"
                onClick={() => applyPreset("dialux")}
                className="px-2.5 py-1 bg-white hover:bg-brand-wash border border-brand-edge text-body hover:text-brand-deep rounded text-spec font-semibold cursor-pointer shadow-2xs transition-colors"
                title="Fill: Sent Dialux photometric report & task in 5 days"
              >
                📄 Sent Dialux / Spec (+5d)
              </button>
              <button
                type="button"
                onClick={() => applyPreset("price-accepted")}
                className="px-2.5 py-1 bg-white hover:bg-brand-wash border border-brand-edge text-body hover:text-brand-deep rounded text-spec font-semibold cursor-pointer shadow-2xs transition-colors"
                title="Fill: Customer confirmed price acceptance & task in 3 days"
              >
                🏆 Price Accepted (+3d)
              </button>
            </div>
          </div>

          {/* Activity Type */}
          <div>
            <label className="block text-spec font-bold text-ink-dim uppercase mb-1.5">
              Activity Type
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {(["call", "email", "meeting", "note"] as ActivityType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleTypeChange(t)}
                  className={`py-2 rounded-edge font-bold text-spec flex items-center justify-center gap-1.5 transition-colors cursor-pointer capitalize ${
                    type === t
                      ? "bg-brand-deep text-white shadow-xs"
                      : "bg-paper hover:bg-raised text-ink-dim"
                  }`}
                >
                  {t === "call" && <Phone className="w-3.5 h-3.5" />}
                  {t === "email" && <Mail className="w-3.5 h-3.5" />}
                  {t === "meeting" && <Calendar className="w-3.5 h-3.5" />}
                  {t === "note" && <FileText className="w-3.5 h-3.5" />}
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Account and Opportunity Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-spec font-bold text-ink-dim uppercase mb-1">
                Account / Customer
              </label>
              <select
                value={selectedAccountId}
                onChange={(e) => {
                  const newAccId = e.target.value;
                  setSelectedAccountId(newAccId);
                  setSelectedOppId("");
                  const prefixes = ["Call with", "Email sent to", "Meeting with", "Account Note:"];
                  const isAutoTitle = !title || prefixes.some((p) => title.startsWith(p));
                  if (isAutoTitle) {
                    const acc = accounts.find((a) => a.id === newAccId);
                    const accName = acc?.name || "Client";
                    if (type === "call") setTitle(`Call with ${accName}`);
                    else if (type === "email") setTitle(`Email sent to ${accName}`);
                    else if (type === "meeting") setTitle(`Meeting with ${accName}`);
                    else if (type === "note") setTitle(`Account Note: ${accName}`);
                  }
                }}
                className="w-full p-2 text-meta rounded-edge border border-line bg-white focus:outline-none"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-spec font-bold text-ink-dim uppercase mb-1">
                Linked Deal (Optional)
              </label>
              <select
                value={selectedOppId}
                onChange={(e) => setSelectedOppId(e.target.value)}
                className="w-full p-2 text-meta rounded-edge border border-line bg-white focus:outline-none"
              >
                <option value="">None / General Account</option>
                {crmOpportunities
                  .filter((d) => !selectedAccountId || d.accountId === selectedAccountId)
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-spec font-bold text-ink-dim uppercase mb-1">
              Activity Summary / Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Call with Sarah Jenkins on Dialux spacing"
              className="w-full p-2 text-meta rounded-edge border border-line focus:outline-none focus:border-brand-deep font-semibold"
              required
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-spec font-bold text-ink-dim uppercase mb-1">
              Discussion Notes &amp; Outcome
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What was discussed? Any specific luminaire or battery autonomy questions?"
              className="w-full p-2 text-meta rounded-edge border border-line focus:outline-none focus:border-brand-deep"
            />
          </div>

          {/* Schedule Next Step */}
          <div className="p-3 bg-paper rounded-edge border border-line space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-spec font-bold text-body flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={scheduleFollowUp}
                  onChange={(e) => setScheduleFollowUp(e.target.checked)}
                  className="rounded text-brand-deep focus:ring-0 cursor-pointer"
                />
                <span>Schedule Next Follow-Up Task</span>
              </label>
              {scheduleFollowUp && (
                <span className="text-spec font-bold text-brand-deep bg-brand-wash px-1.5 py-0.5 rounded">
                  High Priority
                </span>
              )}
            </div>

            {scheduleFollowUp && (
              <div className="flex items-center gap-2 pt-1">
                <Clock className="w-3.5 h-3.5 text-ink-dim shrink-0" />
                <input
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="p-1 text-meta rounded border border-line bg-white focus:outline-none text-body"
                />
                <span className="text-spec text-ink-dim">Assigned to {currentUser.name}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
            <button
              type="button"
              onClick={closeQuickLog}
              className="px-3 py-2 text-meta font-medium text-ink-dim hover:text-ink cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-brand-deep hover:bg-brand-deep text-white font-bold text-meta rounded-edge shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Log Activity &amp; Save Next Step</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
