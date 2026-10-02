import {
    doc, getDoc, setDoc, deleteDoc, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
import { db, requireAuth, t, $, $$, esc, toast, fillSelect, friendlyError, applyI18n, ageFrom } from '../app.js';
import { compressImage } from '../image.js';
import { contactInfoIn, PUBLIC_TEXT_FIELDS, phoneKey, sha256, normaliseText } from '../checks.js';

const MAX_PHOTOS = 3;

// store: 'p' = public profile, 'c' = private contact record
const STEPS = [
    {
        key: 'st_basic', en: 'Basic details', fields: [
            { id: 'createdFor', en: 'This profile is for', type: 'select', list: 'createdFor', req: 1 },
            { id: 'gender', en: 'Bride or groom', type: 'select', list: 'gender', req: 1 },
            { id: 'firstName', en: 'First name', type: 'text', req: 1, hint: 'Shown on the profile.' },
            { id: 'lastName', en: 'Last name', type: 'text', store: 'c', hint: 'Private — only shown with contact details.' },
            { id: 'dob', en: 'Date of birth', type: 'date', req: 1 },
            { id: 'height', en: 'Height (cm)', type: 'number', min: 120, max: 220, req: 1, hint: "e.g. 5' 4\" = 163 cm" },
            { id: 'marital', en: 'Marital status', type: 'select', list: 'marital', req: 1 },
            { id: 'children', en: 'Children', type: 'text', hint: 'Only if previously married, e.g. “None” or “1, lives with me”.' },
            { id: 'religion', en: 'Religion', type: 'select', list: 'religion', req: 1 },
            { id: 'ethnicity', en: 'Ethnicity', type: 'select', list: 'ethnicity', req: 1 },
            { id: 'motherTongue', en: 'Mother tongue', type: 'select', list: 'motherTongue', req: 1 },
            { id: 'caste', en: 'Caste (optional)', type: 'text' },
            { id: 'district', en: 'Home district (family home)', type: 'select', list: 'district', req: 1 },
            { id: 'city', en: 'Home town / city', type: 'text', req: 1 },
            { id: 'liveDistrict', en: 'District you live / work in now', type: 'select', list: 'district', hint: 'If different from your home district, e.g. working in Colombo. Leave as “—” if living overseas.' },
            { id: 'country', en: 'Country you live in now', type: 'select', list: 'country', req: 1, def: 'Sri Lanka' },
            { id: 'countryOther', en: 'Country name (if “Other”)', type: 'text' },
            { id: 'residencyStatus', en: 'Residency status (if living overseas)', type: 'select', list: 'residencyStatus', hint: 'Families often ask this — e.g. Permanent resident, Work visa.' }
        ]
    },
    {
        key: 'st_career', en: 'Education & career', fields: [
            { id: 'education', en: 'Highest education', type: 'select', list: 'education', req: 1 },
            { id: 'educationDetail', en: 'Field / institute', type: 'text', hint: 'e.g. BSc Engineering, University of Moratuwa' },
            { id: 'occupation', en: 'Occupation', type: 'select', list: 'occupation', req: 1, hint: 'Choose the closest. Working abroad? Choose your job — your country is recorded separately. Business owners and self-employed: verify your business registration later (My Account → Verification) to be listed higher.' },
            { id: 'seniority', en: 'Seniority', type: 'select', list: 'seniority' },
            { id: 'school', en: 'School', type: 'text' },
            { id: 'profession', en: 'Profession', type: 'text', req: 1 },
            { id: 'position', en: 'Job position', type: 'text', hint: 'e.g. Senior Engineer, Teacher, Manager' },
            { id: 'employer', en: 'Working at (sector)', type: 'text', hint: 'e.g. Government, private bank, own business' },
            { id: 'incomeRange', en: 'Monthly income', type: 'select', list: 'income', def: 'na', hint: 'Optional — choose “Prefer not to say” if you wish. Living abroad? Convert roughly to LKR.' }
        ]
    },
    {
        key: 'st_family', en: 'Family & lifestyle', fields: [
            { id: 'fatherOcc', en: "Father's occupation", type: 'text' },
            { id: 'motherOcc', en: "Mother's occupation", type: 'text' },
            { id: 'siblings', en: 'Brothers & sisters', type: 'text', hint: 'e.g. 1 elder brother (married), 1 younger sister' },
            { id: 'familyHome', en: 'Family residence', type: 'text', hint: 'e.g. Parents live in Kandy' },
            { id: 'diet', en: 'Diet', type: 'select', list: 'diet' },
            { id: 'smoking', en: 'Smoking', type: 'select', list: 'smoking' },
            { id: 'drinking', en: 'Drinking', type: 'select', list: 'drinking' },
            { id: 'about', en: 'About me / about the family', type: 'textarea', req: 1, full: 1, minLen: 60, hint: 'At least 60 characters. Describe personality, values, interests and family background.' }
        ]
    },
    {
        key: 'st_horo', en: 'Horoscope (optional)', fields: [
            { id: 'nakatha', en: 'Nakatha / Nakshatra (birth star)', type: 'select', list: 'nakatha' },
            { id: 'lagna', en: 'Lagna (ascendant)', type: 'select', list: 'lagna' },
            { id: 'rasi', en: 'Rasi (moon sign)', type: 'select', list: 'rasi' },
            { id: 'gana', en: 'Gana', type: 'select', list: 'gana' },
            { id: 'horoscopeMatch', en: 'Horoscope matching', type: 'select', list: 'horoscopeMatch' },
            { id: 'birthTime', en: 'Birth time', type: 'time', store: 'c', hint: 'Private — shared with contact details.' },
            { id: 'birthPlace', en: 'Birth place', type: 'text', store: 'c', hint: 'Private — shared with contact details.' }
        ]
    },
    {
        key: 'st_partner', en: 'Partner preferences', fields: [
            { id: 'relocate', en: 'Willing to relocate after marriage?', type: 'select', list: 'relocate', full: 1 },
            { id: 'prefAgeMin', en: 'Age from', type: 'number', min: 18, max: 80 },
            { id: 'prefAgeMax', en: 'Age to', type: 'number', min: 18, max: 80 },
            { id: 'prefReligion', en: 'Religion', type: 'select', list: 'religion', any: 'Any religion' },
            { id: 'prefDistrict', en: 'Preferred area (district)', type: 'select', list: 'district', any: 'Any district' },
            { id: 'prefDistance', en: 'How far from that area is OK?', type: 'select', list: 'prefDistance', def: '50', hint: 'Families living nearby in other districts are included, e.g. Gampaha for Colombo.' },
            { id: 'prefEducation', en: 'Minimum education', type: 'select', list: 'education', any: 'Any' },
            { id: 'prefOccupationGroup', en: 'Preferred occupation area', type: 'select', list: 'occGroup', any: 'Any' },
            { id: 'prefSeniority', en: 'Minimum seniority', type: 'select', list: 'seniority', any: 'Any' },
            { id: 'prefIncome', en: 'Minimum monthly income', type: 'select', list: 'incomeMin', any: 'Any' },
            { id: 'prefResidence', en: 'Living in', type: 'select', list: 'residence', any: 'Sri Lanka or overseas' },
            { id: 'prefProfession', en: 'Preferred profession', type: 'text', hint: 'e.g. Professional, government service — or leave blank' },
            { id: 'prefNotes', en: 'What are you looking for?', type: 'textarea', full: 1 }
        ]
    },
    {
        key: 'st_photos', en: 'Photos & contact', fields: [
            { id: 'photos', type: 'photos', full: 1 },
            { id: 'photoVisibility', en: 'Who can see my photos?', type: 'select', list: 'photoVisibility', req: 1, full: 1, def: 'members' },
            { id: 'contactName', en: 'Contact person', type: 'text', store: 'c', req: 1, hint: 'Your name, or a parent/guardian.' },
            { id: 'contactRelation', en: 'Relationship to the bride/groom', type: 'text', store: 'c', hint: 'e.g. Self, Mother, Father' },
            { id: 'phone', en: 'Phone number', type: 'tel', store: 'c', req: 1, hint: 'Only shown to premium members whose interest you accept.' },
            { id: 'whatsapp', en: 'WhatsApp (optional)', type: 'tel', store: 'c' },
            { id: 'confirm', en: 'I confirm these details are true. I understand false profiles are removed.', type: 'check', req: 1, full: 1 }
        ]
    }
];

let step = 0;
const state = {};
let photos = [];          // data URLs
let existing = null;      // existing profile doc
let me;

function fieldHtml(f) {
    const label = f.en ? `<label for="f-${f.id}"><span data-i18n="f_${f.id}">${esc(f.en)}</span>${f.req ? ' <span class="req">*</span>' : ''}</label>` : '';
    const hint = f.hint ? `<div class="hint" data-i18n="h_${f.id}">${esc(f.hint)}</div>` : '';
    const cls = `field${f.full ? ' full' : ''}`;
    switch (f.type) {
        case 'select':
            return `<div class="${cls}">${label}<select id="f-${f.id}" data-list="${f.list}" data-any="${esc(f.any || '')}"></select>${hint}</div>`;
        case 'textarea':
            return `<div class="${cls}">${label}<textarea id="f-${f.id}" maxlength="1500"></textarea>${hint}</div>`;
        case 'check':
            return `<label class="check full"><input type="checkbox" id="f-${f.id}"><span data-i18n="f_${f.id}">${esc(f.en)}</span></label>`;
        case 'photos':
            return `<div class="field full"><label><span data-i18n="f_photos">Photos</span> <span class="muted">(${MAX_PHOTOS} max)</span></label>
                <div class="photo-slots" id="photo-slots"></div>
                <div class="hint" data-i18n="h_photos">Clear, recent photos of the bride/groom only. Group photos, cartoons or other people's photos will be rejected. The first photo is the main one.</div>
                <input type="file" id="photo-input" accept="image/*" hidden></div>`;
        default:
            return `<div class="${cls}">${label}<input id="f-${f.id}" type="${f.type}"${f.min ? ` min="${f.min}"` : ''}${f.max ? ` max="${f.max}"` : ''}${f.type === 'tel' ? ' inputmode="tel" autocomplete="tel"' : ''} maxlength="120">${hint}</div>`;
    }
}

function render() {
    const s = STEPS[step];
    $('#steps').innerHTML = STEPS.map((_, i) => `<span class="${i <= step ? 'done' : ''}"></span>`).join('');
    $('#step-count').textContent = `${t('step', 'Step')} ${step + 1} / ${STEPS.length}`;
    $('#step-name').dataset.i18n = s.key;
    $('#step-name').textContent = s.en;
    $('#step-body').innerHTML = `<div class="form-grid">${s.fields.map(fieldHtml).join('')}</div>`;

    for (const f of s.fields) {
        const el = $('#f-' + f.id);
        if (f.type === 'select') fillSelect(el, f.list, { any: f.any ? t('any', f.any) : '' });
        if (!el) continue;
        const v = state[f.id] ?? f.def ?? '';
        if (f.type === 'check') el.checked = !!state[f.id];
        else el.value = v;
    }
    if (s.fields.some(f => f.type === 'photos')) renderPhotos();

    $('#back-btn').hidden = step === 0;
    const last = step === STEPS.length - 1;
    $('#next-btn').dataset.i18n = last ? 'submit_profile' : 'next';
    $('#next-btn').textContent = last ? 'Submit for review' : 'Next';
    applyI18n();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderPhotos() {
    const slots = $('#photo-slots');
    slots.innerHTML = Array.from({ length: MAX_PHOTOS }, (_, i) => photos[i]
        ? `<div class="photo-slot"><img src="${photos[i]}" alt=""><button type="button" class="remove" data-rm="${i}" aria-label="Remove">✕</button></div>`
        : `<div class="photo-slot" data-add tabindex="0" role="button">＋<br>${esc(t('add_photo', 'Add photo'))}</div>`
    ).join('');
    slots.querySelectorAll('[data-add]').forEach(el => el.addEventListener('click', () => $('#photo-input').click()));
    slots.querySelectorAll('[data-rm]').forEach(el => el.addEventListener('click', () => { photos.splice(+el.dataset.rm, 1); renderPhotos(); }));
    $('#photo-input').onchange = async e => {
        const file = e.target.files[0];
        e.target.value = '';
        if (!file || photos.length >= MAX_PHOTOS) return;
        try {
            toast(t('processing', 'Processing photo…'));
            photos.push(await compressImage(file));
            renderPhotos();
        } catch (err) { toast(err.message, true); }
    };
}

function collect() {
    const s = STEPS[step];
    for (const f of s.fields) {
        const el = $('#f-' + f.id);
        if (!el) continue;
        state[f.id] = f.type === 'check' ? el.checked : f.type === 'number' ? (el.value ? Number(el.value) : '') : el.value.trim();
    }
}

function validate() {
    const s = STEPS[step];
    for (const f of s.fields) {
        const v = state[f.id];
        const name = t('f_' + f.id, f.en || '');
        if (f.req && (v === '' || v === false || v == null)) return `${t('required', 'Please fill in')}: ${name}`;
        if (f.minLen && String(v).length < f.minLen) return `${name}: ${t('min_chars', 'at least')} ${f.minLen} ${t('chars', 'characters')}`;
        if (f.type === 'number' && v !== '' && ((f.min && v < f.min) || (f.max && v > f.max))) return `${name}: ${f.min}–${f.max}`;
    }
    // No phone numbers, emails or links in public text — contact details are shared only after both sides accept.
    for (const f of s.fields) {
        if (!PUBLIC_TEXT_FIELDS.includes(f.id)) continue;
        const hit = contactInfoIn(state[f.id]).strict[0];
        if (hit) {
            return `${t('f_' + f.id, f.en)}: ${t('err_contact_in_text', 'please remove the')} ${hit.kind} (“${hit.sample}”). ` +
                t('err_contact_why', 'Contact details are shared safely after both sides accept an interest.');
        }
    }
    if (step === 0) {
        const age = ageFrom(state.dob);
        if (age == null || age < 18) return t('err_age', 'The bride/groom must be at least 18 years old.');
        if (age > 90) return t('err_dob', 'Please check the date of birth.');
        if (state.country === 'Other' && !state.countryOther) return t('err_country_other', 'Please type the name of the country you live in.');
        if (state.country && state.country !== 'Sri Lanka' && !state.residencyStatus) {
            return t('err_residency', 'Please choose your residency status in that country.');
        }
    }
    if (step === 4 && state.prefAgeMin && state.prefAgeMax && state.prefAgeMin > state.prefAgeMax) {
        return t('err_agerange', '“Age from” must be less than “Age to”.');
    }
    if (step === 5) {
        if (photos.length === 0) return t('err_photo', 'Please add at least one photo.');
        if (!/^\+?[0-9 ()-]{9,16}$/.test(state.phone)) return t('err_phone', 'Please enter a valid phone number.');
    }
    return null;
}

async function save() {
    const uid = me.user.uid;
    const pub = {}, priv = {};
    for (const s of STEPS) for (const f of s.fields) {
        if (f.type === 'photos' || f.type === 'check') continue;
        (f.store === 'c' ? priv : pub)[f.id] = state[f.id] ?? '';
    }
    // "Sri Lanka or overseas" is worked out from the country, so search and match % stay correct
    pub.residence = pub.country && pub.country !== 'Sri Lanka' ? 'abroad' : 'lk';
    if (pub.residence === 'lk') pub.residencyStatus = '';
    if (pub.residence === 'abroad' || pub.liveDistrict === pub.district) pub.liveDistrict = '';
    const profile = {
        ...pub,
        uid,
        status: 'pending',
        photoCount: photos.length,
        // fingerprint of "About me" so the admin can spot text copied between accounts
        aboutHash: await sha256(normaliseText(pub.about)),
        updatedAt: serverTimestamp(),
        // fields only an admin may change — keep existing values
        verified: existing?.verified ?? false,
        premium: existing?.premium ?? false,
        premiumUntil: existing?.premiumUntil ?? null,
        jobVerified: existing?.jobVerified ?? false,
        jobVia: existing?.jobVia ?? '',
        jobWorkplace: existing?.jobWorkplace ?? '',
        createdAt: existing?.createdAt ?? serverTimestamp()
    };

    // photos first, so a visible profile never points at missing photos
    for (let i = 0; i < MAX_PHOTOS; i++) {
        const ref = doc(db, 'photos', `${uid}_${i}`);
        if (photos[i]) await setDoc(ref, { uid, index: i, data: photos[i], hash: await sha256(photos[i]), visibility: state.photoVisibility });
        else await deleteDoc(ref).catch(() => {});
    }
    await setDoc(doc(db, 'contacts', uid), { ...priv, uid, phoneKey: phoneKey(priv.phone), updatedAt: serverTimestamp() });
    await setDoc(doc(db, 'profiles', uid), profile);
}

$('#form').addEventListener('submit', async e => {
    e.preventDefault();
    collect();
    const err = validate();
    if (err) { toast(err, true); return; }
    if (step < STEPS.length - 1) { step++; render(); return; }

    const btn = $('#next-btn');
    btn.disabled = true;
    btn.textContent = t('saving', 'Saving…');
    try {
        await save();
        location.href = 'dashboard.html?saved=1';
    } catch (err2) {
        toast(friendlyError(err2), true);
        btn.disabled = false;
        btn.textContent = t('submit_profile', 'Submit for review');
    }
});
$('#back-btn').addEventListener('click', () => { collect(); step--; render(); });

// ───────── init ─────────
me = await requireAuth();
if (!me.user.emailVerified) {
    $('#notice').innerHTML = `<div class="alert alert-info">${esc(t('verify_first', 'Please verify your email address first. Check your inbox, then come back.'))} <a href="dashboard.html">${esc(t('nav_dashboard', 'My Account'))}</a></div>`;
    $('.card').hidden = true;
} else {
    try {
        const [p, c] = await Promise.all([
            getDoc(doc(db, 'profiles', me.user.uid)),
            getDoc(doc(db, 'contacts', me.user.uid))
        ]);
        if (p.exists()) {
            existing = p.data();
            Object.assign(state, existing, c.exists() ? c.data() : {});
            const snaps = await Promise.all(Array.from({ length: existing.photoCount || 0 }, (_, i) => getDoc(doc(db, 'photos', `${me.user.uid}_${i}`))));
            photos = snaps.filter(s => s.exists()).map(s => s.data().data);
            state.confirm = false;
            $('#notice').innerHTML = `<div class="alert alert-info">${esc(t('edit_review', 'Saving changes sends your profile for review again before it is shown.'))}</div>`;
        } else {
            state.contactName = me.user.displayName || '';
        }
    } catch (err) { toast(friendlyError(err), true); }
    render();
}
