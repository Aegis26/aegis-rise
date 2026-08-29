import { HttpError } from "../utils/errors";

function requiredEnvironmentVariable(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new HttpError(500, `${name} is not configured.`);
  }
  return value;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function sendPasswordResetEmail(
  email: string,
  resetUrl: string,
): Promise<void> {
  const apiKey = requiredEnvironmentVariable("RESEND_API_KEY");
  const from = requiredEnvironmentVariable("RESEND_FROM_EMAIL");
  const safeResetUrl = escapeHtml(resetUrl);

  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "Reset your Aegis Rise password",
      text: [
        "We received a request to reset your Aegis Rise password.",
        "",
        `Reset your password: ${resetUrl}`,
        "",
        "This link expires in 1 hour and can only be used once.",
        "If you did not request this reset, you can ignore this email.",
      ].join("\n"),
      html: `
        <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;color:#172126">
          <h1 style="font-size:24px;margin:0 0 16px">Reset your password</h1>
          <p style="line-height:1.6">We received a request to reset your Aegis Rise password.</p>
          <p style="margin:28px 0">
            <a href="${safeResetUrl}" style="display:inline-block;background:#168cf0;color:#fff;text-decoration:none;padding:12px 20px;border-radius:6px;font-weight:600">Reset Password</a>
          </p>
          <p style="line-height:1.6">This link expires in 1 hour and can only be used once.</p>
          <p style="line-height:1.6;color:#66747b">If you did not request this reset, you can ignore this email.</p>
        </div>
      `,
    }),
  });

  if (!resendResponse.ok) {
    const requestId = resendResponse.headers.get("x-request-id");
    throw new Error(
      `Resend rejected password reset email with status ${resendResponse.status}${
        requestId ? ` (request ${requestId})` : ""
      }.`,
    );
  }
}