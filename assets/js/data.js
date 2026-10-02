// Option lists used in forms, filters and profile display.
// `v` is what gets stored in the database; `en` / `si` are labels.

const opt = (v, en, si) => ({ v, en, si: si || en });

export const GENDERS = [
    opt('female', 'Bride (Female)', 'මනාලිය (ස්ත්‍රී)'),
    opt('male', 'Groom (Male)', 'මනාලයා (පුරුෂ)')
];

export const CREATED_FOR = [
    opt('self', 'Myself', 'මා වෙනුවෙන්'),
    opt('son', 'My son', 'මගේ පුතා'),
    opt('daughter', 'My daughter', 'මගේ දියණිය'),
    opt('brother', 'My brother', 'මගේ සහෝදරයා'),
    opt('sister', 'My sister', 'මගේ සහෝදරිය'),
    opt('relative', 'A relative / friend', 'ඥාතියෙක් / මිතුරෙක්')
];

export const DISTRICTS = [
    'Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale', 'Nuwara Eliya', 'Galle', 'Matara',
    'Hambantota', 'Jaffna', 'Kilinochchi', 'Mannar', 'Vavuniya', 'Mullaitivu', 'Batticaloa',
    'Ampara', 'Trincomalee', 'Kurunegala', 'Puttalam', 'Anuradhapura', 'Polonnaruwa',
    'Badulla', 'Monaragala', 'Ratnapura', 'Kegalle'
].map(d => opt(d, d)).concat([opt('Overseas', 'Overseas', 'විදෙස්')]);

export const RELIGIONS = [
    opt('Buddhist', 'Buddhist', 'බෞද්ධ'),
    opt('Hindu', 'Hindu', 'හින්දු'),
    opt('Catholic', 'Christian – Catholic', 'කතෝලික'),
    opt('Christian', 'Christian – Other', 'ක්‍රිස්තියානි'),
    opt('Islam', 'Islam', 'ඉස්ලාම්'),
    opt('Other', 'Other', 'වෙනත්')
];

export const ETHNICITIES = [
    opt('Sinhala', 'Sinhala', 'සිංහල'),
    opt('Tamil', 'Tamil', 'දෙමළ'),
    opt('Muslim', 'Muslim / Moor', 'මුස්ලිම්'),
    opt('Burgher', 'Burgher', 'බර්ගර්'),
    opt('Other', 'Other', 'වෙනත්')
];

export const MARITAL = [
    opt('never', 'Never married', 'අවිවාහක'),
    opt('divorced', 'Divorced', 'දික්කසාද'),
    opt('widowed', 'Widowed', 'වැන්දඹු'),
    opt('separated', 'Separated (divorce pending)', 'වෙන්ව සිටින')
];

export const EDUCATION = [
    opt('ol', 'G.C.E. O/L', 'අ.පො.ස. සා/පෙළ'),
    opt('al', 'G.C.E. A/L', 'අ.පො.ස. උ/පෙළ'),
    opt('diploma', 'Diploma / NVQ', 'ඩිප්ලෝමා'),
    opt('bachelor', "Bachelor's degree", 'උපාධිය'),
    opt('master', "Master's degree", 'ශාස්ත්‍රපති'),
    opt('doctorate', 'Doctorate (PhD)', 'ආචාර්ය'),
    opt('professional', 'Professional qualification', 'වෘත්තීය සුදුසුකම්')
];

// ───────── Occupation, seniority and income ─────────
// `tier` only organises the default "Recommended" search order (1 = shown first). It is a
// provisional grouping for search results, not a judgement of anyone's worth — change the
// numbers here at any time. Members can instead sort by their own preferences (Best match).
// `group` is the broad area used for partner preferences ("Preferred occupation area").
const occ = (v, en, si, tier, group) => ({ ...opt(v, en, si), tier, group });
export const OCCUPATIONS = [
    // tier 1
    occ('specialist', 'Specialist doctor / surgeon', 'විශේෂඥ වෛද්‍ය / ශල්‍ය වෛද්‍ය', 1, 'medical'),
    occ('doctor', 'Medical doctor', 'වෛද්‍ය', 1, 'medical'),
    occ('engineer', 'Engineer', 'ඉංජිනේරු', 1, 'tech'),
    occ('it', 'IT professional / software engineer', 'IT වෘත්තිකයෙක් / මෘදුකාංග ඉංජිනේරු', 1, 'tech'),
    occ('slas', 'Senior government administrative officer (SLAS etc.)', 'ජ්‍යෙෂ්ඨ රාජ්‍ය පරිපාලන නිලධාරී (SLAS ආදී)', 1, 'govt'),
    occ('academic', 'University professor / lecturer', 'මහාචාර්ය / කථිකාචාර්ය', 1, 'education'),
    occ('lawyer', 'Lawyer / judge', 'නීතිඥ / විනිසුරු', 1, 'lawfin'),
    occ('chartered', 'Chartered accountant / finance professional', 'වරලත් ගණකාධිකාරී / මූල්‍ය වෘත්තිකයෙක්', 1, 'lawfin'),
    occ('seniormgr', 'Senior manager / executive', 'ජ්‍යෙෂ්ඨ කළමනාකරු / විධායක', 1, 'corporate'),
    occ('pilot', 'Pilot / aviation professional', 'ගුවන් නියමු / ගුවන් සේවා වෘත්තිකයෙක්', 1, 'tech'),
    // tier 2
    occ('architect', 'Architect / quantity surveyor', 'ගෘහ නිර්මාණ ශිල්පී / ප්‍රමාණ සමීක්ෂක', 2, 'tech'),
    occ('bankmgr', 'Bank manager / banking officer', 'බැංකු කළමනාකරු / බැංකු නිලධාරී', 2, 'lawfin'),
    occ('principal', 'School principal / senior teacher', 'විදුහල්පති / ජ්‍යෙෂ්ඨ ගුරු', 2, 'education'),
    occ('teacher', 'Teacher', 'ගුරු', 2, 'education'),
    occ('nurse', 'Nurse / healthcare professional', 'හෙද / සෞඛ්‍ය වෘත්තිකයෙක්', 2, 'medical'),
    occ('pharmacist', 'Pharmacist', 'ඖෂධවේදී', 2, 'medical'),
    occ('officer', 'Armed forces commissioned officer', 'හමුදා කොමිෂන් නිලධාරී', 2, 'govt'),
    occ('police', 'Police officer', 'පොලිස් නිලධාරී', 2, 'govt'),
    occ('accountant', 'Accountant / auditor', 'ගණකාධිකාරී / විගණක', 2, 'lawfin'),
    occ('scientist', 'Scientist / researcher', 'විද්‍යාඥ / පර්යේෂක', 2, 'tech'),
    occ('projectmgr', 'Project / construction manager', 'ව්‍යාපෘති / ඉදිකිරීම් කළමනාකරු', 2, 'corporate'),
    occ('govexec', 'Government executive officer', 'රජයේ විධායක නිලධාරී', 2, 'govt'),
    occ('marine', 'Marine / ship officer, air traffic controller', 'නාවික / නැව් නිලධාරී, ගුවන් ගමනාගමන පාලක', 2, 'tech'),
    occ('skilledabroad', 'Skilled overseas worker', 'පුහුණු විදෙස් සේවකයෙක්', 2, 'skilled'),
    // tier 3 (business owners move to tier 2 once their registration is verified)
    occ('business', 'Business owner / entrepreneur', 'ව්‍යාපාරිකයෙක් / ව්‍යවසායකයෙක්', 3, 'business'),
    occ('technical', 'Technical officer / supervisor', 'තාක්ෂණ නිලධාරී / අධීක්ෂක', 3, 'tech'),
    occ('insurance', 'Insurance / financial services', 'රක්ෂණ / මූල්‍ය සේවා', 3, 'lawfin'),
    occ('officeexec', 'Administrative / office executive', 'පරිපාලන / කාර්යාල විධායක', 3, 'corporate'),
    occ('trades', 'Skilled tradesperson / technician', 'කාර්මික ශිල්පී / තාක්ෂණ ශිල්පී', 3, 'skilled'),
    occ('hospitality', 'Hospitality / tourism', 'ආගන්තුක සත්කාර / සංචාරක', 3, 'skilled'),
    occ('sales', 'Sales / marketing', 'විකුණුම් / අලෙවිකරණ', 3, 'corporate'),
    occ('clerical', 'Clerical / office staff', 'ලිපිකරු / කාර්යාල කාර්ය මණ්ඩලය', 3, 'corporate'),
    occ('otheremp', 'Other employee', 'වෙනත් සේවකයෙක්', 3, 'other'),
    // tier 4 (self-employed move to tier 2 once their registration is verified)
    occ('driver', 'Driver / transport', 'රියදුරු / ප්‍රවාහන', 4, 'skilled'),
    occ('factory', 'Factory / production', 'කර්මාන්තශාලා / නිෂ්පාදන', 4, 'skilled'),
    occ('farmer', 'Agriculture / farming', 'කෘෂිකර්ම / ගොවිතැන', 4, 'other'),
    occ('self', 'Freelancer / self-employed', 'නිදහස් / ස්වයං රැකියා', 4, 'business'),
    occ('domestic', 'Domestic / caregiving work', 'ගෘහ සේවා / රැකබලා ගැනීම', 4, 'skilled'),
    // tier 5 and 6
    occ('student', 'Student / trainee', 'සිසු / පුහුණුවන්නා', 5, 'other'),
    occ('notworking', 'Not working', 'රැකියාවක් නැත', 6, 'other')
];

export const OCC_GROUPS = [
    opt('medical', 'Medical & healthcare', 'වෛද්‍ය සහ සෞඛ්‍ය'),
    opt('tech', 'Engineering, IT, science & aviation', 'ඉංජිනේරු, IT, විද්‍යා සහ ගුවන්'),
    opt('lawfin', 'Law, accounting, finance & banking', 'නීති, ගිණුම්, මූල්‍ය සහ බැංකු'),
    opt('education', 'Education', 'අධ්‍යාපන'),
    opt('govt', 'Government, armed forces & police', 'රජය, හමුදා සහ පොලිස්'),
    opt('corporate', 'Corporate & management', 'ආයතනික සහ කළමනාකරණ'),
    opt('business', 'Business & self-employed', 'ව්‍යාපාර සහ ස්වයං රැකියා'),
    opt('skilled', 'Skilled work & services', 'පුහුණු රැකියා සහ සේවා'),
    opt('other', 'Other', 'වෙනත්')
];

export const SENIORITY = [
    opt('entry', 'Entry level / junior', 'ආරම්භක / කනිෂ්ඨ'),
    opt('mid', 'Mid level', 'මධ්‍ය මට්ටම'),
    opt('senior', 'Senior', 'ජ්‍යෙෂ්ඨ'),
    opt('head', 'Head / director / owner', 'ප්‍රධානී / අධ්‍යක්ෂ / හිමිකරු')
];

// Monthly income in LKR (overseas members convert roughly). 'na' = prefer not to say.
export const INCOME = [
    opt('na', 'Prefer not to say', 'නොකියමි'),
    opt('u50', 'Below LKR 50,000', 'රු. 50,000 ට අඩු'),
    opt('50', 'LKR 50,000 – 100,000', 'රු. 50,000 – 100,000'),
    opt('100', 'LKR 100,000 – 200,000', 'රු. 100,000 – 200,000'),
    opt('200', 'LKR 200,000 – 350,000', 'රු. 200,000 – 350,000'),
    opt('350', 'LKR 350,000 – 500,000', 'රු. 350,000 – 500,000'),
    opt('500', 'LKR 500,000 – 1 million', 'රු. 500,000 – මිලියන 1'),
    opt('1m', 'Over LKR 1 million', 'රු. මිලියන 1 ට වැඩි')
];
/** Position of a range for "at least" comparisons; -1 when unknown or not given. */
export const incomeIndex = v => (v && v !== 'na' ? INCOME.findIndex(i => i.v === v) : -1);
export const seniorityIndex = v => SENIORITY.findIndex(s => s.v === v);

// Older profiles used a simpler "Employment type"; map those to tiers until they are edited.
const LEGACY_TIER = { professional: 1, teacher: 2, nurse: 2, forces: 2, banking: 2, executive: 2, government: 2,
    private: 3, overseas: 2, business: 3, self: 4, student: 5, notworking: 6 };

export const occupationOf = p => OCCUPATIONS.find(o => o.v === p?.occupation) || null;
export const isBusiness = p => ['business', 'self'].includes(p?.occupation || p?.employment);
export const isNotWorking = p => (p?.occupation || p?.employment) === 'notworking';

/** Search tier for the "Recommended" order (1 = first). Verified business/self-employed move up to tier 2. */
export function tierOf(p) {
    const o = occupationOf(p);
    let tier = o ? o.tier : (LEGACY_TIER[p?.employment] ?? 2);
    if (isBusiness(p) && p?.jobVerified) tier = Math.min(tier, 2);
    return tier;
}

/** Occupation to display, falling back to the older employment type. */
export function occupationLabel(p, lang = 'en') {
    const o = occupationOf(p);
    if (o) return lang === 'si' ? o.si : o.en;
    return employmentShort(p?.employment, lang);
}

// Older "Employment type" values (kept so existing profiles still display correctly).
export const EMPLOYMENT = [
    // professionals — all listed first
    { ...opt('professional', 'Doctor, engineer, accountant, lawyer, architect, IT…', 'වෛද්‍ය, ඉංජිනේරු, ගණකාධිකාරී, නීතිඥ, ගෘහ නිර්මාණ ශිල්පී, IT…'), rank: 0 },
    { ...opt('teacher', 'Teacher / lecturer', 'ගුරු / කථිකාචාර්ය'), rank: 0 },
    { ...opt('nurse', 'Nurse / healthcare professional', 'හෙද / සෞඛ්‍ය වෘත්තිකයෙක්'), rank: 0 },
    { ...opt('forces', 'Armed forces / police officer', 'ත්‍රිවිධ හමුදා / පොලිස් නිලධාරී'), rank: 0 },
    { ...opt('banking', 'Banking / finance', 'බැංකු / මූල්‍ය'), rank: 0 },
    { ...opt('executive', 'Executive / manager', 'විධායක / කළමනාකරු'), rank: 0 },
    { ...opt('government', 'Government officer (other)', 'රජයේ නිලධාරී (වෙනත්)'), rank: 0 },
    { ...opt('private', 'Private sector employee (other)', 'පෞද්ගලික අංශයේ සේවකයෙක් (වෙනත්)'), rank: 0 },
    { ...opt('overseas', 'Overseas employee (other)', 'විදෙස් රැකියා (වෙනත්)'), rank: 0 },
    { ...opt('business', 'Own business', 'ස්වයං ව්‍යාපාර'), rank: 1 },
    { ...opt('self', 'Self-employed', 'ස්වයං රැකියා'), rank: 1 },
    { ...opt('student', 'Student', 'සිසුවෙක්'), rank: 0 },
    { ...opt('notworking', 'Not working', 'රැකියාවක් නැත'), rank: 2 }     // always last
];
/** Short label for cards and profiles, e.g. "Professional", "Teacher / lecturer". */
export function employmentShort(v, lang = 'en') {
    if (v === 'professional') return lang === 'si' ? 'වෘත්තිකයෙක්' : 'Professional';
    const o = EMPLOYMENT.find(e => e.v === v);
    return o ? (lang === 'si' ? o.si : o.en).replace(/\s*\((other|වෙනත්)\)$/, '') : '';
}

// Professional bodies with public registers, used for job verification by registration number.
// The admin checks the number on the body's own website.
export const JOB_BODIES = [
    { v: 'slmc', en: 'Sri Lanka Medical Council (doctors)', url: 'https://slmc.gov.lk' },
    { v: 'ecsl', en: 'Engineering Council Sri Lanka', url: 'https://ecsl.lk' },
    { v: 'iesl', en: 'Institution of Engineers Sri Lanka', url: 'https://iesl.lk' },
    { v: 'basl', en: 'Attorney-at-Law (Supreme Court / BASL)', url: 'https://basl.lk' },
    { v: 'casl', en: 'CA Sri Lanka (chartered accountants)', url: 'https://www.casrilanka.com' },
    { v: 'cima', en: 'CIMA', url: 'https://www.cimaglobal.com' },
    { v: 'acca', en: 'ACCA', url: 'https://www.accaglobal.com' },
    { v: 'nursing', en: 'Sri Lanka Nursing Council (nurses)', url: '' },
    { v: 'slia', en: 'Sri Lanka Institute of Architects', url: '' },
    // overseas registers
    { v: 'gmc', en: 'UK – General Medical Council (doctors)', url: 'https://www.gmc-uk.org' },
    { v: 'nmc', en: 'UK – Nursing & Midwifery Council (nurses)', url: 'https://www.nmc.org.uk' },
    { v: 'engc', en: 'UK – Engineering Council', url: 'https://www.engc.org.uk' },
    { v: 'ahpra', en: 'Australia – AHPRA (doctors, nurses, health)', url: 'https://www.ahpra.gov.au' },
    { v: 'ea', en: 'Australia – Engineers Australia', url: 'https://www.engineersaustralia.org.au' },
    { v: 'cpaau', en: 'Australia – CPA Australia', url: 'https://www.cpaaustralia.com.au' },
    { v: 'mcc', en: 'Canada – Medical Council of Canada', url: 'https://mcc.ca' },
    { v: 'overseas', en: 'Other overseas professional body', url: '' },
    { v: 'other', en: 'Other professional body', url: '' }
];

// ───────── Area matching ─────────
// Approximate location of each district capital and its province, so search can
// tell that Gampaha is next to Colombo, not "a different district".
export const DISTRICT_GEO = {
    'Colombo': [6.93, 79.85, 'Western'], 'Gampaha': [7.09, 79.99, 'Western'], 'Kalutara': [6.58, 79.96, 'Western'],
    'Kandy': [7.29, 80.63, 'Central'], 'Matale': [7.47, 80.62, 'Central'], 'Nuwara Eliya': [6.97, 80.78, 'Central'],
    'Galle': [6.05, 80.22, 'Southern'], 'Matara': [5.95, 80.55, 'Southern'], 'Hambantota': [6.12, 81.12, 'Southern'],
    'Jaffna': [9.66, 80.02, 'Northern'], 'Kilinochchi': [9.39, 80.40, 'Northern'], 'Mannar': [8.98, 79.90, 'Northern'],
    'Vavuniya': [8.75, 80.50, 'Northern'], 'Mullaitivu': [9.27, 80.81, 'Northern'],
    'Batticaloa': [7.71, 81.69, 'Eastern'], 'Ampara': [7.30, 81.67, 'Eastern'], 'Trincomalee': [8.59, 81.21, 'Eastern'],
    'Kurunegala': [7.49, 80.36, 'North Western'], 'Puttalam': [8.04, 79.84, 'North Western'],
    'Anuradhapura': [8.31, 80.40, 'North Central'], 'Polonnaruwa': [7.94, 81.00, 'North Central'],
    'Badulla': [6.99, 81.06, 'Uva'], 'Monaragala': [6.87, 81.35, 'Uva'],
    'Ratnapura': [6.68, 80.40, 'Sabaragamuwa'], 'Kegalle': [7.25, 80.35, 'Sabaragamuwa']
};

/** Straight-line distance in km between two district capitals (0 for the same district, null if unknown). */
export function districtKm(a, b) {
    const A = DISTRICT_GEO[a], B = DISTRICT_GEO[b];
    if (!A || !B) return null;
    if (a === b) return 0;
    const rad = x => (x * Math.PI) / 180;
    const dLat = rad(B[0] - A[0]), dLon = rad(B[1] - A[1]);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(A[0])) * Math.cos(rad(B[0])) * Math.sin(dLon / 2) ** 2;
    return Math.round(6371 * 2 * Math.asin(Math.sqrt(h)));
}

/** The Sri Lankan districts a profile is connected to: family home, and where they live/work now. */
export function areasOf(p) {
    const list = [p?.district];
    if ((p?.residence || 'lk') === 'lk' && p?.liveDistrict) list.push(p.liveDistrict);
    return [...new Set(list.filter(d => DISTRICT_GEO[d]))];
}

/** Closest distance in km between any of two profiles' areas (null if unknown). */
export function profilesKm(a, b) {
    let best = null;
    for (const x of areasOf(a)) for (const y of areasOf(b)) {
        const d = districtKm(x, y);
        if (d != null && (best == null || d < best)) best = d;
    }
    return best;
}

export const sameProvince = (a, b) => !!(DISTRICT_GEO[a] && DISTRICT_GEO[b] && DISTRICT_GEO[a][2] === DISTRICT_GEO[b][2]);

// How far from the preferred area is acceptable.
export const PREF_DISTANCE = [
    opt('same', 'Same district only', 'එම දිස්ත්‍රික්කය පමණි'),
    opt('25', 'Within about 25 km', 'කි.මී. 25 ක් පමණ ඇතුළත'),
    opt('50', 'Within about 50 km', 'කි.මී. 50 ක් පමණ ඇතුළත'),
    opt('100', 'Within about 100 km', 'කි.මී. 100 ක් පමණ ඇතුළත'),
    opt('province', 'Same province', 'එම පළාත'),
    opt('any', 'Anywhere in Sri Lanka', 'ලංකාවේ ඕනෑම තැනක')
];

/**
 * 0–1: how well `cand` fits an area preference (district + distance).
 * Full marks inside the accepted distance, half marks up to twice as far, none beyond.
 */
export function areaFit(prefDistrict, prefDistance, cand) {
    const areas = areasOf(cand);
    if (!prefDistrict || !areas.length) return null;
    const mode = prefDistance || 'same';
    if (mode === 'any') return null;
    if (mode === 'province') {
        if (areas.some(a => sameProvince(a, prefDistrict))) return 1;
        return areas.some(a => (districtKm(a, prefDistrict) ?? 999) <= 80) ? 0.5 : 0;
    }
    const limit = mode === 'same' ? 0 : Number(mode);
    const km = Math.min(...areas.map(a => districtKm(a, prefDistrict) ?? 999));
    if (km <= limit) return 1;
    if (km <= Math.max(limit * 2, 40)) return 0.5;     // e.g. "same district" still half-credits a neighbour
    return 0;
}

// Countries where Sri Lankans most often live and work. Stored by English name.
export const COUNTRIES = [
    'Sri Lanka', 'United Kingdom', 'Australia', 'Canada', 'United States', 'New Zealand',
    'Italy', 'Germany', 'France', 'Switzerland', 'Netherlands', 'Norway', 'Sweden', 'Denmark', 'Ireland', 'Cyprus',
    'Japan', 'South Korea', 'Singapore', 'Malaysia', 'Maldives', 'India',
    'United Arab Emirates', 'Qatar', 'Saudi Arabia', 'Kuwait', 'Oman', 'Bahrain', 'Israel', 'Other'
].map(c => opt(c, c, c === 'Sri Lanka' ? 'ශ්‍රී ලංකාව' : c === 'Other' ? 'වෙනත්' : c));

/** Country to display for a profile (handles "Other" and older free-text values). */
export function countryName(p, lang = 'en') {
    if (!p?.country) return '';
    if (p.country === 'Other') return p.countryOther || (lang === 'si' ? 'වෙනත්' : 'Other');
    const o = COUNTRIES.find(c => c.v === p.country);
    return o ? (lang === 'si' ? o.si : o.en) : p.country;
}

export const RESIDENCY_STATUS = [
    opt('citizen', 'Citizen', 'පුරවැසි'),
    opt('pr', 'Permanent resident (PR)', 'ස්ථිර පදිංචිය (PR)'),
    opt('work', 'Work visa', 'රැකියා වීසා'),
    opt('student', 'Student visa', 'ශිෂ්‍ය වීසා'),
    opt('dependant', 'Dependant / family visa', 'යැපෙන්නන්ගේ / පවුල් වීසා'),
    opt('other', 'Other', 'වෙනත්')
];

export const RELOCATE = [
    opt('either', 'Yes — to Sri Lanka or abroad', 'ඔව් — ලංකාවට හෝ විදෙසට'),
    opt('abroad', 'Yes — abroad', 'ඔව් — විදෙසට'),
    opt('lk', 'Yes — to Sri Lanka', 'ඔව් — ලංකාවට'),
    opt('no', 'No', 'නැත'),
    opt('discuss', 'Open to discuss', 'සාකච්ඡා කළ හැක')
];

export const MOTHER_TONGUE = [
    opt('Sinhala', 'Sinhala', 'සිංහල'),
    opt('Tamil', 'Tamil', 'දෙමළ'),
    opt('English', 'English', 'ඉංග්‍රීසි'),
    opt('Other', 'Other', 'වෙනත්')
];

export const RESIDENCE = [
    opt('lk', 'Living in Sri Lanka', 'ශ්‍රී ලංකාවේ'),
    opt('abroad', 'Living overseas', 'විදෙස්ගතව')
];

export const DIET = [
    opt('any', 'Non-vegetarian', 'නිර්මාංශ නොවේ'),
    opt('veg', 'Vegetarian', 'නිර්මාංශ'),
    opt('vegan', 'Vegan', 'වීගන්')
];

export const HABITS = [
    opt('no', 'No', 'නැත'),
    opt('occasionally', 'Occasionally', 'ඉඳහිට'),
    opt('yes', 'Yes', 'ඔව්')
];

// 27 nakath, Sinhala order
export const NAKATH = [
    ['Ashwini', 'අස්විද'], ['Berana', 'බෙරණ'], ['Kethi', 'කැති'], ['Rehena', 'රෙහෙණ'],
    ['Muwasirasa', 'මුවසිරස'], ['Ada', 'අද'], ['Punawasa', 'පුනාවස'], ['Pusha', 'පුෂ'],
    ['Aslisa', 'අස්ලිස'], ['Ma', 'මා'], ['Puwapal', 'පුවපල්'], ['Uthrapal', 'උත්‍රපල්'],
    ['Hatha', 'හත'], ['Sitha', 'සිත'], ['Saa', 'සා'], ['Visa', 'විසා'], ['Anura', 'අනුර'],
    ['Deta', 'දෙට'], ['Mula', 'මුල'], ['Puwasala', 'පුවසල'], ['Uthrasala', 'උත්‍රසල'],
    ['Suwana', 'සුවණ'], ['Denata', 'දෙනට'], ['Siyawasa', 'සියාවස'], ['Puwaputupa', 'පුවපුටුප'],
    ['Uthraputupa', 'උත්‍රපුටුප'], ['Rewathi', 'රේවතී']
].map(([en, si]) => opt(en, `${en} (${si})`, si));

export const LAGNA = [
    ['Mesha', 'මේෂ'], ['Vrushabha', 'වෘෂභ'], ['Mithuna', 'මිථුන'], ['Kataka', 'කටක'],
    ['Simha', 'සිංහ'], ['Kanya', 'කන්‍යා'], ['Thula', 'තුලා'], ['Vrushchika', 'වෘශ්චික'],
    ['Dhanu', 'ධනු'], ['Makara', 'මකර'], ['Kumbha', 'කුම්භ'], ['Meena', 'මීන']
].map(([en, si]) => opt(en, `${en} (${si})`, si));

export const GANA = [
    opt('Deva', 'Deva (දේව)', 'දේව'),
    opt('Manushya', 'Manushya (මනුෂ්‍ය)', 'මනුෂ්‍ය'),
    opt('Rakshasa', 'Rakshasa (රාක්ෂ)', 'රාක්ෂ')
];

export const YES_NO_MATTER = [
    opt('required', 'Required', 'අවශ්‍යයි'),
    opt('preferred', 'Preferred', 'කැමතියි'),
    opt('no', 'Not necessary', 'අවශ්‍ය නැත')
];

export const PHOTO_VISIBILITY = [
    opt('members', 'All signed-in members', 'සියලු සාමාජිකයින්ට'),
    opt('accepted', 'Only people whose interest I accept', 'මා පිළිගත් අයට පමණි')
];

export const REPORT_REASONS = [
    opt('fake', 'Fake profile / false details', 'ව්‍යාජ ගිණුමක්'),
    opt('photos', 'Photos are not of this person', 'වෙනත් අයගේ ඡායාරූප'),
    opt('married', 'Already married', 'දැනටමත් විවාහක'),
    opt('money', 'Asked for money', 'මුදල් ඉල්ලා සිටියා'),
    opt('abuse', 'Rude or abusive behaviour', 'අසභ්‍ය හැසිරීම'),
    opt('other', 'Other', 'වෙනත්')
];

export const lists = {
    gender: GENDERS, createdFor: CREATED_FOR, district: DISTRICTS, religion: RELIGIONS,
    ethnicity: ETHNICITIES, marital: MARITAL, education: EDUCATION, diet: DIET,
    smoking: HABITS, drinking: HABITS, nakatha: NAKATH, lagna: LAGNA, gana: GANA, rasi: LAGNA, motherTongue: MOTHER_TONGUE, residence: RESIDENCE, employment: EMPLOYMENT,
    country: COUNTRIES, residencyStatus: RESIDENCY_STATUS, relocate: RELOCATE,
    occupation: OCCUPATIONS, occGroup: OCC_GROUPS, seniority: SENIORITY, income: INCOME,
    incomeMin: INCOME.filter(i => i.v !== 'na'), prefDistance: PREF_DISTANCE,
    horoscopeMatch: YES_NO_MATTER, photoVisibility: PHOTO_VISIBILITY, reason: REPORT_REASONS
};
