import { Resend } from "npm:resend";

const resendApiKey = Deno.env.get("RESEND_API_KEY");
console.log("RESEND_API_KEY present:", !!resendApiKey);
const resend = new Resend(resendApiKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Helper: generate a gradient CSS string from company colors ──
function gradient(primary: string, secondary: string): string {
  return `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)`;
}

// ── Helper: build the common outer wrapper + header + footer ──
function buildEmailShell(opts: {
  headerTitle: string;
  headerSubtitle?: string;
  bodyHtml: string;
  footerText: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl?: string;
  companyName: string;
}) {
  const {
    headerTitle,
    headerSubtitle,
    bodyHtml,
    footerText,
    primaryColor,
    secondaryColor,
    logoUrl,
    companyName,
  } = opts;

  const grad = gradient(primaryColor, secondaryColor);

  const logoBlock = logoUrl
    ? `<img src="${logoUrl}" alt="${companyName}" style="max-height:48px;max-width:180px;margin-bottom:16px;display:block;" />`
    : '';

  const subtitleBlock = headerSubtitle
    ? `<p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:15px;">${headerSubtitle}</p>`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.07);">
          <!-- Header -->
          <tr>
            <td style="background:${grad};padding:40px 40px 30px;">
              ${logoBlock}
              <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:800;">${headerTitle}</h1>
              ${subtitleBlock}
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px 40px;">
              ${bodyHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;background-color:#f9fafb;border-top:1px solid #e5e7eb;">
              <p style="color:#9ca3af;font-size:12px;margin:0;text-align:center;">
                ${footerText}
              </p>
              <p style="color:#d1d5db;font-size:11px;margin:8px 0 0;text-align:center;">
                Enviado por ${companyName}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Helper: CTA button ──
function ctaButton(label: string, href: string, primaryColor: string, secondaryColor: string): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
  <tr>
    <td align="center">
      <a href="${href}" style="display:inline-block;padding:14px 32px;background:${gradient(primaryColor, secondaryColor)};color:#ffffff;text-decoration:none;border-radius:12px;font-weight:700;font-size:15px;">
        ${label}
      </a>
    </td>
  </tr>
</table>`;
}

// ── Helper: fallback link ──
function fallbackLink(href: string, primaryColor: string): string {
  return `<p style="color:#9ca3af;font-size:12px;line-height:1.5;margin:24px 0 0;text-align:center;">
  O copia y pega este enlace en tu navegador:<br>
  <a href="${href}" style="color:${primaryColor};word-break:break-all;">${href}</a>
</p>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("Received body:", JSON.stringify(body));

    const {
      email,
      companyName,
      senderName,
      inviteLink,
      role,
      companyDomain,
      isPasswordRecovery,
      // ── Branding fields ──
      logoUrl,
      primaryColor,
      secondaryColor,
    } = body;

    if (!email) {
      console.error("Missing email field");
      return new Response(JSON.stringify({ error: "Missing email" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Resolve colors — fall back to Blukastor brand defaults
    const pc = primaryColor || '#6366f1';
    const sc = secondaryColor || '#8b5cf6';
    const logo = logoUrl || '';
    const name = companyName || 'Blukastor';

    const fromEmail = `${name} <notificaciones@autoflowai.io>`;

    let subject: string;
    let htmlContent: string;

    if (isPasswordRecovery) {
      // ────── Password Recovery Email ──────
      subject = `Restablece tu contraseña — ${name}`;

      const bodyHtml = `
        <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px;">Hola,</p>
        <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px;">
          Hemos recibido una solicitud para restablecer tu contraseña en <strong>${name}</strong>.
          Haz clic en el siguiente botón para continuar:
        </p>
        ${ctaButton('Restablecer Contraseña', inviteLink, pc, sc)}
        ${fallbackLink(inviteLink, pc)}
        <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:24px 0 0;">Este enlace expira en 24 horas. Si no solicitaste restablecer tu contraseña, puedes ignorar este mensaje.</p>
      `;

      htmlContent = buildEmailShell({
        headerTitle: 'Restablece tu contraseña',
        headerSubtitle: 'Hemos recibido una solicitud para restablecer tu contraseña',
        bodyHtml,
        footerText: 'Si no solicitaste esta acción, puedes ignorar este mensaje.',
        primaryColor: pc,
        secondaryColor: sc,
        logoUrl: logo,
        companyName: name,
      });
    } else {
      // ────── Company Invite Email ──────
      const roleLabel = role === 'admin' ? 'Administrador' : 'Usuario';
      const accessDescription = role === 'admin'
        ? 'Tendrás acceso al panel de administración corporativo y al portal de la empresa.'
        : 'Tendrás acceso al portal de la empresa.';

      subject = `Has sido invitado a ${name}`;

      const bodyHtml = `
        <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px;">Hola,</p>
        <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px;">
          <strong>${senderName || 'Un administrador'}</strong> te ha invitado a unirte a <strong>${name}</strong> como <strong>${roleLabel}</strong>.
        </p>
        <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 24px;">
          ${accessDescription}
        </p>
        ${ctaButton('Aceptar Invitación', inviteLink, pc, sc)}
        ${fallbackLink(inviteLink, pc)}
      `;

      htmlContent = buildEmailShell({
        headerTitle: 'Has sido invitado',
        headerSubtitle: `a unirte a <strong>${name}</strong>`,
        bodyHtml,
        footerText: 'Si no esperabas esta invitación, puedes ignorar este mensaje.',
        primaryColor: pc,
        secondaryColor: sc,
        logoUrl: logo,
        companyName: name,
      });
    }

    console.log("Sending email to:", email, "from:", fromEmail, "subject:", subject);

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [email],
      subject,
      html: htmlContent,
    });

    if (error) {
      console.error("Resend error:", JSON.stringify(error));
      return new Response(JSON.stringify({ error }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    console.log("Email sent successfully:", JSON.stringify(data));
    return new Response(JSON.stringify({ data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Unexpected error:", error.message, error.stack);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
