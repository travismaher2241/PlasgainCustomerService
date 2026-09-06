import { CRMActionPayload, Account, CRMOpportunity, CRMLead, CRMContact, CRMTask } from "../types/crm";

export interface ActionDispatchContext {
  openEmailComposer: (context?: any) => void;
  openScheduleMeeting: (options?: any) => void;
  openQuickLog: (options?: any) => void;
  addTask: (task: CRMTask) => void;
  updateOpportunity: (id: string, updates: Partial<CRMOpportunity>) => void;
  navigateToCRM: (subTab: any, entityId?: string) => void;
  setSelectedAccountId?: (id: string | null) => void;
  setSelectedOpportunityId?: (id: string | null) => void;
  showToast: (message: string, type?: "success" | "info" | "warning" | "error") => void;
  currentUser: { name: string };
  accounts?: Account[];
  crmOpportunities?: CRMOpportunity[];
  leads?: CRMLead[];
  contacts?: CRMContact[];
}

export function executeCRMAction(
  action: CRMActionPayload,
  ctx: ActionDispatchContext
): { success: boolean; message: string } {
  if (!action || !action.type) {
    return { success: false, message: "No action payload provided." };
  }

  const deal = action.opportunityId && ctx.crmOpportunities
    ? ctx.crmOpportunities.find((d) => d.id === action.opportunityId)
    : undefined;
  const account = action.accountId && ctx.accounts
    ? ctx.accounts.find((a) => a.id === action.accountId)
    : undefined;
  const contact = action.assignedContactId && ctx.contacts
    ? ctx.contacts.find((c) => c.id === action.assignedContactId)
    : undefined;

  switch (action.type) {
    case "send_email": {
      ctx.openEmailComposer({
        opportunityId: action.opportunityId,
        accountId: action.accountId || deal?.accountId,
        contactEmail: action.recipientEmail || deal?.primaryContactEmail || contact?.email,
        contactName: deal?.primaryContactName || (contact ? `${contact.firstName} ${contact.lastName}` : undefined),
        projectName: deal?.name,
        companyName: account?.name || deal?.accountName,
        projectNotes: action.defaultNotes,
        rawContent: action.defaultNotes
      });
      ctx.showToast(`Opened email composer for ${deal?.name || account?.name || "client"}`, "info");
      return { success: true, message: `Opened email draft: "${action.defaultTitle || "Follow-up"}"` };
    }

    case "schedule_meeting": {
      ctx.openScheduleMeeting({
        accountId: action.accountId || deal?.accountId,
        opportunityId: action.opportunityId,
        contactId: action.assignedContactId || deal?.primaryContactId,
        defaultTitle: action.defaultTitle || `Meeting: ${deal?.name || account?.name || "Project Review"}`,
        agenda: action.defaultNotes
      });
      ctx.showToast(`Opened meeting scheduler for ${deal?.name || account?.name || "client"}`, "info");
      return { success: true, message: `Opened meeting scheduler for "${deal?.name || account?.name || "client"}"` };
    }

    case "log_call": {
      ctx.openQuickLog({
        type: "call",
        accountId: action.accountId || deal?.accountId,
        opportunityId: action.opportunityId,
        contactId: action.assignedContactId || deal?.primaryContactId,
        prefillNotes: action.defaultNotes || action.defaultTitle || "Outbound call logged via Copilot action"
      });
      ctx.showToast(`Opened quick call log for ${deal?.name || account?.name || "client"}`, "info");
      return { success: true, message: `Opened call log for "${deal?.name || account?.name || "client"}"` };
    }

    case "create_task": {
      const taskId = `task-${Date.now()}`;
      const dueDate = action.dueDate || new Date(Date.now() + 2 * 86400000).toISOString().split("T")[0];
      const taskTitle = action.defaultTitle || `Follow up: ${deal?.name || account?.name || "Task"}`;

      ctx.addTask({
        id: taskId,
        title: taskTitle,
        type: "Follow-up",
        dueDate,
        priority: "High",
        status: "To Do",
        assignedTo: ctx.currentUser.name,
        createdBy: ctx.currentUser.name,
        opportunityId: action.opportunityId,
        accountId: action.accountId || deal?.accountId,
        notes: action.defaultNotes || "Generated via Copilot action"
      });

      ctx.showToast(`Created task: "${taskTitle}" (due ${dueDate})`, "success");
      return { success: true, message: `Created task: "${taskTitle}"` };
    }

    case "update_stage": {
      if (!action.opportunityId) {
        ctx.showToast("Cannot update stage: No opportunity linked.", "error");
        return { success: false, message: "No opportunity ID provided for stage update." };
      }

      const targetStageId = action.targetStageId || "stage-quote-sent";
      const targetStageName = action.targetStageName || "Quote Sent";

      ctx.updateOpportunity(action.opportunityId, {
        stageId: targetStageId,
        stageName: targetStageName
      });

      ctx.showToast(`Advanced "${deal?.name || "Deal"}" to ${targetStageName}`, "success");
      return { success: true, message: `Advanced stage to ${targetStageName}` };
    }

    case "assign_contact": {
      if (!action.opportunityId || !action.assignedContactId) {
        ctx.showToast("Cannot assign contact: Missing opportunity or contact ID.", "error");
        return { success: false, message: "Missing opportunity or contact ID for assignment." };
      }

      const matchedContact = ctx.contacts?.find((c) => c.id === action.assignedContactId);
      ctx.updateOpportunity(action.opportunityId, {
        primaryContactId: action.assignedContactId,
        primaryContactName: matchedContact ? `${matchedContact.firstName} ${matchedContact.lastName}`.trim() : undefined,
        primaryContactEmail: matchedContact?.email,
        primaryContactPhone: matchedContact?.mobile || matchedContact?.phone
      });

      const contactLabel = matchedContact ? `${matchedContact.firstName} ${matchedContact.lastName}` : "Contact";
      ctx.showToast(`Assigned ${contactLabel} as primary contact`, "success");
      return { success: true, message: `Assigned ${contactLabel} as primary contact` };
    }

    default: {
      return { success: false, message: `Unknown action type: ${(action as any).type}` };
    }
  }
}
