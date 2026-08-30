import React, { useState, useEffect } from "react";
import {
  X,
  User,
  Mail,
  Phone,
  Smartphone,
  Briefcase,
  Building2,
  UserCheck,
  Award,
  Sparkles,
  Trash2,
  Globe,
  Tag
} from "lucide-react";
import { CRMContact, ContactRole } from "../../types/crm";
import { useApp } from "../../context/AppContext";
import { detectDuplicateContact, DuplicateMatchResult } from "../../utils/duplicateDetector";
import { CRMDuplicateWarningModal } from "./CRMDuplicateWarningModal";

interface CRMContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (contactData: Omit<CRMContact, "id">, existingId?: string) => void;
  onDelete?: (contactId: string) => void;
  contactToEdit?: CRMContact | null;
  accountId: string;
  accountName: string;
  accountWebsite?: string;
  accountOwner?: string;
}

export const CRMContactModal: React.FC<CRMContactModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  contactToEdit,
  accountId,
  accountName,
  accountWebsite,
  accountOwner
}) => {
  const { currentUser, contacts, showToast } = useApp();
  const isEditMode = !!contactToEdit;
  const [duplicateMatch, setDuplicateMatch] = useState<DuplicateMatchResult<CRMContact> | null>(null);
  const [pendingContactPayload, setPendingContactPayload] = useState<Omit<CRMContact, "id"> | null>(null);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);

  // Derive domain from website or company name
  const defaultDomain = accountWebsite
    ? accountWebsite.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0]
    : `${accountName.toLowerCase().replace(/[^a-z0-9]/g, "")}.com.au`;

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    jobTitle: "",
    department: "",
    email: "",
    mobile: "",
    phone: "",
    preferredContactMethod: "Email" as "Email" | "Mobile" | "Phone" | "Teams/Zoom",
    roleInBuyingProcess: "Influencer" as ContactRole,
    isDecisionMaker: false,
    influenceLevel: "Medium" as "High" | "Medium" | "Low",
    relationshipStatus: "Warm" as "Strong" | "Warm" | "Neutral" | "Cold",
    linkedinUrl: "",
    notes: "",
    tagInput: "",
    tags: [] as string[]
  });

  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (contactToEdit) {
      setFormData({
        firstName: contactToEdit.firstName || "",
        lastName: contactToEdit.lastName || "",
        jobTitle: contactToEdit.jobTitle || "",
        department: contactToEdit.department || "",
        email: contactToEdit.email || "",
        mobile: contactToEdit.mobile || "",
        phone: contactToEdit.phone || "",
        preferredContactMethod: contactToEdit.preferredContactMethod || "Email",
        roleInBuyingProcess: contactToEdit.roleInBuyingProcess || "Influencer",
        isDecisionMaker: contactToEdit.isDecisionMaker || false,
        influenceLevel: contactToEdit.influenceLevel || "Medium",
        relationshipStatus: contactToEdit.relationshipStatus || "Warm",
        linkedinUrl: contactToEdit.linkedinUrl || "",
        notes: contactToEdit.notes || "",
        tagInput: "",
        tags: contactToEdit.tags || []
      });
    } else {
      // Reset to defaults for a new contact
      setFormData({
        firstName: "",
        lastName: "",
        jobTitle: "",
        department: "",
        email: "",
        mobile: "",
        phone: "",
        preferredContactMethod: "Email",
        roleInBuyingProcess: "Influencer",
        isDecisionMaker: false,
        influenceLevel: "Medium",
        relationshipStatus: "Warm",
        linkedinUrl: "",
        notes: "",
        tagInput: "",
        tags: ["Key Stakeholder"]
      });
    }
    setConfirmDelete(false);
  }, [contactToEdit, isOpen, defaultDomain]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.email.trim()) {
      return;
    }

    const payload: Omit<CRMContact, "id"> = {
      accountId,
      accountName,
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      jobTitle: formData.jobTitle.trim() || "Lighting Contact",
      department: formData.department.trim() || undefined,
      email: formData.email.trim(),
      mobile: formData.mobile.trim() || undefined,
      phone: formData.phone.trim() || undefined,
      preferredContactMethod: formData.preferredContactMethod,
      roleInBuyingProcess: formData.roleInBuyingProcess,
      isDecisionMaker: formData.isDecisionMaker,
      influenceLevel: formData.influenceLevel,
      relationshipStatus: formData.relationshipStatus,
      contactOwner: accountOwner || currentUser.name,
      linkedinUrl: formData.linkedinUrl.trim() || undefined,
      notes: formData.notes.trim() || undefined,
      tags: formData.tags
    };

    if (!isEditMode) {
      const duplicate = detectDuplicateContact(
        {
          name: `${formData.firstName} ${formData.lastName}`.trim(),
          email: formData.email.trim(),
          phone: formData.phone || formData.mobile,
          accountId
        },
        contacts
      );

      if (duplicate) {
        setPendingContactPayload(payload);
        setDuplicateMatch(duplicate);
        setIsDuplicateModalOpen(true);
        return;
      }
    }

    onSave(payload, contactToEdit ? contactToEdit.id : undefined);
    onClose();
  };

  const handleAddTag = () => {
    if (formData.tagInput.trim() && !formData.tags.includes(formData.tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, formData.tagInput.trim()],
        tagInput: ""
      });
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((t) => t !== tagToRemove)
    });
  };

  const handleDelete = () => {
    if (contactToEdit && onDelete) {
      onDelete(contactToEdit.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-chrome/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div
        className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-line overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-raised border-b border-line flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-brand-wash text-brand-deep rounded-panel">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-body">
                {isEditMode ? `Edit Contact: ${contactToEdit.firstName} ${contactToEdit.lastName}` : "Add Buying Committee Stakeholder"}
              </h2>
              <p className="text-meta text-ink-dim">
                Account: <span className="font-semibold text-body">{accountName}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-ink-faint hover:text-ink hover:bg-line rounded-edge transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-meta">
          {/* Section 1: Name & Role */}
          <div className="space-y-3">
            <div className="text-spec font-bold uppercase tracking-wider text-ink-dim flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-ink-faint" />
              General Details & Position
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-body mb-1">
                  First Name <span className="text-urgent">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sarah"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full px-3 py-2 border border-line-strong rounded-edge focus:outline-none focus:ring-2 focus:ring-brand text-body bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-body mb-1">
                  Last Name <span className="text-urgent">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jenkins"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full px-3 py-2 border border-line-strong rounded-edge focus:outline-none focus:ring-2 focus:ring-brand text-body bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-body mb-1">
                  Job Title <span className="text-urgent">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senior Lighting Asset Manager"
                  value={formData.jobTitle}
                  onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                  className="w-full px-3 py-2 border border-line-strong rounded-edge focus:outline-none focus:ring-2 focus:ring-brand text-body bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-body mb-1">Department</label>
                <input
                  type="text"
                  placeholder="e.g. Infrastructure & Open Spaces"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full px-3 py-2 border border-line-strong rounded-edge focus:outline-none focus:ring-2 focus:ring-brand text-body bg-white"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Contact Channels */}
          <div className="space-y-3 pt-3 border-t border-line">
            <div className="text-spec font-bold uppercase tracking-wider text-ink-dim flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-ink-faint" />
              Direct Communication Channels
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1">
                <label className="block font-semibold text-body mb-1">
                  Work Email <span className="text-urgent">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder={`name@${defaultDomain}`}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-line-strong rounded-edge focus:outline-none focus:ring-2 focus:ring-brand text-body bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-body mb-1">Mobile Phone</label>
                <input
                  type="tel"
                  placeholder="e.g. 0412 345 678"
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  className="w-full px-3 py-2 border border-line-strong rounded-edge focus:outline-none focus:ring-2 focus:ring-brand text-body bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-body mb-1">Direct Office Phone</label>
                <input
                  type="tel"
                  placeholder="e.g. (07) 5555 1234"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-line-strong rounded-edge focus:outline-none focus:ring-2 focus:ring-brand text-body bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-body mb-1">Preferred Contact Method</label>
                <select
                  value={formData.preferredContactMethod}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      preferredContactMethod: e.target.value as any
                    })
                  }
                  className="w-full px-3 py-2 border border-line-strong rounded-edge bg-white text-body"
                >
                  <option value="Email">Email</option>
                  <option value="Mobile">Mobile Call</option>
                  <option value="Phone">Office Direct</option>
                  <option value="Teams/Zoom">Teams / Video Call</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-body mb-1">LinkedIn Profile</label>
                <input
                  type="url"
                  placeholder="https://linkedin.com/in/..."
                  value={formData.linkedinUrl}
                  onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
                  className="w-full px-3 py-2 border border-line-strong rounded-edge focus:outline-none focus:ring-2 focus:ring-brand text-body bg-white"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Buying Committee & Influence Intelligence */}
          <div className="space-y-3 pt-3 border-t border-line">
            <div className="text-spec font-bold uppercase tracking-wider text-ink-dim flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-ink-faint" />
              Buying Committee & Stakeholder Mapping
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-body mb-1">Role in Buying Process</label>
                <select
                  value={formData.roleInBuyingProcess}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      roleInBuyingProcess: e.target.value as ContactRole
                    })
                  }
                  className="w-full px-3 py-2 border border-line-strong rounded-edge bg-white text-body"
                >
                  <option value="Decision Maker">Decision Maker</option>
                  <option value="Champion">Champion (Internal Advocate)</option>
                  <option value="Influencer">Influencer</option>
                  <option value="Technical Contact">Technical Contact / Engineer</option>
                  <option value="Procurement">Procurement Gatekeeper</option>
                  <option value="Finance">Finance / Budget Holder</option>
                  <option value="End User">End User / Maintenance</option>
                  <option value="Consultant">Consultant / External Specifier</option>
                  <option value="Gatekeeper">Executive Assistant / Gatekeeper</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-body mb-1">Influence Level</label>
                <select
                  value={formData.influenceLevel}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      influenceLevel: e.target.value as any
                    })
                  }
                  className="w-full px-3 py-2 border border-line-strong rounded-edge bg-white text-body"
                >
                  <option value="High">High (Veto / Direct Approval)</option>
                  <option value="Medium">Medium (Evaluation Committee)</option>
                  <option value="Low">Low (Advisory)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-body mb-1">Relationship Status</label>
                <select
                  value={formData.relationshipStatus}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      relationshipStatus: e.target.value as any
                    })
                  }
                  className="w-full px-3 py-2 border border-line-strong rounded-edge bg-white text-body"
                >
                  <option value="Strong">Strong (Trusted Partner)</option>
                  <option value="Warm">Warm (Engaged & Responsive)</option>
                  <option value="Neutral">Neutral (Standard Contact)</option>
                  <option value="Cold">Cold (Unresponsive / Competitor Bias)</option>
                </select>
              </div>
            </div>

            {/* Decision maker toggle */}
            <div className="p-3 bg-hold-wash border border-hold rounded-panel flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-hold" />
                <div>
                  <div className="font-bold text-hold">Primary Final Decision Maker</div>
                  <div className="text-spec text-hold">
                    Has formal budgetary authority to sign off on luminaire supply contracts.
                  </div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isDecisionMaker}
                  onChange={(e) => setFormData({ ...formData, isDecisionMaker: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-line peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-line-strong after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-hold"></div>
              </label>
            </div>
          </div>

          {/* Section 4: Notes & Tags */}
          <div className="space-y-3 pt-3 border-t border-line">
            <div className="text-spec font-bold uppercase tracking-wider text-ink-dim flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-ink-faint" />
              Stakeholder Notes & Tags
            </div>

            <div>
              <label className="block font-semibold text-body mb-1">
                Engineering Preferences / Stakeholder Insights
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Always requests 3000K wildlife-sensitive luminaires; prefers Dialux .ies files emailed directly."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 border border-line-strong rounded-edge focus:outline-none focus:ring-2 focus:ring-brand text-body bg-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-body mb-1">Tags</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Type tag and press Add (e.g. Dialux Reviewer, AS1158 Auditor)"
                  value={formData.tagInput}
                  onChange={(e) => setFormData({ ...formData, tagInput: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  className="flex-1 px-3 py-1.5 border border-line-strong rounded-edge focus:outline-none focus:ring-2 focus:ring-brand bg-white"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-3 py-1.5 bg-paper hover:bg-line text-body font-semibold rounded-edge border border-line-strong"
                >
                  Add Tag
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(formData.tags || []).map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-meta font-semibold bg-brand-wash text-brand-deep border border-brand-edge"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="text-brand-deep hover:text-brand-deep font-bold ml-1"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Action Buttons & Delete */}
          <div className="pt-4 border-t border-line flex flex-col sm:flex-row items-center justify-between gap-3">
            {isEditMode && onDelete ? (
              <div>
                {!confirmDelete ? (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="text-urgent hover:text-urgent hover:bg-urgent-wash px-3 py-1.5 rounded-edge font-semibold flex items-center gap-1.5 transition-colors text-meta"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete Contact
                  </button>
                ) : (
                  <div className="flex items-center gap-2 bg-urgent-wash p-1.5 rounded-edge border border-urgent text-meta">
                    <span className="text-urgent font-semibold">Confirm delete?</span>
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="px-2 py-1 bg-urgent hover:bg-urgent text-white rounded font-bold"
                    >
                      Yes, Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="px-2 py-1 bg-white hover:bg-paper text-body rounded border border-line-strong"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-ink-dim hover:text-ink font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 font-bold text-white bg-brand-deep hover:bg-brand-deep rounded-edge shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <UserCheck className="w-4 h-4" />
                {isEditMode ? "Save Changes" : "Create Contact"}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* P2-13: CRM Duplicate Contact Warning Modal */}
      {isDuplicateModalOpen && duplicateMatch && pendingContactPayload && (
        <CRMDuplicateWarningModal<CRMContact>
          isOpen={isDuplicateModalOpen}
          onClose={() => {
            setIsDuplicateModalOpen(false);
            setDuplicateMatch(null);
            setPendingContactPayload(null);
          }}
          entityType="Contact"
          candidateName={`${pendingContactPayload.firstName} ${pendingContactPayload.lastName}`}
          matchResult={duplicateMatch}
          onOpenExisting={(existingCon) => {
            onClose();
            showToast(`Contact "${existingCon.firstName} ${existingCon.lastName}" already exists on file.`, "info");
          }}
          onUseExisting={(existingCon) => {
            onClose();
            showToast(`Attached to existing contact "${existingCon.firstName} ${existingCon.lastName}"`, "success");
          }}
          onCreateAnyway={() => {
            onSave(pendingContactPayload);
            onClose();
            showToast(`Created contact "${pendingContactPayload.firstName} ${pendingContactPayload.lastName}" (Duplicate override audit recorded)`, "warning");
          }}
        />
      )}
    </div>
  );
};
