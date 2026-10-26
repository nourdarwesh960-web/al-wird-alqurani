import { OFFLINE_SURAHS_MAP } from "../data/juzAmmaSurahs";

// Mushaf Service: Fetches, caches, and prepares Medina Mushaf pages
// Uses Amiri Quran and Aref Ruqaa typography with natural Arabic text flow
const API_BASE = "https://api.alquran.cloud/v1";
const pageMemoryCache = new Map();

export async function getMushafPage(pageNumber) {
  const p = Math.max(1, Math.min(604, Number(pageNumber) || 1));

  // 1. Check in-memory cache
  if (pageMemoryCache.has(p)) {
    return pageMemoryCache.get(p);
  }

  // 2. Check localStorage cache for instant offline load
  const storageKey = `wirdak_page_cache_v2_${p}`;
  try {
    const local = localStorage.getItem(storageKey);
    if (local) {
      const parsed = JSON.parse(local);
      pageMemoryCache.set(p, parsed);
      return parsed;
    }
  } catch (e) {}

  // 3. Fetch from API
  try {
    const res = await fetch(`${API_BASE}/page/${p}/quran-uthmani`);
    if (!res.ok) {
      throw new Error(`تعذر جلب الصفحة ${p} (${res.status})`);
    }
    const json = await res.json();
    if (!json?.data?.ayahs) {
      throw new Error("بيانات الصفحة غير صالحة");
    }

    const ayahs = json.data.ayahs.map((item) => {
      let cleanText = item.text || "";
      const isFirstAyahInSurah = item.numberInSurah === 1;
      const isSurahFatiha = item.surah?.number === 1;
      const isSurahTawbah = item.surah?.number === 9;

      let hasBasmalaHeader = false;
      // Strip Basmala from beginning of first Ayah if it's not Al-Fatihah, to display Basmala centered above
      if (isFirstAyahInSurah && !isSurahFatiha && !isSurahTawbah) {
        const basmalaPrefix = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ ";
        if (cleanText.startsWith(basmalaPrefix)) {
          cleanText = cleanText.replace(basmalaPrefix, "").trim();
          hasBasmalaHeader = true;
        } else if (cleanText.includes("بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ")) {
          cleanText = cleanText.replace("بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ", "").trim();
          hasBasmalaHeader = true;
        }
      }

      return {
        number: item.number,
        numberInSurah: item.numberInSurah,
        text: cleanText,
        surah: item.surah,
        juz: item.juz,
        page: item.page,
        hizbQuarter: item.hizbQuarter,
        verseKey: `${item.surah.number}:${item.numberInSurah}`,
        isFirstAyahInSurah,
        hasBasmalaHeader,
      };
    });

    const pageResult = {
      pageNumber: p,
      juz: ayahs[0]?.juz || 1,
      surah: ayahs[0]?.surah || null,
      ayahs,
    };

    pageMemoryCache.set(p, pageResult);
    try {
      localStorage.setItem(storageKey, JSON.stringify(pageResult));
    } catch (e) {}

    return pageResult;
  } catch (err) {
    console.error(`Error loading page ${p}:`, err);
    throw err;
  }
}

/**
 * Convert numbers to Eastern Arabic numerals (١, ٢, ٣...)
 */
export function toArabicNumerals(num) {
  const arabicDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  return String(num).replace(/[0-9]/g, (w) => arabicDigits[+w]);
}

/**
 * Common short surahs with offline fallback text for Kids Mode and fast offline memorization
 */
export const BUILTIN_KIDS_SURAHS = {
  1: {
    number: 1,
    name: "الفاتحة",
    ayahs: [
      { numberInSurah: 1, text: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ", verseKey: "1:1" },
      { numberInSurah: 2, text: "ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ", verseKey: "1:2" },
      { numberInSurah: 3, text: "ٱلرَّحْمَٰنِ ٱلرَّحِيمِ", verseKey: "1:3" },
      { numberInSurah: 4, text: "مَٰلِكِ يَوْمِ ٱلدِّينِ", verseKey: "1:4" },
      { numberInSurah: 5, text: "إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ", verseKey: "1:5" },
      { numberInSurah: 6, text: "ٱهْدِنَا ٱلصِّرَٰطَ ٱلْمُسْتَقِيمَ", verseKey: "1:6" },
      { numberInSurah: 7, text: "صِرَٰطَ ٱلَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ ٱلْمَغْضُوبِ عَلَيْهِمْ وَلَا ٱلضَّآلِّينَ", verseKey: "1:7" },
    ],
  },
  112: {
    number: 112,
    name: "الإخلاص",
    ayahs: [
      { numberInSurah: 1, text: "قُلْ هُوَ ٱللَّهُ أَحَدٌ", verseKey: "112:1" },
      { numberInSurah: 2, text: "ٱللَّهُ ٱلصَّمَدُ", verseKey: "112:2" },
      { numberInSurah: 3, text: "لَمْ يَلِدْ وَلَمْ يُولَدْ", verseKey: "112:3" },
      { numberInSurah: 4, text: "وَلَمْ يَكُن لَّهُۥ كُفُوًا أَحَدٌۢ", verseKey: "112:4" },
    ],
  },
  113: {
    number: 113,
    name: "الفلق",
    ayahs: [
      { numberInSurah: 1, text: "قُلْ أَعُوذُ بِرَبِّ ٱلْفَلَقِ", verseKey: "113:1" },
      { numberInSurah: 2, text: "مِن شَرِّ مَا خَلَقَ", verseKey: "113:2" },
      { numberInSurah: 3, text: "وَمِن شَرِّ غَاسِقٍ إِذَا وَقَبَ", verseKey: "113:3" },
      { numberInSurah: 4, text: "وَمِن شَرِّ ٱلنَّفَّٰثَٰتِ فِى ٱلْعُقَدِ", verseKey: "113:4" },
      { numberInSurah: 5, text: "وَمِن شَرِّ حَاسِدٍ إِذَا حَسَدَ", verseKey: "113:5" },
    ],
  },
  114: {
    number: 114,
    name: "الناس",
    ayahs: [
      { numberInSurah: 1, text: "قُلْ أَعُوذُ بِرَبِّ ٱلنَّاسِ", verseKey: "114:1" },
      { numberInSurah: 2, text: "مَلِكِ ٱلنَّاسِ", verseKey: "114:2" },
      { numberInSurah: 3, text: "إِلَٰهِ ٱلنَّاسِ", verseKey: "114:3" },
      { numberInSurah: 4, text: "مِن شَرِّ ٱلْوَسْوَاسِ ٱلْخَنَّاسِ", verseKey: "114:4" },
      { numberInSurah: 5, text: "ٱلَّذِى يُوَسْوِسُ فِى صُدُورِ ٱلنَّاسِ", verseKey: "114:5" },
      { numberInSurah: 6, text: "مِنَ ٱلْجِنَّةِ وَٱلنَّاسِ", verseKey: "114:6" },
    ],
  },
  108: {
    number: 108,
    name: "الكوثر",
    ayahs: [
      { numberInSurah: 1, text: "إِنَّآ أَعْطَيْنَٰكَ ٱلْكَوْثَرَ", verseKey: "108:1" },
      { numberInSurah: 2, text: "فَصَلِّ لِرَبِّكَ وَٱنْحَرْ", verseKey: "108:2" },
      { numberInSurah: 3, text: "إِنَّ شَانِئَكَ هُوَ ٱلْأَبْتَرُ", verseKey: "108:3" },
    ],
  },
  110: {
    number: 110,
    name: "النصر",
    ayahs: [
      { numberInSurah: 1, text: "إِذَا جَآءَ نَصْرُ ٱللَّهِ وَٱلْفَتْحُ", verseKey: "110:1" },
      { numberInSurah: 2, text: "وَرَأَيْتَ ٱلنَّاسَ يَدْخُلُونَ فِى دِينِ ٱللَّهِ أَفْوَاجًا", verseKey: "110:2" },
      { numberInSurah: 3, text: "فَسَبِّحْ بِحَمْدِ رَبِّكَ وَٱسْتَغْفِرْهُ ۚ إِنَّهُۥ كَانَ تَوَّابًۢا", verseKey: "110:3" },
    ],
  },
};

/**
 * Fetch full Surah ayahs with verified offline database and online fallback
 */
export async function getSurahAyahs(surahNumber) {
  const num = Number(surahNumber) || 1;

  // 1. Instant verified offline map (Covers Surah 1 + all Juz Amma 78-114)
  if (OFFLINE_SURAHS_MAP[num]) {
    return OFFLINE_SURAHS_MAP[num];
  }

  // 2. Builtin legacy fallback
  if (BUILTIN_KIDS_SURAHS[num]) {
    return BUILTIN_KIDS_SURAHS[num];
  }

  // 3. LocalStorage persistent cache
  const storageKey = `wirdak_surah_cache_v3_${num}`;
  try {
    const local = localStorage.getItem(storageKey);
    if (local) return JSON.parse(local);
  } catch {}

  // 4. Online API fetch
  try {
    const res = await fetch(`https://api.alquran.cloud/v1/surah/${num}/quran-uthmani`);
    const json = await res.json();
    if (json?.data?.ayahs) {
      const data = {
        number: json.data.number,
        name: json.data.name?.replace("سُورَةُ ", "") || `سورة ${num}`,
        numberOfAyahs: json.data.ayahs.length,
        ayahs: json.data.ayahs.map((a) => {
          let text = a.text;
          // Strip prepended Basmalah from Ayah 1 (except Al-Fatiha and At-Tawbah)
          if (num !== 1 && a.numberInSurah === 1) {
            text = text.replace(/^بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ\s*/, "").trim();
          }
          return {
            numberInSurah: a.numberInSurah,
            text,
            verseKey: `${num}:${a.numberInSurah}`,
          };
        }),
      };
      try {
        localStorage.setItem(storageKey, JSON.stringify(data));
      } catch {}
      return data;
    }
  } catch (err) {
    console.warn(`Surah ${num} fetch failed:`, err);
  }

  return OFFLINE_SURAHS_MAP[1] || BUILTIN_KIDS_SURAHS[1];
}

/**
 * Fetch Ayah Tafsir (التفسير الميسر) with persistent caching
 */
export async function getAyahTafsir(verseKey) {
  if (!verseKey) return "";
  const key = String(verseKey).trim();
  const storageKey = `wirdak_tafsir_muyassar_${key}`;

  try {
    const local = localStorage.getItem(storageKey);
    if (local) return local;
  } catch {}

  try {
    const res = await fetch(`https://api.alquran.cloud/v1/ayah/${key}/ar.muyassar`);
    const json = await res.json();
    if (json?.data?.text) {
      const tafsirText = json.data.text;
      try {
        localStorage.setItem(storageKey, tafsirText);
      } catch {}
      return tafsirText;
    }
  } catch (err) {
    console.warn(`Tafsir fetch failed for ${key}:`, err);
  }

  return "تعذر تحميل التفسير حالياً، يرجى التأكد من الاتصال بالإنترنت.";
}
