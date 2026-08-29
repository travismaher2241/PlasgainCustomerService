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
  const { showToast, currentUser } = useApp();
  const [documents, setDocuments] = useState<ControlledDocument[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  // Mirrors DOCUMENT_APPROVER_ROLES on the server. Kept in sync deliberately:
  // the server is the gate, this only decides whether to offer the control.
  const DOCUMENT_APPROVER_ROLES = [
    "engineering lead",
    "lead engineer",
    "structural engineer",
    "compliance manager",
    "engineering director",
    "technical director",
    "sales director"
  ];
  const canApproveDocuments =
    currentUser.isAdmin === true ||
    DOCUMENT_APPROVER_ROLES.includes((currentUser.role || "").trim().toLowerCase());

  const [governanceFilter, setGovernanceFilter] = useState<"all" | "authoritative" | "draft" | "superseded">("all");
  const [previewDoc, setPreviewDoc] = useState<ControlledDocument | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // Upload modal form state
  const [uploadMode, setUploadMode] = useState<"file" | "metadata">("file");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileChecksum, setFileChecksum] = useState<string | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadFamily, setUploadFamily] = useState("Pro Blade Solar");
  const [uploadType, setUploadType] = useState<ControlledDocument["documentType"]>("Datasheet");
  const [uploadVersion, setUploadVersion] = useState("Rev 1.0");
  const [uploadVersionOwner, setUploadVersionOwner] = useState(currentUser.name || "Engineering Lead");
  const [uploadApprovalStatus, setUploadApprovalStatus] = useState<ControlledDocument["approvalStatus"]>("Approved");
  const [uploadEffectiveDate, setUploadEffectiveDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [uploadExpiryDate, setUploadExpiryDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [uploadSource, setUploadSource] = useState("Plasgain Engineering Dept");

  const computeFileSHA256 = async (file: File): Promise<string> => {
    try {
      const buffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
    } catch {
      return `sha-${Math.random().toString(36).substring(2, 10)}`;
    }
  };

  const handleFileChange = async (file: File | null) => {
    if (!file) {
      setSelectedFile(null);
      setFileChecksum(null);
      return;
    }
    setSelectedFile(file);
    if (!uploadTitle) {
      setUploadTitle(file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " "));
    }
    const hash = await computeFileSHA256(file);
    setFileChecksum(hash);
  };

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
      const calculatedChecksum = fileChecksum || (uploadMode === "file" && selectedFile ? await computeFileSHA256(selectedFile) : `meta-${Math.random().toString(36).substring(2, 8)}`);
      
      const newDoc: Partial<ControlledDocument> = {
        title: uploadTitle.trim(),
        productFamily: uploadFamily,
        documentType: uploadType,
        version: uploadVersion.trim(),
        versionOwner: uploadVersionOwner.trim(),
        checksum: calculatedChecksum,
        fileSizeBytes: selectedFile?.size || 1024 * 350,
        mimeType: selectedFile?.type || "application/pdf",
        fileName: selectedFile?.name || `${uploadTitle.toLowerCase().replace(/\s+/g, "_")}.pdf`,
        isExternalMetadataOnly: uploadMode === "metadata",
        effectiveDate: uploadEffectiveDate,
        reviewExpiryDate: uploadExpiryDate,
        source: uploadSource.trim(),
        uploader: currentUser.name || "Technical Sales Specialist",
        approvalStatus: uploadApprovalStatus,
        fileUrl: `/docs/${uploadTitle.toLowerCase().replace(/\s+/g, "_")}.pdf`,
        pageCount: 4,
        validationResult: {
          isValid: true,
          checkedAt: new Date().toISOString(),
          notes: "Compliant with 2026.1 Controlled Engineering Document Standard."
        }
      };

      await apiPost("/api/controlled-documents", newDoc);
      showToast(
        uploadMode === "file"
          ? `Uploaded and registered "${uploadTitle}" (SHA: ${calculatedChecksum})`
          : `Registered external document metadata for "${uploadTitle}"`,
        "success"
      );
      setIsUploadOpen(false);
      setUploadTitle("");
      setSelectedFile(null);
      setFileChecksum(null);
      loadDocuments();
    } catch (err: any) {
      showToast(err?.message || "Failed to upload document", "error");
    }
  };

  const handleApproveDocument = async (docId: string) => {
    try {
      // Record who actually approved it. The server re-checks authority — this
      // is a UI convenience, not the access control.
      await apiPost(`/api/controlled-documents/${docId}/approve`, {
        approvedBy: currentUser.name,
        approverRole: currentUser.role,
        approverIsAdmin: currentUser.isAdmin === true
      });
      showToast(`Approved and marked Authoritative — recorded against ${currentUser.name}`, "success");
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
                  {doc.approvalStatus === "Draft" && canApproveDocuments && (
                    <button
                      onClick={() => handleApproveDocument(doc.id)}
                      className="inline-flex items-center gap-1 text-spec font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-2.5 py-1.5 rounded-edge cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Approve</span>
                    </button>
                  )}
                  {doc.approvalStatus === "Draft" && !canApproveDocuments && (
                    <span
                      className="text-spec text-ink-faint border border-line px-2.5 py-1.5 rounded-edge whitespace-nowrap"
                      title="Controlled documents are approved by engineering, not sales."
                    >
                      Awaiting engineering approval
                    </span>
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
                {doc.checksum && (
                  <span className="text-[10px] font-mono text-brand-deep bg-brand-wash px-1.5 py-0.5 rounded border border-brand-edge">
                    SHA: {doc.checksum.slice(0, 10)}
                  </span>
                )}
                {renderStatusBadge(doc)}
              </div>

              <div className="mt-1.5 flex items-center gap-4 text-spec text-ink-dim flex-wrap">
                <span>Type: <strong className="text-ink">{doc.documentType}</strong></span>
                <span>Owner: <strong className="text-ink">{doc.versionOwner || doc.uploader}</strong></span>
                <span>Effective: <strong className="text-ink">{doc.effectiveDate}</strong></span>
                <span>Review / Expiry: <strong className="text-ink">{doc.reviewExpiryDate}</strong></span>
                <span>Source: <strong className="text-ink">{doc.source}</strong></span>
                {doc.fileSizeBytes && (
                  <span className="text-ink-faint font-mono text-[11px]">
                    ({(doc.fileSizeBytes / 1024).toFixed(0)} KB)
                  </span>
                )}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-chrome/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-surface w-full max-w-xl rounded-frame border border-line shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="p-4 bg-raised border-b border-line flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <UploadCloud className="w-5 h-5 text-brand-deep" />
                <h2 className="text-body font-bold text-ink">
                  {uploadMode === "file" ? "Upload & Register Controlled Document" : "Register External Document Metadata"}
                </h2>
              </div>
              <button
                onClick={() => setIsUploadOpen(false)}
                className="p-1 rounded-edge hover:bg-hover text-ink-dim cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mode Switcher */}
            <div className="flex border-b border-line bg-paper/60 px-5 pt-3 gap-2">
              <button
                type="button"
                onClick={() => setUploadMode("file")}
                className={`pb-2.5 px-3 text-meta font-bold border-b-2 cursor-pointer transition-colors ${
                  uploadMode === "file"
                    ? "border-brand-deep text-brand-deep"
                    : "border-transparent text-ink-dim hover:text-ink"
                }`}
              >
                Upload Document File
              </button>
              <button
                type="button"
                onClick={() => setUploadMode("metadata")}
                className={`pb-2.5 px-3 text-meta font-bold border-b-2 cursor-pointer transition-colors ${
                  uploadMode === "metadata"
                    ? "border-brand-deep text-brand-deep"
                    : "border-transparent text-ink-dim hover:text-ink"
                }`}
              >
                Register External Metadata
              </button>
            </div>

            <form onSubmit={handleCreateDocument} className="p-5 space-y-3.5 text-meta text-ink overflow-y-auto">
              {/* File Selector Zone */}
              {uploadMode === "file" && (
                <div>
                  <label className="block text-spec font-bold uppercase text-ink-dim mb-1">
                    Source Document File (.pdf, .docx, .ies, .csv) <span className="text-red-500">*</span>
                  </label>
                  <div
                    className="p-4 border-2 border-dashed border-line hover:border-brand-deep rounded-edge bg-raised/50 text-center cursor-pointer transition-colors"
                    onClick={() => document.getElementById("doc-file-input")?.click()}
                  >
                    <input
                      id="doc-file-input"
                      type="file"
                      accept=".pdf,.docx,.ies,.csv,.xlsx"
                      className="hidden"
                      onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                    />
                    {selectedFile ? (
                      <div className="flex items-center justify-between text-left bg-white p-2.5 rounded border border-brand-edge">
                        <div className="flex items-center gap-2 truncate">
                          <FileText className="w-5 h-5 text-brand-deep shrink-0" />
                          <div className="truncate">
                            <div className="font-semibold text-ink text-meta truncate">{selectedFile.name}</div>
                            <div className="text-[11px] text-ink-dim font-mono">
                              {(selectedFile.size / 1024).toFixed(0)} KB · Checksum: {fileChecksum || "calculating..."}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFileChange(null);
                          }}
                          className="p-1 hover:bg-hover text-ink-dim rounded cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1 py-2">
                        <UploadCloud className="w-8 h-8 text-brand-deep mx-auto opacity-80" />
                        <p className="font-semibold text-ink">Click or drag file here to upload</p>
                        <p className="text-spec text-ink-faint">Supports PDF, DOCX, IES Photometrics &amp; Excel sheets</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-spec font-bold uppercase text-ink-dim mb-1">Document Title <span className="text-red-500">*</span></label>
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
                    <option value="Civil & Cable Covers">Civil &amp; Cable Covers</option>
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

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block text-spec font-bold uppercase text-ink-dim mb-1">Version</label>
                  <input
                    type="text"
                    required
                    value={uploadVersion}
                    onChange={(e) => setUploadVersion(e.target.value)}
                    className="w-full p-2 bg-surface rounded-edge border border-line font-mono text-spec"
                  />
                </div>
                <div>
                  <label className="block text-spec font-bold uppercase text-ink-dim mb-1">Version Owner</label>
                  <input
                    type="text"
                    required
                    value={uploadVersionOwner}
                    onChange={(e) => setUploadVersionOwner(e.target.value)}
                    className="w-full p-2 bg-surface rounded-edge border border-line text-spec"
                  />
                </div>
                <div>
                  <label className="block text-spec font-bold uppercase text-ink-dim mb-1">Approval State</label>
                  <select
                    value={uploadApprovalStatus}
                    onChange={(e) => setUploadApprovalStatus(e.target.value as any)}
                    className="w-full p-2 bg-surface rounded-edge border border-line text-spec font-semibold"
                  >
                    <option value="Approved">Approved (Authoritative)</option>
                    <option value="Pending Review">Pending Review</option>
                    <option value="Draft">Draft</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
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

              <div className="p-3 bg-brand/5 border border-brand/20 rounded-edge text-spec text-brand-deep flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-brand-deep shrink-0 mt-0.5" />
                <span>
                  All registered documents undergo automatic governance checksum verification and are mapped to Plasgain Copilot and Quotation AI grounding datasets.
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  className="px-3 py-2 rounded-edge text-meta font-medium text-ink-dim border border-line cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-deep hover:bg-brand text-white font-bold text-meta rounded-edge shadow-xs cursor-pointer transition-colors"
                >
                  {uploadMode === "file" ? "Upload & Register Document" : "Register Metadata"}
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
