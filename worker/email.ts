// Emails to shops and admins, sent through Resend (https://resend.com).
// Without RESEND_API_KEY the message is only logged (see `wrangler tail`).
import type { Env } from './env.ts';
import { escapeHtml } from '../sync/text.ts';

type Lang = 'el' | 'en';

interface Mail { to: string | string[]; subject: string; lines: string[]; button?: { label: string; url: string } }

function render(m: Mail): { html: string; text: string } {
  const p = m.lines.map((l) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:#3A3650">${escapeHtml(l)}</p>`).join('');
  const btn = m.button
    ? `<p style="margin:22px 0"><a href="${escapeHtml(m.button.url)}" style="display:inline-block;background:#C9361A;color:#fff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:12px;font-size:15px">${escapeHtml(m.button.label)}</a></p>`
    : '';
  const html = `<!doctype html><html><body style="margin:0;background:#FFF6EC;font-family:Arial,Helvetica,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:28px 20px"><div style="font-size:26px;font-weight:800;color:#1D1A2F;letter-spacing:-.5px;margin-bottom:18px">tag<span style="color:#EF4A23">o</span>ra</div>
<div style="background:#fff;border-radius:16px;padding:24px 22px">${p}${btn}</div>
<p style="font-size:12px;color:#5D5870;margin:16px 4px">Tagora · ${m.button ? escapeHtml(new URL(m.button.url).host) : ''}</p></div></body></html>`;
  const text = [...m.lines, ...(m.button ? ['', `${m.button.label}: ${m.button.url}`] : [])].join('\n\n');
  return { html, text };
}

export async function sendMail(env: Env, m: Mail): Promise<boolean> {
  const { html, text } = render(m);
  if (!env.RESEND_API_KEY || !env.MAIL_FROM) {
    console.log(`[email not sent: RESEND_API_KEY/MAIL_FROM missing] to=${String(m.to)} subject=${m.subject}\n${text}`);
    return false;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: env.MAIL_FROM, to: m.to, subject: m.subject, html, text }),
  });
  if (!res.ok) console.log(`[email failed] ${res.status} ${await res.text()}`);
  return res.ok;
}

const T = {
  login: {
    el: { subject: 'Σύνδεση στο Tagora', lines: ['Πάτησε το κουμπί για να μπεις στον λογαριασμό του καταστήματός σου. Ο σύνδεσμος ισχύει 30 λεπτά και μία φορά.', 'Αν δεν το ζήτησες εσύ, αγνόησε αυτό το μήνυμα.'], button: 'Σύνδεση' },
    en: { subject: 'Sign in to Tagora', lines: ['Use the button to sign in to your shop account. The link works once, for 30 minutes.', 'If you did not ask for this, you can ignore this email.'], button: 'Sign in' },
  },
  received: {
    el: { subject: 'Λάβαμε την αίτηση του καταστήματός σου', lines: ['Ευχαριστούμε! Λάβαμε την αίτηση για το «{shop}» και θα την ελέγξουμε σύντομα.', 'Μόλις εγκριθεί, τα προϊόντα σου θα εμφανιστούν στο Tagora και θα ενημερώνονται αυτόματα. Θα σου στείλουμε email.'], button: 'Δες την κατάσταση' },
    en: { subject: 'We received your shop application', lines: ['Thank you! We received the application for “{shop}” and will review it shortly.', 'Once approved, your products appear on Tagora and update automatically. We will email you.'], button: 'See the status' },
  },
  approved: {
    el: { subject: 'Το «{shop}» είναι πλέον στο Tagora', lines: ['Η αίτησή σου εγκρίθηκε. {count} προϊόντα είναι ήδη online και ενημερώνονται αυτόματα {every}.', 'Στον πίνακα του καταστήματος βλέπεις τον τελευταίο συγχρονισμό, τα προϊόντα που χρειάζονται διόρθωση και πόσους επισκέπτες σού στείλαμε.'], button: 'Άνοιξε τον πίνακα' },
    en: { subject: '“{shop}” is now on Tagora', lines: ['Your application was approved. {count} products are already live and update automatically {every}.', 'Your shop dashboard shows the last sync, products that need fixing and how many visitors we sent you.'], button: 'Open the dashboard' },
  },
  rejected: {
    el: { subject: 'Η αίτηση του «{shop}»', lines: ['Δυστυχώς δεν μπορούμε να εγκρίνουμε την αίτηση αυτή τη στιγμή.', 'Αιτία: {reason}', 'Μπορείς να απαντήσεις σε αυτό το email για οποιαδήποτε ερώτηση.'] },
    en: { subject: 'Your application for “{shop}”', lines: ['Unfortunately we cannot approve the application right now.', 'Reason: {reason}', 'You can reply to this email with any questions.'] },
  },
  paused: {
    el: { subject: 'Τα προϊόντα του «{shop}» αφαιρέθηκαν προσωρινά', lines: ['Αφαιρέσαμε προσωρινά τα προϊόντα του «{shop}» από το Tagora.', 'Αιτία: {reason}', 'Μόλις λυθεί, απάντησε σε αυτό το email και θα τα επαναφέρουμε. Μπορείς επίσης να απαντήσεις αν διαφωνείς με την απόφαση.'], button: 'Άνοιξε τον πίνακα' },
    en: { subject: 'Products of “{shop}” temporarily removed', lines: ['We have temporarily removed the products of “{shop}” from Tagora.', 'Reason: {reason}', 'Once it is fixed, reply to this email and we will bring them back. You can also reply if you disagree with the decision.'], button: 'Open the dashboard' },
  },
  resumed: {
    el: { subject: 'Το «{shop}» εμφανίζεται ξανά στο Tagora', lines: ['Τα προϊόντα του «{shop}» είναι ξανά online: {count} προϊόντα.', 'Ενημερώνονται αυτόματα {every}, όπως πριν.'], button: 'Άνοιξε τον πίνακα' },
    en: { subject: '“{shop}” is back on Tagora', lines: ['The products of “{shop}” are live again: {count} products.', 'They update automatically {every}, as before.'], button: 'Open the dashboard' },
  },
  syncFailed: {
    el: { subject: 'Πρόβλημα στον συγχρονισμό του «{shop}»', lines: ['Δεν μπορέσαμε να διαβάσουμε τα προϊόντα του καταστήματός σου: {message}', 'Τα προϊόντα που ήδη έχουμε μένουν online. Θα ξαναδοκιμάσουμε σε μία ώρα.'], button: 'Δες λεπτομέρειες' },
    en: { subject: 'Problem syncing “{shop}”', lines: ['We could not read your shop’s products: {message}', 'The products we already have stay live. We will try again in an hour.'], button: 'See details' },
  },
  adminAlert: {
    el: { subject: 'Tagora: {count} καταστήματα δεν συγχρονίζονται', lines: ['Ο τελευταίος συγχρονισμός απέτυχε για: {list}.', 'Τα προϊόντα τους που ήδη υπάρχουν μένουν online. Τα καταστήματα έχουν ήδη λάβει email. Αυτό το μήνυμα στέλνεται το πολύ μία φορά τη μέρα.'], button: 'Άνοιγμα διαχείρισης' },
    en: { subject: 'Tagora: {count} shops are not syncing', lines: ['The last sync failed for: {list}.', 'Their products already online stay online. The shops have been emailed. This message is sent at most once a day.'], button: 'Open admin' },
  },
  newShop: {
    el: { subject: 'Νέα αίτηση καταστήματος: {shop}', lines: ['Νέα αίτηση από «{shop}» ({website}).', 'Σύνδεση: {source}. Έλεγχος: {count} προϊόντα.'], button: 'Άνοιγμα διαχείρισης' },
    en: { subject: 'New shop application: {shop}', lines: ['New application from “{shop}” ({website}).', 'Source: {source}. Check: {count} products.'], button: 'Open admin' },
  },
} as const;

type Kind = keyof typeof T;

/** How often a shop's products update, for the emails: feeds on a timer, the plugin on every change. */
export function updateEvery(lang: Lang, plugin: boolean, hours: number): string {
  if (lang === 'en') return plugin ? 'a few minutes after each change in your shop' : `every ${hours} hours`;
  return plugin ? 'λίγα λεπτά μετά από κάθε αλλαγή στο κατάστημά σου' : `κάθε ${hours} ώρες`;
}

export function mailFor(kind: Kind, lang: Lang, to: string | string[], vars: Record<string, string | number>, url?: string): Mail {
  const t = T[kind][lang === 'en' ? 'en' : 'el'];
  const fill = (s: string) => s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ''));
  const button = 'button' in t && url ? { label: t.button, url } : undefined;
  return { to, subject: fill(t.subject), lines: t.lines.map(fill), button };
}
