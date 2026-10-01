// Preference match: how well two profiles fit each other's stated
// partner preferences. A guide for searching — not a prediction of
// whether two people are compatible.
import { ageFrom } from './app.js';
import { EDUCATION } from './data.js';

const eduRank = v => EDUCATION.findIndex(e => e.v === v);

/** Checks how well `cand` fits the preferences set by `seeker`. */
function fit(seeker, cand) {
    const checks = [];
    const age = ageFrom(cand.dob);
    if (seeker.prefAgeMin || seeker.prefAgeMax) {
        checks.push(age >= (seeker.prefAgeMin || 18) && age <= (seeker.prefAgeMax || 99));
    }
    if (seeker.prefReligion) checks.push(cand.religion === seeker.prefReligion);
    if (seeker.prefDistrict) checks.push(cand.district === seeker.prefDistrict);
    if (seeker.prefEducation) checks.push(eduRank(cand.education) >= eduRank(seeker.prefEducation));
    if (seeker.prefResidence) checks.push((cand.residence || 'lk') === seeker.prefResidence);
    return checks;
}

/**
 * Returns a 0–100 score counting both directions (what I want and what they
 * want), or null when neither side has set any preferences.
 */
export function matchScore(mine, theirs) {
    if (!mine || !theirs) return null;
    const checks = [...fit(mine, theirs), ...fit(theirs, mine)];
    if (!checks.length) return null;
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}
