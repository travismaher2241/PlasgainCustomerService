import React, { useState, useEffect } from "react";
import {
  X,
  UserCheck,
  Building2,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  CheckCircle2,
  LogIn,
  Sparkles,
  ArrowRight
} from "lucide-react";
import { useApp, PRESET_TEAM_MEMBERS, UserProfile, initialsOf } from "../context/AppContext";

export const UserLoginModal: React.FC = () => {
  const {
    isLoginModalOpen,
    closeLoginModal,
    currentUser,
    loginAsUser
  } = useApp();

  const [activeTab, setActiveTab] = useState<"preset" | "custom">("preset");

  const [customDraft, setCustomDraft] = useState<UserProfile>({
    name: "",
    role: "Internal Sales",
    location: "Drouin, VIC",
    email: "",
    phone: ""
  });

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isLoginModalOpen) {
      setCustomDraft({
        name: currentUser.name || "",
        role: currentUser.role || "Internal Sales",
        location: currentUser.location || "Drouin, VIC",
        email: currentUser.email || "",
        phone: currentUser.phone || ""
      });
      setErrorMsg(null);
    }
  }, [isLoginModalOpen, currentUser]);

  if (!isLoginModalOpen) return null;

  const handleSelectPreset = (member: UserProfile) => {
    loginAsUser(member);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customDraft.name.trim()) {
      setErrorMsg("Your full name is required.");
      return;
    }
    const userId = `user-${customDraft.name.toLowerCase().trim().replace(/[^a-z0-9]/g, "-")}`;
    loginAsUser({
      ...customDraft,
      id: userId,
      name: customDraft.name.trim(),
      role: customDraft.role.trim(),
      location: customDraft.location.trim(),
      email: customDraft.email.trim(),
      phone: (customDraft.phone || "").trim()
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-chrome/70 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeLoginModal();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-login-modal-title"
        className="bg-surface w-full max-w-lg rounded-frame border border-line shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="p-4 bg-raised border-b border-line flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-edge bg-brand-deep text-white flex items-center justify-center text-body font-bold">
              {initialsOf(currentUser.name)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="user-login-modal-title" className="text-body font-bold text-ink">
                  Plasgain Sales Workspace Login
                </h2>
              </div>
              <p className="text-spec text-ink-dim">
                Signed in as: <strong className="text-brand-deep">{currentUser.name}</strong> ({currentUser.role || "Sales"})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeLoginModal}
            aria-label="Close login dialog"
            className="p-1.5 rounded-edge hover:bg-hover text-ink-dim hover:text-ink cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-line bg-paper/60 px-5 pt-3 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("preset")}
            className={`pb-2.5 px-3 text-meta font-bold border-b-2 cursor-pointer transition-colors ${
              activeTab === "preset"
                ? "border-brand-deep text-brand-deep"
                : "border-transparent text-ink-dim hover:text-ink"
            }`}
          >
            Team Members
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("custom")}
            className={`pb-2.5 px-3 text-meta font-bold border-b-2 cursor-pointer transition-colors ${
              activeTab === "custom"
                ? "border-brand-deep text-brand-deep"
                : "border-transparent text-ink-dim hover:text-ink"
            }`}
          >
            Custom Sign-In
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-meta text-ink flex-1">
          {activeTab === "preset" ? (
            <div className="space-y-3">
              <p className="text-spec text-ink-dim">
                Select your Plasgain team profile. Your identity will be saved locally and stored securely in Cloud Firestore for quoting, CRM activities, and email signatures.
              </p>

              <div className="space-y-2 pt-1">
                {PRESET_TEAM_MEMBERS.map((member) => {
                  const isCurrent = currentUser.name.toLowerCase() === member.name.toLowerCase();
                  return (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => handleSelectPreset(member)}
                      className={`w-full p-3.5 rounded-panel border text-left flex items-center justify-between gap-3 transition-all cursor-pointer ${
                        isCurrent
                          ? "bg-brand-wash border-brand-edge shadow-xs ring-1 ring-brand-deep"
                          : "bg-white border-line hover:border-brand-edge hover:bg-raised shadow-2xs"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-edge flex items-center justify-center text-meta font-bold shrink-0 ${
                            isCurrent ? "bg-brand-deep text-white" : "bg-paper text-ink border border-line"
                          }`}
                        >
                          {initialsOf(member.name)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-body text-ink truncate">{member.name}</span>
                            {isCurrent && (
                              <span className="px-1.5 py-0.2 text-[10px] font-bold bg-brand-deep text-white rounded">
                                Active
                              </span>
                            )}
                          </div>
                          <div className="text-spec text-ink-dim truncate">
                            {member.role} · {member.location}
                          </div>
                          {member.email && (
                            <div className="text-[11px] text-ink-faint font-mono truncate">
                              {member.email}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0 text-brand-deep font-semibold text-spec flex items-center gap-1">
                        {isCurrent ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        ) : (
                          <div className="px-2.5 py-1 bg-brand-deep text-white text-spec font-bold rounded-edge hover:bg-brand transition-colors">
                            Sign In
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <form onSubmit={handleCustomSubmit} className="space-y-3.5">
              {errorMsg && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded-edge text-meta text-red-800 font-medium">
                  {errorMsg}
                </div>
              )}

              <div>
                <label htmlFor="login-custom-name" className="u-eyebrow text-ink-dim block mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="login-custom-name"
                  type="text"
                  required
                  value={customDraft.name}
                  onChange={(e) => setCustomDraft({ ...customDraft, name: e.target.value })}
                  placeholder="e.g. Travis Maher"
                  className="w-full text-body px-3 py-2 rounded-edge border border-line bg-surface text-ink placeholder:text-ink-faint focus:outline-none focus:border-brand-deep transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="login-custom-role" className="u-eyebrow text-ink-dim block mb-1">
                    Role / Position
                  </label>
                  <input
                    id="login-custom-role"
                    type="text"
                    value={customDraft.role}
                    onChange={(e) => setCustomDraft({ ...customDraft, role: e.target.value })}
                    placeholder="e.g. Internal Sales"
                    className="w-full text-body px-3 py-2 rounded-edge border border-line bg-surface text-ink placeholder:text-ink-faint focus:outline-none focus:border-brand-deep transition-colors"
                  />
                </div>
                <div>
                  <label htmlFor="login-custom-location" className="u-eyebrow text-ink-dim block mb-1">
                    Location / Office
                  </label>
                  <input
                    id="login-custom-location"
                    type="text"
                    value={customDraft.location}
                    onChange={(e) => setCustomDraft({ ...customDraft, location: e.target.value })}
                    placeholder="e.g. Drouin, VIC"
                    className="w-full text-body px-3 py-2 rounded-edge border border-line bg-surface text-ink placeholder:text-ink-faint focus:outline-none focus:border-brand-deep transition-colors"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="login-custom-email" className="u-eyebrow text-ink-dim block mb-1">
                  Work Email (For Customer Signatures)
                </label>
                <input
                  id="login-custom-email"
                  type="email"
                  value={customDraft.email}
                  onChange={(e) => setCustomDraft({ ...customDraft, email: e.target.value })}
                  placeholder="e.g. travis@plasgain.com.au"
                  className="w-full text-body px-3 py-2 rounded-edge border border-line bg-surface text-ink placeholder:text-ink-faint focus:outline-none focus:border-brand-deep transition-colors"
                />
              </div>

              <div>
                <label htmlFor="login-custom-phone" className="u-eyebrow text-ink-dim block mb-1">
                  Direct Phone / Mobile
                </label>
                <input
                  id="login-custom-phone"
                  type="tel"
                  value={customDraft.phone || ""}
                  onChange={(e) => setCustomDraft({ ...customDraft, phone: e.target.value })}
                  placeholder="e.g. 0412 345 678"
                  className="w-full text-body px-3 py-2 rounded-edge border border-line bg-surface text-ink placeholder:text-ink-faint focus:outline-none focus:border-brand-deep transition-colors"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 bg-brand-deep hover:bg-brand text-white font-bold text-meta rounded-edge shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In &amp; Save Details</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-raised border-t border-line flex items-center justify-between text-spec text-ink-dim">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Details synced with Cloud Firestore (Sydney/AU)</span>
          </div>
          <button
            type="button"
            onClick={closeLoginModal}
            className="px-3 py-1.5 rounded-edge border border-line hover:bg-hover text-ink font-semibold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
