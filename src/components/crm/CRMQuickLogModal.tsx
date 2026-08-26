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
  Building2
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
    addTask
  } = useApp();

  if (!quickLogModal || !quickLogModal.isOpen) return null;

  const [type, setType] = useState<ActivityType>(
    quickLogModal.type === "task" ? "call" : (quickLogModal.type as ActivityType) || "call"
  );
  const [selectedAccountId, setSelectedAccountId] = useState(quickLogModal.accountId || accounts[0]?.id || "");
  const [selectedOppId, setSelectedOppId] = useState(quickLogModal.opportunityId || "");
  const [selectedContactId, setSelectedContactId] = useState(quickLogModal.contactId || "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [outcome, setOutcome] = useState("Connected / Positive");
  const [scheduleFollowUp, setScheduleFollowUp] = useState(true);
  const [followUpDate, setFollowUpDate] = useState(
    new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );

  const targetAccount = accounts.find((a) => a.id === selectedAccountId);
  const targetOpp = crmOpportunities.find((o) => o.id === selectedOppId);
  const targetContact = contacts.find((c) => c.id === selectedContactId);

  const handleTypeChange = (newType: ActivityType) => {
    setType(newType);
    const prefixes = ["Call with", "Email sent to", "Meeting with", "Account Note:"];
    const isAutoTitle = !title || prefixes.some((p) => title.startsWith(p));
    if (isAutoTitle) {
      if (newType === "call") setTitle(`Call with ${targetAccount?.name || "Client"}`);
      else if (newType === "email") setTitle(`Email sent to ${targetAccount?.name || "Client"}`);
      else if (newType === "meeting") setTitle(`Meeting with ${targetAccount?.name || "Client"}`);
      else if (newType === "note") setTitle(`Account Note: ${targetAccount?.name || "Client"}`);
    }
  };

  useEffect(() => {
    if (!title) {
      if (type === "call") setTitle(`Call with ${targetAccount?.name || "Client"}`);
      else if (type === "email") setTitle(`Email sent to ${targetAccount?.name || "Client"}`);
      else if (type === "meeting") setTitle(`Meeting with ${targetAccount?.name || "Client"}`);
      else if (type === "note") setTitle(`Account Note: ${targetAccount?.name || "Client"}`);
    }
  }, [type, targetAccount]);

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
      performedBy: "Marcus Vance",
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
        assignedTo: "Marcus Vance",
        createdBy: "Marcus Vance",
        notes: `Automated follow-up created from activity log.`
      });
    }

    closeQuickLog();
  };

  return (
    <div className="fixed inset-0 bg-chrome/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-brand-wash text-brand-deep rounded-edge">
              <Phone className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-body">Quick Log Activity & Next Step</h3>
          </div>
          <button onClick={closeQuickLog} className="text-ink-faint hover:text-ink-dim">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-meta">
          {/* Type Selector */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { id: "call", label: "Call", icon: Phone },
              { id: "email", label: "Email", icon: Mail },
              { id: "meeting", label: "Meeting", icon: Calendar },
              { id: "note", label: "Note", icon: FileText }
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => handleTypeChange(item.id as ActivityType)}
                  className={`py-2 px-2 rounded-edge border font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                    type === item.id
                      ? "border-brand-deep bg-brand-wash text-brand-deep"
                      : "border-line bg-white text-ink-dim hover:bg-raised"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-body mb-1">Related Account</label>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="w-full p-2 border border-line-strong rounded-edge bg-white"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-body mb-1">Related Opportunity</label>
              <select
                value={selectedOppId}
                onChange={(e) => setSelectedOppId(e.target.value)}
                className="w-full p-2 border border-line-strong rounded-edge bg-white"
              >
                <option value="">None / General</option>
                {crmOpportunities
                  .filter((o) => !selectedAccountId || o.accountId === selectedAccountId)
                  .map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-body mb-1">Activity Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-2 border border-line-strong rounded-edge"
            />
          </div>

          <div>
            <label className="block font-semibold text-body mb-1">Key Discussion Points & Summary</label>
            <textarea
              rows={3}
              placeholder="What was agreed? Any technical questions or CCT requirements raised?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2 border border-line-strong rounded-edge"
            />
          </div>

          {/* Follow up toggle */}
          <div className="p-3 bg-brand-wash border border-brand-edge rounded-edge space-y-2">
            <label className="flex items-center gap-2 font-semibold text-brand-deep cursor-pointer">
              <input
                type="checkbox"
                checked={scheduleFollowUp}
                onChange={(e) => setScheduleFollowUp(e.target.checked)}
                className="rounded border-brand text-brand-deep focus:ring-brand"
              />
              Schedule automatic next follow-up task
            </label>
            {scheduleFollowUp && (
              <div className="flex items-center gap-2 pt-1">
                <span className="text-brand-deep">Due Date:</span>
                <input
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="p-1.5 border border-brand-edge bg-white rounded-edge text-meta"
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
            <button
              type="button"
              onClick={closeQuickLog}
              className="px-4 py-2 text-ink-dim hover:text-ink"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 font-semibold text-white bg-brand-deep rounded-edge hover:bg-brand-deep"
            >
              Save Activity
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
