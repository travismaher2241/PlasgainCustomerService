import React, { useState, useEffect } from "react";
import {
  BookOpen,
  Search,
  UploadCloud,
  Download,
  Eye,
  Tag,
  CheckCircle2,
  ExternalLink,
  Layers,
  Sparkles,
  FileText,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Check,
  X
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { Surface, ListRow, Chip } from "./ui/Surface";
import { ControlledDocument } from "../server/documentGovernanceStore";
import { PDFViewerModal } from "./PDFViewerModal";
import { apiGet, apiPost } from "../utils/apiClient";

export const DocumentLibrary: React.FC = () => {
  const { showToast } = useApp();
  const [documents, setDocuments] = useState<ControlledDocument[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [governanceFilter, setGovernanceFilter] = useState<"all" | "authoritative" | "draft" | "superseded">("all");
  const [previewDoc, setPreviewDoc] = useState<ControlledDocument | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // Upload modal form state
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadFamily, setUploadFamily] = useState("Pro Blade Solar");
  const [uploadType, setUploadType] = useState<ControlledDocument["documentType"]>("Datasheet");
  const [uploadVersion, setUploadVersion] = useState("Rev 1.0");
  const [uploadEffectiveDate, setUploadEffectiveDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [uploadExpiryDate, setUploadExpiryDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [uploadSource, setUploadSource] = useState("Plasgain Engineering Dept");

  const loadDocuments = async () => {
    try {
      const docs = await apiGet<ControlledDocument[]>("/api/controlled-documents");
      setDocuments(docs);
    } catch {
      // Fallback sample documents if backend route loading
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const now = new Date().toISOString().slice(0, 10);

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.productFamily.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.version.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (governanceFilter === "authoritative") {
      return doc.approvalStatus === "Approved" && doc.reviewExpiryDate >= now;
    }
    if (governanceFilter === "draft") {
      return doc.approvalStatus === "Draft" || doc.approvalStatus === "Pending Review";
    }
    if (governanceFilter === "superseded") {
      return doc.approvalStatus === "Superseded" || doc.approvalStatus === "Expired";
    }
    return true;
  });

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTitle.trim()) return;

    try {
      const newDoc: Partial<ControlledDocument> = {
        title: uploadTitle.trim(),
        productFamily: uploadFamily,
        documentType: uploadType,
        version: uploadVersion.trim(),
        effectiveDate: uploadEffectiveDate,
        reviewExpiryDate: uploadExpiryDate,
        source: uploadSource.trim(),
        uploader: "Technical Sales Specialist",
        approvalStatus: "Approved",
        fileUrl: `/docs/${uploadTitle.toLowerCase().replace(/\s+/g, "_")}.pdf`,
        pageCount: 4
      };

      await apiPost("/api/controlled-documents", newDoc);
      showToast("Document saved to governed catalogue!", "success");
      setIsUploadOpen(false);
      setUploadTitle("");
      loadDocuments();
    } catch (err: any) {
      showToast(err?.message || "Failed to upload document", "error");
    }
  };

  const handleApproveDocument = async (docId: string) => {
    try {
      await apiPost(`/api/controlled-documents/${docId}/approve`, {
        approvedBy: "Engineering Director"
      });
      showToast("Document approved and marked Authoritative!", "success");
      loadDocuments();
    } catch (err: any) {
      showToast(err?.message || "Failed to approve document", "error");
    }
  };

  const renderStatusBadge = (doc: ControlledDocument) => {
    const isExpired = doc.reviewExpiryDate < now;
    if (isExpired && doc.approvalStatus === "Approved") {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-300">
          <AlertTriangle className="w-3 h-3" />
          <span>Expired</span>
        </span>
      );
    }

    switch (doc.approvalStatus) {
      case "Approved":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
            <ShieldCheck className="w-3 h-3" />
            <span>Approved &amp; Authoritative</span>
          </span>
        );
      case "Superseded":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
            <Clock className="w-3 h-3" />
            <span>Superseded</span>
          </span>
        );
      case "Draft":
      case "Pending Review":
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-300">
            <span>{doc.approvalStatus}</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-line">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-body">Governed Document &amp; Catalogue Library</h1>
            <span className="text-meta font-bold px-2 py-0.5 rounded bg-brand-wash text-brand-deep border border-brand-edge">
              AS/NZS Compliant
            </span>
          </div>
          <p className="text-meta text-ink-dim mt-0.5">
            Controlled product datasheets, engineering certificates, and tender specification catalogues with lifecycle governance.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start">
          <button
            onClick={() => setIsUploadOpen(true)}
            className="inline-flex items-center gap-1.5 text-meta font-medium bg-brand-deep hover:bg-brand text-white px-3.5 py-2 rounded-edge transition-colors cursor-pointer shadow-xs"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Document</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3.5 rounded-panel border border-line shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-ink-faint absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search documents, product families, versions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-meta bg-raised border border-line rounded-edge pl-9 pr-3 py-2 focus:outline-hidden focus:ring-1 focus:ring-brand focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <button
            onClick={() => setGovernanceFilter("all")}
            className={`text-meta px-3 py-1.5 rounded-edge font-medium transition-colors cursor-pointer whitespace-nowrap ${
              governanceFilter === "all"
                ? "bg-chrome text-white shadow-2xs"
                : "bg-raised text-ink-dim hover:bg-paper border border-line"
            }`}
          >
            All Documents ({documents.length})
          </button>
          <button
            onClick={() => setGovernanceFilter("authoritative")}
            className={`text-meta px-3 py-1.5 rounded-edge font-medium transition-colors cursor-pointer whitespace-nowrap ${
              governanceFilter === "authoritative"
                ? "bg-chrome text-white shadow-2xs"
                : "bg-raised text-ink-dim hover:bg-paper border border-line"
            }`}
          >
            Authoritative Only
          </button>
          <button
            onClick={() => setGovernanceFilter("draft")}
            className={`text-meta px-3 py-1.5 rounded-edge font-medium transition-colors cursor-pointer whitespace-nowrap ${
              governanceFilter === "draft"
                ? "bg-chrome text-white shadow-2xs"
                : "bg-raised text-ink-dim hover:bg-paper border border-line"
            }`}
          >
            Drafts &amp; Pending
          </button>
          <button
            onClick={() => setGovernanceFilter("superseded")}
            className={`text-meta px-3 py-1.5 rounded-edge font-medium transition-colors cursor-pointer whitespace-nowrap ${
              governanceFilter === "superseded"
                ? "bg-chrome text-white shadow-2xs"
                : "bg-raised text-ink-dim hover:bg-paper border border-line"
            }`}
          >
            Superseded / Expired
          </button>
        </div>
      </div>

      {/* Governed Document List */}
      {filteredDocs.length > 0 && (
        <Surface>
          {filteredDocs.map((doc) => (
            <ListRow
              key={doc.id}
              tone="brand"
              actions={
                <div className="flex items-center gap-2">
                  {doc.approvalStatus === "Draft" && (
                    <button
                      onClick={() => handleApproveDocument(doc.id)}
                      className="inline-flex items-center gap-1 text-spec font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-2.5 py-1.5 rounded-edge cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Approve</span>
                    </button>
                  )}
                  <button
                    onClick={() => setPreviewDoc(doc)}
                    className="inline-flex items-center gap-1.5 text-meta font-medium text-ink-dim border border-line-strong hover:text-ink hover:border-ink-faint px-2.5 py-1.5 rounded-edge transition-colors cursor-pointer whitespace-nowrap bg-surface"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View PDF</span>
                  </button>
                </div>
              }
            >
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-body font-semibold text-ink">{doc.title}</h3>
                <Chip tone="brand">{doc.productFamily}</Chip>
                <span className="u-data text-spec font-mono text-ink-faint bg-paper px-1.5 py-0.5 rounded border border-line">
                  {doc.version}
                </span>
                {renderStatusBadge(doc)}
              </div>

              <div className="mt-1.5 flex items-center gap-4 text-spec text-ink-dim flex-wrap">
                <span>Type: <strong className="text-ink">{doc.documentType}</strong></span>
                <span>Effective: <strong className="text-ink">{doc.effectiveDate}</strong></span>
                <span>Review / Expiry: <strong className="text-ink">{doc.reviewExpiryDate}</strong></span>
                <span>Source: <strong className="text-ink">{doc.source}</strong></span>
              </div>
            </ListRow>
          ))}
        </Surface>
      )}

      {filteredDocs.length === 0 && (
        <div className="text-center py-12 bg-white rounded-panel border border-line p-8">
          <BookOpen className="w-10 h-10 text-ink-faint mx-auto mb-3" />
          <h3 className="text-body font-bold">No documents match filter</h3>
          <p className="text-meta text-ink-dim mt-1 max-w-sm mx-auto">
            Try adjusting your search terms or selecting "All Documents" to view the library.
          </p>
        </div>
      )}

      {/* Upload & Governance Registration Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-chrome/60 backdrop-blur-xs">
          <div className="bg-surface w-full max-w-lg rounded-frame border border-line shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 bg-raised border-b border-line flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <UploadCloud className="w-5 h-5 text-brand-deep" />
                <h2 className="text-body font-bold text-ink">Register Controlled Document</h2>
              </div>
              <button
                onClick={() => setIsUploadOpen(false)}
                className="p-1 rounded-edge hover:bg-hover text-ink-dim"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateDocument} className="p-5 space-y-3.5 text-meta text-ink">
              <div>
                <label className="block text-spec font-bold uppercase text-ink-dim mb-1">Document Title</label>
                <input
                  type="text"
                  required
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="e.g. Plasgain Pro Blade Solar 125 Specification"
                  className="w-full p-2 bg-surface rounded-edge border border-line text-body font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-spec font-bold uppercase text-ink-dim mb-1">Product Family</label>
                  <select
                    value={uploadFamily}
                    onChange={(e) => setUploadFamily(e.target.value)}
                    className="w-full p-2 bg-surface rounded-edge border border-line text-meta"
                  >
                    <option value="Pro Blade Solar">Pro Blade Solar</option>
                    <option value="PathMaster Solar">PathMaster Solar</option>
                    <option value="Roadway Pro">Roadway Pro</option>
                    <option value="Composite Poles">Composite Poles</option>
                    <option value="Sensors & Controls">Sensors &amp; Controls</option>
                  </select>
                </div>

                <div>
                  <label className="block text-spec font-bold uppercase text-ink-dim mb-1">Document Type</label>
                  <select
                    value={uploadType}
                    onChange={(e) => setUploadType(e.target.value as any)}
                    className="w-full p-2 bg-surface rounded-edge border border-line text-meta"
                  >
                    <option value="Datasheet">Datasheet</option>
                    <option value="Catalogue">Catalogue</option>
                    <option value="Compliance Certificate">Compliance Certificate</option>
                    <option value="Installation Manual">Installation Manual</option>
                    <option value="Warranty Doc">Warranty Doc</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-spec font-bold uppercase text-ink-dim mb-1">Version</label>
                  <input
                    type="text"
                    required
                    value={uploadVersion}
                    onChange={(e) => setUploadVersion(e.target.value)}
                    className="w-full p-2 bg-surface rounded-edge border border-line font-mono"
                  />
                </div>
                <div>
                  <label className="block text-spec font-bold uppercase text-ink-dim mb-1">Effective Date</label>
                  <input
                    type="date"
                    required
                    value={uploadEffectiveDate}
                    onChange={(e) => setUploadEffectiveDate(e.target.value)}
                    className="w-full p-1.5 bg-surface rounded-edge border border-line text-spec"
                  />
                </div>
                <div>
                  <label className="block text-spec font-bold uppercase text-ink-dim mb-1">Review Expiry</label>
                  <input
                    type="date"
                    required
                    value={uploadExpiryDate}
                    onChange={(e) => setUploadExpiryDate(e.target.value)}
                    className="w-full p-1.5 bg-surface rounded-edge border border-line text-spec"
                  />
                </div>
              </div>

              <div>
                <label className="block text-spec font-bold uppercase text-ink-dim mb-1">Author / Source Dept</label>
                <input
                  type="text"
                  value={uploadSource}
                  onChange={(e) => setUploadSource(e.target.value)}
                  className="w-full p-2 bg-surface rounded-edge border border-line text-body"
                />
              </div>

              <div className="p-3 bg-brand/5 border border-brand/20 rounded-edge text-spec text-brand-deep">
                Only Approved &amp; unexpired documents are exposed as authoritative for tender spec packages, Copilot grounding, and quotation support.
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  className="px-3 py-2 rounded-edge text-meta font-medium text-ink-dim border border-line"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-deep hover:bg-brand text-white font-bold text-meta rounded-edge shadow-xs"
                >
                  Register Document
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Real Multi-Page PDF Viewer Modal (P2-10) */}
      {previewDoc && (
        <PDFViewerModal
          isOpen={Boolean(previewDoc)}
          onClose={() => setPreviewDoc(null)}
          document={previewDoc}
        />
      )}
    </div>
  );
};
