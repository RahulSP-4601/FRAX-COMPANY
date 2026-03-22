"use client";

import { useRouter } from "next/navigation";

export default function PendingApprovalPage() {
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      const res = await fetch("/api/auth/signout", { method: "POST", credentials: "include" });
      if (!res.ok) {
        throw new Error("Failed to sign out");
      }

      router.push("/signin");
      router.refresh();
    } catch {
      console.error("Failed to sign out");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="card p-8 text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">⏳</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Account Pending Approval
          </h1>
          <p className="text-gray-600 mb-6">
            Your sales team account is waiting for approval from the founder.
            You'll receive an email once you're approved.
          </p>
          <button
            onClick={handleSignOut}
            className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
