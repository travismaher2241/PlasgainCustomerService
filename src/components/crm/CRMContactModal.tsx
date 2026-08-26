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
  const isEditMode = !!contactToEdit;

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
      contactOwner: accountOwner || "Marcus Vance",
      linkedinUrl: formData.linkedinUrl.trim() || undefined,
      notes: formData.notes.trim() || undefined,
      tags: formData.tags
    };

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
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div
        className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {isEditMode ? `Edit Contact: ${contactToEdit.firstName} ${contactToEdit.lastName}` : "Add Buying Committee Stakeholder"}
              </h2>
              <p className="text-xs text-slate-500">
                Account: <span className="font-semibold text-slate-700">{accountName}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs">
          {/* Section 1: Name & Role */}
          <div className="space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-slate-400" />
              General Details & Position
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  First Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sarah"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Last Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jenkins"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Job Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senior Lighting Asset Manager"
                  value={formData.jobTitle}
                  onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Department</label>
                <input
                  type="text"
                  placeholder="e.g. Infrastructure & Open Spaces"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 bg-white"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Contact Channels */}
          <div className="space-y-3 pt-3 border-t border-slate-200">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              Direct Communication Channels
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1">
                <label className="block font-semibold text-slate-700 mb-1">
                  Work Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder={`name@${defaultDomain}`}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mobile Phone</label>
                <input
                  type="tel"
                  placeholder="e.g. 0412 345 678"
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Direct Office Phone</label>
                <input
                  type="tel"
                  placeholder="e.g. (07) 5555 1234"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Preferred Contact Method</label>
                <select
                  value={formData.preferredContactMethod}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      preferredContactMethod: e.target.value as any
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-800"
                >
                  <option value="Email">Email</option>
                  <option value="Mobile">Mobile Call</option>
                  <option value="Phone">Office Direct</option>
                  <option value="Teams/Zoom">Teams / Video Call</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">LinkedIn Profile</label>
                <input
                  type="url"
                  placeholder="https://linkedin.com/in/..."
                  value={formData.linkedinUrl}
                  onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 bg-white"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Buying Committee & Influence Intelligence */}
          <div className="space-y-3 pt-3 border-t border-slate-200">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-slate-400" />
              Buying Committee & Stakeholder Mapping
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Role in Buying Process</label>
                <select
                  value={formData.roleInBuyingProcess}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      roleInBuyingProcess: e.target.value as ContactRole
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-800"
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
                <label className="block font-semibold text-slate-700 mb-1">Influence Level</label>
                <select
                  value={formData.influenceLevel}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      influenceLevel: e.target.value as any
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-800"
                >
                  <option value="High">High (Veto / Direct Approval)</option>
                  <option value="Medium">Medium (Evaluation Committee)</option>
                  <option value="Low">Low (Advisory)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Relationship Status</label>
                <select
                  value={formData.relationshipStatus}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      relationshipStatus: e.target.value as any
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-800"
                >
                  <option value="Strong">Strong (Trusted Partner)</option>
                  <option value="Warm">Warm (Engaged & Responsive)</option>
                  <option value="Neutral">Neutral (Standard Contact)</option>
                  <option value="Cold">Cold (Unresponsive / Competitor Bias)</option>
                </select>
              </div>
            </div>

            {/* Decision maker toggle */}
            <div className="p-3 bg-purple-50/60 border border-purple-200 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-purple-700" />
                <div>
                  <div className="font-bold text-purple-950">Primary Final Decision Maker</div>
                  <div className="text-[11px] text-purple-700">
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
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>
          </div>

          {/* Section 4: Notes & Tags */}
          <div className="space-y-3 pt-3 border-t border-slate-200">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-slate-400" />
              Stakeholder Notes & Tags
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Engineering Preferences / Stakeholder Insights
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Always requests 3000K wildlife-sensitive luminaires; prefers Dialux .ies files emailed directly."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 bg-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tags</label>
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
                  className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg border border-slate-300"
                >
                  Add Tag
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {formData.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="text-emerald-600 hover:text-emerald-900 font-bold ml-1"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Action Buttons & Delete */}
          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            {isEditMode && onDelete ? (
              <div>
                {!confirmDelete ? (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors text-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete Contact
                  </button>
                ) : (
                  <div className="flex items-center gap-2 bg-rose-50 p-1.5 rounded-lg border border-rose-200 text-xs">
                    <span className="text-rose-800 font-semibold">Confirm delete?</span>
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded font-bold"
                    >
                      Yes, Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 rounded border border-slate-300"
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
                className="px-4 py-2 text-slate-600 hover:text-slate-800 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <UserCheck className="w-4 h-4" />
                {isEditMode ? "Save Changes" : "Create Contact"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
