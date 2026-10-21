// Notification & Daily Reminder Manager for Wirdak
// Fully compatible with Mobile PWA, Android Chrome, and Service Worker
const SCHEDULE_STORAGE_KEY = "wirdak_reminder_schedule_v1";
const LAST_NOTIFIED_KEY = "wirdak_last_notified_timestamp";

export const DEFAULT_SCHEDULE = {
  enabled: true,
  time: "07:00", // 07:00 AM by default
  days: [0, 1, 2, 3, 4, 5, 6], // All days: Sunday to Saturday
  readingGoalPages: 4,
  memorizeGoalText: "صفحة واحدة يومياً",
  repetitions: 5,
};

export function getReminderSchedule() {
  try {
    const raw = localStorage.getItem(SCHEDULE_STORAGE_KEY);
    if (!raw) return DEFAULT_SCHEDULE;
    return { ...DEFAULT_SCHEDULE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SCHEDULE;
  }
}

export function saveReminderSchedule(schedule) {
  try {
    localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(schedule));
  } catch {}
}

export async function requestNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  try {
    const perm = await Notification.requestPermission();
    return perm; // "granted" | "denied" | "default"
  } catch {
    return "denied";
  }
}

export function isNotificationGranted() {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }
  return Notification.permission === "granted";
}

/**
 * Fires the reminder notification with NO emojis and full mobile compatibility.
 */
export async function fireWirdReminder(schedule = getReminderSchedule()) {
  const title = "تذكير الورد القرآني اليومي";
  const body = `حان موعد قراءة وحفظ وردك اليومي (${schedule.readingGoalPages || 4} صفحات). افتح المصحف لتواصل التزامك المبارك.`;
  const icon = "/logo.svg";

  // Play gentle Islamic chime tone
  playReminderChime();

  if (!isNotificationGranted()) {
    return;
  }

  // 1. Try Service Worker showNotification (Required on Android Chrome & Mobile PWA)
  if ("serviceWorker" in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.showNotification) {
        await reg.showNotification(title, {
          body,
          icon,
          badge: icon,
          vibrate: [200, 100, 200],
          tag: "wirdak-daily-reminder",
          renotify: true,
          data: { url: "/" },
        });
        return;
      }
    } catch (e) {
      console.warn("ServiceWorker showNotification failed, trying fallback:", e);
    }
  }

  // 2. Desktop Browser Fallback
  try {
    new Notification(title, {
      body,
      icon,
      badge: icon,
      vibrate: [200, 100, 200],
      tag: "wirdak-daily-reminder",
      renotify: true,
    });
  } catch (err) {
    console.warn("Desktop notification error:", err);
  }
}

/**
 * Sound synthesis using Web Audio API (Dignified chime without harsh tones)
 */
export function playReminderChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const notes = [
      { freq: 523.25, time: 0.0, dur: 0.4 },  // C5
      { freq: 659.25, time: 0.25, dur: 0.4 }, // E5
      { freq: 783.99, time: 0.5, dur: 0.7 },  // G5
    ];
    notes.forEach((n) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = n.freq;
      gain.gain.setValueAtTime(0.18, ctx.currentTime + n.time);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + n.time + n.dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + n.time);
      osc.stop(ctx.currentTime + n.time + n.dur);
    });
  } catch {}
}

/**
 * Background loop: checks once every 30 seconds if it's reminder time
 */
export function initReminderWatcher(onReminderTriggered) {
  if (typeof window === "undefined") return () => {};

  const check = () => {
    const schedule = getReminderSchedule();
    if (!schedule.enabled) return;

    const now = new Date();
    const currentDay = now.getDay(); // 0 to 6
    if (!schedule.days.includes(currentDay)) return;

    const [targetHour, targetMinute] = (schedule.time || "07:00").split(":").map(Number);
    const nowHour = now.getHours();
    const nowMinute = now.getMinutes();

    // Check if within the target minute
    if (nowHour === targetHour && nowMinute === targetMinute) {
      const todayDateStr = now.toLocaleDateString("en-CA"); // YYYY-MM-DD
      const lastNotified = localStorage.getItem(LAST_NOTIFIED_KEY);

      if (lastNotified !== todayDateStr) {
        localStorage.setItem(LAST_NOTIFIED_KEY, todayDateStr);
        fireWirdReminder(schedule);
        if (typeof onReminderTriggered === "function") {
          onReminderTriggered(schedule);
        }
      }
    }
  };

  const timer = setInterval(check, 30000); // Check every 30s
  check();
  return () => clearInterval(timer);
}
