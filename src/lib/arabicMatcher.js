// Arabic Text Normalizer & Recitation Matcher
// For Smart Oral Recitation & Quranic Memorization Testing

export function normalizeArabic(text) {
  if (!text) return "";
  return text
    // Remove Quranic diacritics, sukun, madd, waslah, and annotation marks
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
    // Normalize Alefs: أ, إ, آ, ٱ -> ا
    .replace(/[إأآٱ]/g, "ا")
    // Normalize Taa Marbuta: ة -> ه
    .replace(/ة/g, "ه")
    // Normalize Yaa & Alef Maksura: ى, ئ -> ي
    .replace(/[ىيئ]/g, "ي")
    // Normalize Waw with Hamza: ؤ -> و
    .replace(/ؤ/g, "و")
    // Remove tatweel (kashida)
    .replace(/ـ+/g, "")
    // Common joined speech transcriptions
    .replace(/الحمدلله/g, "الحمد لله")
    .replace(/بسمالله/g, "بسم الله")
    .replace(/انالله/g, "انا لله")
    // Strip non-Arabic letters and punctuation
    .replace(/[^\u0621-\u063A\u0641-\u064A0-9\s]/g, " ")
    // Collapse multiple spaces
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Checks if the spoken Arabic transcript matches the target Quranic Ayah
 * Returns true if recitation is deemed correct (>= 60% word overlap or substring match)
 */
export function checkAyahRecitationMatch(spoken, targetAyahText) {
  const normSpoken = normalizeArabic(spoken);
  const normTarget = normalizeArabic(targetAyahText);
  if (!normSpoken || !normTarget) return false;

  // 1. Direct equality
  if (normSpoken === normTarget) return true;

  // 2. Substring containment with reasonable length ratio
  if (normSpoken.includes(normTarget) || normTarget.includes(normSpoken)) {
    const ratio =
      Math.min(normSpoken.length, normTarget.length) /
      Math.max(normSpoken.length, normTarget.length);
    if (ratio >= 0.58) return true;
  }

  // 3. Word-by-word intersection
  const targetWords = normTarget.split(" ").filter(Boolean);
  const spokenWords = normSpoken.split(" ").filter(Boolean);
  if (targetWords.length === 0) return false;

  let matchedWords = 0;
  targetWords.forEach((tw) => {
    if (
      spokenWords.some(
        (sw) =>
          sw === tw ||
          (sw.length >= 3 && (sw.includes(tw) || tw.includes(sw)))
      )
    ) {
      matchedWords++;
    }
  });

  const matchRatio = matchedWords / targetWords.length;
  // If at least 60% of words are correctly recognized, or if it's a short 3-word ayah and 2 words matched
  if (targetWords.length <= 4) {
    return matchedWords >= Math.max(1, targetWords.length - 1);
  }

  return matchRatio >= 0.6;
}
