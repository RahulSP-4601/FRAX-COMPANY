import "server-only";
const WAITLIST_TABLE = "Waitlist" as const;

export interface NormalizedWaitlistEntry {
  id: string;
  companyName: string;
  email: string;
  phone: string | null;
  source: string | null;
  status: "PENDING" | "TRIAL_SENT" | "CONVERTED" | "DECLINED";
  trialToken: string | null;
  trialSentAt: string | null;
  createdAt: string | null;
}

function normalizeWaitlistEntry(entry: any): NormalizedWaitlistEntry {
  const rawStatus = entry.status || "PENDING";
  const normalizedStatus =
    rawStatus === "APPROVED"
      ? "TRIAL_SENT"
      : rawStatus === "REJECTED"
        ? "DECLINED"
        : rawStatus;

  return {
    id: entry.id,
    companyName:
      entry.companyName ||
      entry.company_name ||
      entry.company ||
      entry.name ||
      "Unknown Company",
    email: entry.email,
    phone: entry.phone || entry.phoneNumber || entry.phone_number || null,
    source: entry.source || entry.howDidYouHear || entry.how_did_you_hear || null,
    status: normalizedStatus,
    trialToken: entry.trialToken || entry.trial_token || null,
    trialSentAt: entry.trialSentAt || entry.trial_sent_at || null,
    createdAt: entry.createdAt || entry.created_at || null,
  };
}

export async function fetchWaitlistEntries(supabase: any) {
  const { data, error } = await supabase
    .from(WAITLIST_TABLE)
    .select("*");

  if (error) {
    console.error(`Waitlist fetch error from ${WAITLIST_TABLE}:`, error);
    return [];
  }

  const normalizedEntries = (data || []).map(normalizeWaitlistEntry);
  normalizedEntries.sort((a: NormalizedWaitlistEntry, b: NormalizedWaitlistEntry) => {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bTime - aTime;
  });

  return normalizedEntries;
}

export async function updateWaitlistByEmail(
  supabase: any,
  email: string,
  values: {
    status: string;
    trialToken?: string;
    trialSentAt?: string;
    invitedByEmployeeId?: string;
  }
) {
  const statusCandidates =
    values.status === "TRIAL_SENT"
      ? ["TRIAL_SENT", "APPROVED"]
      : values.status === "CONVERTED"
        ? ["CONVERTED", "APPROVED"]
        : values.status === "DECLINED"
          ? ["DECLINED", "REJECTED"]
          : [values.status];

  const updateAttempts = statusCandidates.flatMap((statusValue) => [
    {
      ...values,
      status: statusValue,
    },
    {
      status: statusValue,
      trialToken: values.trialToken,
      trialSentAt: values.trialSentAt,
    },
    {
      status: statusValue,
      trialSentAt: values.trialSentAt,
    },
    {
      status: statusValue,
    },
  ]);

  for (const attempt of updateAttempts) {
    const sanitizedAttempt = Object.fromEntries(
      Object.entries(attempt).filter(([, value]) => value !== undefined)
    );

    const { error } = await supabase
      .from(WAITLIST_TABLE)
      .update(sanitizedAttempt)
      .eq("email", email.toLowerCase());

    if (!error) {
      return true;
    }

    console.error(`Waitlist update by email failed on ${WAITLIST_TABLE}:`, error);
  }

  return false;
}

export async function updateWaitlistByTrialToken(
  supabase: any,
  trialToken: string,
  values: {
    status: string;
  }
) {
  const statusCandidates =
    values.status === "CONVERTED"
      ? ["CONVERTED", "APPROVED"]
      : values.status === "DECLINED"
        ? ["DECLINED", "REJECTED"]
        : [values.status];

  for (const statusValue of statusCandidates) {
    let { error } = await supabase
      .from(WAITLIST_TABLE)
      .update({ ...values, status: statusValue })
      .eq("trialToken", trialToken);

    if (!error) {
      return true;
    }

    console.error(`Waitlist update by token failed on ${WAITLIST_TABLE}:`, error);

    ({ error } = await supabase
      .from(WAITLIST_TABLE)
      .update({ status: statusValue })
      .eq("trialToken", trialToken));

    if (!error) {
      return true;
    }

    console.error(`Waitlist status-only update by token failed on ${WAITLIST_TABLE}:`, error);
  }

  return false;
}
