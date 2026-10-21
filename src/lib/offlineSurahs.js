// Offline Surah Audio Storage & Cache Manager
const CACHE_NAME = "wirdak-offline-surahs-v1";

/**
 * Checks if a Surah audio file is already cached offline
 */
export async function isSurahOffline(reciterId, surahNumber) {
  if (typeof window === "undefined" || !("caches" in window)) return false;
  try {
    const cache = await caches.open(CACHE_NAME);
    const key = `/offline-audio/${reciterId}/${surahNumber}.mp3`;
    const match = await cache.match(key);
    return Boolean(match);
  } catch {
    return false;
  }
}

/**
 * Gets the playable URL for a Surah (returns cached Blob URL if available, else online URL)
 */
export async function getSurahAudioUrl(reciter, surahNumber) {
  const surahPad = String(surahNumber).padStart(3, "0");
  const onlineUrl = `${reciter.surahBase}/${surahPad}.mp3`;

  if (typeof window !== "undefined" && "caches" in window) {
    try {
      const cache = await caches.open(CACHE_NAME);
      const key = `/offline-audio/${reciter.id}/${surahNumber}.mp3`;
      const match = await cache.match(key);
      if (match) {
        const blob = await match.blob();
        return URL.createObjectURL(blob);
      }
    } catch (e) {
      console.warn("Offline cache retrieval failed:", e);
    }
  }

  return onlineUrl;
}

/**
 * Downloads and caches a full Surah for offline playback
 */
export async function downloadSurahForOffline(reciter, surahNumber, onProgress) {
  if (typeof window === "undefined" || !("caches" in window)) {
    throw new Error("خاصية التخزين دون إنترنت غير مدعومة في هذا المتصفح.");
  }

  const surahPad = String(surahNumber).padStart(3, "0");
  const onlineUrl = `${reciter.surahBase}/${surahPad}.mp3`;
  const key = `/offline-audio/${reciter.id}/${surahNumber}.mp3`;

  const response = await fetch(onlineUrl);
  if (!response.ok) {
    throw new Error(`تعذر تحميل السورة: ${response.status}`);
  }

  const contentLength = response.headers.get("content-length");
  const total = contentLength ? parseInt(contentLength, 10) : 0;
  let loaded = 0;

  const reader = response.body.getReader();
  const chunks = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    if (total > 0 && typeof onProgress === "function") {
      onProgress(Math.round((loaded / total) * 100));
    }
  }

  const blob = new Blob(chunks, { type: "audio/mpeg" });
  const cache = await caches.open(CACHE_NAME);
  await cache.put(key, new Response(blob, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Length": String(blob.size),
    },
  }));

  return true;
}

/**
 * Deletes a cached Surah from offline storage
 */
export async function deleteSurahOffline(reciterId, surahNumber) {
  if (typeof window === "undefined" || !("caches" in window)) return false;
  try {
    const cache = await caches.open(CACHE_NAME);
    const key = `/offline-audio/${reciterId}/${surahNumber}.mp3`;
    return await cache.delete(key);
  } catch {
    return false;
  }
}
