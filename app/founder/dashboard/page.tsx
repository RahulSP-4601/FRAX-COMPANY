"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface SalesMember {
  id: string;
  name: string;
  email: string;
  isApproved: boolean;
  createdAt: string | null;
  trialsCount: number;
}

interface WaitlistEntry {
  id: string;
  companyName: string;
  email: string;
  phone: string | null;
  source: string | null;
  status: "PENDING" | "TRIAL_SENT" | "CONVERTED" | "DECLINED";
  statusLabel: string;
  trialDaysLeft: number | null;
  trialSentAt: string | null;
  createdAt: string;
}

interface TrialInvite {
  id: string;
  email: string;
  name: string | null;
  status: string;
  createdAt: string | null;
  expiresAt: string | null;
  claimedAt: string | null;
  employee: { name: string; email: string } | null;
}

type Tab = "team" | "waitlist" | "trials";

const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return "—";

  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-US");
};

export default function FounderDashboardPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("team");
  const [salesTeam, setSalesTeam] = useState<SalesMember[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [trials, setTrials] = useState<TrialInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Add sales member form
  const [showAddMemberForm, setShowAddMemberForm] = useState(false);
  const [memberForm, setMemberForm] = useState({ name: "", email: "" });
  const [addingMember, setAddingMember] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError("");

    try {
      const [teamRes, waitlistRes, trialsRes] = await Promise.all([
        fetch("/api/founder/team", { credentials: "include" }),
        fetch("/api/founder/waitlist", { credentials: "include" }),
        fetch("/api/founder/trials", { credentials: "include" }),
      ]);

      const [teamData, waitlistData, trialsData] = await Promise.all([
        teamRes.ok ? teamRes.json() : null,
        waitlistRes.ok ? waitlistRes.json() : null,
        trialsRes.ok ? trialsRes.json() : null,
      ]);

      setSalesTeam(teamData?.members || []);
      setWaitlist(waitlistData?.entries || []);
      setTrials(trialsData?.trials || []);

      const failedSections = [
        !teamRes.ok ? "sales team" : null,
        !waitlistRes.ok ? "waitlist" : null,
        !trialsRes.ok ? "trials" : null,
      ].filter(Boolean);

      if (failedSections.length > 0) {
        setError(`Some dashboard sections could not be loaded: ${failedSections.join(", ")}`);
      }
    } catch {
      setSalesTeam([]);
      setWaitlist([]);
      setTrials([]);
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingMember(true);
    setError("");
    setSuccessMessage("");

    try {
      const res = await fetch("/api/founder/team/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(memberForm),
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to add member");
        setAddingMember(false);
        return;
      }

      setSuccessMessage(
        data.resent
          ? `Activation email resent to ${memberForm.email}.`
          : `Sales member invite sent to ${memberForm.email}.`
      );
      setMemberForm({ name: "", email: "" });
      setShowAddMemberForm(false);
      await fetchData();
    } catch {
      setError("Network error");
    } finally {
      setAddingMember(false);
    }
  };

  const handleRejectMember = async (id: string) => {
    if (!confirm("Are you sure you want to reject this member? This will delete their account.")) {
      return;
    }

    setError("");
    try {
      const res = await fetch(`/api/founder/team/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to reject member");
        return;
      }

      setSuccessMessage("Member rejected and removed!");
      await fetchData();
    } catch {
      setError("Network error");
    }
  };

  const handleSendTrial = async (email: string, name: string) => {
    setSending(email);
    setError("");
    setSuccessMessage("");
    try {
      const res = await fetch("/api/founder/send-trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name }),
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to send trial");
        setSending(null);
        return;
      }

      setSuccessMessage(`Trial link sent to ${email}!`);
      await fetchData();
    } catch {
      setError("Network error");
    } finally {
      setSending(null);
    }
  };

  const handleSignOut = async () => {
    try {
      const res = await fetch("/api/auth/signout", { method: "POST", credentials: "include" });
      if (!res.ok) {
        throw new Error("Failed to sign out");
      }

      router.push("/signin");
      router.refresh();
    } catch {
      setError("Failed to sign out");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const pendingMembers = salesTeam.filter(m => !m.isApproved);
  const approvedMembers = salesTeam.filter(m => m.isApproved);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Founder Dashboard</h1>
            <p className="text-sm text-gray-500">FRAX Company Portal</p>
          </div>
          <button
            onClick={handleSignOut}
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex justify-between items-center">
            <p className="text-sm text-red-600">{error}</p>
            <button onClick={() => setError("")} className="text-red-400 hover:text-red-600">&times;</button>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex justify-between items-center">
            <p className="text-sm text-green-600">{successMessage}</p>
            <button onClick={() => setSuccessMessage("")} className="text-green-400 hover:text-green-600">&times;</button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex gap-1 bg-gray-100 border border-gray-200 rounded-lg p-1">
            {(["team", "waitlist", "trials"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-5 py-2 rounded-md text-sm font-medium transition-colors ${
                  tab === t
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {t === "team" ? "Sales Team" : t === "waitlist" ? "Waitlist" : "All Trials"}
              </button>
            ))}
          </div>

          {tab === "team" && (
            <button
              onClick={() => setShowAddMemberForm(!showAddMemberForm)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {showAddMemberForm ? "Cancel" : "+ Add Sales Member"}
            </button>
          )}
        </div>

        {/* Add Member Form */}
        {tab === "team" && showAddMemberForm && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Sales Team Member</h3>
            <p className="text-sm text-gray-500 mb-4">
              The sales member will receive an activation link by email and set their own password.
            </p>
            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={memberForm.name}
                  onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={memberForm.email}
                  onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="john@example.com"
                />
              </div>
              <button
                type="submit"
                disabled={addingMember}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {addingMember ? "Sending Invite..." : "Send Activation Invite"}
              </button>
            </form>
          </div>
        )}

        {/* SALES TEAM TAB */}
        {tab === "team" && (
          <div className="space-y-6">
            {/* Pending Members */}
            {pendingMembers.length > 0 && (
              <div className="bg-white border border-yellow-200 rounded-xl shadow-sm">
                <div className="p-5 border-b border-yellow-100">
                  <h2 className="text-lg font-semibold text-yellow-700">
                    Pending Activation ({pendingMembers.length})
                  </h2>
                </div>
                <div className="divide-y divide-gray-100">
                  {pendingMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-5">
                      <div>
                        <p className="font-medium text-gray-900">{member.name}</p>
                        <p className="text-sm text-gray-500">{member.email}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          Invite sent {formatDate(member.createdAt)}
                        </p>
                        <p className="text-xs text-yellow-700 mt-1">
                          Waiting for the sales member to open the email invite and set a password.
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRejectMember(member.id)}
                          className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-sm rounded-lg transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Approved Members */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
              <div className="p-5 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  Active Sales Team ({approvedMembers.length})
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-500">
                      <th className="text-left px-5 py-3 font-medium">Name</th>
                      <th className="text-left px-5 py-3 font-medium">Email</th>
                      <th className="text-left px-5 py-3 font-medium">Trials Sent</th>
                      <th className="text-left px-5 py-3 font-medium">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {approvedMembers.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-5 py-12 text-center text-gray-400">
                          No approved sales members yet.
                        </td>
                      </tr>
                    ) : (
                      approvedMembers.map((member) => (
                        <tr key={member.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-5 py-3 font-medium text-gray-900">{member.name}</td>
                          <td className="px-5 py-3 text-gray-600">{member.email}</td>
                          <td className="px-5 py-3 text-blue-600 font-medium">{member.trialsCount}</td>
                          <td className="px-5 py-3 text-gray-500">{formatDate(member.createdAt)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* WAITLIST TAB */}
        {tab === "waitlist" && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
            <div className="p-5 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Waitlist ({waitlist.length})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500">
                    <th className="text-left px-5 py-3 font-medium">Company</th>
                    <th className="text-left px-5 py-3 font-medium">Email</th>
                    <th className="text-left px-5 py-3 font-medium">Status</th>
                    <th className="text-left px-5 py-3 font-medium">Date</th>
                    <th className="text-right px-5 py-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {waitlist.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-12 text-center text-gray-400">
                        No waitlist entries yet
                      </td>
                    </tr>
                  ) : (
                    waitlist.map((entry) => (
                      <tr key={entry.id} className="border-b border-gray-100">
                        <td className="px-5 py-3 text-gray-900">{entry.companyName}</td>
                        <td className="px-5 py-3 text-gray-600">{entry.email}</td>
                        <td className="px-5 py-3">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              entry.status === "TRIAL_SENT"
                                ? "bg-blue-100 text-blue-700"
                                : entry.status === "CONVERTED"
                                  ? "bg-green-100 text-green-700"
                                  : entry.status === "DECLINED"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-yellow-100 text-yellow-700"
                            }`}
                          >
                            {entry.statusLabel}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-gray-500">{formatDate(entry.createdAt)}</td>
                        <td className="px-5 py-3 text-right">
                          <button
                            onClick={() => handleSendTrial(entry.email, entry.companyName)}
                            disabled={entry.status !== "PENDING" || sending === entry.email}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {sending === entry.email ? "Sending..." : "Send Trial"}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ALL TRIALS TAB */}
        {tab === "trials" && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
            <div className="p-5 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                All Trial Invites ({trials.length})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500">
                    <th className="text-left px-5 py-3 font-medium">Name</th>
                    <th className="text-left px-5 py-3 font-medium">Email</th>
                    <th className="text-left px-5 py-3 font-medium">Sent By</th>
                    <th className="text-left px-5 py-3 font-medium">Status</th>
                    <th className="text-left px-5 py-3 font-medium">Sent Date</th>
                  </tr>
                </thead>
                <tbody>
                  {trials.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-12 text-center text-gray-400">
                        No trial invites sent yet
                      </td>
                    </tr>
                  ) : (
                    trials.map((trial) => (
                      <tr key={trial.id} className="border-b border-gray-100">
                        <td className="px-5 py-3 text-gray-900">{trial.name || "—"}</td>
                        <td className="px-5 py-3 text-gray-600">{trial.email}</td>
                        <td className="px-5 py-3 text-gray-600">{trial.employee?.name || "—"}</td>
                        <td className="px-5 py-3">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              trial.status === "CLAIMED"
                                ? "bg-green-100 text-green-700"
                                : trial.status === "EXPIRED"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-yellow-100 text-yellow-700"
                            }`}
                          >
                            {trial.status}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-gray-500">{formatDate(trial.createdAt)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
