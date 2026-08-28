import { saveDocToCloud, loadDocFromCloud, loadCollectionFromCloud } from "../utils/firebase";

export interface ProjectAnalysisRecord {
  id: string;
  projectId: string;
  projectName?: string;
  customerCompany?: string;
  opportunityId?: string;
  accountId?: string;
  analysisType: "enquiry" | "drawing_takeoff" | "tender_spec" | "quote_review";
  status: "complete" | "stale" | "failed" | "current";
  sourceHash: string;
  sourceVersion?: string;
  sourceUpdatedAt?: string;
  rawEnquiryText?: string;
  analysisData?: any;
  result?: any;
  createdAt: string;
  completedAt?: string;
  createdBy?: string;
  model?: string;
  promptVersion?: string;
}

const FIRESTORE_COLLECTION = "project_analyses";

class AnalysisStore {
  private inMemoryCache: Map<string, ProjectAnalysisRecord> = new Map();
  private isInitialized = false;

  constructor() {
    this.initFromCloud();
  }

  private async initFromCloud() {
    try {
      const records = await loadCollectionFromCloud<ProjectAnalysisRecord>(FIRESTORE_COLLECTION);
      if (records && records.length > 0) {
        records.forEach((r) => {
          if (!this.inMemoryCache.has(r.id)) {
            this.inMemoryCache.set(r.id, r);
          }
        });
      }
      this.isInitialized = true;
    } catch (err) {
      console.warn("[AnalysisStore] Cloud Firestore init fallback to memory cache:", err);
    }
  }

  public async saveAnalysis(partial: Partial<ProjectAnalysisRecord> & { projectId: string }): Promise<ProjectAnalysisRecord> {
    const id = partial.id || `an-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const fullRecord: ProjectAnalysisRecord = {
      id,
      projectId: partial.projectId,
      projectName: partial.projectName || "Public Lighting Project",
      customerCompany: partial.customerCompany || "Client Organisation",
      analysisType: partial.analysisType || "enquiry",
      status: partial.status || "complete",
      sourceHash: partial.sourceHash || "v1",
      result: partial.result || partial.analysisData,
      analysisData: partial.analysisData || partial.result,
      rawEnquiryText: partial.rawEnquiryText,
      createdAt: partial.createdAt || new Date().toISOString(),
      completedAt: partial.completedAt || new Date().toISOString(),
      createdBy: partial.createdBy || "AI Analysis Pipeline",
      model: partial.model || "gemini-2.5-flash",
      promptVersion: partial.promptVersion || "2026.1"
    };

    this.inMemoryCache.set(id, fullRecord);
    // Persist to Cloud Firestore
    await saveDocToCloud(FIRESTORE_COLLECTION, id, fullRecord);
    return fullRecord;
  }

  public async getAnalysis(id: string): Promise<ProjectAnalysisRecord | undefined> {
    if (this.inMemoryCache.has(id)) {
      return this.inMemoryCache.get(id);
    }
    const cloudRecord = await loadDocFromCloud<ProjectAnalysisRecord>(FIRESTORE_COLLECTION, id);
    if (cloudRecord) {
      this.inMemoryCache.set(cloudRecord.id, cloudRecord);
      return cloudRecord;
    }
    return undefined;
  }

  public async getLatestByProject(projectId: string, analysisType?: string): Promise<ProjectAnalysisRecord | undefined> {
    // Check cache first
    const cached = Array.from(this.inMemoryCache.values()).filter(
      (r) => r.projectId === projectId && (!analysisType || r.analysisType === analysisType)
    );
    if (cached.length > 0) {
      return cached.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    }

    // Refresh from cloud
    const all = await loadCollectionFromCloud<ProjectAnalysisRecord>(FIRESTORE_COLLECTION);
    all.forEach((r) => {
      if (!this.inMemoryCache.has(r.id)) {
        this.inMemoryCache.set(r.id, r);
      }
    });
    const matching = all.filter((r) => r.projectId === projectId && (!analysisType || r.analysisType === analysisType));
    if (matching.length === 0) return undefined;
    return matching.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  }

  public async listByProject(projectId: string): Promise<ProjectAnalysisRecord[]> {
    const all = await loadCollectionFromCloud<ProjectAnalysisRecord>(FIRESTORE_COLLECTION);
    if (all && all.length > 0) {
      all.forEach((r) => {
        if (!this.inMemoryCache.has(r.id)) {
          this.inMemoryCache.set(r.id, r);
        }
      });
    }
    return Array.from(this.inMemoryCache.values())
      .filter((r) => r.projectId === projectId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public async markStale(id: string): Promise<boolean> {
    const record = await this.getAnalysis(id);
    if (record) {
      const updatedRecord: ProjectAnalysisRecord = { ...record, status: "stale" };
      this.inMemoryCache.set(id, updatedRecord);
      await saveDocToCloud(FIRESTORE_COLLECTION, id, updatedRecord);
      return true;
    }
    return false;
  }

  public clearLocalCache() {
    this.inMemoryCache.clear();
  }
}

export const analysisStore = new AnalysisStore();
