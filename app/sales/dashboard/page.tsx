"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface TrialInvite {
  id: string;
  email: string;
  name: string | null;
  status: string;
  createdAt: string | null;
  expiresAt: string | null;
  claimedAt: string | null;
}

const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return "—";

  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-US");
};

export default function SalesDashboardPage() {
  const router = useRouter();
  const [trials, setTrials] = useState<TrialInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", name: "" });
  const [sending, setSending] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const fetchTrials = async () => {
    try {
      const res = await fetch("/api/sales/trials", { credentials: "include" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setTrials(data.trials || []);
    } catch {
      setError("Failed to load trials");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrials();
  }, []);

  const handleSendTrial = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError("");
    setSuccessMessage("");

    try {
      const res = await fetch("/api/sales/send-trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inviteForm),
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to send trial");
        setSending(false);
        return;
      }

      setSuccessMessage(`Trial link sent to ${inviteForm.email}!`);
      setInviteForm({ email: "", name: "" });
      setShowInviteForm(false);
      await fetchTrials();
    } catch {
      setError("Network error");
    } finally {
      setSending(false);
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

  const pendingTrials = trials.filter(t => t.status === "PENDING");
  const claimedTrials = trials.filter(t => t.status === "CLAIMED");
  const expiredTrials = trials.filter(t => t.status === "EXPIRED");

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Sales Dashboard</h1>
            <p className="text-sm text-gray-500">FRAX Trial Management</p>
          </div>
          <button
            onClick={handleSignOut}
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {successMessage && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-600">{successMessage}</p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <p className="text-sm text-gray-500">Pending Trials</p>
            <p className="text-3xl font-bold text-yellow-600 mt-2">{pendingTrials.length}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <p className="text-sm text-gray-500">Claimed Trials</p>
            <p className="text-3xl font-bold text-green-600 mt-2">{claimedTrials.length}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <p className="text-sm text-gray-500">Total Sent</p>
            <p className="text-3xl font-bold text-blue-600 mt-2">{trials.length}</p>
          </div>
        </div>

        {/* Send Trial Button */}
        <div className="flex justify-end">
          <button
            onClick={() => setShowInviteForm(!showInviteForm)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            {showInviteForm ? "Cancel" : "+ Send Trial Invite"}
          </button>
        </div>

        {/* Invite Form */}
        {showInviteForm && (
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Send Trial Invite</h2>
            <form onSubmit={handleSendTrial} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client Email *
                </label>
                <input
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="client@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client Name
                </label>
                <input
                  type="text"
                  value={inviteForm.name}
                  onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="John Doe"
                />
              </div>
              <button
                type="submit"
                disabled={sending}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? "Sending..." : "Send Trial Invite"}
              </button>
            </form>
          </div>
        )}

        {/* Trial Invites Table */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
          <div className="p-5 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              My Trial Invites ({trials.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500">
                  <th className="text-left px-5 py-3 font-medium">Name</th>
                  <th className="text-left px-5 py-3 font-medium">Email</th>
                  <th className="text-left px-5 py-3 font-medium">Status</th>
                  <th className="text-left px-5 py-3 font-medium">Sent</th>
                  <th className="text-left px-5 py-3 font-medium">Expires</th>
                  <th className="text-left px-5 py-3 font-medium">Claimed</th>
                </tr>
              </thead>
              <tbody>
                {trials.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-gray-400">
                      No trial invites sent yet
                    </td>
                  </tr>
                ) : (
                  trials.map((trial) => (
                    <tr key={trial.id} className="border-b border-gray-100">
                      <td className="px-5 py-3 text-gray-900">{trial.name || "—"}</td>
                      <td className="px-5 py-3 text-gray-600">{trial.email}</td>
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
                      <td className="px-5 py-3 text-gray-500">{formatDate(trial.expiresAt)}</td>
                      <td className="px-5 py-3 text-gray-500">
                        {trial.claimedAt ? formatDate(trial.claimedAt) : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
