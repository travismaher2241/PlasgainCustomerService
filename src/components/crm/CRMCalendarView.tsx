import React, { useState, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Building2,
  Users,
  CheckCircle2,
  Sparkles,
  PhoneCall,
  MapPin,
  Briefcase,
  AlertCircle,
  FileText,
  Filter,
  Kanban,
  Check,
  X,
  Trash2
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { formatAuDateLong, formatAuTime, formatAuDate, addDaysLocal, getLocalDateInputValue } from "../../utils/dateUtils";
import { useDialogDismiss } from "../../utils/useDialogDismiss";
import { CRMTask, TaskType } from "../../types/crm";
import { getNextDayMeetings, getTomorrowDateString } from "../../utils/crmMeetingPreparation";

type CalendarViewMode = "month" | "agenda";
type CalendarFilter = "all" | "meetings" | "followups" | "quotes";

export const CRMCalendarView: React.FC = () => {
  const {
    tasks,
    crmOpportunities,
    accounts,
    activities,
    toggleTaskComplete,
    openScheduleMeeting,
    openMeetingPrep,
    openQuickLog,
    updateMeetingDate,
    deleteActivity
  } = useApp();

  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(getLocalDateInputValue());
  const [viewMode, setViewMode] = useState<CalendarViewMode>("month");
  const [filter, setFilter] = useState<CalendarFilter>("all");
  const [editingMeeting, setEditingMeeting] = useState<{ id: string; title: string; date: string; time?: string } | null>(null);
  const [newMeetingDate, setNewMeetingDate] = useState("");
  const [newMeetingTime, setNewMeetingTime] = useState("");
  useDialogDismiss(Boolean(editingMeeting), () => setEditingMeeting(null));

  const todayStr = getLocalDateInputValue();
  const tomorrowStr = getTomorrowDateString();

  // 1. Gather all calendar scheduled items
  // Meetings, follow-ups, tasks, quote deadlines, and logged meetings
  const calendarEvents = useMemo(() => {
    const events: Array<{
      id: string;
      title: string;
      date: string;
      time?: string;
      type: "meeting" | "task" | "quote";
      categoryLabel: string;
      accountName?: string;
      accountId?: string;
      contactId?: string;
      opportunityId?: string;
      contactName?: string;
      isCompleted?: boolean;
      originalTask?: CRMTask;
      quoteNumber?: string;
      dealValue?: number;
      isLoggedMeeting?: boolean;
      description?: string;
      outcome?: string;
      nextAction?: string;
      nextActionDate?: string;
      sourceActivityId?: string;
      performedBy?: string;
    }> = [];

    const coveredActivityIds = new Set<string>();

    // Add tasks & meetings
    for (const t of tasks) {
      if (t.dueDate) {
        const isMeeting = t.type === "Meeting" || t.type === "Site Visit";
        if (t.sourceActivityId) {
          coveredActivityIds.add(t.sourceActivityId);
        }
        if (t.id.startsWith("meeting-log-")) {
          coveredActivityIds.add(t.id.replace("meeting-log-", ""));
        }
        events.push({
          id: t.id,
          title: t.title,
          date: t.dueDate,
          time: t.dueTime,
          type: isMeeting ? "meeting" : "task",
          categoryLabel: isMeeting && t.outcome ? t.outcome : t.type,
          accountName: t.accountName,
          accountId: t.accountId,
          contactId: t.contactId,
          opportunityId: t.opportunityId,
          contactName: t.contactName,
          isCompleted: t.status === "Completed",
          originalTask: t,
          isLoggedMeeting: Boolean(t.sourceActivityId || (isMeeting && t.status === "Completed")),
          description: t.notes,
          outcome: t.outcome,
          sourceActivityId: t.sourceActivityId,
          performedBy: t.assignedTo || t.createdBy
        });
      }
    }

    // Add logged meetings from activities (not already covered by tasks)
    if (activities && activities.length > 0) {
      for (const act of activities) {
        if ((act.type === "meeting" || act.type === "site_visit") && !coveredActivityIds.has(act.id)) {
          const actDate =
            act.metadata?.meetingDate ||
            (act as any).meetingDate ||
            (act as any).date ||
            (act.timestamp ? act.timestamp.split("T")[0] : todayStr);
          const actTime =
            act.metadata?.meetingTime ||
            (act as any).meetingTime ||
            (act as any).time;

          events.push({
            id: `act-${act.id}`,
            title: act.title,
            date: actDate,
            time: actTime,
            type: "meeting",
            categoryLabel: act.outcome || "Meeting Held",
            accountName: act.accountName,
            accountId: act.accountId,
            contactId: act.contactId,
            opportunityId: act.opportunityId,
            contactName: act.contactName,
            isCompleted: true,
            isLoggedMeeting: true,
            description: act.description,
            outcome: act.outcome,
            nextAction: act.nextAction,
            nextActionDate: act.nextActionDate,
            sourceActivityId: act.id,
            performedBy: act.performedBy
          });
        }
      }
    }

    // Add quote expiry deadlines
    for (const opp of crmOpportunities) {
      const deadline = opp.quoteExpiryDate || opp.expectedCloseDate;
      if (deadline && opp.quoteNumber) {
        events.push({
          id: `quote-${opp.id}`,
          title: `Quote ${opp.quoteNumber} Deadline`,
          date: deadline,
          type: "quote",
          categoryLabel: "Quote Expiry",
          accountName: opp.accountName,
          accountId: opp.accountId,
          quoteNumber: opp.quoteNumber,
          dealValue: opp.dealValue
        });
      }
    }

    return events;
  }, [tasks, crmOpportunities, activities, todayStr]);

  // Filter events
  const filteredEvents = useMemo(() => {
    return calendarEvents.filter((ev) => {
      if (filter === "meetings") return ev.type === "meeting";
      if (filter === "followups") return ev.type === "task";
      if (filter === "quotes") return ev.type === "quote";
      return true;
    });
  }, [calendarEvents, filter]);

  // Next-Day meetings
  const tomorrowMeetings = useMemo(() => {
    return getNextDayMeetings(tasks);
  }, [tasks]);

  // Month navigation
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };
  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };
  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDateStr(todayStr);
  };

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const monthName = currentDate.toLocaleDateString("en-AU", { month: "long", year: "numeric" });

  // Compute month grid days
  const calendarGrid = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

    // Monday as first day of week (0: Mon, ..., 6: Sun)
    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const daysInMonth = lastDayOfMonth.getDate();

    const days: Array<{
      dateStr: string;
      dayNum: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      events: typeof filteredEvents;
    }> = [];

    // Previous month padding days
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const day = prevMonthLastDay - i;
      const prevDate = new Date(currentYear, currentMonth - 1, day);
      const dateStr = getLocalDateInputValue(prevDate);
      days.push({
        dateStr,
        dayNum: day,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        events: filteredEvents.filter((e) => e.date === dateStr)
      });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const monthStr = String(currentMonth + 1).padStart(2, "0");
      const dayStr = String(day).padStart(2, "0");
      const dateStr = `${currentYear}-${monthStr}-${dayStr}`;
      days.push({
        dateStr,
        dayNum: day,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        events: filteredEvents.filter((e) => e.date === dateStr)
      });
    }

    // Next month padding days to complete 35 or 42 cells
    const remainingCells = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remainingCells; i++) {
      const nextDate = new Date(currentYear, currentMonth + 1, i);
      const dateStr = getLocalDateInputValue(nextDate);
      days.push({
        dateStr,
        dayNum: i,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        events: filteredEvents.filter((e) => e.date === dateStr)
      });
    }

    return days;
  }, [currentYear, currentMonth, filteredEvents, todayStr]);

  // Selected date events
  const selectedDateEvents = useMemo(() => {
    return filteredEvents.filter((e) => e.date === selectedDateStr);
  }, [filteredEvents, selectedDateStr]);

  // Formatted date label for selected day
  const formattedSelectedDate = useMemo(() => {
    try {
      const [y, m, d] = selectedDateStr.split("-").map(Number);
      const dateObj = new Date(y, m - 1, d);
      return dateObj.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    } catch {
      return selectedDateStr;
    }
  }, [selectedDateStr]);

  return (
    <div className="space-y-4 max-w-7xl mx-auto px-2.5 sm:px-6 py-4">
      {/* Calendar Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-line shadow-xs">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-body flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-brand-deep" />
            <span>Calendar</span>
          </h2>
          <p className="text-spec text-ink-dim">
            Track customer meetings, follow-ups, scheduled calls, and quote milestones.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => openScheduleMeeting({ date: selectedDateStr })}
            className="px-3.5 py-2 bg-brand-deep hover:bg-brand text-white text-spec font-bold rounded-edge shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Schedule Meeting</span>
          </button>
          <button
            type="button"
            onClick={() => openQuickLog({ type: "follow_up" })}
            className="px-3 py-2 bg-paper hover:bg-line text-body text-spec font-semibold rounded-edge border border-line cursor-pointer flex items-center gap-1.5 transition-colors"
          >
            <Clock className="w-4 h-4 text-ink-dim" />
            <span>Quick Task</span>
          </button>
        </div>
      </div>

      {/* NEXT-DAY MEETING PREPARATION BANNER (Key user requirement) */}
      {tomorrowMeetings.length > 0 ? (
        <div className="p-4 bg-gradient-to-r from-brand-wash to-white border border-brand-edge rounded-2xl shadow-xs space-y-2.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-brand-deep text-white rounded-edge shadow-xs">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase text-brand-deep tracking-wider block">
                  Ready for tomorrow
                </span>
                <p className="text-sm font-bold text-body">
                  {formatAuDateLong(tomorrowStr)} &mdash; {tomorrowMeetings.length} meeting
                  {tomorrowMeetings.length === 1 ? "" : "s"}
                </p>
              </div>
            </div>
            <span className="text-xs font-medium text-ink-dim">
              A briefing is ready for each one
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
            {tomorrowMeetings.map((m) => (
              <div
                key={m.id}
                className="p-3 bg-white rounded-edge border border-line shadow-2xs flex flex-col gap-2.5 hover:border-brand-deep transition-all"
              >
                {/*
                  Stacked. As a single flex row the account name collapsed to
                  one word per line beside the button, with the separator and
                  clock icon stranded mid-column.
                */}
                <div className="space-y-1 min-w-0">
                  <div className="flex items-baseline gap-1.5 flex-wrap">
                    <span className="font-bold text-sm text-body break-words">
                      {m.title}
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-brand-wash text-brand-deep border border-brand-edge whitespace-nowrap shrink-0">
                      {m.meetingFormat || "In Person"}
                    </span>
                  </div>
                  <p className="text-xs text-ink-dim break-words">{m.accountName}</p>
                  <p className="text-xs text-ink-dim flex items-center gap-1">
                    <Clock className="w-3 h-3 shrink-0" />
                    <span>{m.dueTime ? formatAuTime(m.dueTime) : "Time to be confirmed"}</span>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => openMeetingPrep(m.id)}
                  className="w-full sm:w-auto sm:self-start min-h-[44px] px-3 bg-brand-deep hover:bg-brand text-white text-spec font-bold rounded-edge shadow-xs cursor-pointer flex items-center justify-center gap-1.5 transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Open briefing</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-3 bg-paper border border-line rounded-edge flex items-center justify-between text-xs text-ink-dim">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-ink-faint" />
            <span>No meetings scheduled for tomorrow ({tomorrowStr}).</span>
          </div>
          <button
            type="button"
            onClick={() => openScheduleMeeting({ date: tomorrowStr })}
            className="text-brand-deep font-bold hover:underline cursor-pointer"
          >
            + Schedule Meeting for Tomorrow
          </button>
        </div>
      )}

      {/* Calendar Controls & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-line">
        {/* Month Navigation */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={prevMonth}
              aria-label="Previous month"
              className="p-1.5 rounded hover:bg-line text-ink-dim hover:text-body cursor-pointer transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={nextMonth}
              aria-label="Next month"
              className="p-1.5 rounded hover:bg-line text-ink-dim hover:text-body cursor-pointer transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <span className="text-base font-bold text-body min-w-36">
            {monthName}
          </span>
          <button
            type="button"
            onClick={goToToday}
            className="px-2.5 py-1 text-xs font-semibold rounded bg-paper border border-line hover:border-ink-dim text-body cursor-pointer transition-colors"
          >
            Today
          </button>
        </div>

        {/* View Mode & Event Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Filter Chips */}
          <div className="flex items-center gap-1 bg-paper p-1 rounded-edge border border-line text-xs">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`px-2 py-1 rounded font-semibold cursor-pointer transition-colors ${
                filter === "all" ? "bg-white text-brand-deep shadow-2xs" : "text-ink-dim hover:text-body"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilter("meetings")}
              className={`px-2 py-1 rounded font-semibold cursor-pointer transition-colors ${
                filter === "meetings" ? "bg-white text-brand-deep shadow-2xs" : "text-ink-dim hover:text-body"
              }`}
            >
              Meetings
            </button>
            <button
              type="button"
              onClick={() => setFilter("followups")}
              className={`px-2 py-1 rounded font-semibold cursor-pointer transition-colors ${
                filter === "followups" ? "bg-white text-brand-deep shadow-2xs" : "text-ink-dim hover:text-body"
              }`}
            >
              Follow-ups
            </button>
            <button
              type="button"
              onClick={() => setFilter("quotes")}
              className={`px-2 py-1 rounded font-semibold cursor-pointer transition-colors ${
                filter === "quotes" ? "bg-white text-brand-deep shadow-2xs" : "text-ink-dim hover:text-body"
              }`}
            >
              Quotes
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-paper p-1 rounded-edge border border-line text-xs">
            <button
              type="button"
              onClick={() => setViewMode("month")}
              className={`px-2.5 py-1 rounded font-semibold cursor-pointer transition-colors ${
                viewMode === "month" ? "bg-brand-deep text-white shadow-xs" : "text-ink-dim hover:text-body"
              }`}
            >
              Month
            </button>
            <button
              type="button"
              onClick={() => setViewMode("agenda")}
              className={`px-2.5 py-1 rounded font-semibold cursor-pointer transition-colors ${
                viewMode === "agenda" ? "bg-brand-deep text-white shadow-xs" : "text-ink-dim hover:text-body"
              }`}
            >
              Agenda
            </button>
          </div>
        </div>
      </div>

      {/* MAIN VIEW: Month Grid or Agenda List */}
      {viewMode === "month" ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Calendar Month Grid (3 cols on desktop) */}
          <div className="lg:col-span-3 bg-white rounded-2xl border border-line shadow-xs overflow-hidden">
            {/* Days of week header */}
            <div className="grid grid-cols-7 border-b border-line bg-paper text-center py-2 text-xs font-bold uppercase text-ink-dim">
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
              <span>Sun</span>
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-line/60">
              {calendarGrid.map((day, idx) => {
                const isSelected = day.dateStr === selectedDateStr;
                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedDateStr(day.dateStr)}
                    className={`min-h-[92px] p-1.5 transition-colors cursor-pointer flex flex-col justify-between ${
                      day.isCurrentMonth ? "bg-white" : "bg-paper/50 text-ink-faint"
                    } ${isSelected ? "ring-2 ring-brand-deep bg-brand-wash/10 z-10" : "hover:bg-paper/40"}`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                          day.isToday
                            ? "bg-brand-deep text-white shadow-xs"
                            : isSelected
                            ? "bg-brand-wash text-brand-deep font-bold"
                            : "text-body"
                        }`}
                      >
                        {day.dayNum}
                      </span>
                      {day.events.length > 0 && (
                        <span className="text-[10px] text-ink-dim font-bold">
                          {day.events.length}
                        </span>
                      )}
                    </div>

                    {/* Event Chips */}
                    <div className="space-y-1 mt-1 overflow-hidden">
                      {day.events.slice(0, 2).map((ev) => {
                        const isMeeting = ev.type === "meeting";
                        const isQuote = ev.type === "quote";
                        return (
                          <div
                            key={ev.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDateStr(day.dateStr);
                            }}
                            title={`${ev.title} (${ev.accountName || ""})`}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-medium truncate flex items-center gap-1 ${
                              isMeeting
                                ? ev.isLoggedMeeting
                                  ? "bg-emerald-50 text-emerald-800 border border-emerald-300 font-semibold"
                                  : "bg-brand-wash text-brand-deep border border-brand-edge font-semibold"
                                : isQuote
                                ? "bg-purple-100 text-purple-900 border border-purple-300"
                                : ev.isCompleted
                                ? "bg-slate-100 text-slate-500 line-through"
                                : "bg-amber-100 text-amber-900 border border-amber-300 font-medium"
                            }`}
                          >
                            <span className="truncate">{ev.title}</span>
                          </div>
                        );
                      })}
                      {day.events.length > 2 && (
                        <span className="text-[9px] font-bold text-ink-dim block pl-1">
                          +{day.events.length - 2} more
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Date Drawer / Panel (1 col on desktop) */}
          <div className="bg-white rounded-2xl border border-line shadow-xs p-4 space-y-3.5">
            <div className="border-b border-line pb-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-brand-deep tracking-wider">
                  {selectedDateStr === todayStr ? "Today's Schedule" : selectedDateStr === tomorrowStr ? "Tomorrow's Schedule" : "Selected Date"}
                </span>
                <span className="text-xs text-ink-dim font-medium">
                  {selectedDateEvents.length} item{selectedDateEvents.length !== 1 ? "s" : ""}
                </span>
              </div>
              <h3 className="text-sm font-bold text-body mt-0.5">
                {formattedSelectedDate}
              </h3>
            </div>

            {/* Actions for this date */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => openScheduleMeeting({ date: selectedDateStr })}
                className="flex-1 py-1.5 bg-brand-deep hover:bg-brand text-white text-xs font-bold rounded-edge shadow-xs cursor-pointer flex items-center justify-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Meeting</span>
              </button>
              <button
                type="button"
                onClick={() => openQuickLog({ type: "follow_up" })}
                className="px-2.5 py-1.5 bg-paper hover:bg-line text-body text-xs font-semibold rounded-edge border border-line cursor-pointer"
              >
                + Task
              </button>
            </div>

            {/* Events for this day */}
            {selectedDateEvents.length > 0 ? (
              <div className="space-y-2.5 max-h-[440px] overflow-y-auto pr-0.5">
                {selectedDateEvents.map((ev) => {
                  const isMeeting = ev.type === "meeting";
                  return (
                    <div
                      key={ev.id}
                      className={`p-3 rounded-edge border text-xs space-y-2 ${
                        isMeeting
                          ? ev.isLoggedMeeting
                            ? "bg-emerald-50/40 border-emerald-200"
                            : "bg-brand-wash/40 border-brand-edge"
                          : ev.type === "quote"
                          ? "bg-purple-50/70 border-purple-200"
                          : ev.isCompleted
                          ? "bg-paper/50 border-line text-ink-faint"
                          : "bg-paper border-line text-body"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase inline-block ${
                                isMeeting
                                  ? ev.isLoggedMeeting
                                    ? "bg-emerald-700 text-white"
                                    : "bg-brand-deep text-white"
                                  : ev.type === "quote"
                                  ? "bg-purple-200 text-purple-900"
                                  : "bg-amber-200 text-amber-900"
                              }`}
                            >
                              {ev.categoryLabel}
                            </span>
                            {ev.outcome && ev.outcome !== ev.categoryLabel && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-white text-emerald-800 border border-emerald-200">
                                {ev.outcome}
                              </span>
                            )}
                          </div>
                          <h4 className={`font-bold text-sm ${ev.isCompleted && !isMeeting ? "line-through text-ink-dim" : "text-body"}`}>
                            {ev.title}
                          </h4>
                        </div>

                        {/* Completion toggle for tasks */}
                        {ev.originalTask && !isMeeting && (
                          <button
                            type="button"
                            onClick={() => toggleTaskComplete(ev.originalTask!.id)}
                            className={`p-1 rounded cursor-pointer ${
                              ev.isCompleted ? "text-green-700 bg-green-100" : "text-ink-dim hover:text-body"
                            }`}
                            title={ev.isCompleted ? "Mark incomplete" : "Mark completed"}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {ev.accountName && (
                        <p className="text-ink-dim font-medium flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-ink-faint shrink-0" />
                          <span>{ev.accountName}</span>
                          {ev.contactName && <span>· {ev.contactName}</span>}
                        </p>
                      )}

                      {ev.time && (
                        <p className="text-ink-dim flex items-center gap-1">
                          <Clock className="w-3 h-3 text-ink-faint shrink-0" />
                          <span>{ev.time}</span>
                        </p>
                      )}

                      {/* What was done / Meeting notes & discussion */}
                      {ev.description && (
                        <div className="p-2.5 bg-white rounded border border-line/80 text-xs text-body space-y-1 mt-1 shadow-2xs">
                          <span className="font-bold text-ink-dim block text-[10px] uppercase tracking-wider">
                            What Was Done / Notes:
                          </span>
                          <p className="whitespace-pre-wrap leading-relaxed text-ink text-spec">
                            {ev.description}
                          </p>
                        </div>
                      )}

                      {/* Next action if any */}
                      {ev.nextAction && (
                        <div className="text-[11px] text-brand-deep font-semibold flex items-center gap-1 pt-0.5">
                          <span>Next Action:</span>
                          <span className="font-normal text-body">{ev.nextAction}</span>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                        {isMeeting && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingMeeting({
                                id: ev.id,
                                title: ev.title,
                                date: ev.date,
                                time: ev.time
                              });
                              setNewMeetingDate(ev.date);
                              setNewMeetingTime(ev.time || "10:00 AM");
                            }}
                            className="px-2.5 py-1 bg-white hover:bg-brand-wash text-brand-deep text-xs font-bold rounded border border-brand-edge shadow-2xs cursor-pointer flex items-center gap-1 transition-colors"
                          >
                            <CalendarIcon className="w-3.5 h-3.5" />
                            <span>Change Date</span>
                          </button>
                        )}

                        {/* Delete Logged Meeting Button */}
                        {isMeeting && ev.sourceActivityId && (
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Delete logged meeting "${ev.title}"?\n\nThis will remove it and cannot be undone.`)) {
                                deleteActivity(ev.sourceActivityId!);
                              }
                            }}
                            className="px-2.5 py-1 bg-white hover:bg-rose-50 text-rose-600 text-xs font-bold rounded border border-rose-200 shadow-2xs cursor-pointer flex items-center gap-1 transition-colors"
                            title="Delete logged meeting"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        )}

                        {/* View Meeting Prep Plan Button (for scheduled upcoming meetings) */}
                        {isMeeting && ev.originalTask && !ev.isCompleted && (
                          <button
                            type="button"
                            onClick={() => openQuickLog({
                              type: "meeting",
                              accountId: ev.accountId,
                              opportunityId: ev.opportunityId,
                              contactId: ev.contactId,
                              scheduledTaskId: ev.originalTask!.id
                            })}
                            className="flex-1 py-1 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded shadow-2xs cursor-pointer flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Log meeting outcome</span>
                          </button>
                        )}

                        {isMeeting && ev.originalTask && !ev.isCompleted && (
                          <button
                            type="button"
                            onClick={() => openMeetingPrep(ev.originalTask!.id)}
                            className="flex-1 py-1 bg-brand-deep hover:bg-brand text-white text-xs font-bold rounded shadow-2xs cursor-pointer flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>View Meeting Prep Plan</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-ink-dim space-y-1">
                <p className="font-semibold text-body">No items scheduled</p>
                <p>Click "Add Meeting" to schedule a customer meeting for this date.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* AGENDA VIEW: Linear Upcoming Schedule */
        <div className="bg-white rounded-2xl border border-line shadow-xs p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-line pb-2.5">
            <span className="text-xs font-bold uppercase text-ink-dim tracking-wider">
              Upcoming Schedule (Sorted by Date)
            </span>
            <span className="text-xs text-ink-dim font-medium">
              {filteredEvents.length} items total
            </span>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {filteredEvents.length > 0 ? (
              filteredEvents.map((ev) => {
                const isMeeting = ev.type === "meeting";
                return (
                  <div
                    key={ev.id}
                    className="p-3 rounded-edge border border-line bg-paper flex items-center justify-between gap-3 hover:border-brand-deep transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="text-center shrink-0 w-12 py-1 bg-white rounded border border-line">
                        <span className="text-[10px] uppercase font-bold text-brand-deep block leading-tight">
                          {ev.date.slice(5, 7)}
                        </span>
                        <span className="text-base font-black text-body block leading-tight">
                          {ev.date.slice(8, 10)}
                        </span>
                      </div>

                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-sm text-body truncate">
                            {ev.title}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                              isMeeting
                                ? ev.isLoggedMeeting
                                  ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                                  : "bg-brand-wash text-brand-deep border border-brand-edge"
                                : ev.type === "quote"
                                ? "bg-purple-100 text-purple-900 border border-purple-300"
                                : "bg-amber-100 text-amber-900 border border-amber-300"
                            }`}
                          >
                            {ev.categoryLabel}
                          </span>
                        </div>

                        <p className="text-xs text-ink-dim flex items-center gap-2">
                          <span className="font-medium text-body">{ev.accountName}</span>
                          {ev.time && (
                            <>
                              <span>•</span>
                              <span>{ev.time}</span>
                            </>
                          )}
                          {ev.date === todayStr && (
                            <span className="text-emerald-700 font-bold">• Today</span>
                          )}
                          {ev.date === tomorrowStr && (
                            <span className="text-brand-deep font-bold">• Tomorrow</span>
                          )}
                        </p>

                        {ev.description && (
                          <p className="text-xs text-ink line-clamp-2 pt-0.5 italic">
                            "{ev.description}"
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isMeeting && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingMeeting({
                              id: ev.id,
                              title: ev.title,
                              date: ev.date,
                              time: ev.time
                            });
                            setNewMeetingDate(ev.date);
                            setNewMeetingTime(ev.time || "10:00 AM");
                          }}
                          className="px-2.5 py-1.5 bg-white hover:bg-brand-wash text-brand-deep text-xs font-bold rounded-edge border border-brand-edge shadow-2xs cursor-pointer flex items-center gap-1 transition-colors"
                        >
                          <CalendarIcon className="w-3.5 h-3.5" />
                          <span>Change Date</span>
                        </button>
                      )}

                      {/* Delete Logged Meeting Button */}
                      {isMeeting && ev.sourceActivityId && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Delete logged meeting "${ev.title}"?\n\nThis will remove it and cannot be undone.`)) {
                              deleteActivity(ev.sourceActivityId!);
                            }
                          }}
                          className="px-2.5 py-1.5 bg-white hover:bg-rose-50 text-rose-600 text-xs font-bold rounded-edge border border-rose-200 shadow-2xs cursor-pointer flex items-center gap-1 transition-colors"
                          title="Delete logged meeting"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      )}

                      {isMeeting && ev.originalTask && !ev.isCompleted && (
                        <button
                          type="button"
                          onClick={() => openQuickLog({
                            type: "meeting",
                            accountId: ev.accountId,
                            opportunityId: ev.opportunityId,
                            contactId: ev.contactId,
                            scheduledTaskId: ev.originalTask!.id
                          })}
                          className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-edge shadow-xs cursor-pointer flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Log outcome</span>
                        </button>
                      )}

                      {isMeeting && ev.originalTask && !ev.isCompleted && (
                        <button
                          type="button"
                          onClick={() => openMeetingPrep(ev.originalTask!.id)}
                          className="px-3 py-1.5 bg-brand-deep hover:bg-brand text-white text-xs font-bold rounded-edge shadow-xs cursor-pointer flex items-center gap-1"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Prep Plan</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="p-8 text-center text-xs text-ink-dim">
                No events found matching this filter.
              </p>
            )}
          </div>
        </div>
      )}

      {/* CHANGE MEETING DATE MODAL */}
      {editingMeeting && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="change-meeting-date-title"
          className="fixed inset-0 z-50 bg-chrome/60 backdrop-blur-xs p-4 flex items-center justify-center animate-in fade-in duration-150"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-line space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-brand-wash text-brand-deep rounded-edge">
                  <CalendarIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 id="change-meeting-date-title" className="text-base font-bold text-body">
                    Change Meeting Date
                  </h3>
                  <p className="text-xs text-ink-dim truncate max-w-[260px]">
                    {editingMeeting.title}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingMeeting(null)}
                aria-label="Close"
                className="text-ink-faint hover:text-ink-dim p-1 rounded-edge cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5">
              {/* Quick Date Presets */}
              <div>
                <label className="block text-[11px] font-bold text-ink-dim uppercase mb-1.5">
                  Quick Presets
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setNewMeetingDate(todayStr)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded border cursor-pointer transition-colors ${
                      newMeetingDate === todayStr
                        ? "bg-brand-deep text-white border-brand-deep font-bold"
                        : "bg-paper text-ink-dim border-line hover:border-ink-dim"
                    }`}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewMeetingDate(addDaysLocal(-1))}
                    className={`px-2.5 py-1 text-xs font-semibold rounded border cursor-pointer transition-colors ${
                      newMeetingDate === addDaysLocal(-1)
                        ? "bg-brand-deep text-white border-brand-deep font-bold"
                        : "bg-paper text-ink-dim border-line hover:border-ink-dim"
                    }`}
                  >
                    Yesterday
                  </button>
                </div>
              </div>

              {/* Date Input */}
              <div>
                <label className="block text-[11px] font-bold text-ink-dim uppercase mb-1">
                  Meeting Date *
                </label>
                <input
                  type="date"
                  aria-label="New Meeting Date"
                  value={newMeetingDate}
                  onChange={(e) => setNewMeetingDate(e.target.value)}
                  required
                  className="w-full p-2 text-spec rounded-edge border border-line bg-white font-sans focus:outline-none focus:border-brand-deep"
                />
              </div>

              {/* Time Input */}
              <div>
                <label className="block text-[11px] font-bold text-ink-dim uppercase mb-1">
                  Time (Optional)
                </label>
                <input
                  type="text"
                  aria-label="New Meeting Time"
                  placeholder="e.g. 10:00 AM or 2:30 PM"
                  value={newMeetingTime}
                  onChange={(e) => setNewMeetingTime(e.target.value)}
                  className="w-full p-2 text-spec rounded-edge border border-line bg-white font-sans focus:outline-none focus:border-brand-deep"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-line">
              <button
                type="button"
                onClick={() => {
                  if (newMeetingDate) {
                    updateMeetingDate(editingMeeting.id, newMeetingDate, newMeetingTime);
                    setSelectedDateStr(newMeetingDate);
                    setEditingMeeting(null);
                  }
                }}
                className="flex-1 py-2 bg-brand-deep hover:bg-brand text-white font-bold text-spec rounded-edge shadow-xs transition-colors cursor-pointer"
              >
                Save Date
              </button>
              <button
                type="button"
                onClick={() => setEditingMeeting(null)}
                className="px-4 py-2 bg-paper hover:bg-line text-ink font-semibold text-spec rounded-edge border border-line transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
