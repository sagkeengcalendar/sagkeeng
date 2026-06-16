/* ============================================================================
   TWILIO CLIENT — thin wrapper with graceful demo mode
   ============================================================================
   If TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM_NUMBER are set in
   .env, we send real SMS. Otherwise we run in DEMO mode: messages are logged
   to the server console so the whole flow still works end-to-end.

   .env example:
     TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
     TWILIO_AUTH_TOKEN=your_auth_token_here
     TWILIO_FROM_NUMBER=+1204xxxxxxx
   ============================================================================ */

export interface TwilioConfig {
  accountSid?: string;
  authToken?: string;
  fromNumber?: string;
}

export function getTwilioConfig(): TwilioConfig & { isConfigured: boolean } {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;
  const isConfigured = !!(accountSid && authToken && fromNumber);
  return { accountSid, authToken, fromNumber, isConfigured };
}

export interface SendSmsResult {
  status: "sent" | "demo" | "failed";
  providerSid?: string;
  error?: string;
  body: string;
  to: string;
}

/**
 * Send an SMS via Twilio's REST API directly (no SDK needed — keeps deps light).
 * Returns a structured result so callers can record audit rows.
 */
export async function sendSms(to: string, body: string): Promise<SendSmsResult> {
  const cfg = getTwilioConfig();

  // Always normalize "to" to E.164
  const normalizedTo = to.startsWith("+") ? to : "+" + to.replace(/[^\d]/g, "");

  // DEMO MODE — no credentials. Log to console so the flow is visible.
  if (!cfg.isConfigured) {
    console.log("\n────────── SMS (DEMO MODE — set TWILIO_* env vars to send for real) ──────────");
    console.log("  To:   " + normalizedTo);
    console.log("  From: " + (cfg.fromNumber || "(not set)"));
    console.log("  Body:");
    body.split("\n").forEach((l) => console.log("    " + l));
    console.log("──────────────────────────────────────────────────────────────────────────────\n");
    return { status: "demo", body, to: normalizedTo };
  }

  // REAL SEND — direct REST call to Twilio's API
  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${cfg.accountSid}/Messages.json`;
    const auth = Buffer.from(`${cfg.accountSid}:${cfg.authToken}`).toString("base64");
    const params = new URLSearchParams();
    params.append("To", normalizedTo);
    params.append("From", cfg.fromNumber as string);
    params.append("Body", body);

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const data = await res.json();
    if (!res.ok) {
      return {
        status: "failed",
        error: data?.message || `Twilio error ${res.status}`,
        body,
        to: normalizedTo,
      };
    }
    return {
      status: "sent",
      providerSid: data.sid,
      body,
      to: normalizedTo,
    };
  } catch (err) {
    return {
      status: "failed",
      error: err instanceof Error ? err.message : String(err),
      body,
      to: normalizedTo,
    };
  }
}
