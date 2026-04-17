interface SummaryRow {
  label: string;
  value: string;
}

interface SecondaryAction {
  label: string;
  url: string;
}

interface TransactionalEmailLayoutProps {
  preheader: string;
  eyebrow: string;
  title: string;
  intro: string;
  statusLabel: string;
  statusTone: 'primary' | 'success' | 'warning';
  summaryRows: SummaryRow[];
  ctaLabel: string;
  ctaUrl: string;
  secondaryActions?: SecondaryAction[];
  footerNote: string;
}

const brand = {
  pageBg: '#F5F7F5',
  cardBg: '#FFFFFF',
  border: '#E2E8E2',
  textPrimary: '#2C3E2C',
  textSecondary: '#6B7B6B',
  textMuted: '#9BA89B',
  primary: '#8B9D83',
  primaryLight: '#D4DED0',
  secondary: '#B8A8D9',
  success: '#7BA377',
  successBg: '#F0F7F0',
  warning: '#E89D88',
  warningBg: '#FCEEEA',
};

const toneMap: Record<
  TransactionalEmailLayoutProps['statusTone'],
  { bg: string; text: string; border: string }
> = {
  primary: {
    bg: brand.primaryLight,
    text: brand.textPrimary,
    border: brand.primary,
  },
  success: {
    bg: brand.successBg,
    text: brand.success,
    border: brand.success,
  },
  warning: {
    bg: brand.warningBg,
    text: brand.warning,
    border: brand.warning,
  },
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const renderSummaryRows = (summaryRows: SummaryRow[]): string =>
  summaryRows
    .map(
      ({ label, value }) => `
        <tr>
          <td style="padding: 10px 0; color: ${brand.textSecondary}; font-size: 13px; width: 34%; vertical-align: top;">
            ${escapeHtml(label)}
          </td>
          <td style="padding: 10px 0; color: ${brand.textPrimary}; font-size: 14px; font-weight: 600; vertical-align: top;">
            ${escapeHtml(value)}
          </td>
        </tr>
      `
    )
    .join('');

const renderSecondaryActions = (actions: SecondaryAction[] | undefined): string => {
  if (!actions?.length) {
    return '';
  }

  return `
    <div style="margin-top: 18px;">
      ${actions
        .map(
          ({ label, url }) => `
            <a
              href="${escapeHtml(url)}"
              style="display: inline-block; margin-right: 12px; margin-bottom: 10px; color: ${brand.secondary}; font-size: 13px; font-weight: 600; text-decoration: none;"
            >
              ${escapeHtml(label)}
            </a>
          `
        )
        .join('')}
    </div>
  `;
};

export const buildTransactionalEmailHtml = ({
  preheader,
  eyebrow,
  title,
  intro,
  statusLabel,
  statusTone,
  summaryRows,
  ctaLabel,
  ctaUrl,
  secondaryActions,
  footerNote,
}: TransactionalEmailLayoutProps): string => {
  const tone = toneMap[statusTone];

  return `
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${escapeHtml(title)}</title>
      </head>
      <body style="margin: 0; padding: 0; background: ${brand.pageBg}; font-family: Arial, Helvetica, sans-serif; color: ${brand.textPrimary};">
        <div style="display: none; max-height: 0; overflow: hidden; opacity: 0;">
          ${escapeHtml(preheader)}
        </div>

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: ${brand.pageBg}; padding: 24px 12px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 640px;">
                <tr>
                  <td style="padding-bottom: 14px; color: ${brand.textMuted}; font-size: 12px; letter-spacing: 0.8px; text-transform: uppercase;">
                    HERA
                  </td>
                </tr>
                <tr>
                  <td style="background: ${brand.cardBg}; border: 1px solid ${brand.border}; border-radius: 24px; padding: 28px;">
                    <div style="display: inline-block; padding: 6px 12px; border-radius: 999px; background: ${brand.primaryLight}; color: ${brand.primary}; font-size: 12px; font-weight: 700; letter-spacing: 0.3px;">
                      ${escapeHtml(eyebrow)}
                    </div>

                    <h1 style="margin: 18px 0 10px; font-size: 30px; line-height: 1.2; color: ${brand.textPrimary};">
                      ${escapeHtml(title)}
                    </h1>

                    <p style="margin: 0 0 18px; font-size: 15px; line-height: 1.7; color: ${brand.textSecondary};">
                      ${escapeHtml(intro)}
                    </p>

                    <div style="display: inline-block; margin-bottom: 22px; padding: 8px 14px; border-radius: 999px; background: ${tone.bg}; color: ${tone.text}; border: 1px solid ${tone.border}; font-size: 13px; font-weight: 700;">
                      ${escapeHtml(statusLabel)}
                    </div>

                    <div style="border: 1px solid ${brand.border}; border-radius: 18px; background: #FCFDFC; padding: 18px 20px;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                        ${renderSummaryRows(summaryRows)}
                      </table>
                    </div>

                    <div style="margin-top: 24px;">
                      <a
                        href="${escapeHtml(ctaUrl)}"
                        style="display: inline-block; background: ${brand.primary}; color: #FFFFFF; padding: 14px 20px; border-radius: 999px; font-size: 14px; font-weight: 700; text-decoration: none;"
                      >
                        ${escapeHtml(ctaLabel)}
                      </a>
                    </div>

                    ${renderSecondaryActions(secondaryActions)}

                    <div style="margin-top: 28px; padding-top: 18px; border-top: 1px solid ${brand.border};">
                      <p style="margin: 0; font-size: 13px; line-height: 1.7; color: ${brand.textMuted};">
                        ${escapeHtml(footerNote)}
                      </p>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
};

export const buildTransactionalEmailText = ({
  title,
  intro,
  statusLabel,
  summaryRows,
  ctaLabel,
  ctaUrl,
  secondaryActions,
  footerNote,
}: Omit<TransactionalEmailLayoutProps, 'preheader' | 'eyebrow' | 'statusTone'>): string => {
  const summary = summaryRows
    .map(({ label, value }) => `${label}: ${value}`)
    .join('\n');

  const secondary = secondaryActions?.length
    ? `\n\nAccesos adicionales:\n${secondaryActions
        .map(({ label, url }) => `- ${label}: ${url}`)
        .join('\n')}`
    : '';

  return `${title}\n\n${intro}\n\n${statusLabel}\n\n${summary}\n\n${ctaLabel}: ${ctaUrl}${secondary}\n\n${footerNote}`;
};
