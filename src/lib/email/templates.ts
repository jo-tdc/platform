const LOGO_URL =
  'https://zfxhhfpdsyglvnjivlsh.supabase.co/storage/v1/object/public/Images/logo_white.png'
const ZELIA_PHOTO_URL =
  'https://zfxhhfpdsyglvnjivlsh.supabase.co/storage/v1/object/public/Images/zelia.jpg'

function buildEmail(p: {
  title: string
  bodyLines: string[]
  ctaText: string
  ctaUrl: string
  postCtaLines?: string[]
}): string {
  const bodyHtml = p.bodyLines
    .map((line) => `<p style="font-family:Arial,sans-serif;font-size:15px;color:#374151;line-height:1.7;margin:0 0 12px;">${line}</p>`)
    .join('')

  const postCtaHtml = (p.postCtaLines ?? [])
    .map((line) => `<p style="font-family:Arial,sans-serif;font-size:15px;color:#374151;line-height:1.7;margin:0 0 4px;">${line}</p>`)
    .join('')

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<body style="margin:0;padding:0;background-color:#f5f0e6;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f5f0e6">
  <tr>
    <td align="center" style="padding:40px 16px;">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr>
          <td bgcolor="#ffffff" style="padding:24px 32px;border-radius:16px 16px 0 0;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td><img src="${LOGO_URL}" height="72" alt="All-round Design Hub" style="display:block;height:72px;" /></td>
                <td align="right" style="font-family:Arial,sans-serif;font-size:13px;color:#9ca3af;white-space:nowrap;">All-round Design Hub</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Divider -->
        <tr>
          <td bgcolor="#ffffff" style="padding:0 32px;">
            <div style="height:1px;background-color:#f3f4f6;"></div>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td bgcolor="#ffffff" style="padding:32px 32px 40px;">
            <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:700;color:#111827;margin:0 0 20px;line-height:1.3;">${p.title}</h1>
            ${bodyHtml}
            <p style="font-family:Arial,sans-serif;font-size:15px;color:#374151;line-height:1.7;margin:0 0 28px;">&nbsp;</p>
            <!-- CTA -->
            <table cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td bgcolor="#111827" style="border-radius:8px;">
                  <a href="${p.ctaUrl}" style="display:inline-block;padding:14px 28px;font-family:Arial,sans-serif;font-size:15px;font-weight:600;text-decoration:none;color:#ffffff;-webkit-text-fill-color:#ffffff;">
                    <span style="color:#ffffff;-webkit-text-fill-color:#ffffff;">${p.ctaText}</span>
                  </a>
                </td>
              </tr>
            </table>
            <p style="font-family:Arial,sans-serif;font-size:12px;color:#9ca3af;margin:20px 0 0;">Ce lien est à usage unique et expire dans 24h.</p>
            ${postCtaHtml ? `<p style="font-family:Arial,sans-serif;font-size:15px;color:#374151;line-height:1.7;margin:28px 0 0;">&nbsp;</p>${postCtaHtml}` : ''}
          </td>
        </tr>

        <!-- Signature -->
        <tr>
          <td bgcolor="#ffffff" style="padding:0 32px 32px;">
            <p style="font-family:Arial,sans-serif;font-size:14px;color:#374151;margin:0 0 16px;">À bientôt,<br /><strong>Zélia</strong></p>
            <table cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
              <tr>
                <td style="padding:16px 20px;">
                  <table cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="padding-right:16px;vertical-align:top;">
                        <img src="${ZELIA_PHOTO_URL}" width="56" height="56" alt="Zélia" style="display:block;width:56px;height:56px;border-radius:50%;object-fit:cover;" />
                      </td>
                      <td style="vertical-align:middle;">
                        <p style="font-family:Arial,sans-serif;font-size:14px;font-weight:700;color:#111827;margin:0 0 2px;">Zélia</p>
                        <p style="font-family:Arial,sans-serif;font-size:13px;color:#6b7280;margin:0 0 6px;">Fondatrice — The Design Crew</p>
                        <p style="font-family:Arial,sans-serif;font-size:12px;color:#9ca3af;margin:0;">zelia@thedesigncrew.co</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td bgcolor="#ffffff" style="padding:20px 32px 28px;border-top:1px solid #e5e7eb;border-radius:0 0 16px 16px;">
            <p style="font-family:Arial,sans-serif;font-size:12px;color:#9ca3af;margin:0;text-align:center;">
              <a href="https://thedesigncrew.co" style="color:#9ca3af;text-decoration:none;">Site web</a>
              &nbsp;&middot;&nbsp;
              <a href="https://linkedin.com/company/thedesigncrew" style="color:#9ca3af;text-decoration:none;">LinkedIn</a>
              &nbsp;&middot;&nbsp;
              <a href="https://instagram.com/join_thedesigncrew" style="color:#9ca3af;text-decoration:none;">Instagram</a>
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`
}

export function emailFigmaBasics(magicLink: string): { subject: string; html: string } {
  return {
    subject: 'Ton accès à Figma Basics',
    html: buildEmail({
      title: 'Ton accès à Figma Basics',
      bodyLines: [
        'Bonjour,',
        "Tu as désormais accès à l'ensemble des contenus <strong>Figma Basics</strong> sur All-round Design Hub.",
        'Clique sur le bouton ci-dessous pour te connecter directement à la plateforme.',
      ],
      ctaText: 'Accéder à Figma Basics',
      ctaUrl: magicLink,
    }),
  }
}

export function emailFirstConnection(magicLink: string): { subject: string; html: string } {
  return {
    subject: 'Bienvenue sur All-round Design Hub',
    html: buildEmail({
      title: 'Bienvenue sur la plateforme',
      bodyLines: [
        'Bonjour,',
        'Ton compte a bien été créé sur <strong>All-round Design Hub</strong>.',
        'Clique sur le bouton ci-dessous pour accéder à ta formation.',
      ],
      ctaText: 'Accéder à la plateforme',
      ctaUrl: magicLink,
    }),
  }
}

export function emailReturningUser(magicLink: string): { subject: string; html: string } {
  return {
    subject: 'Accéder à la plateforme',
    html: buildEmail({
      title: 'Accéder à la plateforme',
      bodyLines: [
        'Bonjour,',
        "Tu as demandé à pouvoir te connecter à la plateforme d'apprentissage The Design Crew. Tu peux y accéder en cliquant sur le bouton ci-dessous.",
      ],
      ctaText: 'Accéder',
      ctaUrl: magicLink,
      postCtaLines: [
        "N'hésite pas à me contacter si tu as des questions,",
        'Zélia',
      ],
    }),
  }
}
