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
  ArrowRight,
  Trash2,
  UserPlus
} from "lucide-react";
import { useApp, UserProfile, initialsOf } from "../context/AppContext";

export const UserLoginModal: React.FC = () => {
  const {
    isLoginModalOpen,
    closeLoginModal,
    currentUser,
    loginAsUser,
    switchUserWithPin,
    teamMembers,
    deleteTeamMember,
    addTeamMember
  } = useApp();

  const [activeTab, setActiveTab] = useState<"preset" | "custom">("preset");
  const [memberToDelete, setMemberToDelete] = useState<UserProfile | null>(null);
  const [memberToAuthenticate, setMemberToAuthenticate] = useState<UserProfile | null>(null);
  const [pinInput, setPinInput] = useState<string>("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);

  const [customDraft, setCustomDraft] = useState<UserProfile>({
    id: "",
    name: "",
    role: "Internal Sales",
    location: "Drouin, VIC",
    email: "",
    phone: "",
    isAdmin: false
  });

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isLoginModalOpen) {
      setCustomDraft({
        id: "",
        name: "",
        role: "Internal Sales",
        location: "Drouin, VIC",
        email: "",
        phone: "",
        isAdmin: false
      });
      setErrorMsg(null);
      setMemberToDelete(null);
      setMemberToAuthenticate(null);
      setPinInput("");
      setPinError(null);
    }
  }, [isLoginModalOpen, currentUser]);

  if (!isLoginModalOpen) return null;

  const handleSelectPreset = (member: UserProfile) => {
    // A selected profile may have no valid server session (first visit, expiry,
    // or server restart). Allow the current profile to authenticate again.
    setMemberToAuthenticate(member);
    setPinInput("");
    setPinError(null);
  };

  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberToAuthenticate) return;
    setIsVerifyingPin(true);
    const result = await switchUserWithPin(memberToAuthenticate.id, pinInput);
    setIsVerifyingPin(false);
    if (result.success) {
      setMemberToAuthenticate(null);
      setPinInput("");
      setPinError(null);
    } else {
      // Clear on failure too. The field is masked and capped at 6 characters, so
      // a retyped PIN used to append to the failed one and get truncated —
      // silently corrupting every retry and burning the 5-attempt lockout.
      setPinInput("");
      setPinError(result.error || "Invalid PIN code. Please try again.");
    }
  };

  const handleDeleteConfirm = (e: React.MouseEvent, member: UserProfile) => {
    e.stopPropagation();
    deleteTeamMember(member.id || member.name);
    setMemberToDelete(null);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser.isAdmin) {
      setErrorMsg("Access Denied: Only administrators can create new team profiles.");
      return;
    }
    if (!customDraft.name.trim()) {
      setErrorMsg("Your full name is required.");
      return;
    }
    const userId = `user-${customDraft.name.toLowerCase().trim().replace(/[^a-z0-9]/g, "-")}`;
    const newProfile: UserProfile = {
      ...customDraft,
      id: userId,
      name: customDraft.name.trim(),
      role: customDraft.role.trim(),
      location: customDraft.location.trim(),
      email: customDraft.email.trim(),
      phone: (customDraft.phone || "").trim(),
      isAdmin: customDraft.isAdmin || false
    };
    addTeamMember(newProfile);
    loginAsUser(newProfile);
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
            Team Members ({teamMembers.length})
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
            Custom Sign-In / Add Member
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-meta text-ink flex-1">
          {memberToAuthenticate ? (
            <form onSubmit={handleVerifyPin} className="p-5 bg-raised rounded-panel border border-brand-edge space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-edge bg-brand-deep text-white flex items-center justify-center text-lead font-bold">
                  {initialsOf(memberToAuthenticate.name)}
                </div>
                <div>
                  <h3 className="text-body font-bold text-ink">Authenticate Sign-In</h3>
                  <p className="text-spec text-ink-dim">
                    Enter PIN to switch to <strong className="text-brand-deep">{memberToAuthenticate.name}</strong> ({memberToAuthenticate.role})
                  </p>
                </div>
              </div>

              {pinError && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded-edge text-meta text-red-800 font-medium">
                  {pinError}
                </div>
              )}

              <div>
                <label htmlFor="user-pin-input" className="u-eyebrow text-ink-dim block mb-1.5">
                  4-Digit Security PIN
                </label>
                <input
                  id="user-pin-input"
                  type="password"
                  maxLength={6}
                  autoFocus
                  required
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="••••"
                  className="w-full text-center text-2xl tracking-[0.3em] font-mono px-3 py-2 rounded-edge border border-line-strong bg-white text-ink placeholder:text-ink-faint focus:outline-none focus:border-brand-deep"
                />
                <p className="text-[11px] text-ink-faint mt-1 text-center">
                  PINs are verified by the server and are never displayed or stored in this browser.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={pinInput.trim().length < 4 || isVerifyingPin}
                  className="flex-1 py-2 px-4 bg-brand-deep hover:bg-brand text-white font-bold text-meta rounded-edge shadow-xs cursor-pointer transition-colors"
                >
                  {isVerifyingPin ? "Verifying…" : "Verify & Sign In"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMemberToAuthenticate(null);
                    setPinInput("");
                    setPinError(null);
                  }}
                  className="px-4 py-2 border border-line hover:bg-paper text-ink font-semibold text-meta rounded-edge cursor-pointer transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : activeTab === "preset" ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-spec text-ink-dim">
                <span>Select your profile to authenticate and sign in:</span>
                {!currentUser.isAdmin && (
                  <span className="text-ink-faint text-[11px] italic">
                    (Admin required to remove profiles)
                  </span>
                )}
              </div>

              {/* Confirm Delete Banner */}
              {memberToDelete && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-edge flex items-center justify-between gap-3 text-meta text-red-900 animate-in fade-in duration-150">
                  <div className="flex items-center gap-2">
                    <Trash2 className="w-4 h-4 text-red-600 shrink-0" />
                    <span>Delete {memberToDelete.name} from workspace?</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => handleDeleteConfirm(e, memberToDelete)}
                      className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white font-bold text-spec rounded cursor-pointer transition-colors"
                    >
                      Confirm Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setMemberToDelete(null)}
                      className="px-2 py-1 bg-white hover:bg-paper border border-line text-ink font-semibold text-spec rounded cursor-pointer transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-2 pt-1">
                {teamMembers.map((member) => {
                  const isCurrent = currentUser.name.toLowerCase() === member.name.toLowerCase() || currentUser.id === member.id;
                  return (
                    <div
                      key={member.id || member.name}
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
                            {member.isAdmin && (
                              <span className="px-1.5 py-0.2 text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 rounded">
                                Admin
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

                      <div className="shrink-0 flex items-center gap-2">
                        {isCurrent ? (
                          <button type="button" onClick={(event) => { event.stopPropagation(); handleSelectPreset(member); }} className="px-3 py-1.5 bg-brand-deep text-white text-spec font-bold rounded-edge">Verify session</button>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectPreset(member);
                              }}
                              className="px-3 py-1.5 bg-brand-deep text-white text-spec font-bold rounded-edge hover:bg-brand transition-colors cursor-pointer"
                            >
                              Sign In
                            </button>
                            {currentUser.isAdmin && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setMemberToDelete(member);
                                }}
                                title={`Delete ${member.name} from workspace`}
                                aria-label={`Delete ${member.name}`}
                                className="p-1.5 text-ink-dim hover:text-red-600 hover:bg-red-50 rounded-edge transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("custom")}
                  className="w-full py-2.5 px-3 rounded-panel border border-dashed border-line hover:border-brand-deep hover:bg-brand-wash/40 text-brand-deep font-bold text-meta flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>+ Add New User / Team Member</span>
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleCustomSubmit} className="space-y-3.5">
              {!currentUser.isAdmin && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-edge text-spec text-amber-900 font-medium flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>Administrator privileges required to create team profiles.</span>
                </div>
              )}

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
                  disabled={!currentUser.isAdmin}
                  value={customDraft.name}
                  onChange={(e) => setCustomDraft({ ...customDraft, name: e.target.value })}
                  placeholder="e.g. Travis Maher"
                  className="w-full text-body px-3 py-2 rounded-edge border border-line bg-surface text-ink placeholder:text-ink-faint focus:outline-none focus:border-brand-deep transition-colors disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label htmlFor="login-custom-role" className="u-eyebrow text-ink-dim block mb-1">
                    Role / Position
                  </label>
                  <input
                    id="login-custom-role"
                    type="text"
                    disabled={!currentUser.isAdmin}
                    value={customDraft.role}
                    onChange={(e) => setCustomDraft({ ...customDraft, role: e.target.value })}
                    placeholder="e.g. Internal Sales"
                    className="w-full text-body px-3 py-2 rounded-edge border border-line bg-surface text-ink placeholder:text-ink-faint focus:outline-none focus:border-brand-deep transition-colors disabled:bg-slate-100 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label htmlFor="login-custom-location" className="u-eyebrow text-ink-dim block mb-1">
                    Location / Office
                  </label>
                  <input
                    id="login-custom-location"
                    type="text"
                    disabled={!currentUser.isAdmin}
                    value={customDraft.location}
                    onChange={(e) => setCustomDraft({ ...customDraft, location: e.target.value })}
                    placeholder="e.g. Drouin, VIC"
                    className="w-full text-body px-3 py-2 rounded-edge border border-line bg-surface text-ink placeholder:text-ink-faint focus:outline-none focus:border-brand-deep transition-colors disabled:bg-slate-100 disabled:cursor-not-allowed"
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
                  disabled={!currentUser.isAdmin}
                  value={customDraft.email}
                  onChange={(e) => setCustomDraft({ ...customDraft, email: e.target.value })}
                  placeholder="e.g. travis@plasgain.com.au"
                  className="w-full text-body px-3 py-2 rounded-edge border border-line bg-surface text-ink placeholder:text-ink-faint focus:outline-none focus:border-brand-deep transition-colors disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="login-custom-phone" className="u-eyebrow text-ink-dim block mb-1">
                    Direct Phone / Mobile
                  </label>
                  <input
                    id="login-custom-phone"
                    type="tel"
                    disabled={!currentUser.isAdmin}
                    value={customDraft.phone || ""}
                    onChange={(e) => setCustomDraft({ ...customDraft, phone: e.target.value })}
                    placeholder="e.g. 0412 345 678"
                    className="w-full text-body px-3 py-2 rounded-edge border border-line bg-surface text-ink placeholder:text-ink-faint focus:outline-none focus:border-brand-deep transition-colors disabled:bg-slate-100 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              <p className="text-spec text-ink-dim bg-paper border border-line rounded-edge p-2.5">
                New profile credentials must be provisioned in the server environment by an administrator. PINs are not collected or stored in the browser.
              </p>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={!currentUser.isAdmin}
                  className={`w-full py-2.5 px-4 font-bold text-meta rounded-edge shadow-sm flex items-center justify-center gap-2 transition-colors ${
                    currentUser.isAdmin
                      ? "bg-brand-deep hover:bg-brand text-white cursor-pointer"
                      : "bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300"
                  }`}
                >
                  <LogIn className="w-4 h-4" />
                  <span>{currentUser.isAdmin ? "Save & Sign In" : "Admin Permission Required"}</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-raised border-t border-line flex items-center justify-between text-spec text-ink-dim">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>PIN-Protected Authenticated Workspace Access</span>
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
