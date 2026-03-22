import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createAdminClient } from "@/utils/supabase/admin";

export async function GET() {
  try {
    const session = await getSession();

    if (!session || (session.role !== "SALES" && session.role !== "SALES_MEMBER")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const supabase = createAdminClient();

    // Query the full record to avoid hard-coding column names that may differ
    // across environments.
    const { data: trials, error } = await supabase
      .from("TrialInvite")
      .select("*")
      .eq("employeeId", session.employeeId);

    if (error) {
      console.error("Sales trials fetch error:", error);
      return NextResponse.json({ trials: [] });
    }

    const normalizedTrials = (trials || []).map((trial) => ({
      id: trial.id,
      email: trial.email,
      name: trial.name || null,
      status: trial.status,
      createdAt: trial.createdAt || trial.created_at || null,
      expiresAt: trial.expiresAt || trial.expires_at || null,
      claimedAt: trial.claimedAt || trial.claimed_at || null,
    }));

    normalizedTrials.sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });

    return NextResponse.json({ trials: normalizedTrials });
  } catch (error) {
    console.error("Sales trials fetch error:", error);
    return NextResponse.json({ trials: [] });
  }
}
