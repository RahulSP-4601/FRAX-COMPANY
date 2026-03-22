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
    // This endpoint intentionally bypasses Supabase RLS because employee auth in this
    // app is handled by our signed session cookie, not Supabase Auth, and the founder
    // dashboard must read Employee + TrialInvite records even when table policies are
    // not mapped to a Supabase user. Keep the explicit session role check above as the
    // authorization boundary unless the data model is expanded for multi-tenant scoping.

    // Query the full record to avoid hard-coding optional column names that may differ
    // across environments. The dashboard only maps the fields it actually needs.
    const { data: members, error: membersError } = await supabase
      .from("Employee")
      .select("*")
      .eq("role", "SALES");

    if (membersError) {
      console.error("Team fetch error:", membersError);
      return NextResponse.json({ members: [] });
    }

    // Get trial counts for each member
    const membersWithCount = await Promise.all(
      (members || []).map(async (member) => {
        const { count, error: countError } = await supabase
          .from("TrialInvite")
          .select("id", { count: "exact", head: true })
          .eq("employeeId", member.id);

        if (countError) {
          console.error(`Team trial count error for ${member.id}:`, countError);
        }

        return {
          id: member.id,
          name: member.name,
          email: member.email,
          isApproved: member.isApproved,
          createdAt: member.createdAt || member.created_at || null,
          trialsCount: count || 0,
        };
      })
    );

    membersWithCount.sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });

    return NextResponse.json({ members: membersWithCount });
  } catch (error) {
    console.error("Team fetch error:", error);
    return NextResponse.json({ members: [] });
  }
}
