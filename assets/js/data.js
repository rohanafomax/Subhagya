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

// Search ranks profiles by `rank`: lower numbers appear first.
// Business owners and self-employed are listed after salaried professionals; not working is last.
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
/** Search rank for an employment value (0 = shown first). Profiles saved before this field existed count as 0. */
export function employmentRank(v) {
    return EMPLOYMENT.find(e => e.v === v)?.rank ?? 0;
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
    horoscopeMatch: YES_NO_MATTER, photoVisibility: PHOTO_VISIBILITY, reason: REPORT_REASONS
};
