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
  UserPlus,
  KeyRound,
  Eye,
  EyeOff,
  RefreshCw,
  Copy,
  Check
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
    addTeamMember,
    updateTeamMemberPin
  } = useApp();

  const generatePin = () => String(Math.floor(1000 + Math.random() * 9000));

  const [activeTab, setActiveTab] = useState<"preset" | "custom">("preset");
  const [memberToDelete, setMemberToDelete] = useState<UserProfile | null>(null);
  const [memberToAuthenticate, setMemberToAuthenticate] = useState<UserProfile | null>(null);
  const [pinInput, setPinInput] = useState<string>("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);

  // Admin PIN management state
  const [memberToManagePin, setMemberToManagePin] = useState<UserProfile | null>(null);
  const [managePinInput, setManagePinInput] = useState("");
  const [showManagePin, setShowManagePin] = useState(false);
  const [managePinError, setManagePinError] = useState<string | null>(null);
  const [isSavingManagePin, setIsSavingManagePin] = useState(false);
  const [copiedManagePin, setCopiedManagePin] = useState(false);

  // Custom user draft state
  const [customDraft, setCustomDraft] = useState<UserProfile>({
    id: "",
    name: "",
    role: "Internal Sales",
    location: "Drouin, VIC",
    email: "",
    phone: "",
    pin: "1234",
    isAdmin: false
  });
  const [showCustomPin, setShowCustomPin] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createdSummary, setCreatedSummary] = useState<{ profile: UserProfile; pin: string } | null>(null);
  const [copiedCreatedPin, setCopiedCreatedPin] = useState(false);

  useEffect(() => {
    if (isLoginModalOpen) {
      setCustomDraft({
        id: "",
        name: "",
        role: "Internal Sales",
        location: "Drouin, VIC",
        email: "",
        phone: "",
        pin: generatePin(),
        isAdmin: false
      });
      setErrorMsg(null);
      setMemberToDelete(null);
      setMemberToAuthenticate(null);
      setMemberToManagePin(null);
      setManagePinInput("");
      setManagePinError(null);
      setShowManagePin(false);
      setCopiedManagePin(false);
      setPinInput("");
      setPinError(null);
      setCreatedSummary(null);
      setCopiedCreatedPin(false);
      setShowCustomPin(false);
    }
  }, [isLoginModalOpen, currentUser]);

  if (!isLoginModalOpen) return null;

  const handleSelectPreset = (member: UserProfile) => {
    setMemberToAuthenticate(member);
    setMemberToManagePin(null);
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
      setPinInput("");
      setPinError(result.error || "Invalid PIN code. Please try again.");
    }
  };

  const handleDeleteConfirm = (e: React.MouseEvent, member: UserProfile) => {
    e.stopPropagation();
    deleteTeamMember(member.id || member.name);
    setMemberToDelete(null);
  };

  const handleSaveManagePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberToManagePin) return;
    const cleanPin = managePinInput.trim();
    if (cleanPin.length < 4) {
      setManagePinError("PIN must be at least 4 digits.");
      return;
    }
    setIsSavingManagePin(true);
    const ok = await updateTeamMemberPin(memberToManagePin.id, cleanPin);
    setIsSavingManagePin(false);
    if (ok) {
      setMemberToManagePin(null);
      setManagePinInput("");
      setManagePinError(null);
    } else {
      setManagePinError("Failed to update PIN. Please try again.");
    }
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
    const pin = (customDraft.pin || "").trim();
    if (!pin || pin.length < 4) {
      setErrorMsg("A 4-digit security PIN is required so this team member can sign in.");
      return;
    }

    const userId = `user-${customDraft.name.toLowerCase().trim().replace(/[^a-z0-9]/g, "-")}`;
    const newProfile: UserProfile = {
      ...customDraft,
      id: userId,
      name: customDraft.name.trim(),
      role: customDraft.role.trim() || "Internal Sales",
      location: customDraft.location.trim() || "Drouin, VIC",
      email: customDraft.email.trim(),
      phone: (customDraft.phone || "").trim(),
      pin: pin,
      isAdmin: customDraft.isAdmin || false
    };

    addTeamMember(newProfile);
    setCreatedSummary({ profile: newProfile, pin });
  };

  const handleCopy = (text: string, type: "created" | "manage") => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      if (type === "created") {
        setCopiedCreatedPin(true);
        setTimeout(() => setCopiedCreatedPin(false), 2500);
      } else {
        setCopiedManagePin(true);
        setTimeout(() => setCopiedManagePin(false), 2500);
      }
    }
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
            onClick={() => {
              setActiveTab("preset");
              setCreatedSummary(null);
            }}
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
                  PINs are verified securely and are never exposed publicly.
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
          ) : memberToManagePin ? (
            <form onSubmit={handleSaveManagePin} className="p-5 bg-raised rounded-panel border border-brand-edge space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-brand-deep" />
                  <h3 className="text-body font-bold text-ink">Manage Security PIN</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setMemberToManagePin(null)}
                  className="p-1 hover:bg-paper rounded text-ink-dim hover:text-ink"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-spec text-ink-dim">
                Viewing or resetting PIN for <strong className="text-ink font-bold">{memberToManagePin.name}</strong> ({memberToManagePin.role})
              </p>

              {memberToManagePin.pin && (
                <div className="p-3 bg-brand-wash/40 border border-brand-edge rounded-edge flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-bold text-ink-dim uppercase block">Current Stored PIN</span>
                    <span className="text-lg font-mono font-bold tracking-widest text-brand-deep">{memberToManagePin.pin}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(memberToManagePin.pin!, "manage")}
                    className="px-2.5 py-1.5 bg-white border border-brand-edge hover:bg-brand-wash text-brand-deep font-bold text-spec rounded flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    {copiedManagePin ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedManagePin ? "Copied" : "Copy"}</span>
                  </button>
                </div>
              )}

              {managePinError && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded-edge text-meta text-red-800 font-medium">
                  {managePinError}
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="manage-pin-input" className="u-eyebrow text-ink-dim block">
                    {memberToManagePin.pin ? "Set New 4-Digit PIN" : "Assign 4-Digit PIN"}
                  </label>
                  <button
                    type="button"
                    onClick={() => setManagePinInput(generatePin())}
                    className="text-[11px] text-brand-deep hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Generate Random</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="manage-pin-input"
                    type={showManagePin ? "text" : "password"}
                    maxLength={6}
                    required
                    value={managePinInput}
                    onChange={(e) => setManagePinInput(e.target.value.replace(/\D/g, ""))}
                    placeholder="••••"
                    className="w-full text-body font-mono tracking-widest px-3 py-2 pr-10 rounded-edge border border-line bg-surface text-ink placeholder:text-ink-faint focus:outline-none focus:border-brand-deep"
                  />
                  <button
                    type="button"
                    onClick={() => setShowManagePin((p) => !p)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-dim hover:text-ink p-1 cursor-pointer"
                    title={showManagePin ? "Hide PIN" : "Show PIN"}
                  >
                    {showManagePin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={managePinInput.trim().length < 4 || isSavingManagePin}
                  className="flex-1 py-2 px-4 bg-brand-deep hover:bg-brand text-white font-bold text-meta rounded-edge shadow-xs cursor-pointer transition-colors"
                >
                  {isSavingManagePin ? "Saving…" : "Save New PIN"}
                </button>
                <button
                  type="button"
                  onClick={() => setMemberToManagePin(null)}
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
                    (Admin required to manage team)
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
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleSelectPreset(member);
                            }}
                            className="px-3 py-1.5 bg-brand-deep text-white text-spec font-bold rounded-edge hover:bg-brand transition-colors cursor-pointer"
                          >
                            Verify session
                          </button>
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
                              <>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setMemberToManagePin(member);
                                    setManagePinInput(member.pin || "");
                                    setManagePinError(null);
                                  }}
                                  title={`View or reset PIN for ${member.name}`}
                                  aria-label={`Manage PIN for ${member.name}`}
                                  className="p-1.5 text-ink-dim hover:text-brand-deep hover:bg-brand-wash rounded-edge transition-colors cursor-pointer"
                                >
                                  <KeyRound className="w-4 h-4" />
                                </button>
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
                              </>
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
                  onClick={() => {
                    setActiveTab("custom");
                    setCreatedSummary(null);
                  }}
                  className="w-full py-2.5 px-3 rounded-panel border border-dashed border-line hover:border-brand-deep hover:bg-brand-wash/40 text-brand-deep font-bold text-meta flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>+ Add New User / Team Member</span>
                </button>
              </div>
            </div>
          ) : createdSummary ? (
            <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-panel space-y-4 animate-in fade-in">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-body font-bold text-emerald-950">Team Member Added Successfully!</h3>
                  <p className="text-spec text-emerald-800 mt-0.5">
                    <strong>{createdSummary.profile.name}</strong> has been created and synced to the cloud database.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-white border border-emerald-300 rounded-edge space-y-2 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-spec font-bold text-ink-dim uppercase tracking-wider">Assigned Login PIN</span>
                  <span className="text-[11px] text-emerald-700 font-semibold">Ready to share</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-2xl font-mono font-bold tracking-[0.25em] text-brand-deep bg-brand-wash/50 px-3 py-1.5 rounded border border-brand-edge">
                    {createdSummary.pin}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(createdSummary.pin, "created")}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-spec rounded-edge flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                  >
                    {copiedCreatedPin ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedCreatedPin ? "Copied!" : "Copy PIN"}</span>
                  </button>
                </div>
                <p className="text-[11px] text-ink-dim pt-1">
                  Share this PIN code with <strong>{createdSummary.profile.name}</strong> so they can log into their workspace. As an admin, you can also view or reset their PIN anytime from the Team Members list.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    loginAsUser(createdSummary.profile);
                    closeLoginModal();
                  }}
                  className="flex-1 py-2 px-3 bg-brand-deep hover:bg-brand text-white font-bold text-meta rounded-edge shadow-xs transition-colors cursor-pointer"
                >
                  Sign In As {createdSummary.profile.name}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCreatedSummary(null);
                    setActiveTab("preset");
                  }}
                  className="px-4 py-2 border border-line bg-white hover:bg-paper text-ink font-semibold text-meta rounded-edge transition-colors cursor-pointer"
                >
                  Done / Team List
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
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="login-custom-pin" className="u-eyebrow text-ink-dim block">
                      4-Digit Login PIN <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setCustomDraft((prev) => ({ ...prev, pin: generatePin() }))}
                      className="text-[11px] text-brand-deep hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Generate</span>
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      id="login-custom-pin"
                      type={showCustomPin ? "text" : "password"}
                      required
                      maxLength={6}
                      disabled={!currentUser.isAdmin}
                      value={customDraft.pin || ""}
                      onChange={(e) => setCustomDraft({ ...customDraft, pin: e.target.value.replace(/\D/g, "") })}
                      placeholder="e.g. 1234"
                      className="w-full text-body font-mono tracking-widest px-3 py-2 pr-10 rounded-edge border border-line bg-surface text-ink placeholder:text-ink-faint focus:outline-none focus:border-brand-deep transition-colors disabled:bg-slate-100 disabled:cursor-not-allowed"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCustomPin((p) => !p)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-dim hover:text-ink p-1 cursor-pointer"
                      title={showCustomPin ? "Hide PIN" : "Show PIN"}
                    >
                      {showCustomPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  id="login-custom-is-admin"
                  type="checkbox"
                  disabled={!currentUser.isAdmin}
                  checked={customDraft.isAdmin || false}
                  onChange={(e) => setCustomDraft({ ...customDraft, isAdmin: e.target.checked })}
                  className="rounded text-brand-deep focus:ring-brand-deep w-4 h-4 cursor-pointer"
                />
                <label htmlFor="login-custom-is-admin" className="text-spec font-medium text-ink cursor-pointer">
                  Grant Administrator Privileges (Can manage workspace settings & team members)
                </label>
              </div>

              <p className="text-spec text-ink-dim bg-paper border border-line rounded-edge p-2.5">
                The login PIN you set here will be required whenever this person logs in. You will see a confirmation with the PIN to copy right after saving.
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
                  <span>{currentUser.isAdmin ? "Save & Create Member" : "Admin Permission Required"}</span>
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
