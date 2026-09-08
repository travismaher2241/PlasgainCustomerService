import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  fetchOpportunities,
  fetchAllOpportunities,
  migrateLegacyDeals,
  fetchOpportunityById,
  createOpportunityApi,
  updateOpportunityApi,
  deleteOpportunityApi,
  ApiConflictError
} from "../../api/opportunityClient";
import {
  useOpportunities,
  useOpportunity,
  useCreateOpportunity,
  useUpdateOpportunity,
  useDeleteOpportunity,
  useMarkQuoteSent,
  useMarkQuoteWon,
  useMarkQuoteLost
} from "../../hooks/useOpportunities";
import {
  queueWriteOperation,
  flushOfflineQueue,
  getQueuedWrites,
  syncBatchToCloud
} from "../../utils/firebase";
import { CRMOpportunity } from "../../types/crm";

describe("Opportunity API Client & React Query Hooks Suite", () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    localStorage.clear();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0
        },
        mutations: {
          retry: false
        }
      }
    });
    vi.restoreAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
    vi.restoreAllMocks();
  });

  describe("Paging and legacy quote migration", () => {
    const page = (data: any[], pageNo: number, totalPages: number, total: number) => ({
      ok: true,
      json: async () => ({ success: true, data, pagination: { page: pageNo, limit: 100, total, totalPages } })
    }) as Response;

    it("fetches every page, not just the first — quote 101 must not vanish", async () => {
      const pageOne = Array.from({ length: 100 }, (_, i) => ({ id: `opp-${i + 1}`, name: `Quote ${i + 1}` }));
      const pageTwo = [{ id: "opp-101", name: "Quote 101" }];

      vi.spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(page(pageOne, 1, 2, 101))
        .mockResolvedValueOnce(page(pageTwo, 2, 2, 101));

      const res = await fetchAllOpportunities();

      expect(res.data).toHaveLength(101);
      expect(res.data.map((d) => d.id)).toContain("opp-101");
    });

    it("migrates browser-cached quotes under their existing ids so linked records stay attached", async () => {
      localStorage.setItem(
        "plasgain_crm_deals",
        JSON.stringify([
          { id: "opp-legacy-1", name: "Cardinia Shared Trail", accountId: "acc-1", accountName: "Cardinia", dealValue: 42000 }
        ])
      );

      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: { id: "opp-legacy-1" } })
      } as Response);

      const result = await migrateLegacyDeals([]);

      expect(result).toEqual({ migrated: 1, failed: 0 });
      const body = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string);
      expect(body.id).toBe("opp-legacy-1");
    });

    it("does not re-migrate a quote the server already holds", async () => {
      localStorage.setItem(
        "plasgain_crm_deals",
        JSON.stringify([{ id: "opp-legacy-1", name: "Cardinia", accountId: "acc-1", dealValue: 1 }])
      );
      const fetchSpy = vi.spyOn(globalThis, "fetch");

      const result = await migrateLegacyDeals([{ id: "opp-legacy-1" } as CRMOpportunity]);

      expect(result).toEqual({ migrated: 0, failed: 0 });
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("skips a quote that fails to migrate rather than blocking the rest", async () => {
      localStorage.setItem(
        "plasgain_crm_deals",
        JSON.stringify([
          { id: "opp-a", name: "A", accountId: "acc-1", dealValue: 1 },
          { id: "opp-b", name: "B", accountId: "acc-1", dealValue: 2 }
        ])
      );

      vi.spyOn(globalThis, "fetch")
        .mockResolvedValueOnce({ ok: false, status: 400, json: async () => ({ error: "bad" }) } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: { id: "opp-b" } }) } as Response);

      const result = await migrateLegacyDeals([]);

      expect(result).toEqual({ migrated: 1, failed: 1 });
    });
  });

  describe("API Client: /api/opportunities", () => {
    it("handles empty results correctly without leaving stale records", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [],
          pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }
        })
      } as Response);

      const result = await fetchOpportunities();
      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(Array.isArray(result.data)).toBe(true);
      expect(fetchSpy).toHaveBeenCalled();
    });

    it("serializes filter and pagination query params", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [{ id: "opp-1", name: "Project Solar", dealValue: 50000, accountId: "acc-1", accountName: "Solar Co" }],
          pagination: { page: 2, limit: 10, total: 15, totalPages: 2 }
        })
      } as Response);

      const result = await fetchOpportunities({
        page: 2,
        limit: 10,
        search: "Solar",
        accountId: "acc-1",
        isArchived: false
      });

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining("/api/opportunities?page=2&limit=10&search=Solar&accountId=acc-1&isArchived=false"),
        expect.anything()
      );
      expect(result.data.length).toBe(1);
      expect(result.data[0].id).toBe("opp-1");
    });

    it("fetches an individual opportunity by ID", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { id: "opp-xyz", name: "Pipeline Deal", dealValue: 12000, accountId: "acc-1", accountName: "Council", version: 2 }
        })
      } as Response);

      const deal = await fetchOpportunityById("opp-xyz");
      expect(deal.id).toBe("opp-xyz");
      expect(deal.version).toBe(2);
    });

    it("creates an opportunity via POST /api/opportunities", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { id: "opp-new", name: "New Quote", dealValue: 25000, accountId: "acc-1", accountName: "Council", version: 1 }
        })
      } as Response);

      const created = await createOpportunityApi({
        name: "New Quote",
        accountId: "acc-1",
        accountName: "Council",
        dealValue: 25000
      });

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining("/api/opportunities"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({ "Content-Type": "application/json" })
        })
      );
      expect(created.id).toBe("opp-new");
      expect(created.version).toBe(1);
    });

    it("sends If-Match header and updates opportunity via PUT /api/opportunities/:id", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { id: "opp-1", name: "Updated Name", dealValue: 30000, accountId: "acc-1", accountName: "Council", version: 3 }
        })
      } as Response);

      const updated = await updateOpportunityApi("opp-1", {
        name: "Updated Name",
        dealValue: 30000,
        version: 2
      });

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining("/api/opportunities/opp-1"),
        expect.objectContaining({
          method: "PUT",
          headers: expect.objectContaining({
            "If-Match": '"2"'
          })
        })
      );
      expect(updated.version).toBe(3);
    });

    it("throws ApiConflictError with parsed metadata when server returns HTTP 409 Conflict", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({
          error: "Conflict: Opportunity has been modified concurrently",
          currentVersion: 4,
          currentUpdatedAt: "2026-09-08T10:00:00.000Z",
          providedVersion: 2
        })
      } as Response);

      await expect(
        updateOpportunityApi("opp-1", { dealValue: 9999, version: 2 })
      ).rejects.toThrow(ApiConflictError);

      try {
        vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
          ok: false,
          status: 409,
          json: async () => ({
            error: "Conflict: Opportunity has been modified concurrently",
            currentVersion: 5,
            currentUpdatedAt: "2026-09-08T11:00:00.000Z",
            providedVersion: 3
          })
        } as Response);
        await updateOpportunityApi("opp-1", { dealValue: 9999, version: 3 });
      } catch (err: any) {
        expect(err).toBeInstanceOf(ApiConflictError);
        expect(err.currentVersion).toBe(5);
        expect(err.providedVersion).toBe(3);
        expect(err.currentUpdatedAt).toBe("2026-09-08T11:00:00.000Z");
      }
    });

    it("deletes an opportunity via DELETE /api/opportunities/:id", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { id: "opp-1", isArchived: true, archivedReason: "Test delete" }
        })
      } as Response);

      await deleteOpportunityApi("opp-1", "Test delete");
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining("/api/opportunities/opp-1"),
        expect.objectContaining({
          method: "DELETE",
          body: JSON.stringify({ reason: "Test delete" })
        })
      );
    });
  });

  describe("Bulk Sync Dismantling & Offline Queue Protection", () => {
    it("permanently disarms syncBatchToCloud and prevents collection overwrites", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const result = await syncBatchToCloud("crm_deals", [{ id: "opp-1" }] as any);
      expect(result).toBe(false);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("syncBatchToCloud is dismantled to prevent bulk-overwrite failure modes")
      );
    });

    it("routes queued offline opportunity operations through REST API", async () => {
      queueWriteOperation({
        type: "save",
        collectionName: "crm_deals",
        docId: "opp-offline-1",
        data: {
          id: "opp-offline-1",
          name: "Offline Deal",
          accountId: "acc-1",
          dealValue: 15000,
          version: 1
        }
      });

      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { id: "opp-offline-1", name: "Offline Deal", version: 2 }
        })
      } as Response);

      await flushOfflineQueue({ force: true });
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining("/api/opportunities/opp-offline-1"),
        expect.objectContaining({ method: "PUT" })
      );
      expect(getQueuedWrites().length).toBe(0);
    });

    it("drops stale offline writes when server returns 409 Conflict without clobbering server", async () => {
      queueWriteOperation({
        type: "save",
        collectionName: "crm_deals",
        docId: "opp-stale-1",
        data: {
          id: "opp-stale-1",
          name: "Stale Overwrite",
          accountId: "acc-1",
          dealValue: 5000,
          version: 1
        }
      });

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({
          error: "Conflict: Record modified by another user",
          currentVersion: 3,
          providedVersion: 1
        })
      } as Response);

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      await flushOfflineQueue({ force: true });

      expect(getQueuedWrites().length).toBe(0);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Stale write detected for opportunity")
      );
    });
  });

  describe("React Query Hooks: useOpportunities, useOpportunity, mutators", () => {
    it("useOpportunities returns opportunities array", async () => {
      const mockDeals: CRMOpportunity[] = [
        { id: "opp-a", name: "Deal Alpha", accountId: "acc-1", accountName: "Client A", dealValue: 10000 },
        { id: "opp-b", name: "Deal Beta", accountId: "acc-2", accountName: "Client B", dealValue: 20000 }
      ];

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockDeals,
          pagination: { page: 1, limit: 20, total: 2, totalPages: 1 }
        })
      } as Response);

      const { result } = renderHook(() => useOpportunities(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.data.length).toBe(2);
      expect(result.current.data?.data[0].name).toBe("Deal Alpha");
    });

    it("useCreateOpportunity invalidates opportunities query on success", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { id: "opp-created", name: "Fresh Deal", accountId: "acc-1", accountName: "Client", dealValue: 50000 }
        })
      } as Response);

      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
      const { result } = renderHook(() => useCreateOpportunity(), { wrapper });

      await result.current.mutateAsync({
        name: "Fresh Deal",
        accountId: "acc-1",
        accountName: "Client",
        dealValue: 50000
      });

      expect(invalidateSpy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ["opportunities"] }));
    });

    it("useMarkQuoteWon updates stage to Won and sets wonReason", async () => {
      const existingDeal: CRMOpportunity = {
        id: "opp-win",
        name: "Winning Deal",
        accountId: "acc-1",
        accountName: "Client",
        dealValue: 80000,
        stageId: "stage-submitted",
        stageName: "Submitted",
        version: 2
      };

      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            ...existingDeal,
            stageId: "stage-won",
            stageName: "Won",
            quoteStatus: "PO Received",
            wonReason: "Accepted contract",
            version: 3
          }
        })
      } as Response);

      const { result } = renderHook(() => useMarkQuoteWon(), { wrapper });
      await result.current.markQuoteWon(existingDeal, "Accepted contract");

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining("/api/opportunities/opp-win"),
        expect.objectContaining({
          method: "PUT",
          headers: expect.objectContaining({ "If-Match": '"2"' })
        })
      );
    });

    it("useMarkQuoteLost updates stage to Lost and sets lostReason", async () => {
      const existingDeal: CRMOpportunity = {
        id: "opp-lost",
        name: "Lost Deal",
        accountId: "acc-1",
        accountName: "Client",
        dealValue: 30000,
        stageId: "stage-submitted",
        stageName: "Submitted",
        version: 1
      };

      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            ...existingDeal,
            stageId: "stage-lost",
            stageName: "Lost",
            quoteStatus: "Declined",
            lostReason: "Price",
            lostReasonNotes: "Competitor was 10% cheaper",
            version: 2
          }
        })
      } as Response);

      const { result } = renderHook(() => useMarkQuoteLost(), { wrapper });
      await result.current.markQuoteLost(existingDeal, "Price", "Competitor was 10% cheaper");

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining("/api/opportunities/opp-lost"),
        expect.objectContaining({
          method: "PUT",
          headers: expect.objectContaining({ "If-Match": '"1"' })
        })
      );
    });
  });
});
