// Preference match: how well two profiles fit each other's stated partner
// preferences, in three weighted parts (see MATCH_WEIGHTS in config.js).
// A guide for searching — not a prediction of whether two people are compatible.
import { ageFrom } from './app.js';
import { EDUCATION, occupationOf, incomeIndex, seniorityIndex, areaFit } from './data.js';
import { MATCH_WEIGHTS } from './config.js';

const eduRank = v => EDUCATION.findIndex(e => e.v === v);

/** Checks of `cand` against the preferences set by `seeker`, sorted into the three parts. */
function fit(seeker, cand, parts) {
    // career
    if (seeker.prefOccupationGroup) {
        const g = occupationOf(cand)?.group;
        if (g) parts.career.push(g === seeker.prefOccupationGroup);
    }
    if (seeker.prefEducation && cand.education) parts.career.push(eduRank(cand.education) >= eduRank(seeker.prefEducation));
    if (seeker.prefSeniority && cand.seniority) parts.career.push(seniorityIndex(cand.seniority) >= seniorityIndex(seeker.prefSeniority));

    // financial ("prefer not to say" is simply not counted)
    if (seeker.prefIncome && incomeIndex(cand.incomeRange) >= 0) {
        parts.financial.push(incomeIndex(cand.incomeRange) >= incomeIndex(seeker.prefIncome));
    }

    // lifestyle & location
    const age = ageFrom(cand.dob);
    if (seeker.prefAgeMin || seeker.prefAgeMax) parts.lifestyle.push(age >= (seeker.prefAgeMin || 18) && age <= (seeker.prefAgeMax || 99));
    if (seeker.prefReligion) parts.lifestyle.push(cand.religion === seeker.prefReligion);
    // area: partial credit for nearby districts, using both the family home and where they live now
    const area = areaFit(seeker.prefDistrict, seeker.prefDistance, cand);
    if (area !== null) parts.lifestyle.push(area);
    if (seeker.prefResidence) parts.lifestyle.push((cand.residence || 'lk') === seeker.prefResidence);
}

/** Can two people live in the same place? Only counted when one lives in Sri Lanka and the other abroad. */
function relocationFits(a, b) {
    const ra = a.residence || 'lk', rb = b.residence || 'lk';
    if (ra === rb || !a.relocate || !b.relocate) return null;
    const willing = (p, to) => ['either', 'discuss', to].includes(p.relocate);
    return willing(a, rb) || willing(b, ra);
}

const willingAnywhere = (a, b) => ['either', 'discuss', 'abroad'].includes(a.relocate) || ['either', 'discuss', 'abroad'].includes(b.relocate);

/**
 * Returns { score, parts: { career, financial, lifestyle } } with 0–100 values,
 * or null when neither side has set any preferences. Parts with nothing to
 * compare are left out and the remaining weights are scaled up.
 */
export function matchDetails(mine, theirs) {
    if (!mine || !theirs) return null;
    const parts = { career: [], financial: [], lifestyle: [] };
    fit(mine, theirs, parts);
    fit(theirs, mine, parts);
    const reloc = relocationFits(mine, theirs);
    if (reloc !== null) parts.lifestyle.push(reloc);
    // both overseas: living in the same country matters a lot in practice
    if (mine.residence === 'abroad' && theirs.residence === 'abroad' && mine.country && theirs.country) {
        parts.lifestyle.push(mine.country === theirs.country ? 1 : willingAnywhere(mine, theirs) ? 0.5 : 0);
    }

    let total = 0, weight = 0;
    const out = {};
    for (const [k, checks] of Object.entries(parts)) {
        if (!checks.length) continue;
        // each check is true/false or a partial 0–1 value (e.g. a neighbouring district)
        const pct = (checks.reduce((sum, c) => sum + Number(c), 0) / checks.length) * 100;
        out[k] = Math.round(pct);
        const w = Number(MATCH_WEIGHTS[k]) || 0;
        total += pct * w;
        weight += w;
    }
    if (!weight) return null;
    return { score: Math.round(total / weight), parts: out };
}

/** Just the overall 0–100 score (or null). */
export function matchScore(mine, theirs) {
    return matchDetails(mine, theirs)?.score ?? null;
}
