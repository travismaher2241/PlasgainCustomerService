import fs from "fs";
import path from "path";

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

const STORAGE_FILE = path.resolve(process.cwd(), "server_data_analyses.json");

class AnalysisStore {
  private records: Map<string, ProjectAnalysisRecord> = new Map();

  constructor() {
    this.loadFromDisk();
  }

  private loadFromDisk() {
    try {
      if (fs.existsSync(STORAGE_FILE)) {
        const raw = fs.readFileSync(STORAGE_FILE, "utf-8");
        const items: ProjectAnalysisRecord[] = JSON.parse(raw);
        items.forEach((item) => this.records.set(item.id, item));
      }
    } catch (err) {
      console.warn("[AnalysisStore] Could not load persisted analyses:", err);
    }
  }

  private saveToDisk() {
    try {
      const items = Array.from(this.records.values());
      fs.writeFileSync(STORAGE_FILE, JSON.stringify(items, null, 2), "utf-8");
    } catch (err) {
      console.warn("[AnalysisStore] Could not save analyses to disk:", err);
    }
  }

  public saveAnalysis(partial: Partial<ProjectAnalysisRecord> & { projectId: string }): ProjectAnalysisRecord {
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

    this.records.set(id, fullRecord);
    this.saveToDisk();
    return fullRecord;
  }

  public getAnalysis(id: string): ProjectAnalysisRecord | undefined {
    return this.records.get(id);
  }

  public getLatestByProject(projectId: string, analysisType?: string): ProjectAnalysisRecord | undefined {
    const matching = Array.from(this.records.values()).filter(
      (r) => r.projectId === projectId && (!analysisType || r.analysisType === analysisType)
    );
    if (matching.length === 0) return undefined;
    return matching.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  }

  public listByProject(projectId: string): ProjectAnalysisRecord[] {
    return Array.from(this.records.values())
      .filter((r) => r.projectId === projectId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public markStale(id: string): boolean {
    const record = this.records.get(id);
    if (record) {
      record.status = "stale";
      this.saveToDisk();
      return true;
    }
    return false;
  }
}

export const analysisStore = new AnalysisStore();
