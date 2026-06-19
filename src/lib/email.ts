export interface EmailResult { status: "sent" | "demo" | "failed"; error?: string; to: string; subject: string; body: string; }
export interface SendEmailArgs { to: string; subject: string; body: string; from?: string; }
export async function sendEmail({ to, subject, body, from }: SendEmailArgs): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromAddress = from || process.env.EMAIL_FROM || "miina Calendar <onboarding@resend.dev>";
  if (!apiKey) { console.log("── EMAIL (DEMO) ── To:", to, "Subject:", subject); return { status: "demo", to, subject, body }; }
  try {
    const res = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: fromAddress, to: [to], subject, text: body }) });
    const data = await res.json();
    if (!res.ok) return { status: "failed", error: data?.message || `Error ${res.status}`, to, subject, body };
    return { status: "sent", to, subject, body };
  } catch (err) { return { status: "failed", error: err instanceof Error ? err.message : String(err), to, subject, body }; }
}
