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

/** SHA-256 of a string, hex encoded — used to spot the same photo on two accounts. */
export async function sha256(str) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}
