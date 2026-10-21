// High Quality QCF4 Medina Mushaf Page & Font Loader with Uthmanic Fallback
const QCF4_CDN = "https://cdn.jsdelivr.net/gh/MohamadHajjRabee/quran-qcf4@main";
const QCF4_DATA = "https://raw.githubusercontent.com/MohamadHajjRabee/quran-qcf4/main";
const ALQURAN_API = "https://api.alquran.cloud/v1";

const fontCache = new Set();
const pageCache = new Map();

export async function ensureQcfFont(fontName) {
  if (!fontName || fontCache.has(fontName) || typeof document === "undefined") return;

  const fileName = fontName === "QCF4_QBSML" ? "QCF4_QBSML.woff2" : `${fontName}_W.woff2`;
  const url = `${QCF4_CDN}/fonts-woff2/${fileName}`;

  try {
    const face = new FontFace(fontName, `url(${url})`);
    await face.load();
    document.fonts.add(face);
    fontCache.add(fontName);
  } catch (err) {
    console.warn(`Font load warning for ${fontName}:`, err.message);
  }
}

export async function fetchMushafPage(pageNumber) {
  if (pageCache.has(pageNumber)) {
    return pageCache.get(pageNumber);
  }

  const pagePad = String(pageNumber).padStart(3, "0");

  try {
    // 1. Try QCF4 Medina Mushaf Vector lines
    const res = await fetch(`${QCF4_DATA}/pages/${pagePad}.json`);
    if (res.ok) {
      const pageData = await res.json();
      if (pageData?.lines && pageData?.font) {
        // Pre-load required fonts
        const fontsToLoad = new Set([pageData.font, "QCF4_QBSML"]);
        for (const line of pageData.lines) {
          for (const word of line.words || []) {
            if (word.font) fontsToLoad.add(word.font);
          }
        }
        await Promise.all([...fontsToLoad].map(ensureQcfFont));
        pageCache.set(pageNumber, pageData);
        return pageData;
      }
    }
  } catch (err) {
    console.warn("QCF4 fetch warning, trying fallback:", err.message);
  }

  // 2. High-reliability Fallback via AlQuran Cloud
  try {
    const res = await fetch(`${ALQURAN_API}/page/${pageNumber}/quran-uthmani`);
    const json = await res.json();
    if (json?.data?.ayahs) {
      const fallbackData = {
        pageNumber,
        font: "fallback",
        ayahs: json.data.ayahs,
        surahs: json.data.surahs,
      };
      pageCache.set(pageNumber, fallbackData);
      return fallbackData;
    }
  } catch (err) {
    console.error("Quran page fallback fetch failed:", err);
  }

  throw new Error(`تعذر تحميل الصفحة ${pageNumber}`);
}
