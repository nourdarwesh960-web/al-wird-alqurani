// Plan Setup Wizard: Reading Goals Calculator, Memorization Target, Repetition Count, and Notification Schedule
// Supports Dark Mode, Exact Quran Page Mathematics (604 Pages), and Transition from Reading to Memorization
import { useState } from "react";
import {
  Bell,
  BookOpen,
  Calendar,
  Check,
  ChevronLeft,
  Clock,
  Minus,
  Plus,
  RotateCcw,
  Target,
  Volume2,
  X,
} from "lucide-react";
import { SURAHS_LIST } from "../data/surahs";
import {
  getReminderSchedule,
  saveReminderSchedule,
  requestNotificationPermission,
  fireWirdReminder,
} from "../lib/notificationManager";
import { playSuccessChime } from "../lib/soundEffects";
import { toArabicNumerals } from "../lib/mushafService";

const DAYS_OF_WEEK = [
  { id: 0, label: "الأحد" },
  { id: 1, label: "الاثنين" },
  { id: 2, label: "الثلاثاء" },
  { id: 3, label: "الأربعاء" },
  { id: 4, label: "الخميس" },
  { id: 5, label: "الجمعة" },
  { id: 6, label: "السبت" },
];

const REPETITION_PRESETS = [3, 5, 7, 10, 15, 20];

export default function PlanSetupModal({
  isOpen,
  onClose,
  wirdState,
  onSavePlan,
  isDark = false,
}) {
  if (!isOpen) return null;

  const currentSchedule = getReminderSchedule();

  // Active Wizard Tab: 'reading' (ورد القراءة) or 'memorize' (ورد الحفظ والتنبيهات)
  const [activeTab, setActiveTab] = useState("reading");

  // Box 1: Reading Goal (Pages per day)
  const [readingPages, setReadingPages] = useState(
    wirdState.dailyGoalPages || 20
  );

  // Box 2: Target Duration (Days to complete Khatma)
  const [targetDays, setTargetDays] = useState(() => {
    return Math.ceil(604 / (wirdState.dailyGoalPages || 20));
  });

  // Memorization Goal & Repetition
  const [memorizeSurah, setMemorizeSurah] = useState(
    wirdState.memorizeConfig?.surahNumber || 67
  );
  const [targetReps, setTargetReps] = useState(
    wirdState.memorizeConfig?.targetRepetitions || 5
  );

  // Reminders & Notifications
  const [notifEnabled, setNotifEnabled] = useState(currentSchedule.enabled);
  const [notifTime, setNotifTime] = useState(currentSchedule.time || "07:00");
  const [selectedDays, setSelectedDays] = useState(
    currentSchedule.days || [0, 1, 2, 3, 4, 5, 6]
  );
  const [permStatus, setPermStatus] = useState(
    typeof window !== "undefined" && "Notification" in window
      ? Notification.permission
      : "default"
  );
  const [testSent, setTestSent] = useState(false);

  // Calculations for Box 1: Days to complete given readingPages
  const daysToFinish = Math.max(1, Math.ceil(604 / Math.max(1, readingPages)));
  const monthsEstimate = (daysToFinish / 30).toFixed(1);
  const khatmaSummaryText =
    daysToFinish <= 30
      ? `في خلال ${toArabicNumerals(daysToFinish)} يوماً بإذن الله`
      : daysToFinish <= 60
      ? `في خلال شهرين تقريباً (${toArabicNumerals(daysToFinish)} يوماً)`
      : `في خلال ${toArabicNumerals(daysToFinish)} يوماً (نحو ${toArabicNumerals(monthsEstimate)} أشهر) بإذن الله`;

  // Calculations for Box 2: Required pages per day given targetDays
  const calculatedPagesNeeded = Math.max(1, Math.ceil(604 / Math.max(1, targetDays)));
  const juzEquivalent = (calculatedPagesNeeded / 20).toFixed(1);

  // When user applies target duration to reading wird
  const applyTargetDays = (days) => {
    setTargetDays(days);
    const pages = Math.max(1, Math.ceil(604 / Math.max(1, days)));
    setReadingPages(pages);
  };

  const toggleDay = (dayId) => {
    setSelectedDays((prev) =>
      prev.includes(dayId) ? prev.filter((d) => d !== dayId) : [...prev, dayId]
    );
  };

  const handleRequestPermission = async () => {
    const res = await requestNotificationPermission();
    setPermStatus(res);
    if (res === "granted") {
      setNotifEnabled(true);
      fireWirdReminder({
        ...currentSchedule,
        readingGoalPages: readingPages,
      });
    }
  };

  const handleTestNotification = async () => {
    if (permStatus !== "granted") {
      await handleRequestPermission();
    }
    fireWirdReminder({
      ...currentSchedule,
      readingGoalPages: readingPages,
    });
    setTestSent(true);
    setTimeout(() => setTestSent(false), 3000);
  };

  const handleSave = (e) => {
    if (e) e.preventDefault();

    // 1. Save Reminder Schedule
    const newSchedule = {
      enabled: notifEnabled,
      time: notifTime,
      days: selectedDays.length ? selectedDays : [0, 1, 2, 3, 4, 5, 6],
      readingGoalPages: readingPages,
      memorizeGoalText: `سورة ${SURAHS_LIST.find((s) => s.number === Number(memorizeSurah))?.name || "الملك"}`,
      repetitions: targetReps,
    };
    saveReminderSchedule(newSchedule);

    // 2. Save Plan in Wird State
    onSavePlan({
      dailyGoalPages: readingPages,
      memorizeConfig: {
        surahNumber: Number(memorizeSurah),
        targetRepetitions: targetReps,
        completedRepsCount: 0,
      },
    });

    playSuccessChime();
    onClose();
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.75)",
        backdropFilter: "blur(6px)",
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: isDark ? "#162032" : "#FFFFFF",
          color: isDark ? "#F8FAFC" : "#0F172A",
          borderRadius: "18px",
          width: "min(520px, 94vw)",
          maxHeight: "92vh",
          overflowY: "auto",
          padding: "16px 12px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.4)",
          border: `1.5px solid ${isDark ? "rgba(255,255,255,0.12)" : "#E2E8F0"}`,
          direction: "rtl",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "12px",
            borderBottom: `1.5px solid ${isDark ? "rgba(255,255,255,0.1)" : "#F1F5F9"}`,
            paddingBottom: "8px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "10px",
                backgroundColor: isDark ? "rgba(16, 185, 129, 0.2)" : "rgba(6, 78, 59, 0.1)",
                color: isDark ? "#6EE7B7" : "#064E3B",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Target size={18} />
            </div>
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: "15px",
                  fontWeight: 900,
                  color: isDark ? "#A7F3D0" : "#064E3B",
                  fontFamily: "'Aref Ruqaa', serif",
                }}
              >
                تحديد خطة وِرْدِك القرآني
              </h2>
              <span style={{ fontSize: "10.5px", color: isDark ? "#94A3B8" : "#64748B" }}>
                حاسبة ورد القراءة، ومسار الحفظ، ومواعيد التذكير
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: isDark ? "#94A3B8" : "#64748B",
              cursor: "pointer",
              padding: "4px",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher: 1. ورد القراءة | 2. ورد الحفظ والتنبيهات */}
        <div
          style={{
            display: "flex",
            backgroundColor: isDark ? "#0F172A" : "#F1F5F9",
            borderRadius: "10px",
            padding: "3px",
            marginBottom: "12px",
            gap: "3px",
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab("reading")}
            style={{
              flex: 1,
              padding: "6px 8px",
              borderRadius: "7px",
              border: "none",
              backgroundColor: activeTab === "reading" ? (isDark ? "#064E3B" : "#059669") : "transparent",
              color: activeTab === "reading" ? "#FFFFFF" : isDark ? "#94A3B8" : "#64748B",
              fontWeight: 800,
              fontSize: "11.5px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "4px",
              fontFamily: "'Aref Ruqaa', serif",
            }}
          >
            <BookOpen size={13} />
            <span>1. ورد القراءة والختمة</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("memorize")}
            style={{
              flex: 1,
              padding: "6px 8px",
              borderRadius: "7px",
              border: "none",
              backgroundColor: activeTab === "memorize" ? (isDark ? "#92400E" : "#D97706") : "transparent",
              color: activeTab === "memorize" ? "#FFFFFF" : isDark ? "#94A3B8" : "#64748B",
              fontWeight: 800,
              fontSize: "11.5px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "4px",
              fontFamily: "'Aref Ruqaa', serif",
            }}
          >
            <RotateCcw size={13} />
            <span>2. ورد الحفظ والتذكير</span>
          </button>
        </div>

        {/* ========================================================
            TAB 1: ورد القراءة والختمة
            ======================================================== */}
        {activeTab === "reading" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            
            {/* BOX 1: مربع عدد الصفحات اليومي وحساب مدة الختم */}
            <div
              style={{
                backgroundColor: isDark ? "#0F172A" : "#F8FAFC",
                border: `1.5px solid ${isDark ? "#1E293B" : "#E2E8F0"}`,
                borderRadius: "18px",
                padding: "16px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                <BookOpen size={16} color="#10B981" />
                <h3
                  style={{
                    margin: 0,
                    fontSize: "14px",
                    fontWeight: 900,
                    color: isDark ? "#F8FAFC" : "#0F172A",
                    fontFamily: "'Aref Ruqaa', serif",
                  }}
                >
                  حدد كم صفحة ستقرأ يومياً:
                </h3>
              </div>

              {/* Number Box Beside "صفحة" */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "12px",
                  padding: "12px 0",
                }}
              >
                <button
                  type="button"
                  onClick={() => setReadingPages((p) => Math.max(1, p - 1))}
                  style={{
                    width: "38px",
                    height: "38px",
                    borderRadius: "12px",
                    backgroundColor: isDark ? "#1E293B" : "#E2E8F0",
                    border: "none",
                    color: isDark ? "#FFFFFF" : "#0F172A",
                    display: "grid",
                    placeItems: "center",
                    cursor: "pointer",
                  }}
                >
                  <Minus size={16} />
                </button>

                {/* The Requested Box: Number + "صفحة" */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    backgroundColor: isDark ? "#162032" : "#FFFFFF",
                    border: `2px solid ${isDark ? "#10B981" : "#059669"}`,
                    borderRadius: "16px",
                    padding: "6px 18px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                  }}
                >
                  <input
                    type="number"
                    min="1"
                    max="604"
                    value={readingPages}
                    onChange={(e) => setReadingPages(Math.max(1, Math.min(604, parseInt(e.target.value, 10) || 1)))}
                    style={{
                      width: "60px",
                      fontSize: "22px",
                      fontWeight: 900,
                      textAlign: "center",
                      border: "none",
                      outline: "none",
                      backgroundColor: "transparent",
                      color: isDark ? "#FFFFFF" : "#064E3B",
                      fontFamily: "'Cairo', sans-serif",
                    }}
                  />
                  <span style={{ fontSize: "15px", fontWeight: 900, color: isDark ? "#A7F3D0" : "#064E3B" }}>
                    صفحة
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setReadingPages((p) => Math.min(604, p + 1))}
                  style={{
                    width: "38px",
                    height: "38px",
                    borderRadius: "12px",
                    backgroundColor: isDark ? "#1E293B" : "#E2E8F0",
                    border: "none",
                    color: isDark ? "#FFFFFF" : "#0F172A",
                    display: "grid",
                    placeItems: "center",
                    cursor: "pointer",
                  }}
                >
                  <Plus size={16} />
                </button>
              </div>

              {/* Quick Preset Pills */}
              <div style={{ display: "flex", justifyContent: "center", gap: "6px", flexWrap: "wrap", marginBottom: "10px" }}>
                {[2, 4, 10, 20, 30].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setReadingPages(preset)}
                    style={{
                      padding: "4px 10px",
                      borderRadius: "8px",
                      border: `1px solid ${readingPages === preset ? "#10B981" : isDark ? "#334155" : "#CBD5E1"}`,
                      backgroundColor: readingPages === preset ? "rgba(16, 185, 129, 0.15)" : "transparent",
                      color: readingPages === preset ? "#10B981" : isDark ? "#94A3B8" : "#475569",
                      fontSize: "11.5px",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    {preset} صفحة {preset === 20 ? "(جزء)" : preset === 4 ? "(ربع)" : ""}
                  </button>
                ))}
              </div>

              {/* Small Footnote: Exactly When They Will Complete */}
              <div
                style={{
                  fontSize: "12px",
                  color: isDark ? "#34D399" : "#065F46",
                  backgroundColor: isDark ? "rgba(16, 185, 129, 0.1)" : "#ECFDF5",
                  border: `1px solid ${isDark ? "rgba(16, 185, 129, 0.25)" : "#A7F3D0"}`,
                  borderRadius: "12px",
                  padding: "8px 12px",
                  textAlign: "center",
                  lineHeight: 1.5,
                }}
              >
                ستختم المصحف كاملاً (604 صفحات) <strong>{khatmaSummaryText}</strong>.
              </div>
            </div>

            {/* BOX 2: عايز تختم في أد إيه؟ وهو اللي يختار الرقم ويحسبله */}
            <div
              style={{
                backgroundColor: isDark ? "#0F172A" : "#F8FAFC",
                border: `1.5px solid ${isDark ? "#1E293B" : "#E2E8F0"}`,
                borderRadius: "18px",
                padding: "16px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <Clock size={16} color="#F59E0B" />
                <h3
                  style={{
                    margin: 0,
                    fontSize: "14px",
                    fontWeight: 900,
                    color: isDark ? "#F8FAFC" : "#0F172A",
                    fontFamily: "'Aref Ruqaa', serif",
                  }}
                >
                  أو اختر: عايز تختم في قد إيه؟
                </h3>
              </div>

              {/* Number Box for Target Days */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                  padding: "8px 0",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    backgroundColor: isDark ? "#162032" : "#FFFFFF",
                    border: `2px solid ${isDark ? "#F59E0B" : "#D97706"}`,
                    borderRadius: "16px",
                    padding: "6px 18px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                  }}
                >
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={targetDays}
                    onChange={(e) => setTargetDays(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    style={{
                      width: "60px",
                      fontSize: "20px",
                      fontWeight: 900,
                      textAlign: "center",
                      border: "none",
                      outline: "none",
                      backgroundColor: "transparent",
                      color: isDark ? "#FFFFFF" : "#B45309",
                      fontFamily: "'Cairo', sans-serif",
                    }}
                  />
                  <span style={{ fontSize: "14px", fontWeight: 900, color: isDark ? "#FDE68A" : "#B45309" }}>
                    يوماً
                  </span>
                </div>
              </div>

              {/* Quick Pills for Target Days */}
              <div style={{ display: "flex", justifyContent: "center", gap: "6px", flexWrap: "wrap", marginBottom: "10px" }}>
                {[
                  { d: 15, l: "15 يوماً" },
                  { d: 30, l: "30 يوماً (شهر)" },
                  { d: 60, l: "60 يوماً (شهران)" },
                  { d: 90, l: "90 يوماً (3 أشهر)" },
                  { d: 180, l: "6 أشهر" },
                  { d: 365, l: "سنة" },
                ].map((item) => (
                  <button
                    key={item.d}
                    type="button"
                    onClick={() => applyTargetDays(item.d)}
                    style={{
                      padding: "4px 8px",
                      borderRadius: "8px",
                      border: `1px solid ${targetDays === item.d ? "#F59E0B" : isDark ? "#334155" : "#CBD5E1"}`,
                      backgroundColor: targetDays === item.d ? "rgba(245, 158, 11, 0.15)" : "transparent",
                      color: targetDays === item.d ? "#F59E0B" : isDark ? "#94A3B8" : "#475569",
                      fontSize: "11px",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    {item.l}
                  </button>
                ))}
              </div>

              {/* Result: How much they need to read per day */}
              <div
                style={{
                  fontSize: "12px",
                  color: isDark ? "#FDE68A" : "#92400E",
                  backgroundColor: isDark ? "rgba(245, 158, 11, 0.1)" : "#FEF3C7",
                  border: `1px solid ${isDark ? "rgba(245, 158, 11, 0.25)" : "#FDE68A"}`,
                  borderRadius: "12px",
                  padding: "8px 12px",
                  textAlign: "center",
                  lineHeight: 1.5,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "6px",
                }}
              >
                <span>
                  لتختم في {toArabicNumerals(targetDays)} يوماً: المفروض تقرأ <strong>{toArabicNumerals(calculatedPagesNeeded)} صفحة يومياً</strong> (حوالي {toArabicNumerals(juzEquivalent)} جزء).
                </span>
                <button
                  type="button"
                  onClick={() => setReadingPages(calculatedPagesNeeded)}
                  style={{
                    backgroundColor: "#D97706",
                    color: "#FFFFFF",
                    border: "none",
                    borderRadius: "8px",
                    padding: "4px 8px",
                    fontSize: "11px",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  تطبيق هذا الورد
                </button>
              </div>
            </div>

            {/* SECTION 3: تحت الاثنين: تحديد ورد القراءة والانتقال لبدء الحفظ */}
            <div
              style={{
                backgroundColor: isDark ? "rgba(16, 185, 129, 0.15)" : "#ECFDF5",
                border: `1.5px solid ${isDark ? "#10B981" : "#A7F3D0"}`,
                borderRadius: "16px",
                padding: "14px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "14px", fontWeight: 900, color: isDark ? "#A7F3D0" : "#065F46", marginBottom: "4px" }}>
                ورد القراءة المختار: {toArabicNumerals(readingPages)} صفحة يومياً
              </div>
              <div style={{ fontSize: "11.5px", color: isDark ? "#94A3B8" : "#047857", marginBottom: "12px" }}>
                ستكمل ختمة كاملة كل {toArabicNumerals(daysToFinish)} يوماً بإذن الله تعالى.
              </div>

              <button
                type="button"
                onClick={() => setActiveTab("memorize")}
                style={{
                  width: "100%",
                  backgroundColor: "#059669",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: "10px",
                  padding: "9px 12px",
                  fontSize: "12.5px",
                  fontWeight: 900,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  boxShadow: "0 3px 10px rgba(5, 150, 105, 0.3)",
                  fontFamily: "'Aref Ruqaa', serif",
                }}
              >
                <span>اعتماد ورد القراءة والانتقال للحفظ</span>
                <ChevronLeft size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 2: ورد الحفظ والتكرار ومواعيد التذكير
            ======================================================== */}
        {activeTab === "memorize" && (
          <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            
            {/* Memorization Target */}
            <div
              style={{
                backgroundColor: isDark ? "#0F172A" : "#F8FAFC",
                border: `1.5px solid ${isDark ? "#1E293B" : "#E2E8F0"}`,
                borderRadius: "18px",
                padding: "16px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                <RotateCcw size={16} color="#D97706" />
                <h3
                  style={{
                    margin: 0,
                    fontSize: "14px",
                    fontWeight: 900,
                    color: isDark ? "#F8FAFC" : "#0F172A",
                    fontFamily: "'Aref Ruqaa', serif",
                  }}
                >
                  اختر السورة المراد حفظها:
                </h3>
              </div>

              <select
                value={memorizeSurah}
                onChange={(e) => setMemorizeSurah(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "12px",
                  border: `1.5px solid ${isDark ? "#334155" : "#CBD5E1"}`,
                  backgroundColor: isDark ? "#162032" : "#FFFFFF",
                  color: isDark ? "#FFFFFF" : "#0F172A",
                  fontSize: "14px",
                  fontWeight: 700,
                  cursor: "pointer",
                  outline: "none",
                  marginBottom: "14px",
                }}
              >
                {SURAHS_LIST.map((s) => (
                  <option key={s.number} value={s.number}>
                    سورة {s.name} ({s.ayahs} آية) — صفحة {s.startPage}
                  </option>
                ))}
              </select>

              {/* Repetition Target */}
              <div style={{ fontSize: "13px", fontWeight: 800, color: isDark ? "#E2E8F0" : "#334155", marginBottom: "8px" }}>
                تكرار كل آية لتثبيت الحفظ:
              </div>

              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {REPETITION_PRESETS.map((rep) => (
                  <button
                    key={rep}
                    type="button"
                    onClick={() => setTargetReps(rep)}
                    style={{
                      flex: 1,
                      minWidth: "48px",
                      padding: "8px",
                      borderRadius: "10px",
                      border: `1.5px solid ${targetReps === rep ? "#D97706" : isDark ? "#334155" : "#CBD5E1"}`,
                      backgroundColor: targetReps === rep ? "rgba(217, 119, 6, 0.15)" : isDark ? "#162032" : "#FFFFFF",
                      color: targetReps === rep ? "#D97706" : isDark ? "#FFFFFF" : "#0F172A",
                      fontWeight: 900,
                      fontSize: "13px",
                      cursor: "pointer",
                    }}
                  >
                    {rep} مرات
                  </button>
                ))}
              </div>
            </div>

            {/* Notification Reminders */}
            <div
              style={{
                backgroundColor: isDark ? "#0F172A" : "#F8FAFC",
                border: `1.5px solid ${isDark ? "#1E293B" : "#E2E8F0"}`,
                borderRadius: "18px",
                padding: "16px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Bell size={16} color="#10B981" />
                  <span style={{ fontSize: "14px", fontWeight: 900, color: isDark ? "#F8FAFC" : "#0F172A", fontFamily: "'Aref Ruqaa', serif" }}>
                    تنبيهات الورد اليومية
                  </span>
                </div>

                <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={notifEnabled}
                    onChange={(e) => setNotifEnabled(e.target.checked)}
                    style={{ width: "18px", height: "18px", accentColor: "#059669", cursor: "pointer" }}
                  />
                  <span style={{ fontSize: "12px", fontWeight: 700, color: notifEnabled ? "#10B981" : "#64748B" }}>
                    {notifEnabled ? "مفعل" : "معطل"}
                  </span>
                </label>
              </div>

              {notifEnabled && (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                    <span style={{ fontSize: "12px", color: isDark ? "#94A3B8" : "#64748B" }}>
                      وقت التذكير:
                    </span>
                    <input
                      type="time"
                      value={notifTime}
                      onChange={(e) => setNotifTime(e.target.value)}
                      style={{
                        padding: "6px 10px",
                        borderRadius: "10px",
                        border: `1px solid ${isDark ? "#334155" : "#CBD5E1"}`,
                        backgroundColor: isDark ? "#162032" : "#FFFFFF",
                        color: isDark ? "#FFFFFF" : "#0F172A",
                        fontSize: "14px",
                        fontWeight: 800,
                        outline: "none",
                      }}
                    />
                  </div>

                  <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                    {DAYS_OF_WEEK.map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => toggleDay(d.id)}
                        style={{
                          padding: "4px 8px",
                          borderRadius: "8px",
                          border: `1px solid ${selectedDays.includes(d.id) ? "#10B981" : isDark ? "#334155" : "#CBD5E1"}`,
                          backgroundColor: selectedDays.includes(d.id) ? "rgba(16, 185, 129, 0.15)" : "transparent",
                          color: selectedDays.includes(d.id) ? "#10B981" : isDark ? "#94A3B8" : "#64748B",
                          fontSize: "11px",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
              <button
                type="button"
                onClick={() => setActiveTab("reading")}
                style={{
                  flex: 1,
                  padding: "9px 10px",
                  borderRadius: "10px",
                  border: `1px solid ${isDark ? "#334155" : "#CBD5E1"}`,
                  backgroundColor: "transparent",
                  color: isDark ? "#CBD5E1" : "#475569",
                  fontWeight: 800,
                  fontSize: "11.5px",
                  cursor: "pointer",
                }}
              >
                رجوع للقراءة
              </button>

              <button
                type="submit"
                style={{
                  flex: 2,
                  padding: "9px 12px",
                  borderRadius: "10px",
                  border: "none",
                  backgroundColor: "#059669",
                  color: "#FFFFFF",
                  fontWeight: 900,
                  fontSize: "12.5px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  boxShadow: "0 3px 10px rgba(5, 150, 105, 0.3)",
                  fontFamily: "'Aref Ruqaa', serif",
                }}
              >
                <Check size={16} />
                <span>حفظ الخطة وبدء الحفظ</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
