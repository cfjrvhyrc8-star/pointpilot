import { Webhook } from "npm:standardwebhooks@^1";
import { Resend } from "npm:resend@^6";

const resend = new Resend(Deno.env.get("RESEND_API_KEY") ?? "");
const hookSecret = (Deno.env.get("SEND_EMAIL_HOOK_SECRET") ?? "").replace("v1,whsec_", "");

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildMagicLink(supabaseUrl: string, tokenHash: string, type: string, redirectTo: string) {
  const url = new URL("/auth/v1/verify", supabaseUrl);
  url.searchParams.set("token", tokenHash);
  url.searchParams.set("type", type);
  url.searchParams.set("redirect_to", redirectTo);
  return url.toString();
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("not allowed", { status: 400 });
  }

  if (!hookSecret || !Deno.env.get("RESEND_API_KEY")) {
    return Response.json(
      { error: { http_code: 500, message: "Email hook secrets are not configured." } },
      { status: 500 },
    );
  }

  const payload = await req.text();
  const headers = Object.fromEntries(req.headers);

  try {
    const wh = new Webhook(hookSecret);
    const { user, email_data } = wh.verify(payload, headers) as {
      user: { email: string };
      email_data: {
        token: string;
        token_hash: string;
        redirect_to: string;
        email_action_type: string;
        site_url: string;
      };
    };

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? email_data.site_url;
    const magicLink = buildMagicLink(
      supabaseUrl,
      email_data.token_hash,
      email_data.email_action_type,
      email_data.redirect_to,
    );

    const safeLink = escapeHtml(magicLink);
    const safeToken = escapeHtml(email_data.token);

    const html = `<!doctype html>
<html><body style="margin:0;background:#f6f3ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#17132b">
  <div style="max-width:560px;margin:40px auto;padding:32px 24px;background:#fff;border-radius:24px">
    <div style="font-size:24px;font-weight:800;letter-spacing:-.5px">Point<span style="color:#7c3aed">Pilot</span></div>
    <p style="margin:28px 0 8px;font-size:14px;color:#6b647d">SECURE LOGIN</p>
    <h1 style="font-size:30px;line-height:1.15;margin:0 0 14px">Your PointPilot sign-in link</h1>
    <p style="font-size:16px;line-height:1.6;color:#514b61">Use the button below to securely open your rewards wallet. This link is for your PointPilot account only.</p>
    <p style="margin:28px 0"><a href="${safeLink}" style="display:inline-block;padding:14px 22px;border-radius:12px;background:#6d28d9;color:#fff;text-decoration:none;font-weight:700">Open PointPilot</a></p>
    <p style="font-size:13px;color:#777080;line-height:1.6">Or use this one-time code:</p>
    <div style="padding:14px 16px;background:#f5f3f7;border-radius:10px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:20px;letter-spacing:2px">${safeToken}</div>
    <p style="font-size:12px;color:#9993a5;line-height:1.6;margin-top:28px">If you didn't request this email, you can safely ignore it.</p>
  </div>
</body></html>`;

    const { error } = await resend.emails.send({
      from: "PointPilot <no-reply@pointpilot.in>",
      to: [user.email],
      subject: "Your PointPilot sign-in link",
      html,
      text: `Open PointPilot: ${magicLink}\\n\\nYour one-time code: ${email_data.token}\\n\\nIf you didn't request this email, you can safely ignore it.`,
    });

    if (error) throw error;

    return Response.json({});
  } catch (error) {
    const message = error instanceof Error ? error.message : "Email hook failed";
    console.error("send-email hook error:", error);
    return Response.json(
      { error: { http_code: 401, message } },
      { status: 401 },
    );
  }
});
