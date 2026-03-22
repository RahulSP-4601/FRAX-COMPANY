import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createAdminClient } from "@/utils/supabase/admin";

export async function GET() {
  try {
    const session = await getSession();

    if (!session || (session.role !== "FOUNDER" && session.role !== "ADMIN")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const supabase = createAdminClient();

    // Avoid depending on a specific PostgREST relation name in production.
    const { data: trials, error } = await supabase
      .from("TrialInvite")
      .select("*");

    if (error) {
      console.error("Trials fetch error:", error);
      return NextResponse.json({ trials: [] });
    }

    const employeeIds = Array.from(
      new Set((trials || []).map((trial) => trial.employeeId).filter(Boolean))
    );

    let employeeMap = new Map<string, { name: string; email: string }>();

    if (employeeIds.length > 0) {
      const { data: employees, error: employeeError } = await supabase
        .from("Employee")
        .select("id, name, email")
        .in("id", employeeIds);

      if (employeeError) {
        console.error("Trials employee lookup error:", employeeError);
      } else {
        employeeMap = new Map(
          (employees || []).map((employee) => [
            employee.id,
            { name: employee.name, email: employee.email },
          ])
        );
      }
    }

    const normalizedTrials = (trials || []).map((trial) => ({
      id: trial.id,
      email: trial.email,
      name: trial.name || null,
      status: trial.status,
      createdAt: trial.createdAt || trial.created_at || null,
      expiresAt: trial.expiresAt || trial.expires_at || null,
      claimedAt: trial.claimedAt || trial.claimed_at || null,
      employee: employeeMap.get(trial.employeeId) || null,
    }));

    normalizedTrials.sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });

    return NextResponse.json({ trials: normalizedTrials });
  } catch (error) {
    console.error("Trials fetch error:", error);
    return NextResponse.json({ trials: [] });
  }
}
