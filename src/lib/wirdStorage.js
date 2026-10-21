// Storage and Progress Tracking for Wirdak (Reading & Memorization)
const WIRDAK_STORAGE_KEY = "wirdak_user_data_v2";
const WIRDAK_USER_KEY = "wirdak_current_user";

function todayStr() {
  return new Date().toLocaleDateString("en-CA");
}

export function getDefaultWirdState() {
  return {
    mode: "reading", // "reading" | "memorization" | "listening"
    currentPage: 1,
    startPage: 1,
    lastReadPage: 1,
    lastReadSurah: "الفاتحة",
    dailyGoalPages: 20,
    completedPages: [], // Pages finished today
    bookmarks: [1],
    memorizeConfig: {
      surahNumber: 67, // Surah Al-Mulk by default
      startPage: 562,
      targetRepetitions: 5,
      completedRepsCount: 0,
      activeVerseKey: null,
    },
    streak: 1,
    lastActiveDate: todayStr(),
    totalReadPagesCount: 0,
    reciterId: "ar.luhaidan",
    fontSize: 28,
  };
}

export function loadWirdState() {
  try {
    const raw = localStorage.getItem(WIRDAK_STORAGE_KEY) || localStorage.getItem("wirdak_user_data_v1");
    if (!raw) return getDefaultWirdState();
    const data = JSON.parse(raw);
    const today = todayStr();

    // Check if new day: reset daily completed pages and update streak
    if (data.lastActiveDate !== today) {
      const yesterday = new Date(Date.now() - 86400000).toLocaleDateString("en-CA");
      let nextStreak = data.streak || 1;
      if (data.lastActiveDate === yesterday) {
        // Consecutive day
      } else {
        // Missed a day
        nextStreak = 1;
      }
      return {
        ...getDefaultWirdState(),
        ...data,
        completedPages: [],
        lastActiveDate: today,
        streak: nextStreak,
      };
    }
    return { ...getDefaultWirdState(), ...data };
  } catch {
    return getDefaultWirdState();
  }
}

export function saveWirdState(state) {
  try {
    localStorage.setItem(WIRDAK_STORAGE_KEY, JSON.stringify(state));

    // If user is logged in, optionally background sync to server
    const user = getCurrentUser();
    if (user && user.phone) {
      fetch("/api/wird/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: user.phone, wirdState: state }),
      }).catch(() => {});
    }
  } catch {}
}

export function getCurrentUser() {
  try {
    const raw = localStorage.getItem(WIRDAK_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setCurrentUser(user) {
  try {
    if (user) {
      localStorage.setItem(WIRDAK_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(WIRDAK_USER_KEY);
    }
  } catch {}
}

export function logoutUser() {
  try {
    localStorage.removeItem(WIRDAK_USER_KEY);
  } catch {}
}
