import React, { useState } from "react";
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
  X
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { KnowledgeDocument } from "../types";

export const DocumentLibrary: React.FC = () => {
  const { documents, addDocument, showToast } = useApp();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [previewDoc, setPreviewDoc] = useState<KnowledgeDocument | null>(null);

  const categories = [
    "Master Catalogues",
    "Pole & Infrastructure Catalogues",
    "Amenity & Pathway Catalogues",
    "Smart City & Security Catalogues"
  ];

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.tags?.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCat = selectedCategory === "all" || doc.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const handleSimulatedUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const newDoc: KnowledgeDocument = {
        id: `doc-${Date.now().toString().slice(-4)}`,
        title: file.name.replace(/\.[^/.]+$/, "").replace(/-/g, " "),
        category: "Master Catalogues",
        version: "2026.1",
        fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        uploadedDate: "Today",
        status: "Current",
        authorityLevel: "3. Current approved catalogue",
        sourceUrl: "https://plasgain.com.au",
        summary: "Official Plasgain catalogue uploaded for technical reference and customer distribution.",
        tags: ["Official Catalogue", "Plasgain Range"]
      };
      addDocument(newDoc);
      showToast("Catalogue added to library", "success");
    }
  };

  const handleDownload = (doc: KnowledgeDocument) => {
    if (doc.sourceUrl) {
      window.open(doc.sourceUrl, "_blank");
    } else {
      showToast(`Downloading ${doc.title}...`, "info");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-line">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-body">Plasgain Product Catalogues</h1>
            <span className="text-meta font-bold px-2 py-0.5 rounded bg-brand-wash text-brand-deep border border-brand-edge">
              Official PDF Catalogues
            </span>
          </div>
          <p className="text-meta text-ink-dim mt-0.5">
            Complete official Plasgain solar lighting, sustainable pole, and amenity catalogues for customer distribution and technical reference.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start">
          <label className="inline-flex items-center gap-1.5 text-meta font-medium bg-brand-deep hover:bg-brand-deep text-white px-3 py-2 rounded-edge transition-colors cursor-pointer shadow-xs">
            <UploadCloud className="w-4 h-4" />
            <span>Upload Catalogue</span>
            <input type="file" onChange={handleSimulatedUpload} className="hidden" accept=".pdf,.doc,.docx" />
          </label>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3.5 rounded-panel border border-line shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-ink-faint absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search catalogues, products, or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-meta bg-raised border border-line rounded-edge pl-9 pr-3 py-2 focus:outline-hidden focus:ring-1 focus:ring-brand focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`text-meta px-3 py-1.5 rounded-edge font-medium transition-colors cursor-pointer whitespace-nowrap ${
              selectedCategory === "all"
                ? "bg-chrome text-white shadow-2xs"
                : "bg-raised text-ink-dim hover:bg-paper border border-line"
            }`}
          >
            All Catalogues ({documents.length})
          </button>
          {categories.map((cat) => {
            const count = documents.filter((d) => d.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`text-meta px-3 py-1.5 rounded-edge font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  selectedCategory === cat
                    ? "bg-chrome text-white shadow-2xs"
                    : "bg-raised text-ink-dim hover:bg-paper border border-line"
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Catalogues Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredDocs.map((doc) => (
          <div
            key={doc.id}
            className="bg-white rounded-panel border border-line hover:border-brand/60 p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
          >
            <div className="space-y-3">
              {/* Card Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-edge bg-brand-wash border border-brand-edge text-brand-deep flex items-center justify-center shrink-0 mt-0.5">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-spec font-bold uppercase tracking-wider text-brand-deep bg-brand-wash px-2 py-0.5 rounded border border-brand-edge">
                      {doc.category}
                    </span>
                    <h3 className="text-base font-bold text-body mt-1 leading-snug">
                      {doc.title}
                    </h3>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <p className="text-meta text-ink-dim leading-relaxed line-clamp-3">
                {doc.summary}
              </p>

              {/* Tags */}
              {doc.tags && doc.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {doc.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-spec font-medium bg-paper px-2 py-0.5 rounded border border-line"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Card Footer */}
            <div className="mt-5 pt-3.5 border-t border-line flex items-center justify-between text-meta text-ink-dim">
              <div className="flex items-center gap-3">
                {doc.fileSize && <span>{doc.fileSize}</span>}
                {doc.version && <span>• Version {doc.version}</span>}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPreviewDoc(doc)}
                  className="inline-flex items-center gap-1 hover:text-ink bg-paper hover:bg-line font-medium px-2.5 py-1.5 rounded text-meta transition-colors cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Preview</span>
                </button>
                <button
                  onClick={() => handleDownload(doc)}
                  className="inline-flex items-center gap-1 text-white bg-brand-deep hover:bg-brand-deep font-medium px-3 py-1.5 rounded text-meta transition-colors cursor-pointer shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredDocs.length === 0 && (
        <div className="text-center py-12 bg-white rounded-panel border border-line p-8">
          <BookOpen className="w-10 h-10 text-ink-faint mx-auto mb-3" />
          <h3 className="text-body font-bold">No catalogues found</h3>
          <p className="text-meta text-ink-dim mt-1 max-w-sm mx-auto">
            Try adjusting your search terms or category filter to find the Plasgain catalogue you are looking for.
          </p>
        </div>
      )}

      {/* Document Detail Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-chrome/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-line shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-line flex items-center justify-between bg-raised">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-edge bg-brand-wash text-brand-deep flex items-center justify-center">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-body font-bold">{previewDoc.title}</h3>
                  <p className="text-spec text-ink-dim">{previewDoc.category} • Version {previewDoc.version}</p>
                </div>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="text-ink-faint hover:text-ink p-1.5 rounded-edge hover:bg-line transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <h4 className="text-meta font-bold uppercase tracking-wider mb-1.5">Overview</h4>
                <p className="text-meta text-ink-dim leading-relaxed">{previewDoc.summary}</p>
              </div>

              {previewDoc.contentSnippet && (
                <div>
                  <h4 className="text-meta font-bold uppercase tracking-wider mb-1.5">Key Highlights</h4>
                  <div className="bg-raised border border-line rounded-edge p-3 text-meta leading-relaxed font-mono">
                    {previewDoc.contentSnippet}
                  </div>
                </div>
              )}

              {previewDoc.tags && previewDoc.tags.length > 0 && (
                <div>
                  <h4 className="text-meta font-bold uppercase tracking-wider mb-1.5">Product Series & Topics Covered</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {previewDoc.tags.map((t) => (
                      <span key={t} className="text-meta bg-brand-wash text-brand-deep border border-brand-edge px-2 py-0.5 rounded font-medium">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-raised border-t border-line flex items-center justify-end gap-2">
              <button
                onClick={() => setPreviewDoc(null)}
                className="px-3.5 py-1.5 rounded-edge text-meta font-medium hover:bg-line transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => handleDownload(previewDoc)}
                className="px-4 py-1.5 rounded-edge text-meta font-semibold text-white bg-brand-deep hover:bg-brand-deep transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Open / Download PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
