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
    smoking: HABITS, drinking: HABITS, nakatha: NAKATH, lagna: LAGNA, gana: GANA, rasi: LAGNA, motherTongue: MOTHER_TONGUE, residence: RESIDENCE,
    horoscopeMatch: YES_NO_MATTER, photoVisibility: PHOTO_VISIBILITY, reason: REPORT_REASONS
};
