// Top Header Bar with Mode Switching (Reading, Memorization, Full Surah Audio), Kids Mode, Dark Mode, Quran Search, Quick Auth, and Last Read Banner
import {
  Baby,
  BookOpen,
  Calendar,
  ChevronLeft,
  Download,
  Flame,
  Headphones,
  Image,
  List,
  Moon,
  RotateCcw,
  Search,
  Sliders,
  Sun,
  Target,
  User,
} from "lucide-react";
import { RECITERS_LIST } from "../data/surahs";
import { toArabicNumerals } from "../lib/mushafService";

export default function WirdakHeader({
  mode,
  onModeChange,
  streak = 1,
  completedCount = 0,
  dailyGoal = 20,
  onOpenPlanSetup,
  onOpenIndex,
  onOpenSearch,
  onOpenAuth,
  currentUser = null,
  lastReadPage = 1,
  lastReadSurah = "الفاتحة",
  onResumeLastRead,
  selectedReciterId,
  onOpenReciterModal,
  isDark = false,
  onToggleTheme,
  isKidsMode = false,
  onToggleKidsMode,
}) {
  const percent = Math.min(100, Math.round((completedCount / Math.max(1, dailyGoal)) * 100));
  const currentReciter =
    RECITERS_LIST.find((r) => r.id === selectedReciterId) || RECITERS_LIST[0];

  return (
    <header
      style={{
        width: "100%",
        background: isDark
          ? "linear-gradient(135deg, #1C150A 0%, #0F0B05 100%)"
          : "linear-gradient(135deg, #8C6708 0%, #5E4303 100%)",
        color: "#FFFFFF",
        padding: "8px 10px max(6px, env(safe-area-inset-top, 0px)) 10px",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.35)",
        flexShrink: 0,
        direction: "rtl",
        borderBottom: `2px solid var(--accent-gold)`,
        transition: "background 0.25s ease",
        boxSizing: "border-box",
      }}
    >
      {/* Top Row: Logo & Quick Toggles */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          maxWidth: "820px",
          margin: "0 auto 6px",
          gap: "8px",
        }}
      >
        {/* App Logo & Title */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <img
            src="/app-icon.jpg"
            alt="الورد القرآني"
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              objectFit: "cover",
              boxShadow: "0 2px 10px rgba(0,0,0,0.4)",
              border: "1.5px solid var(--accent-gold)",
            }}
          />
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: "17.5px",
                fontWeight: 900,
                color: "#FDE68A",
                fontFamily: "'Aref Ruqaa', serif",
                lineHeight: 1.1,
              }}
            >
              الورد القرآني
            </h1>
            <span style={{ fontSize: "10px", color: isDark ? "#FCD34D" : "#FFF7ED" }}>
              المصحف الذهبي — رفيقك اليومي
            </span>
          </div>
        </div>

        {/* Top Quick Toggles: Kids Mode, Theme, Account */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {/* Kids Mode Toggle */}
          <button
            onClick={onToggleKidsMode}
            title={isKidsMode ? "الرجوع للوضع العام" : "تفعيل وضع الأطفال (حفظ وتسميع)"}
            style={{
              backgroundColor: isKidsMode ? "#10B981" : "rgba(16, 185, 129, 0.25)",
              border: "1px solid #10B981",
              borderRadius: "8px",
              padding: "5px 9px",
              fontSize: "11.5px",
              fontWeight: 800,
              color: "#FFFFFF",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <Baby size={13} />
            <span>{isKidsMode ? "عام" : "أطفال"}</span>
          </button>

          {/* Dark / Light Mode Toggle */}
          <button
            onClick={onToggleTheme}
            title={isDark ? "تفعيل الوضع النهاري" : "تفعيل الوضع الليلي (Dark Mode)"}
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.14)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              borderRadius: "8px",
              padding: "5px 8px",
              color: isDark ? "#FCD34D" : "#FFFFFF",
              cursor: "pointer",
              display: "grid",
              placeItems: "center",
            }}
          >
            {isDark ? <Sun size={14} /> : <Moon size={14} />}
          </button>

          {/* Quick Login / User Sync Button */}
          <button
            onClick={onOpenAuth}
            title="تسجيل الدخول ومزامنة الورد"
            style={{
              backgroundColor: currentUser ? "#059669" : "rgba(255, 255, 255, 0.14)",
              border: `1px solid ${currentUser ? "#10B981" : "rgba(255, 255, 255, 0.2)"}`,
              borderRadius: "8px",
              padding: "5px 9px",
              fontSize: "11.5px",
              fontWeight: 700,
              color: "#FFFFFF",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <User size={13} />
            <span>{currentUser ? currentUser.phone?.slice(-4) : "حسابي"}</span>
          </button>
        </div>
      </div>

      {/* Second Row: Responsive Action Pills (3-column grid on mobile, flex on desktop) */}
      <div className="wird-header-actions">
        {/* Quran Verse Search */}
        <button
          onClick={onOpenSearch}
          title="البحث في آيات القرآن الكريم"
          className="wird-btn-action-pill"
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.12)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            borderRadius: "8px",
            padding: "5px 10px",
            fontSize: "11.5px",
            fontWeight: 700,
            color: "#FFFFFF",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            flexShrink: 0,
          }}
        >
          <Search size={13} />
          <span>بحث الآيات</span>
        </button>

        {/* Index Drawer */}
        <button
          onClick={onOpenIndex}
          title="فهرس السور والأجزاء"
          className="wird-btn-action-pill"
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.12)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            borderRadius: "8px",
            padding: "5px 10px",
            fontSize: "11.5px",
            fontWeight: 700,
            color: "#FFFFFF",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            flexShrink: 0,
          }}
        >
          <List size={13} />
          <span>فهرس السور</span>
        </button>

        {/* Reciter Selector */}
        <button
          onClick={onOpenReciterModal}
          title="اختيار القارئ"
          className="wird-btn-action-pill"
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.14)",
            border: "1px solid rgba(255, 255, 255, 0.25)",
            borderRadius: "8px",
            padding: "5px 10px",
            fontSize: "11.5px",
            fontWeight: 800,
            color: "#FFFFFF",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            fontFamily: "'Aref Ruqaa', serif",
            flexShrink: 0,
          }}
        >
          <Headphones size={13} color="#FCD34D" />
          <span>القارئ: {currentReciter.name.split(" ").slice(-1)[0] || currentReciter.name}</span>
        </button>

        {/* Setup / Goals Button */}
        <button
          onClick={onOpenPlanSetup}
          title="تحديد خطة القراءة والختمة ومواعيد التذكير"
          className="wird-btn-action-pill"
          style={{
            backgroundColor: "#D97706",
            border: "none",
            borderRadius: "8px",
            padding: "5px 11px",
            fontSize: "11.5px",
            fontWeight: 800,
            color: "#FFFFFF",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            flexShrink: 0,
          }}
        >
          <Target size={13} />
          <span>تحديد الورد</span>
        </button>

        {/* Download Mobile APK Button */}
        <a
          href="/wirdak-app.apk"
          download="wirdak-app.apk"
          title="تحميل تطبيق الأندرويد (APK)"
          className="wird-btn-action-pill"
          style={{
            backgroundColor: "rgba(252, 211, 77, 0.18)",
            border: "1px solid rgba(252, 211, 77, 0.4)",
            borderRadius: "8px",
            padding: "5px 10px",
            fontSize: "11.5px",
            fontWeight: 800,
            color: "#FCD34D",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            textDecoration: "none",
            flexShrink: 0,
          }}
        >
          <Download size={13} />
          <span>تحميل APK</span>
        </a>

        {/* Download Wallpaper Button */}
        <a
          href="/wirdak-wallpaper.jpg"
          download="wirdak-wallpaper.jpg"
          target="_blank"
          rel="noopener noreferrer"
          title="تحميل خلفية الشاشة الفاخرة للهاتف (Wallpaper)"
          className="wird-btn-action-pill"
          style={{
            backgroundColor: "rgba(16, 185, 129, 0.2)",
            border: "1px solid rgba(16, 185, 129, 0.4)",
            borderRadius: "8px",
            padding: "5px 10px",
            fontSize: "11.5px",
            fontWeight: 800,
            color: "#6EE7B7",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            textDecoration: "none",
            flexShrink: 0,
          }}
        >
          <Image size={13} />
          <span>خلفية الشاشة</span>
        </a>
      </div>

      {/* 3-Mode Switcher: القراءة | الحفظ | استماع السور (Only shown if not in Kids Mode) */}
      {!isKidsMode && (
        <div
          style={{
            display: "flex",
            maxWidth: "820px",
            margin: "0 auto",
            backgroundColor: "rgba(0, 0, 0, 0.28)",
            borderRadius: "8px",
            padding: "2px",
            gap: "2px",
          }}
        >
          {/* Reading Wird */}
          <button
            onClick={() => onModeChange("reading")}
            style={{
              flex: 1,
              padding: "7px 6px",
              borderRadius: "7px",
              border: "none",
              backgroundColor: mode === "reading" ? "#B8860B" : "transparent",
              color: mode === "reading" ? "#FFFFFF" : "rgba(255, 255, 255, 0.75)",
              fontWeight: 800,
              fontSize: "12px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "4px",
              fontFamily: "'Aref Ruqaa', serif",
              transition: "all 0.15s ease",
              whiteSpace: "nowrap",
            }}
          >
            <BookOpen size={13} />
            <span>القراءة</span>
            <span style={{ fontSize: "9.5px", backgroundColor: "rgba(0,0,0,0.25)", borderRadius: "999px", padding: "1px 5px" }}>
              {toArabicNumerals(completedCount)}/{toArabicNumerals(dailyGoal)}
            </span>
          </button>

          {/* Memorization Wird */}
          <button
            onClick={() => onModeChange("memorization")}
            style={{
              flex: 1,
              padding: "7px 6px",
              borderRadius: "7px",
              border: "none",
              backgroundColor: mode === "memorization" ? "#D97706" : "transparent",
              color: mode === "memorization" ? "#FFFFFF" : "rgba(255, 255, 255, 0.75)",
              fontWeight: 800,
              fontSize: "12px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "4px",
              fontFamily: "'Aref Ruqaa', serif",
              transition: "all 0.15s ease",
              whiteSpace: "nowrap",
            }}
          >
            <RotateCcw size={13} />
            <span>الحفظ والتكرار</span>
          </button>

          {/* Full Surahs Offline Listening */}
          <button
            onClick={() => onModeChange("listening")}
            style={{
              flex: 1,
              padding: "7px 6px",
              borderRadius: "7px",
              border: "none",
              backgroundColor: mode === "listening" ? "#785306" : "transparent",
              color: mode === "listening" ? "#FFFFFF" : "rgba(255, 255, 255, 0.75)",
              fontWeight: 800,
              fontSize: "12px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "4px",
              fontFamily: "'Aref Ruqaa', serif",
              transition: "all 0.15s ease",
              whiteSpace: "nowrap",
            }}
          >
            <Headphones size={13} />
            <span>استماع السور</span>
          </button>
        </div>
      )}

      {/* "آخر موضع قراءة" (Resume Last Reading Banner) */}
      {!isKidsMode && mode !== "listening" && (
        <div
          style={{
            maxWidth: "820px",
            margin: "5px auto 0",
            backgroundColor: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.18)",
            borderRadius: "8px",
            padding: "4px 10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "11px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ color: "#FCD34D", fontWeight: 800 }}>آخر موضع قراءة:</span>
            <span style={{ color: "#FFFFFF", fontWeight: 700 }}>
              سورة {lastReadSurah} (صفحة {toArabicNumerals(lastReadPage)})
            </span>
          </div>

          <button
            onClick={onResumeLastRead}
            style={{
              backgroundColor: "#F59E0B",
              color: "#0F172A",
              border: "none",
              borderRadius: "6px",
              padding: "2px 8px",
              fontSize: "10.5px",
              fontWeight: 900,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "2px",
            }}
          >
            <span>متابعة</span>
            <ChevronLeft size={11} />
          </button>
        </div>
      )}

      {/* Progress Bar for Reading Goal */}
      {!isKidsMode && mode === "reading" && (
        <div style={{ maxWidth: "820px", margin: "4px auto 0" }}>
          <div style={{ height: "3px", borderRadius: "999px", backgroundColor: "rgba(255,255,255,0.15)", overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: `${percent}%`,
                backgroundColor: "#F59E0B",
                transition: "width 0.3s ease",
              }}
            />
          </div>
        </div>
      )}
    </header>
  );
}
