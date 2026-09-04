import React, { useState, useEffect } from "react";
import {
  X,
  Calendar,
  Clock,
  Building2,
  Users,
  MapPin,
  FileText,
  Video,
  Phone,
  Compass,
  Check,
  Briefcase
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { getLocalDateInputValue, formatAuTime } from "../../utils/dateUtils";
import { getTomorrowDateString } from "../../utils/crmMeetingPreparation";

export const CRMScheduleMeetingModal: React.FC = () => {
  const {
    scheduleMeetingModal,
    closeScheduleMeeting,
    scheduleCustomerMeeting,
    openMeetingPrep,
    accounts,
    contacts,
    crmOpportunities
  } = useApp();

  const [accountId, setAccountId] = useState("");
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [opportunityId, setOpportunityId] = useState("");
  const [title, setTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState(getTomorrowDateString());
  const [meetingTime, setMeetingTime] = useState("10:00");
  const [meetingFormat, setMeetingFormat] = useState<"In Person" | "Teams/Zoom" | "Phone" | "Site Visit">("In Person");
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [location, setLocation] = useState("");
  const [agenda, setAgenda] = useState("");
  const [notes, setNotes] = useState("");

  // Initialize from prefill context
  useEffect(() => {
    if (scheduleMeetingModal?.isOpen) {
      const prefill = scheduleMeetingModal.prefill;
      // Nothing is chosen on the rep's behalf. This previously defaulted to the
      // first account and then ticked the first two of its contacts, so people
      // nobody selected ended up as meeting participants — and their names were
      // printed in the preparation plan's attendee line.
      const initialAccountId = prefill?.accountId || "";
      setAccountId(initialAccountId);
      setSelectedContactIds(prefill?.contactId ? [prefill.contactId] : []);

      setOpportunityId(prefill?.opportunityId || "");
      setMeetingDate(prefill?.date || getTomorrowDateString());
      setTitle("");
      setMeetingTime("10:00");
      setMeetingFormat("In Person");
      setDurationMinutes(45);
      setLocation("");
      setAgenda("");
      setNotes("");
    }
  }, [scheduleMeetingModal, accounts, contacts]);

  if (!scheduleMeetingModal || !scheduleMeetingModal.isOpen) return null;

  // Contacts belonging to the selected account
  const accountContacts = contacts.filter((c) => c.accountId === accountId && !c.isArchived);
  // Deals belonging to the selected account
  const accountDeals = crmOpportunities.filter((d) => d.accountId === accountId);
  const selectedAccount = accounts.find((a) => a.id === accountId);

  const toggleContact = (cId: string) => {
    setSelectedContactIds((prev) =>
      prev.includes(cId) ? prev.filter((id) => id !== cId) : [...prev, cId]
    );
  };

  const handleAccountChange = (newAccId: string) => {
    setAccountId(newAccId);
    // Changing customer clears the participant list rather than ticking the
    // first two contacts of the new account on the rep's behalf.
    setSelectedContactIds([]);
    setOpportunityId("");
  };

  const setDatePreset = (preset: "tomorrow" | "in2days" | "nextweek") => {
    const d = new Date();
    if (preset === "tomorrow") {
      d.setDate(d.getDate() + 1);
    } else if (preset === "in2days") {
      d.setDate(d.getDate() + 2);
    } else if (preset === "nextweek") {
      d.setDate(d.getDate() + 7);
    }
    setMeetingDate(d.toISOString().split("T")[0]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const primaryContact = contacts.find((c) => selectedContactIds.includes(c.id));
    const opp = crmOpportunities.find((o) => o.id === opportunityId);

    const defaultTitle = `Meeting with ${selectedAccount?.name || "Customer"}`;

    const scheduled = scheduleCustomerMeeting({
      title: title.trim() || defaultTitle,
      type: "Meeting",
      priority: "High",
      dueDate: meetingDate,
      dueTime: meetingTime,
      accountId: selectedAccount?.id,
      accountName: selectedAccount?.name,
      contactId: primaryContact?.id,
      contactName: primaryContact ? `${primaryContact.firstName} ${primaryContact.lastName}` : undefined,
      contactIds: selectedContactIds,
      opportunityId: opp?.id,
      opportunityName: opp?.name,
      location: location.trim() || undefined,
      meetingFormat,
      durationMinutes,
      agenda: agenda.trim() || undefined,
      notes: notes.trim() || undefined
    });

    closeScheduleMeeting();
    // Offer to immediately view the generated meeting preparation plan
    if (scheduled) {
      openMeetingPrep(scheduled.id);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="schedule-meeting-title"
      className="fixed inset-0 bg-chrome/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto"
    >
      <div className="bg-white rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl space-y-4 my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-brand-wash text-brand-deep rounded-edge">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 id="schedule-meeting-title" className="text-base font-bold text-body">
                Schedule a meeting
              </h3>
              <p className="text-spec text-ink-dim">
                A preparation plan is put together for you once it is booked
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeScheduleMeeting}
            aria-label="Close scheduling modal"
            className="text-ink-faint hover:text-ink-dim p-1 rounded-edge cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* 1. Target Account */}
          <div>
            <label className="block text-spec font-bold uppercase text-ink-dim mb-1">
              Customer / Account *
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-ink-dim absolute left-3 top-3" />
              <select
                value={accountId}
                onChange={(e) => handleAccountChange(e.target.value)}
                required
                className="w-full pl-9 pr-3 py-2 text-spec rounded-edge border border-line focus:outline-none focus:border-brand-deep bg-white font-medium"
              >
                <option value="">Choose a customer…</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.territory})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 2. Participants / Contacts */}
          <div>
            <label className="block text-spec font-bold uppercase text-ink-dim mb-1 flex items-center justify-between">
              <span>Meeting Participants</span>
              <span className="text-[11px] text-ink-faint font-normal">
                {selectedContactIds.length} selected
              </span>
            </label>
            {accountContacts.length > 0 ? (
              <div className="p-2 bg-paper rounded-edge border border-line space-y-1.5 max-h-32 overflow-y-auto">
                {accountContacts.map((c) => {
                  const isSelected = selectedContactIds.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleContact(c.id)}
                      className={`w-full flex items-center justify-between p-1.5 rounded text-xs transition-colors cursor-pointer text-left ${
                        isSelected
                          ? "bg-brand-wash text-brand-deep font-semibold"
                          : "hover:bg-white text-body"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                            isSelected ? "bg-brand-deep border-brand-deep text-white" : "border-line bg-white"
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                        </div>
                        <span>
                          {c.firstName} {c.lastName}
                        </span>
                        {c.jobTitle && (
                          <span className="text-ink-dim text-[11px]">· {c.jobTitle}</span>
                        )}
                      </div>
                      {c.preferredContactMethod && (
                        <span className="text-[10px] text-ink-dim uppercase">
                          {c.preferredContactMethod}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-ink-dim italic">
                No active contacts recorded for this account.
              </p>
            )}
          </div>

          {/* 3. Meeting Title & Objective */}
          <div>
            <label className="block text-spec font-bold uppercase text-ink-dim mb-1">
              Meeting Title / Main Objective
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`e.g. Stock Replenishment & SA Rollout Review with ${selectedAccount?.name || "Customer"}`}
              className="w-full px-3 py-2 text-spec rounded-edge border border-line focus:outline-none focus:border-brand-deep"
            />
          </div>

          {/* 4. Date & Time Selection with Presets */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-spec font-bold uppercase text-ink-dim">
                Date &amp; Time *
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setDatePreset("tomorrow")}
                  className="px-2 py-0.5 text-[11px] font-semibold rounded bg-paper border border-line hover:border-brand-deep hover:text-brand-deep text-ink-dim cursor-pointer"
                >
                  Tomorrow
                </button>
                <button
                  type="button"
                  onClick={() => setDatePreset("in2days")}
                  className="px-2 py-0.5 text-[11px] font-semibold rounded bg-paper border border-line hover:border-brand-deep hover:text-brand-deep text-ink-dim cursor-pointer"
                >
                  In 2 Days
                </button>
                <button
                  type="button"
                  onClick={() => setDatePreset("nextweek")}
                  className="px-2 py-0.5 text-[11px] font-semibold rounded bg-paper border border-line hover:border-brand-deep hover:text-brand-deep text-ink-dim cursor-pointer"
                >
                  Next Week
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="relative">
                <Calendar className="w-4 h-4 text-ink-dim absolute left-3 top-2.5" />
                <input
                  type="date"
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-2 text-spec rounded-edge border border-line focus:outline-none focus:border-brand-deep font-sans"
                />
              </div>

              <div className="relative">
                <Clock className="w-4 h-4 text-ink-dim absolute left-3 top-2.5" />
                <select
                  value={meetingTime}
                  onChange={(e) => setMeetingTime(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-spec rounded-edge border border-line focus:outline-none focus:border-brand-deep bg-white"
                >
                  {/*
                    Stored as 24-hour and displayed through the shared
                    formatter. The picker previously offered "08:30 AM" while
                    the calendar card and preparation plan rendered the same
                    value as "08:30".
                  */}
                  {[
                    "08:30", "09:00", "09:30", "10:00", "10:30",
                    "11:00", "11:30", "12:00", "13:00", "13:30",
                    "14:00", "14:30", "15:00", "15:30", "16:00", "16:30"
                  ].map((tm) => (
                    <option key={tm} value={tm}>
                      {formatAuTime(tm)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 5. Format, Duration & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className="block text-spec font-bold uppercase text-ink-dim mb-1">
                Format
              </label>
              <select
                value={meetingFormat}
                onChange={(e) => setMeetingFormat(e.target.value as any)}
                className="w-full px-2.5 py-2 text-spec rounded-edge border border-line focus:outline-none focus:border-brand-deep bg-white"
              >
                <option value="In Person">In Person</option>
                <option value="Teams/Zoom">Teams / Zoom</option>
                <option value="Phone">Phone</option>
                <option value="Site Visit">Site Visit</option>
              </select>
            </div>

            <div>
              <label className="block text-spec font-bold uppercase text-ink-dim mb-1">
                Duration
              </label>
              <select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full px-2.5 py-2 text-spec rounded-edge border border-line focus:outline-none focus:border-brand-deep bg-white"
              >
                <option value={15}>15 mins</option>
                <option value={30}>30 mins</option>
                <option value={45}>45 mins</option>
                <option value={60}>1 hour</option>
                <option value={90}>1.5 hours</option>
              </select>
            </div>

            <div>
              <label className="block text-spec font-bold uppercase text-ink-dim mb-1">
                Location / Link
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Office, Site, or Link"
                className="w-full px-2.5 py-2 text-spec rounded-edge border border-line focus:outline-none focus:border-brand-deep"
              />
            </div>
          </div>

          {/* 6. Linked Opportunity (Optional) */}
          {accountDeals.length > 0 && (
            <div>
              <label className="block text-spec font-bold uppercase text-ink-dim mb-1">
                Linked Deal / Opportunity (Optional)
              </label>
              <div className="relative">
                <Briefcase className="w-4 h-4 text-ink-dim absolute left-3 top-3" />
                <select
                  value={opportunityId}
                  onChange={(e) => setOpportunityId(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-spec rounded-edge border border-line focus:outline-none focus:border-brand-deep bg-white"
                >
                  <option value="">-- No specific deal --</option>
                  {accountDeals.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} (${(d.dealValue || 0).toLocaleString()} · {d.stageName})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* 7. Agenda & Notes */}
          <div>
            <label className="block text-spec font-bold uppercase text-ink-dim mb-1">
              Meeting Agenda &amp; Key Focus Points
            </label>
            <textarea
              value={agenda}
              onChange={(e) => setAgenda(e.target.value)}
              placeholder="e.g. Discuss PLASSLAB consumption in SA, confirm timeline for next order, review open quote."
              rows={2}
              className="w-full p-2.5 text-spec rounded-edge border border-line focus:outline-none focus:border-brand-deep font-sans"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-line">
            <button
              type="button"
              onClick={closeScheduleMeeting}
              className="px-3.5 py-2 text-spec font-bold text-ink-dim hover:text-ink cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-[44px] px-4 py-2 bg-brand-deep hover:bg-brand text-white text-spec font-bold rounded-edge shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Book meeting</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
