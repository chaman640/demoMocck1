import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api";
import TeacherBottomNav from "../../components/TeacherBottomNav";

const SkeletonBlock = ({ className = "" }) => (
  <div className={`bg-gray-800/70 rounded animate-pulse ${className}`} />
);

const PageSkeleton = () => (
  <div className="min-h-screen bg-[#0A0D14] text-white px-4 sm:px-6 py-8 pb-24">
    <div className="max-w-2xl mx-auto space-y-4">
      <SkeletonBlock className="w-52 h-7" />
      <SkeletonBlock className="w-full h-40 rounded-2xl" />
      <SkeletonBlock className="w-full h-28 rounded-2xl" />
    </div>
  </div>
);

const STATUS_STYLES = {
  active: "bg-green-500/15 text-green-400 border-green-500/30",
  pending: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  removed: "bg-red-500/15 text-red-400 border-red-500/30",
};

const TeacherSubTeachers = () => {
  const navigate = useNavigate();

  const [phase, setPhase] = useState("loading");
  const [role, setRole] = useState("main");
  const [coupons, setCoupons] = useState([]);
  const [subTeachers, setSubTeachers] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");

  // ── Invite form state ──
  const [invitePhone, setInvitePhone] = useState("");
  const [assignments, setAssignments] = useState([{ couponId: "", subjectsText: "" }]);
  const [inviteError, setInviteError] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);

  // ── Per sub-teacher manage-state ──
  const [expandedId, setExpandedId] = useState(null);
  const [assignForm, setAssignForm] = useState({ couponId: "", subjectsText: "" });
  const [assignError, setAssignError] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [revokingKey, setRevokingKey] = useState(null); // `${subTeacherId}-${couponId}-${subject}`
  const [removingId, setRemovingId] = useState(null);
  const [resendingId, setResendingId] = useState(null);
  const [resendLink, setResendLink] = useState({}); // { [subTeacherId]: link }

  const load = useCallback(async () => {
    setPhase("loading");
    try {
      const [couponsRes, subRes] = await Promise.all([
        api.get("/my-coupons"),
        api.get("/my-sub-teachers"),
      ]);

      if (couponsRes.data.role !== "main") {
        setPhase("forbidden");
        return;
      }

      setRole(couponsRes.data.role);
      setCoupons(couponsRes.data.data || []);
      setSubTeachers(subRes.data.data || []);
      setPhase("view");
    } catch (err) {
      if (err.response?.status === 401) {
        navigate("/TeacherLogin");
        return;
      }
      if (err.response?.status === 403) {
        setPhase("forbidden");
        return;
      }
      setErrorMsg(err.response?.data?.message || "Data load nahi ho paaya.");
      setPhase("error");
    }
  }, [navigate]);

  useEffect(() => { load(); }, [load]);

  // ── Invite form helpers ──
  const addAssignmentRow = () => {
    setAssignments((prev) => [...prev, { couponId: "", subjectsText: "" }]);
  };
  const removeAssignmentRow = (idx) => {
    setAssignments((prev) => prev.filter((_, i) => i !== idx));
  };
  const updateAssignmentRow = (idx, field, value) => {
    setAssignments((prev) => prev.map((a, i) => (i === idx ? { ...a, [field]: value } : a)));
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    setInviteError("");
    setInviteLink("");

    if (invitePhone.length !== 10) {
      setInviteError("Phone number 10 anko ka hona chahiye!");
      return;
    }

    // Sirf wahi assignments bhejo jinme coupon + subjects dono bhare hon
    const cleanAssignments = assignments
      .filter((a) => a.couponId && a.subjectsText.trim())
      .map((a) => ({
        couponId: a.couponId,
        subjects: a.subjectsText.split(",").map((s) => s.trim()).filter(Boolean),
      }));

    setInviting(true);
    try {
      const res = await api.post("/invite-sub-teacher", {
        phone: invitePhone,
        assignments: cleanAssignments,
      });
      const token = res.data.data.inviteToken;
      const link = `${window.location.origin}${window.location.pathname}#/AcceptInvite/${token}`;
      setInviteLink(link);
      setInvitePhone("");
      setAssignments([{ couponId: "", subjectsText: "" }]);
      await load();
    } catch (err) {
      setInviteError(err.response?.data?.message || "Invite nahi bhej paaye.");
    } finally {
      setInviting(false);
    }
  };

  const copyLink = (link, setCopiedFn) => {
    navigator.clipboard.writeText(link);
    setCopiedFn(true);
    setTimeout(() => setCopiedFn(false), 1500);
  };

  // ── Manage-access helpers ──
  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
    setAssignForm({ couponId: "", subjectsText: "" });
    setAssignError("");
  };

  const handleAssign = async (subTeacherId) => {
    setAssignError("");
    if (!assignForm.couponId || !assignForm.subjectsText.trim()) {
      setAssignError("Coupon aur kam se kam ek subject zaroori hai!");
      return;
    }
    const subjects = assignForm.subjectsText.split(",").map((s) => s.trim()).filter(Boolean);

    setAssigning(true);
    try {
      await api.post("/manage-coupon-access/assign", {
        subTeacherId,
        couponId: assignForm.couponId,
        subjects,
      });
      setAssignForm({ couponId: "", subjectsText: "" });
      await load();
    } catch (err) {
      setAssignError(err.response?.data?.message || "Access assign nahi ho paaya.");
    } finally {
      setAssigning(false);
    }
  };

  const handleRevoke = async (subTeacherId, couponId, subject) => {
    const key = `${subTeacherId}-${couponId}-${subject}`;
    setRevokingKey(key);
    try {
      await api.post("/manage-coupon-access/revoke", { subTeacherId, couponId, subject });
      await load();
    } catch (err) {
      alert(err.response?.data?.message || "Revoke nahi ho paaya.");
    } finally {
      setRevokingKey(null);
    }
  };

  const handleRemove = async (subTeacherId, name) => {
    if (!window.confirm(`${name} ko remove karein? Unka bana hua content safe rahega.`)) return;
    setRemovingId(subTeacherId);
    try {
      await api.post(`/remove-sub-teacher/${subTeacherId}`);
      await load();
    } catch (err) {
      alert(err.response?.data?.message || "Remove nahi ho paaya.");
    } finally {
      setRemovingId(null);
    }
  };

  const handleResend = async (phone, subTeacherId) => {
    setResendingId(subTeacherId);
    try {
      const res = await api.post("/invite-sub-teacher", { phone, assignments: [] });
      const token = res.data.data.inviteToken;
      const link = `${window.location.origin}${window.location.pathname}#/AcceptInvite/${token}`;
      setResendLink((prev) => ({ ...prev, [subTeacherId]: link }));
    } catch (err) {
      alert(err.response?.data?.message || "Resend nahi ho paaya.");
    } finally {
      setResendingId(null);
    }
  };

  if (phase === "loading") return <PageSkeleton />;

  if (phase === "forbidden") {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white flex items-center justify-center px-6 pb-24">
        <div className="max-w-md text-center space-y-4">
          <p className="text-gray-300">Sirf Main Teacher hi ye page access kar sakta hai.</p>
          <button
            onClick={() => navigate("/TeacherDashboard")}
            className="px-5 py-2 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-sm font-medium"
          >
            Dashboard Jaayein
          </button>
        </div>
        <TeacherBottomNav />
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white flex items-center justify-center px-6 pb-24">
        <div className="max-w-md text-center space-y-4">
          <p className="text-gray-300">{errorMsg}</p>
          <button onClick={load} className="px-5 py-2 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-sm font-medium">
            Dobara Try Karein
          </button>
        </div>
        <TeacherBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0D14] text-white px-4 sm:px-6 py-8 pb-24">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Team / Sub-Teachers</h1>
          <p className="text-gray-400 text-sm">Apni team invite karein aur unka subject-access manage karein</p>
        </div>

        {/* ── Invite Form ── */}
        <div className="bg-[#111827] border border-gray-800 rounded-2xl p-5">
          <h3 className="font-semibold text-sm mb-4">Naya Sub-Teacher Invite Karein</h3>

          {inviteError && (
            <div className="mb-4 p-3 bg-red-500/10 text-red-400 border border-red-500/25 rounded-xl text-sm text-center">
              {inviteError}
            </div>
          )}

          {inviteLink && (
            <div className="mb-4 p-3.5 bg-green-500/10 border border-green-500/25 rounded-xl">
              <p className="text-xs text-green-400 mb-2">Invite ready hai! Ye link copy karke bhejein:</p>
              <div className="flex items-center gap-2 bg-[#0A0D14] border border-gray-700 rounded-lg px-3 py-2">
                <span className="text-xs text-gray-300 truncate flex-1">{inviteLink}</span>
                <button
                  onClick={() => copyLink(inviteLink, setLinkCopied)}
                  className="text-[11px] px-2 py-1 rounded bg-[#7C3AED] hover:bg-[#6D28D9] flex-shrink-0"
                >
                  {linkCopied ? "Copied ✓" : "Copy"}
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleInvite} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide text-gray-400">
                Phone Number
              </label>
              <input
                type="text"
                value={invitePhone}
                onChange={(e) => setInvitePhone(e.target.value.replace(/[^0-9]/g, "").slice(0, 10))}
                placeholder="10 digit number"
                className="w-full px-4 py-2.5 text-sm bg-[#0A0D14] border border-gray-700 focus:border-[#7C3AED] rounded-xl outline-none transition-colors text-white placeholder-gray-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide text-gray-400">
                Coupon / Subject Assign Karein (optional, baad mein bhi kar sakte hain)
              </label>
              <div className="space-y-2">
                {assignments.map((a, idx) => (
                  <div key={idx} className="flex gap-2">
                    <select
                      value={a.couponId}
                      onChange={(e) => updateAssignmentRow(idx, "couponId", e.target.value)}
                      className="flex-1 px-3 py-2 text-xs bg-[#0A0D14] border border-gray-700 focus:border-[#7C3AED] rounded-lg outline-none text-white appearance-none cursor-pointer"
                    >
                      <option value="">Coupon chunein</option>
                      {coupons.map((c) => (
                        <option key={c._id} value={c._id}>{c.name}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={a.subjectsText}
                      onChange={(e) => updateAssignmentRow(idx, "subjectsText", e.target.value)}
                      placeholder="Hindi, Maths"
                      className="flex-1 px-3 py-2 text-xs bg-[#0A0D14] border border-gray-700 focus:border-[#7C3AED] rounded-lg outline-none text-white placeholder-gray-600"
                    />
                    {assignments.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeAssignmentRow(idx)}
                        className="text-red-400 text-sm px-2 flex-shrink-0"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addAssignmentRow}
                className="text-xs text-[#A78BFA] mt-2 hover:underline"
              >
                + Ek aur coupon/subject add karein
              </button>
            </div>

            <button
              type="submit"
              disabled={inviting}
              className="w-full py-3 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] font-semibold disabled:opacity-50"
            >
              {inviting ? "Invite bhej rahe hain..." : "Invite Link Banayein"}
            </button>
          </form>
        </div>

        {/* ── Sub-Teachers List ── */}
        <div>
          <h3 className="font-semibold text-sm mb-3 text-gray-300">
            Aapki Team ({subTeachers.length})
          </h3>

          {subTeachers.length === 0 ? (
            <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 text-center">
              <p className="text-sm text-gray-400">Abhi tak koi sub-teacher invite nahi kiya.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {subTeachers.map((t) => {
                const isExpanded = expandedId === t._id;
                return (
                  <div key={t._id} className="bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden">
                    <button
                      onClick={() => toggleExpand(t._id)}
                      className="w-full text-left p-4 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-sm truncate">
                            {t.status === "pending" ? "Pending Teacher" : t.name}
                          </p>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${STATUS_STYLES[t.status]}`}>
                            {t.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{t.phone}</p>
                      </div>
                      <span className="text-gray-500 flex-shrink-0">{isExpanded ? "▲" : "▼"}</span>
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-gray-800 pt-4 space-y-4">
                        {/* Current access */}
                        {t.coupons && t.coupons.length > 0 ? (
                          <div className="space-y-2">
                            <p className="text-[11px] text-gray-500 uppercase tracking-wide">Current Access</p>
                            {t.coupons.map((c) => (
                              <div key={c.couponId} className="bg-[#1F2937] rounded-lg p-3">
                                <p className="text-xs font-medium text-gray-200 mb-1.5">
                                  {c.couponName} <span className="text-gray-500">({c.exam})</span>
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                  {c.subjects.map((subj) => {
                                    const key = `${t._id}-${c.couponId}-${subj}`;
                                    return (
                                      <span
                                        key={subj}
                                        className="flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-full bg-[#7C3AED]/15 text-[#A78BFA]"
                                      >
                                        {subj}
                                        <button
                                          onClick={() => handleRevoke(t._id, c.couponId, subj)}
                                          disabled={revokingKey === key}
                                          className="text-red-400 hover:text-red-300"
                                        >
                                          {revokingKey === key ? "…" : "✕"}
                                        </button>
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-500">Abhi koi subject-access assign nahi hai.</p>
                        )}

                        {/* Assign new access — sirf active teacher ke liye useful */}
                        {t.status !== "removed" && (
                          <div className="bg-[#0A0D14] border border-gray-800 rounded-lg p-3">
                            <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-2">
                              Naya Access Assign Karein
                            </p>
                            {assignError && (
                              <p className="text-xs text-red-400 mb-2">{assignError}</p>
                            )}
                            <div className="flex flex-col sm:flex-row gap-2">
                              <select
                                value={assignForm.couponId}
                                onChange={(e) => setAssignForm((p) => ({ ...p, couponId: e.target.value }))}
                                className="flex-1 px-3 py-2 text-xs bg-[#111827] border border-gray-700 rounded-lg outline-none text-white appearance-none cursor-pointer"
                              >
                                <option value="">Coupon chunein</option>
                                {coupons.map((c) => (
                                  <option key={c._id} value={c._id}>{c.name}</option>
                                ))}
                              </select>
                              <input
                                type="text"
                                value={assignForm.subjectsText}
                                onChange={(e) => setAssignForm((p) => ({ ...p, subjectsText: e.target.value }))}
                                placeholder="Hindi, Maths"
                                className="flex-1 px-3 py-2 text-xs bg-[#111827] border border-gray-700 rounded-lg outline-none text-white placeholder-gray-600"
                              />
                              <button
                                onClick={() => handleAssign(t._id)}
                                disabled={assigning}
                                className="px-4 py-2 text-xs rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-50 flex-shrink-0"
                              >
                                {assigning ? "..." : "Assign"}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Resend invite — sirf pending ke liye */}
                        {t.status === "pending" && (
                          <div>
                            {resendLink[t._id] ? (
                              <div className="flex items-center gap-2 bg-[#0A0D14] border border-gray-700 rounded-lg px-3 py-2">
                                <span className="text-xs text-gray-300 truncate flex-1">{resendLink[t._id]}</span>
                                <button
                                  onClick={() => navigator.clipboard.writeText(resendLink[t._id])}
                                  className="text-[11px] px-2 py-1 rounded bg-[#7C3AED] hover:bg-[#6D28D9] flex-shrink-0"
                                >
                                  Copy
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleResend(t.phone, t._id)}
                                disabled={resendingId === t._id}
                                className="text-xs px-3 py-2 rounded-lg border border-gray-700 text-gray-300 hover:border-gray-500 disabled:opacity-50"
                              >
                                {resendingId === t._id ? "Bhej rahe hain..." : "Invite Link Dobara Bhejein"}
                              </button>
                            )}
                          </div>
                        )}

                        {/* Remove */}
                        {t.status !== "removed" && (
                          <button
                            onClick={() => handleRemove(t._id, t.name)}
                            disabled={removingId === t._id}
                            className="w-full py-2 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs font-medium disabled:opacity-50"
                          >
                            {removingId === t._id ? "Remove ho raha hai..." : "Sub-Teacher Remove Karein"}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <TeacherBottomNav />
    </div>
  );
};

export default TeacherSubTeachers;