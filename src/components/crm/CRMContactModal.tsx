import React, { useState, useEffect } from "react";
import {
  X,
  User,
  Mail,
  Briefcase,
  Trash2,
  Heart,
  Calendar,
  Sparkles,
  Plus,
  CheckCircle2,
  Cake,
  Users
} from "lucide-react";
import { CRMContact, ContactNotableEvent } from "../../types/crm";
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

const COMMON_ROLES = [
  "Lighting Engineer",
  "Electrical Engineer",
  "Project Manager",
  "Asset Manager",
  "Procurement",
  "Estimator",
  "Maintenance Manager",
  "Operations",
  "Designer",
  "Accounts",
  "Owner",
  "Director",
  "Other"
];

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

  // Form State
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [preferredName, setPreferredName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [role, setRole] = useState("");

  // Direct Communication
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [phone, setPhone] = useState("");
  const [preferredContactMethod, setPreferredContactMethod] = useState<"Email" | "Mobile" | "Phone" | "Teams/Zoom">("Email");
  const [linkedinUrl, setLinkedinUrl] = useState("");

  // Personal Details
  const [hobbies, setHobbies] = useState("");
  const [hasPartner, setHasPartner] = useState(false);
  const [partnerName, setPartnerName] = useState("");
  const [hasChildren, setHasChildren] = useState(false);
  const [numberOfChildren, setNumberOfChildren] = useState<number>(2);
  const [childrenNames, setChildrenNames] = useState<string[]>(["", ""]);
  const [birthday, setBirthday] = useState("");
  const [birthdayReminder, setBirthdayReminder] = useState(false);

  // Things to Remember
  const [thingsToRemember, setThingsToRemember] = useState("");

  // Notable Events
  const [notableEvents, setNotableEvents] = useState<ContactNotableEvent[]>([]);

  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (contactToEdit) {
      setFirstName(contactToEdit.firstName || "");
      setLastName(contactToEdit.lastName || "");
      setPreferredName(contactToEdit.preferredName || "");
      setJobTitle(contactToEdit.jobTitle || "");
      setDepartment(contactToEdit.department || "");
      setRole(contactToEdit.role || "");
      setEmail(contactToEdit.email || "");
      setMobile(contactToEdit.mobile || "");
      setPhone(contactToEdit.phone || "");
      setPreferredContactMethod(contactToEdit.preferredContactMethod || "Email");
      setLinkedinUrl(contactToEdit.linkedinUrl || "");
      setHobbies(contactToEdit.hobbies || "");
      setHasPartner(Boolean(contactToEdit.hasPartner || contactToEdit.partnerName));
      setPartnerName(contactToEdit.partnerName || "");
      setHasChildren(Boolean(contactToEdit.hasChildren || (contactToEdit.childrenNames && contactToEdit.childrenNames.length > 0)));
      const count = contactToEdit.numberOfChildren || (contactToEdit.childrenNames ? contactToEdit.childrenNames.length : 2);
      setNumberOfChildren(count);
      setChildrenNames(contactToEdit.childrenNames && contactToEdit.childrenNames.length > 0 ? contactToEdit.childrenNames : Array(count).fill(""));
      setBirthday(contactToEdit.birthday || "");
      setBirthdayReminder(Boolean(contactToEdit.birthdayReminder));
      setThingsToRemember(contactToEdit.thingsToRemember || contactToEdit.notes || "");
      setNotableEvents(contactToEdit.notableEvents ? [...contactToEdit.notableEvents] : []);
    } else {
      // Reset for clean new contact
      setFirstName("");
      setLastName("");
      setPreferredName("");
      setJobTitle("");
      setDepartment("");
      setRole("");
      setEmail("");
      setMobile("");
      setPhone("");
      setPreferredContactMethod("Email");
      setLinkedinUrl("");
      setHobbies("");
      setHasPartner(false);
      setPartnerName("");
      setHasChildren(false);
      setNumberOfChildren(2);
      setChildrenNames(["", ""]);
      setBirthday("");
      setBirthdayReminder(false);
      setThingsToRemember("");
      setNotableEvents([]);
    }
    setConfirmDelete(false);
  }, [contactToEdit, isOpen]);

  if (!isOpen) return null;

  // Handle number of children change
  const handleNumChildrenChange = (newCount: number) => {
    const validCount = Math.max(1, Math.min(10, newCount || 1));
    setNumberOfChildren(validCount);
    setChildrenNames((prev) => {
      const updated = [...prev];
      if (validCount > prev.length) {
        while (updated.length < validCount) updated.push("");
      } else {
        updated.splice(validCount);
      }
      return updated;
    });
  };

  const handleChildNameChange = (index: number, name: string) => {
    setChildrenNames((prev) => {
      const updated = [...prev];
      updated[index] = name;
      return updated;
    });
  };

  // Notable event helpers
  const handleAddNotableEvent = () => {
    const newEvent: ContactNotableEvent = {
      id: `ev-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title: "",
      eventDate: "",
      followUpDate: ""
    };
    setNotableEvents([...notableEvents, newEvent]);
  };

  const handleUpdateNotableEvent = (id: string, field: keyof ContactNotableEvent, value: string) => {
    setNotableEvents(
      notableEvents.map((ev) => (ev.id === id ? { ...ev, [field]: value } : ev))
    );
  };

  const handleRemoveNotableEvent = (id: string) => {
    setNotableEvents(notableEvents.filter((ev) => ev.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      return;
    }

    const payload: Omit<CRMContact, "id"> = {
      accountId,
      accountName,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      preferredName: preferredName.trim() || undefined,
      jobTitle: jobTitle.trim() || "Contact",
      department: department.trim() || undefined,
      role: role.trim() || undefined,
      email: email.trim(),
      mobile: mobile.trim() || undefined,
      phone: phone.trim() || undefined,
      preferredContactMethod,
      linkedinUrl: linkedinUrl.trim() || undefined,
      contactOwner: accountOwner || currentUser.name,

      // Personal Details (only if provided)
      hobbies: hobbies.trim() || undefined,
      hasPartner,
      partnerName: hasPartner && partnerName.trim() ? partnerName.trim() : undefined,
      hasChildren,
      numberOfChildren: hasChildren ? numberOfChildren : undefined,
      childrenNames: hasChildren ? childrenNames.filter((n) => n.trim() !== "") : undefined,
      birthday: birthday.trim() || undefined,
      birthdayReminder: birthday.trim() ? birthdayReminder : undefined,

      // Things to Remember
      thingsToRemember: thingsToRemember.trim() || undefined,

      // Notable Events
      notableEvents: notableEvents
        .filter((ev) => ev.title.trim() !== "")
        .map((ev) => ({
          id: ev.id,
          title: ev.title.trim(),
          eventDate: ev.eventDate || undefined,
          followUpDate: ev.followUpDate || undefined
        }))
    };

    if (!isEditMode) {
      const duplicate = detectDuplicateContact(
        {
          name: `${firstName} ${lastName}`.trim(),
          email: email.trim(),
          phone: phone || mobile,
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

  const handleDelete = () => {
    if (contactToEdit && onDelete) {
      onDelete(contactToEdit.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-chrome/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div
        className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-line overflow-hidden my-6 max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 bg-raised border-b border-line flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-brand-wash text-brand-deep rounded-panel">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-body">
                {isEditMode ? `Edit Contact: ${firstName} ${lastName}` : "Add Contact"}
              </h2>
              <p className="text-meta text-ink-dim">
                Account: <span className="font-semibold text-body">{accountName}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 text-ink-faint hover:text-ink hover:bg-line rounded-edge transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body - Scrollable */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-6 overflow-y-auto text-meta flex-1">
          {/* 1. GENERAL DETAILS & POSITION */}
          <section className="space-y-3">
            <div className="text-spec font-bold uppercase tracking-wider text-ink-dim flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-brand-deep" />
              General Details &amp; Position
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-body mb-1">
                  First Name <span className="text-urgent">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Matthew"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
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
                  placeholder="e.g. Richardson"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-3 py-2 border border-line-strong rounded-edge focus:outline-none focus:ring-2 focus:ring-brand text-body bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-body mb-1">
                Preferred Name <span className="text-xs font-normal text-ink-dim">(optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Richo"
                value={preferredName}
                onChange={(e) => setPreferredName(e.target.value)}
                className="w-full px-3 py-2 border border-line-strong rounded-edge focus:outline-none focus:ring-2 focus:ring-brand text-body bg-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-body mb-1">
                  Job Title <span className="text-urgent">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senior Lighting Engineer"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-line-strong rounded-edge focus:outline-none focus:ring-2 focus:ring-brand text-body bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-body mb-1">Department</label>
                <input
                  type="text"
                  placeholder="e.g. Infrastructure & Works"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3 py-2 border border-line-strong rounded-edge focus:outline-none focus:ring-2 focus:ring-brand text-body bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-body mb-1">
                Role <span className="text-xs font-normal text-ink-dim">(organisation role/function)</span>
              </label>
              <input
                type="text"
                list="contact-role-suggestions"
                placeholder="Select or type role (e.g. Lighting Engineer, Project Manager, Asset Manager, Procurement)"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3 py-2 border border-line-strong rounded-edge focus:outline-none focus:ring-2 focus:ring-brand text-body bg-white"
              />
              <datalist id="contact-role-suggestions">
                {COMMON_ROLES.map((r) => (
                  <option key={r} value={r} />
                ))}
              </datalist>
            </div>
          </section>

          {/* 2. DIRECT COMMUNICATION */}
          <section className="space-y-3 pt-4 border-t border-line">
            <div className="text-spec font-bold uppercase tracking-wider text-ink-dim flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-brand-deep" />
              Direct Communication
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-body mb-1">
                  Work Email <span className="text-urgent">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder={`e.g. name@${defaultDomain}`}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-line-strong rounded-edge focus:outline-none focus:ring-2 focus:ring-brand text-body bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-body mb-1">Mobile Phone</label>
                <input
                  type="tel"
                  placeholder="e.g. 0412 345 678"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="w-full px-3 py-2 border border-line-strong rounded-edge focus:outline-none focus:ring-2 focus:ring-brand text-body bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-body mb-1">Direct Office Phone</label>
                <input
                  type="tel"
                  placeholder="e.g. (03) 9747 7200"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-line-strong rounded-edge focus:outline-none focus:ring-2 focus:ring-brand text-body bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-body mb-1">Preferred Contact Method</label>
                <select
                  value={preferredContactMethod}
                  onChange={(e) =>
                    setPreferredContactMethod(e.target.value as any)
                  }
                  className="w-full px-3 py-2 border border-line-strong rounded-edge bg-white text-body"
                >
                  <option value="Email">Email</option>
                  <option value="Mobile">Mobile Phone</option>
                  <option value="Phone">Office Phone</option>
                  <option value="Teams/Zoom">Teams / Video Call</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-body mb-1">LinkedIn Profile</label>
              <input
                type="url"
                placeholder="https://linkedin.com/in/..."
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                className="w-full px-3 py-2 border border-line-strong rounded-edge focus:outline-none focus:ring-2 focus:ring-brand text-body bg-white"
              />
            </div>
          </section>

          {/* 3. PERSONAL DETAILS (Optional progressive disclosure) */}
          <section className="space-y-3 pt-4 border-t border-line">
            <div className="flex items-center justify-between flex-wrap gap-1">
              <div className="text-spec font-bold uppercase tracking-wider text-ink-dim flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-brand-deep" />
                Personal Details <span className="text-xs font-normal text-ink-dim lowercase">(optional context)</span>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-body mb-1">Hobbies &amp; Interests</label>
              <textarea
                rows={2}
                placeholder="e.g. Golf, Carlton supporter, camping, coaches junior soccer"
                value={hobbies}
                onChange={(e) => setHobbies(e.target.value)}
                className="w-full px-3 py-2 border border-line-strong rounded-edge focus:outline-none focus:ring-2 focus:ring-brand text-body bg-white"
              />
            </div>

            <div className="space-y-3 pt-1">
              {/* Partner Toggle */}
              <div className="p-3 bg-paper border border-line rounded-edge space-y-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={hasPartner}
                    onChange={(e) => {
                      setHasPartner(e.target.checked);
                      if (!e.target.checked) setPartnerName("");
                    }}
                    className="w-4 h-4 rounded text-brand-deep focus:ring-brand"
                  />
                  <span className="font-semibold text-body">Has Partner</span>
                </label>

                {hasPartner && (
                  <div className="pl-6 pt-1">
                    <label className="block text-xs font-medium text-ink-dim mb-1">Partner's Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Sarah"
                      value={partnerName}
                      onChange={(e) => setPartnerName(e.target.value)}
                      className="w-full sm:w-72 px-3 py-1.5 border border-line-strong rounded-edge focus:outline-none focus:ring-2 focus:ring-brand text-body bg-white"
                    />
                  </div>
                )}
              </div>

              {/* Children Toggle */}
              <div className="p-3 bg-paper border border-line rounded-edge space-y-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={hasChildren}
                    onChange={(e) => {
                      setHasChildren(e.target.checked);
                      if (!e.target.checked) {
                        setChildrenNames(["", ""]);
                      }
                    }}
                    className="w-4 h-4 rounded text-brand-deep focus:ring-brand"
                  />
                  <span className="font-semibold text-body">Has Children</span>
                </label>

                {hasChildren && (
                  <div className="pl-6 pt-1 space-y-2.5">
                    <div className="flex items-center gap-3">
                      <label className="text-xs font-medium text-ink-dim">Number of Children:</label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={numberOfChildren}
                        onChange={(e) => handleNumChildrenChange(parseInt(e.target.value, 10))}
                        className="w-20 px-2 py-1 border border-line-strong rounded-edge text-body bg-white text-center font-bold"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {childrenNames.slice(0, numberOfChildren).map((name, idx) => (
                        <div key={idx}>
                          <label className="block text-xs font-medium text-ink-dim mb-1">
                            Child {idx + 1} Name
                          </label>
                          <input
                            type="text"
                            placeholder={`e.g. ${idx === 0 ? "Emily" : idx === 1 ? "Jack" : `Child ${idx + 1}`}`}
                            value={name}
                            onChange={(e) => handleChildNameChange(idx, e.target.value)}
                            className="w-full px-3 py-1.5 border border-line-strong rounded-edge focus:outline-none focus:ring-2 focus:ring-brand text-body bg-white"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Birthday */}
              <div className="p-3 bg-paper border border-line rounded-edge space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                  <div>
                    <label className="block font-semibold text-body mb-1 flex items-center gap-1.5">
                      <Cake className="w-3.5 h-3.5 text-brand-deep" />
                      Birthday <span className="text-xs font-normal text-ink-dim">(year optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 14 March or 14/03/1985"
                      value={birthday}
                      onChange={(e) => setBirthday(e.target.value)}
                      className="w-full px-3 py-1.5 border border-line-strong rounded-edge focus:outline-none focus:ring-2 focus:ring-brand text-body bg-white"
                    />
                  </div>

                  {birthday.trim() && (
                    <label className="flex items-center gap-2 cursor-pointer pb-2">
                      <input
                        type="checkbox"
                        checked={birthdayReminder}
                        onChange={(e) => setBirthdayReminder(e.target.checked)}
                        className="w-4 h-4 rounded text-brand-deep focus:ring-brand"
                      />
                      <span className="text-spec font-medium text-body">Birthday Reminder</span>
                    </label>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* 4. THINGS TO REMEMBER */}
          <section className="space-y-2 pt-4 border-t border-line">
            <div className="text-spec font-bold uppercase tracking-wider text-ink-dim flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-brand-deep" />
              Things to Remember
            </div>
            <p className="text-xs text-ink-dim">
              Useful things to remember for future conversations.
            </p>
            <textarea
              rows={3}
              placeholder="e.g. Usually wants pricing first, then technical information. Very particular about lead times — confirm availability before quoting. Likes a bit of a chat about golf."
              value={thingsToRemember}
              onChange={(e) => setThingsToRemember(e.target.value)}
              className="w-full px-3 py-2 border border-line-strong rounded-edge focus:outline-none focus:ring-2 focus:ring-brand text-body bg-white"
            />
          </section>

          {/* 5. NOTABLE EVENTS */}
          <section className="space-y-3 pt-4 border-t border-line">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-spec font-bold uppercase tracking-wider text-ink-dim flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-brand-deep" />
                  Notable Events
                </div>
                <p className="text-xs text-ink-dim">
                  Events or milestones mentioned by the customer to follow up on.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddNotableEvent}
                className="px-3 py-1.5 text-xs font-bold text-brand-deep bg-brand-wash hover:bg-brand-wash/80 border border-brand-edge rounded-edge flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Notable Event
              </button>
            </div>

            {notableEvents.length > 0 && (
              <div className="space-y-2.5 pt-1">
                {notableEvents.map((ev, idx) => (
                  <div
                    key={ev.id}
                    className="p-3 bg-paper border border-line rounded-edge space-y-2 relative group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-ink-dim">Event #{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveNotableEvent(ev.id)}
                        className="text-urgent hover:text-urgent/80 text-xs font-semibold flex items-center gap-1 p-1 cursor-pointer"
                        title="Remove event"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Remove</span>
                      </button>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-ink-dim mb-1">Event / Note</label>
                      <input
                        type="text"
                        placeholder="e.g. Emily's soccer tournament, Going to Bali for two weeks"
                        value={ev.title}
                        onChange={(e) => handleUpdateNotableEvent(ev.id, "title", e.target.value)}
                        className="w-full px-3 py-1.5 border border-line-strong rounded-edge bg-white text-body text-spec"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                      <div>
                        <label className="block text-xs font-medium text-ink-dim mb-1">Event Date</label>
                        <input
                          type="date"
                          value={ev.eventDate || ""}
                          onChange={(e) => handleUpdateNotableEvent(ev.id, "eventDate", e.target.value)}
                          className="w-full px-3 py-1 border border-line-strong rounded-edge bg-white text-body text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-ink-dim mb-1">Follow-Up Date</label>
                        <input
                          type="date"
                          value={ev.followUpDate || ""}
                          onChange={(e) => handleUpdateNotableEvent(ev.id, "followUpDate", e.target.value)}
                          className="w-full px-3 py-1 border border-line-strong rounded-edge bg-white text-body text-xs font-semibold text-brand-deep"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Action Buttons & Delete */}
          <div className="pt-4 border-t border-line flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            {isEditMode && onDelete ? (
              <div>
                {!confirmDelete ? (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="text-urgent hover:text-urgent hover:bg-urgent-wash px-3 py-1.5 rounded-edge font-semibold flex items-center gap-1.5 transition-colors text-meta cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete Contact
                  </button>
                ) : (
                  <div className="flex items-center gap-2 bg-urgent-wash p-1.5 rounded-edge border border-urgent text-meta">
                    <span className="text-urgent font-semibold">Confirm delete?</span>
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="px-2 py-1 bg-urgent hover:bg-urgent text-white rounded font-bold cursor-pointer"
                    >
                      Yes, Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="px-2 py-1 bg-white hover:bg-paper text-body rounded border border-line-strong cursor-pointer"
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
                className="px-4 py-2 text-ink-dim hover:text-ink font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 font-bold text-white bg-brand-deep hover:bg-brand rounded-edge shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                {isEditMode ? "Save Changes" : "Add Contact"}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Duplicate Contact Warning Modal */}
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
