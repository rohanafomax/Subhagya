// Automatic checks used by the profile form (to block) and the admin panel (to flag).

const PATTERNS = {
    // things that are always blocked in public profile text
    email: /[a-z0-9._%+-]+\s*(?:@|\(at\)|\[at\])\s*[a-z0-9-]+(?:\s*(?:\.|\(dot\)|\[dot\])\s*[a-z]{2,})+/i,
    link: /(?:https?:\/\/|www\.)\S+|\b[a-z0-9-]{2,}\.(?:com|lk|net|org|info|me|io|co|app|xyz|site)\b/i,
    numberWords: /(?:\b(?:zero|oh|one|two|three|four|five|six|seven|eight|nine)\b[\s,.\-]*){6,}/i
};
// messaging apps: flagged for the admin, not blocked (people may mention them innocently)
const APPS = /\b(?:whats\s?app|viber|imo|telegram|facebook|fb|instagram|insta|tiktok|snapchat|signal)\b/i;

/** Finds digit sequences that look like phone numbers (9+ digits, spaces/dashes allowed). */
function findPhone(text) {
    for (const m of String(text).matchAll(/\+?\d[\d\s\-().]{7,}\d/g)) {
        if (m[0].replace(/\D/g, '').length >= 9) return m[0].trim();
    }
    return null;
}

/**
 * Contact details hidden in text. `strict` results block submission;
 * `soft` results are only shown to the admin.
 */
export function contactInfoIn(text) {
    const s = String(text || '');
    const strict = [];
    const phone = findPhone(s);
    if (phone) strict.push({ kind: 'phone number', sample: phone });
    for (const [kind, re] of Object.entries(PATTERNS)) {
        const m = s.match(re);
        if (m) strict.push({ kind: kind === 'numberWords' ? 'number written in words' : kind, sample: m[0].trim() });
    }
    const app = s.match(APPS);
    const soft = app ? [{ kind: 'messaging app', sample: app[0] }] : [];
    return { strict, soft };
}

/** Public profile fields that are free text (and so need checking). */
export const PUBLIC_TEXT_FIELDS = [
    'firstName', 'children', 'caste', 'city', 'country', 'educationDetail', 'school', 'profession',
    'position', 'employer', 'fatherOcc', 'motherOcc', 'siblings', 'familyHome', 'about', 'prefProfession', 'prefNotes'
];

/** Last 9 digits of a phone number, so 077…, +9477… and 9477… compare equal. */
export function phoneKey(phone) {
    const d = String(phone || '').replace(/\D/g, '');
    return d.length >= 9 ? d.slice(-9) : '';
}

// ───────── fake-profile signals ─────────

// Throwaway email services often used for fake accounts.
const DISPOSABLE = new Set([
    'mailinator.com', 'guerrillamail.com', 'guerrillamail.info', 'sharklasers.com', '10minutemail.com', '10minutemail.net',
    'tempmail.com', 'temp-mail.org', 'temp-mail.io', 'tempmail.net', 'tempmailo.com', 'throwawaymail.com', 'yopmail.com',
    'yopmail.net', 'getnada.com', 'nada.email', 'trashmail.com', 'maildrop.cc', 'dispostable.com', 'fakeinbox.com',
    'mintemail.com', 'mohmal.com', 'emailondeck.com', 'spamgourmet.com', 'mailnesia.com', 'tempinbox.com', 'mytemp.email',
    'burnermail.io', 'inboxkitten.com', 'mail.tm', 'tmail.ws', 'tmpmail.org', 'tmpmail.net', 'linshiyouxiang.net', 'emailfake.com'
]);
export function isDisposableEmail(email) {
    const domain = String(email || '').toLowerCase().split('@')[1] || '';
    return DISPOSABLE.has(domain);
}

// Free/personal email providers — not accepted as proof of a workplace.
// Keep in step with freeDomain() in firestore.rules.
export const FREE_MAIL = [
    'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.co.uk', 'yahoo.co.in', 'ymail.com', 'rocketmail.com',
    'hotmail.com', 'hotmail.co.uk', 'outlook.com', 'live.com', 'msn.com', 'icloud.com', 'me.com', 'aol.com',
    'proton.me', 'protonmail.com', 'gmx.com', 'gmx.net', 'mail.com', 'zoho.com', 'yandex.com', 'rediffmail.com', 'sltnet.lk'
];
export function isFreeMail(email) {
    const domain = String(email || '').toLowerCase().trim().split('@')[1] || '';
    return FREE_MAIL.includes(domain) || isDisposableEmail(email);
}

/** Problems with a first name that suggest a fake or careless profile. */
export function nameProblems(name) {
    const n = String(name || '').trim();
    const out = [];
    if (!n) return out;
    if (/\d/.test(n)) out.push('name contains numbers');
    if (/[\u{1F300}-\u{1FAFF}☀-➿]/u.test(n)) out.push('name contains emoji');
    if (/(.)\1{2,}/i.test(n)) out.push('name has a letter repeated 3+ times');
    if (n.replace(/[^\p{L}]/gu, '').length < 2) out.push('name too short');
    if (/\b(test|fake|admin|unknown|abc|asdf|qwerty|xyz|sexy|hot|lover?|darling)\b/i.test(n)) out.push('name looks made-up');
    return out;
}

/** Details that don't fit together (common in invented profiles). */
export function consistencyProblems(p, age) {
    const out = [];
    if (age != null) {
        if (age < 22 && ['master', 'doctorate'].includes(p.education)) out.push(`age ${age} with ${p.education === 'doctorate' ? 'a doctorate' : "a master's degree"}`);
        if (age < 21 && ['divorced', 'widowed'].includes(p.marital)) out.push(`age ${age} and ${p.marital}`);
        if (age > 70) out.push(`age ${age} — check the date of birth`);
    }
    if (p.height && (p.height < 135 || p.height > 210)) out.push(`unusual height ${p.height} cm`);
    if (p.residence === 'abroad' && /^sri\s*lanka$/i.test(String(p.country || '').trim())) out.push('says “overseas” but country is Sri Lanka');
    return out;
}

/** Normalised text used to spot the same “About me” copied between accounts. */
export function normaliseText(s) {
    return String(s || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

/** SHA-256 of a string, hex encoded — used to spot the same photo on two accounts. */
export async function sha256(str) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}
