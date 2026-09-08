import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CRMOpportunity } from "../types/crm";
import {
  CreateOpportunityInput,
  UpdateOpportunityInput,
  OpportunityQueryInput
} from "../validators/opportunityValidator";
import {
  fetchOpportunities,
  fetchOpportunityById,
  createOpportunityApi,
  updateOpportunityApi,
  deleteOpportunityApi,
  ApiConflictError
} from "../api/opportunityClient";

export { ApiConflictError };

export const OPPORTUNITY_KEYS = {
  all: ["opportunities"] as const,
  lists: () => [...OPPORTUNITY_KEYS.all, "list"] as const,
  list: (filters?: Partial<OpportunityQueryInput>) => [...OPPORTUNITY_KEYS.lists(), filters || {}] as const,
  details: () => [...OPPORTUNITY_KEYS.all, "detail"] as const,
  detail: (id: string) => [...OPPORTUNITY_KEYS.details(), id] as const
};

/**
 * Hook to list opportunities with server-side pagination, search, and filtering.
 * CRITICAL: Gracefully handles empty results (`data: []`) without persisting stale data.
 */
export function useOpportunities(filters?: Partial<OpportunityQueryInput>) {
  return useQuery({
    queryKey: OPPORTUNITY_KEYS.list(filters),
    queryFn: async () => {
      const res = await fetchOpportunities(filters);
      return res;
    },
    initialData: () => {
      if (typeof window !== "undefined" && (!filters || Object.keys(filters).length === 0)) {
        try {
          const saved = localStorage.getItem("plasgain_crm_deals");
          if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
              return {
                data: parsed,
                total: parsed.length,
                page: 1,
                limit: parsed.length,
                totalPages: 1
              };
            }
          }
        } catch {
          // ignore
        }
      }
      return undefined;
    },
    staleTime: 1000 * 30 // 30 seconds
  });
}

/**
 * Hook to retrieve a single opportunity by ID.
 */
export function useOpportunity(id?: string | null) {
  return useQuery({
    queryKey: OPPORTUNITY_KEYS.detail(id || ""),
    queryFn: () => fetchOpportunityById(id!),
    enabled: Boolean(id),
    staleTime: 1000 * 30
  });
}

/**
 * Mutation to create a new opportunity. Automatically invalidates opportunity lists.
 */
export function useCreateOpportunity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateOpportunityInput) => createOpportunityApi(data),
    onMutate: async (newRecord) => {
      const optimisticDeal: CRMOpportunity = {
        id: (newRecord as any).id || `opp-opt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        accountName: newRecord.accountName || "Account",
        dealValue: newRecord.dealValue || 0,
        ...newRecord
      } as CRMOpportunity;

      queryClient.setQueriesData(
        { queryKey: OPPORTUNITY_KEYS.lists() },
        (old: any) => {
          if (!old || !Array.isArray(old.data)) {
            return { data: [optimisticDeal], total: 1, page: 1, limit: 20, totalPages: 1 };
          }
          return {
            ...old,
            data: [optimisticDeal, ...old.data.filter((d: any) => d.id !== optimisticDeal.id)],
            total: (old.total || 0) + 1
          };
        }
      );

      queryClient.setQueryData(OPPORTUNITY_KEYS.detail(optimisticDeal.id), optimisticDeal);
      return { optimisticDeal };
    },
    onSuccess: (newRecord) => {
      queryClient.invalidateQueries({ queryKey: OPPORTUNITY_KEYS.all });
      queryClient.setQueryData(OPPORTUNITY_KEYS.detail(newRecord.id), newRecord);
    }
  });
}

/**
 * Mutation to perform field-level updates on an opportunity with optimistic concurrency control.
 */
export function useUpdateOpportunity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateOpportunityInput }) =>
      updateOpportunityApi(id, updates),
    onMutate: async ({ id, updates }) => {
      queryClient.setQueriesData(
        { queryKey: OPPORTUNITY_KEYS.lists() },
        (old: any) => {
          if (!old || !Array.isArray(old.data)) return old;
          return {
            ...old,
            data: old.data.map((d: CRMOpportunity) =>
              d.id === id ? { ...d, ...updates, updatedAt: new Date().toISOString() } : d
            )
          };
        }
      );

      queryClient.setQueryData(OPPORTUNITY_KEYS.detail(id), (old: any) =>
        old ? { ...old, ...updates, updatedAt: new Date().toISOString() } : old
      );
    },
    onSuccess: (updatedRecord) => {
      // Invalidate list queries so all views refresh
      queryClient.invalidateQueries({ queryKey: OPPORTUNITY_KEYS.lists() });
      // Update individual deal cache directly
      queryClient.setQueryData(OPPORTUNITY_KEYS.detail(updatedRecord.id), updatedRecord);
    }
  });
}

/**
 * Mutation to soft-delete an opportunity (Manager or Admin role required).
 */
export function useDeleteOpportunity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      deleteOpportunityApi(id, reason),
    onMutate: async ({ id }) => {
      queryClient.setQueriesData(
        { queryKey: OPPORTUNITY_KEYS.lists() },
        (old: any) => {
          if (!old || !Array.isArray(old.data)) return old;
          return {
            ...old,
            data: old.data.filter((d: CRMOpportunity) => d.id !== id),
            total: Math.max(0, (old.total || 1) - 1)
          };
        }
      );
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: OPPORTUNITY_KEYS.all });
      queryClient.removeQueries({ queryKey: OPPORTUNITY_KEYS.detail(id) });
    }
  });
}

/**
 * Domain workflow action: Mark Quote as Sent.
 * Eliminates hardcoded AppContext 2-day magic strings and uses caller-provided or calculated follow-up dates.
 */
export function useMarkQuoteSent() {
  const updateMutation = useUpdateOpportunity();

  return {
    ...updateMutation,
    markQuoteSent: async (
      deal: CRMOpportunity,
      options?: { followUpDays?: number; notes?: string }
    ) => {
      const days = options?.followUpDays ?? 2;
      const targetDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      const followUpDateStr = targetDate.toISOString().split("T")[0];
      const nowIso = new Date().toISOString();

      const updates: UpdateOpportunityInput = {
        version: deal.version,
        stageId: "stage-submitted",
        stageName: "Submitted",
        quoteStatus: "Sent",
        quoteSentDate: nowIso.split("T")[0],
        submittedAt: nowIso,
        nextAction: "Follow up on submitted quote",
        nextActionDate: followUpDateStr
      };

      return updateMutation.mutateAsync({ id: deal.id, updates });
    }
  };
}

/**
 * Domain workflow action: Mark Quote Won.
 */
export function useMarkQuoteWon() {
  const updateMutation = useUpdateOpportunity();

  return {
    ...updateMutation,
    markQuoteWon: async (deal: CRMOpportunity, notes?: string) => {
      const updates: UpdateOpportunityInput = {
        version: deal.version,
        stageId: "stage-won",
        stageName: "Won",
        quoteStatus: "PO Received",
        wonReason: notes || "Customer accepted quote / PO received"
      };

      return updateMutation.mutateAsync({ id: deal.id, updates });
    }
  };
}

/**
 * Domain workflow action: Mark Quote Lost.
 */
export function useMarkQuoteLost() {
  const updateMutation = useUpdateOpportunity();

  return {
    ...updateMutation,
    markQuoteLost: async (deal: CRMOpportunity, reason: string, notes?: string) => {
      const updates: UpdateOpportunityInput = {
        version: deal.version,
        stageId: "stage-lost",
        stageName: "Lost",
        quoteStatus: "Declined",
        lostReason: reason,
        lostReasonNotes: notes
      };

      return updateMutation.mutateAsync({ id: deal.id, updates });
    }
  };
}

/**
 * Domain workflow action: Complete Follow-Up.
 */
export function useLogFollowUpCompleted() {
  const updateMutation = useUpdateOpportunity();

  return {
    ...updateMutation,
    logFollowUpCompleted: async (deal: CRMOpportunity, nextActionDays: number = 3) => {
      const nowIso = new Date().toISOString();
      const nextDate = new Date(Date.now() + nextActionDays * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

      const updates: UpdateOpportunityInput = {
        version: deal.version,
        stageId: "stage-followed-up",
        stageName: "Followed Up",
        nextAction: "Review feedback / awaiting decision",
        nextActionDate: nextDate
      };

      return updateMutation.mutateAsync({ id: deal.id, updates });
    }
  };
}
