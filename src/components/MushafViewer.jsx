// MushafViewer: Authentic Medina Quran Page Renderer with Natural Text Flow
// Zero Emojis, Zero Pulsing Animations, Ruq'ah and Amiri Quran Typography
// Fully Supports True Dark Mode: Deep Black Background & Crisp Pure White Ayahs Text
// Smart Recitation Verification: Ayah appears IF recited correctly, stays hidden IF wrong (لو اتسمعت صح تبان، ولو خطأ متظهرش)
import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Bookmark,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  Headphones,
  Loader2,
  Mic,
  MicOff,
  Play,
  RotateCcw,
  Square,
  Volume2,
  X,
} from "lucide-react";
import { getMushafPage, toArabicNumerals, getAyahTafsir } from "../lib/mushafService";

function GoldenCornerSVG({ className }) {
  return (
    <svg
      className={`golden-corner ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M2 2H12C12 7.52 7.52 12 2 12V2Z"
        fill="currentColor"
        fillOpacity="0.32"
      />
      <path
        d="M2 2H19C19 11.39 11.39 19 2 19V2Z"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <circle cx="5" cy="5" r="2" fill="currentColor" />
    </svg>
  );
}
import { SURAHS_LIST } from "../data/surahs";
import {
  playPageFlipSound,
  playCounterTick,
  playSuccessChime,
  playTryAgainSound,
} from "../lib/soundEffects";
import { checkAyahRecitationMatch } from "../lib/arabicMatcher";

export default function MushafViewer({
  currentPage,
  onPageChange,
  isCompleted,
  onToggleComplete,
  isBookmarked,
  onToggleBookmark,
  mode = "reading", // "reading" | "memorization"
  activeVerseKey = null,
  onSelectVerse,
  repetitionCount = 0,
  targetRepetitions = 5,
  onIncrementRepetition,
  onPlayAyah,
  isDark = false,
}) {
  const [pageData, setPageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hideTextForRecall, setHideTextForRecall] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);

  // Tafsir Modal State
  const [isTafsirOpen, setIsTafsirOpen] = useState(false);
  const [tafsirData, setTafsirData] = useState(null); // { verseKey, ayahText, text, loading }

  const handleOpenTafsir = async (verseKey, ayahText) => {
    setIsTafsirOpen(true);
    setTafsirData({ verseKey, ayahText, text: "", loading: true });
    try {
      const text = await getAyahTafsir(verseKey);
      setTafsirData({ verseKey, ayahText, text, loading: false });
    } catch {
      setTafsirData({ verseKey, ayahText, text: "تعذر جلب التفسير حالياً، يرجى المحاولة لاحقاً.", loading: false });
    }
  };

  // Dynamic Quran Font Size Control (Zoom in/out for mobile readability)
  const [quranFontSize, setQuranFontSize] = useState(() => {
    const saved = localStorage.getItem("wirdak_font_size");
    return saved ? Math.max(18, Math.min(38, Number(saved))) : 26;
  });

  const changeFontSize = (delta) => {
    setQuranFontSize((prev) => {
      const next = Math.max(18, Math.min(38, prev + delta));
      localStorage.setItem("wirdak_font_size", String(next));
      return next;
    });
  };

  // Touch Swipe for Natural Page Turning on Mobile
  const touchStartXRef = useRef(0);
  const touchEndXRef = useRef(0);

  const handleTouchStart = (e) => {
    touchStartXRef.current = e.targetTouches?.[0]?.clientX || 0;
  };

  const handleTouchMove = (e) => {
    touchEndXRef.current = e.targetTouches?.[0]?.clientX || 0;
  };

  const handleTouchEnd = () => {
    const diff = touchStartXRef.current - touchEndXRef.current;
    if (Math.abs(diff) > 55) {
      if (diff > 0) {
        // Swiped left in RTL: Go to next page
        handleNext();
      } else {
        // Swiped right in RTL: Go to previous page
        handlePrev();
      }
    }
  };

  // Memorization Mode: Revealed verses tracking map { [verseKey]: boolean }
  const [revealedVerseKeys, setRevealedVerseKeys] = useState({});
  const [isListeningRecitation, setIsListeningRecitation] = useState(false);
  const [spokenTranscript, setSpokenTranscript] = useState("");
  const [recitationFeedback, setRecitationFeedback] = useState(null);

  const recognitionRef = useRef(null);
  const spokenRef = useRef("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setRevealedVerseKeys({});
    setRecitationFeedback(null);
    setSpokenTranscript("");
    spokenRef.current = "";

    getMushafPage(currentPage)
      .then((data) => {
        if (active) {
          setPageData(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message || "تعذر تحميل الصفحة");
          setLoading(false);
        }
      });

    return () => {
      active = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, [currentPage]);

  // Find primary surah info for header
  const surahMeta =
    SURAHS_LIST.slice()
      .reverse()
      .find((s) => s.startPage <= currentPage) || SURAHS_LIST[0];

  // Active target verse in recitation mode (the one whose turn it is)
  const currentTargetAyah =
    pageData?.ayahs?.find((a) => a.verseKey === activeVerseKey) ||
    pageData?.ayahs?.find((a) => !revealedVerseKeys[a.verseKey]) ||
    pageData?.ayahs?.[0] ||
    null;

  const handleNext = () => {
    if (currentPage < 604) {
      playPageFlipSound();
      onPageChange(currentPage + 1);
    }
  };

  const handlePrev = () => {
    if (currentPage > 1) {
      playPageFlipSound();
      onPageChange(currentPage - 1);
    }
  };

  const handleCopyAyah = (e, text, verseKey) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedKey(verseKey);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Toggle hiding text: resets revealed state when enabling test
  const handleToggleRecallMode = () => {
    if (!hideTextForRecall) {
      setRevealedVerseKeys({});
      setRecitationFeedback(null);
      if (pageData?.ayahs?.[0]) {
        onSelectVerse(pageData.ayahs[0].verseKey);
      }
    }
    setHideTextForRecall(!hideTextForRecall);
  };

  // Oral Recitation for active verse
  const handleStartRecitation = () => {
    if (isListeningRecitation) {
      handleStopRecitation();
      return;
    }

    setSpokenTranscript("");
    spokenRef.current = "";
    setRecitationFeedback(null);

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setRecitationFeedback({
        type: "error",
        title: "التعرف الصوتي غير متاح في هذا المتصفح",
        desc: "يمكنك قراءة الآية شفوياً بصوتك، ثم الضغط على زر 'أتقنت الآية (تأكيد الحفظ)' بالأسفل لإظهارها مباشرة.",
      });
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "ar-SA";
      recognition.continuous = false;
      recognition.interimResults = true;
      recognitionRef.current = recognition;

      recognition.onresult = (e) => {
        const text = Array.from(e.results)
          .map((r) => r[0].transcript)
          .join("");
        setSpokenTranscript(text);
        spokenRef.current = text;
      };

      recognition.onerror = (e) => {
        setIsListeningRecitation(false);
        const errMsg =
          e?.error === "not-allowed"
            ? "يرجى منح الإذن للمايكروفون من إعدادات المتصفح أو التطبيق."
            : e?.error === "no-speech"
            ? "لم يتم سماع صوت واضح. يرجى التحدث قرب المايكروفون أو تأكيد الحفظ بالزر اليدوي."
            : "تعذر التقاط الصوت، يمكنك المحاولة مجدداً أو الضغط على زر 'أتقنت الآية'.";
        setRecitationFeedback({
          type: "error",
          title: "تنبيه المايكروفون",
          desc: errMsg,
        });
      };

      recognition.onend = () => {
        handleFinishRecitationCheck();
      };

      recognition.start();
      setIsListeningRecitation(true);
    } catch (err) {
      console.warn("Speech recognition error:", err);
      setIsListeningRecitation(false);
      setRecitationFeedback({
        type: "error",
        title: "تعذر تشغيل المايكروفون",
        desc: "يرجى التأكد من صلاحية المايك، أو استخدام زر 'أتقنت الآية' لتأكيد الحفظ مباشرة.",
      });
    }
  };

  const handleStopRecitation = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsListeningRecitation(false);
    handleFinishRecitationCheck();
  };

  const handleFinishRecitationCheck = () => {
    setIsListeningRecitation(false);
    const transcript = spokenRef.current || spokenTranscript;
    if (!currentTargetAyah) return;

    if (!transcript.trim()) {
      setRecitationFeedback({
        type: "error",
        title: "لم يتم التقاط كلمات التسميع",
        desc: "تحدث بوضوح قرب المايكروفون، أو اضغط زر 'أتقنت الآية (تأكيد الحفظ)' بالأسفل لإظهارها.",
      });
      return;
    }

    const isMatch = checkAyahRecitationMatch(transcript, currentTargetAyah.text);

    if (isMatch) {
      // ✅ SUCCESS: Reveal this Ayah!
      playSuccessChime();
      setRevealedVerseKeys((prev) => ({
        ...prev,
        [currentTargetAyah.verseKey]: true,
      }));

      // Find next unrevealed Ayah on the page
      const nextUnrevealed = pageData?.ayahs?.find(
        (a) => a.verseKey !== currentTargetAyah.verseKey && !revealedVerseKeys[a.verseKey]
      );

      setRecitationFeedback({
        type: "success",
        title: "تلاوة صحيحة ومباركة!",
        desc: nextUnrevealed
          ? `ظهرت الآية (${toArabicNumerals(currentTargetAyah.numberInSurah)}) بنجاح. دورك الآن في الآية التالية.`
          : "ما شاء الله! تم تسميع جميع آيات الصفحة بنجاح!",
      });

      if (nextUnrevealed) {
        setTimeout(() => {
          onSelectVerse(nextUnrevealed.verseKey);
          setRecitationFeedback(null);
          setSpokenTranscript("");
          spokenRef.current = "";
        }, 1800);
      }
    } else {
      // ❌ INCORRECT: Ayah DOES NOT appear! It stays hidden!
      playTryAgainSound();
      setRecitationFeedback({
        type: "error",
        title: "القراءة غير مطابقة للآية المطلوبة",
        desc: "الآية لم تظهر لأن التسميع غير دقيق. حاول مجدداً وسَمّع الآية بصوتك حتى تتقنها وتظهر!",
      });
    }
  };

  // Manual Confirmation Fallback: Allow student/child to confirm memorization directly
  const handleManualPassAyah = () => {
    if (!currentTargetAyah) return;
    playSuccessChime();
    setRevealedVerseKeys((prev) => ({
      ...prev,
      [currentTargetAyah.verseKey]: true,
    }));

    const nextUnrevealed = pageData?.ayahs?.find(
      (a) => a.verseKey !== currentTargetAyah.verseKey && !revealedVerseKeys[a.verseKey]
    );

    setRecitationFeedback({
      type: "success",
      title: "تم تأكيد حفظ الآية بنجاح!",
      desc: nextUnrevealed
        ? `ظهرت الآية (${toArabicNumerals(currentTargetAyah.numberInSurah)}) بنجاح. دورك الآن في الآية التالية.`
        : "ما شاء الله! تم تسميع وحفظ جميع آيات الصفحة بنجاح!",
    });

    if (nextUnrevealed) {
      setTimeout(() => {
        onSelectVerse(nextUnrevealed.verseKey);
        setRecitationFeedback(null);
        setSpokenTranscript("");
        spokenRef.current = "";
      }, 1800);
    }
  };

  const handleRevealSingleAyah = (key) => {
    setRevealedVerseKeys((prev) => ({ ...prev, [key]: true }));
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
        maxWidth: "760px",
        margin: "0 auto",
        direction: "rtl",
      }}
    >
      {/* Top Page Header Bar */}
      <div
        className="wird-mushaf-top-bar"
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 12px",
          marginBottom: "10px",
          backgroundColor: isDark ? "#090D16" : "#FFFFFF",
          borderRadius: "14px",
          border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid #E2E8F0",
          boxShadow: isDark ? "0 2px 8px rgba(0,0,0,0.4)" : "0 2px 6px rgba(0,0,0,0.03)",
          boxSizing: "border-box",
        }}
      >
        {/* Row 1: Surah Name, Juz + Font Zoom Controls */}
        <div className="wird-mushaf-top-row1" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{
                fontFamily: "'Aref Ruqaa', serif",
                fontSize: "16px",
                fontWeight: 800,
                color: isDark ? "#FCD34D" : "#064E3B",
              }}
            >
              سورة {pageData?.surah?.name?.replace("سُورَةُ ", "") || surahMeta.name}
            </span>
            <span style={{ fontSize: "11.5px", color: isDark ? "#94A3B8" : "#64748B" }}>
              الجزء {toArabicNumerals(pageData?.juz || surahMeta.juz || 1)}
            </span>
          </div>

          {/* Quick Font Size Adjuster for Mobile Visibility */}
          <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
            <button
              onClick={() => changeFontSize(-2)}
              title="تصغير خط الآيات"
              style={{
                width: "26px",
                height: "26px",
                borderRadius: "6px",
                border: isDark ? "1px solid #334155" : "1px solid #CBD5E1",
                background: isDark ? "#1E293B" : "#F1F5F9",
                color: isDark ? "#E2E8F0" : "#475569",
                fontSize: "11px",
                fontWeight: 900,
                cursor: "pointer",
                display: "grid",
                placeItems: "center",
              }}
            >
              A-
            </button>
            <button
              onClick={() => changeFontSize(+2)}
              title="تكبير خط الآيات"
              style={{
                width: "26px",
                height: "26px",
                borderRadius: "6px",
                border: isDark ? "1px solid #334155" : "1px solid #CBD5E1",
                background: isDark ? "#1E293B" : "#F1F5F9",
                color: isDark ? "#E2E8F0" : "#475569",
                fontSize: "12px",
                fontWeight: 900,
                cursor: "pointer",
                display: "grid",
                placeItems: "center",
              }}
            >
              A+
            </button>
          </div>
        </div>

        {/* Row 2: Action Buttons */}
        <div className="wird-mushaf-top-row2" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {/* Recall Mode Toggle for Memorization */}
          {mode === "memorization" && (
            <button
              onClick={handleToggleRecallMode}
              title={hideTextForRecall ? "إظهار النص العادي" : "إخفاء النص للتسميع بالمايك"}
              style={{
                background: hideTextForRecall
                  ? (isDark ? "rgba(217, 119, 6, 0.25)" : "#FEF3C7")
                  : (isDark ? "#1E293B" : "#F8FAFC"),
                color: hideTextForRecall
                  ? (isDark ? "#FDE68A" : "#B45309")
                  : (isDark ? "#E2E8F0" : "#475569"),
                border: hideTextForRecall
                  ? "1px solid #D97706"
                  : (isDark ? "1px solid #334155" : "1px solid #CBD5E1"),
                borderRadius: "8px",
                padding: "6px 10px",
                fontSize: "11.5px",
                fontWeight: 800,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              {hideTextForRecall ? <EyeOff size={13} /> : <Eye size={13} />}
              <span>{hideTextForRecall ? "مخفي" : "اختبار الحفظ"}</span>
            </button>
          )}

          {/* Bookmark Button */}
          <button
            onClick={onToggleBookmark}
            title="حفظ الفاصل المرجعي"
            style={{
              background: isBookmarked
                ? (isDark ? "#059669" : "#064E3B")
                : (isDark ? "#1E293B" : "transparent"),
              color: isBookmarked ? "#FFFFFF" : (isDark ? "#94A3B8" : "#64748B"),
              border: isDark ? "1px solid #334155" : "1px solid #CBD5E1",
              borderRadius: "8px",
              padding: "6px 10px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "11.5px",
              fontWeight: 700,
            }}
          >
            <Bookmark size={13} />
            <span>{isBookmarked ? "محفوظة" : "فاصل"}</span>
          </button>

          {/* Mark Completed Button */}
          <button
            onClick={onToggleComplete}
            style={{
              background: isCompleted
                ? "#059669"
                : (isDark ? "#1E293B" : "#F8FAFC"),
              color: isCompleted ? "#FFFFFF" : (isDark ? "#E2E8F0" : "#475569"),
              border: isCompleted ? "none" : (isDark ? "1px solid #334155" : "1px solid #CBD5E1"),
              borderRadius: "8px",
              padding: "6px 12px",
              fontSize: "11.5px",
              fontWeight: 800,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <Check size={13} strokeWidth={2.5} />
            <span>{isCompleted ? "تمت القراءة" : "كمقروءة"}</span>
          </button>
        </div>
      </div>

      {/* Main Mushaf Page Frame — Authentic Golden Quran Frame with Double Gilded Border & Ornaments */}
      <div
        className="golden-mushaf-frame"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Four Islamic Golden Corner Motifs */}
        <GoldenCornerSVG className="golden-corner-tl" />
        <GoldenCornerSVG className="golden-corner-tr" />
        <GoldenCornerSVG className="golden-corner-bl" />
        <GoldenCornerSVG className="golden-corner-br" />

        {/* Inner Gilded Frame */}
        <div className="golden-mushaf-inner-frame">
          {/* Top Medina Header inside Gilded Frame */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingBottom: "8px",
              borderBottom: "1px solid var(--border)",
              marginBottom: "14px",
              fontSize: "12.5px",
              fontWeight: 800,
              fontFamily: "'Aref Ruqaa', serif",
              color: isDark ? "#FCD34D" : "#785306",
            }}
          >
            <span>سُورَةُ {pageData?.surah?.name?.replace("سُورَةُ ", "") || surahMeta.name}</span>
            <span style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
              الجُزْءُ {toArabicNumerals(pageData?.juz || surahMeta.juz || 1)}
            </span>
            <span>الحِزْبُ {toArabicNumerals(Math.ceil(((pageData?.juz || 1) - 1) * 2 + 1))}</span>
          </div>
        {/* Loading Spinner */}
        {loading && (
          <div
            style={{
              margin: "auto",
              textAlign: "center",
              padding: "80px 20px",
              color: isDark ? "#34D399" : "#064E3B",
            }}
          >
            <Loader2 size={30} className="wird-spin" style={{ margin: "0 auto 12px" }} />
            <div style={{ fontSize: "14px", fontWeight: 700, fontFamily: "'Aref Ruqaa', serif" }}>
              جاري فتح صفحة المصحف الشريف ({toArabicNumerals(currentPage)})...
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div style={{ margin: "auto", textAlign: "center", color: "#DC2626", padding: "40px 20px" }}>
            <div style={{ fontSize: "14px", fontWeight: 700 }}>{error}</div>
            <button
              onClick={() => onPageChange(currentPage)}
              style={{
                marginTop: "12px",
                background: "#064E3B",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "999px",
                padding: "8px 20px",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              إعادة المحاولة
            </button>
          </div>
        )}

        {/* Quran Page Content with Authentic Medina Flow */}
        {!loading && !error && pageData && (
          <div
            style={{
              userSelect: "none",
              width: "100%",
            }}
          >
            {pageData.ayahs?.map((ayah, idx) => {
              const isSelected = activeVerseKey === ayah.verseKey;
              const isRevealed = !hideTextForRecall || Boolean(revealedVerseKeys[ayah.verseKey]);
              const isTargetTurn =
                hideTextForRecall &&
                currentTargetAyah &&
                currentTargetAyah.verseKey === ayah.verseKey;

              return (
                <div key={ayah.number} style={{ display: "inline" }}>
                  {/* Surah Header Cartouche in Golden Quran Style */}
                  {ayah.isFirstAyahInSurah && (
                    <div className="golden-surah-cartouche">
                      <div className="golden-surah-title">
                        سُورَةُ {ayah.surah?.name?.replace("سُورَةُ ", "")}
                      </div>
                      <div className="golden-surah-meta">
                        {ayah.surah?.revelationType === "Meccan" ? "مَكِّيَّةٌ" : "مَدَنِيَّةٌ"} • آيَاتُهَا {toArabicNumerals(ayah.surah?.numberOfAyahs || 0)}
                      </div>
                    </div>
                  )}

                  {/* Basmalah Calligraphy Header */}
                  {ayah.hasBasmalaHeader && (
                    <div className="golden-basmalah-header">
                      بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
                    </div>
                  )}

                  {/* Ayah Text and Circular Golden Medallion */}
                  <span
                    onClick={() => {
                      onSelectVerse(ayah.verseKey);
                      if (hideTextForRecall && !isRevealed) {
                        // Select as current recitation target
                      } else {
                        onPlayAyah(ayah.verseKey);
                      }
                    }}
                    className={`golden-ayah-span ${isSelected ? "is-selected" : ""}`}
                    style={{
                      fontFamily: "'Amiri Quran', 'Scheherazade New', serif",
                      fontSize: `${quranFontSize}px`,
                      lineHeight: `${Math.max(2.35, quranFontSize * 0.09)}`,
                      color: isDark
                        ? (isSelected ? "#FDE68A" : "#FFFFFF")
                        : (isSelected ? "#78350F" : "var(--mushaf-text)"),
                      border: isTargetTurn ? `1px dashed ${isDark ? "#D97706" : "#F59E0B"}` : "none",
                    }}
                  >
                    {isRevealed ? (
                      ayah.text
                    ) : (
                      /* Masked text when hidden */
                      <span
                        style={{
                          letterSpacing: "3px",
                          opacity: 0.45,
                          color: "var(--text-muted)",
                          fontFamily: "monospace",
                        }}
                      >
                        ••••••••••••
                      </span>
                    )}{" "}
                    {/* Authentic Golden Ayah Medallion */}
                    <span
                      className="golden-ayah-mark"
                      title={`الآية ${toArabicNumerals(ayah.numberInSurah)}`}
                    >
                      <span>{toArabicNumerals(ayah.numberInSurah)}</span>
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Selected Ayah Golden Quick Action Ribbon */}
        {!hideTextForRecall && activeVerseKey && (
          <div
            style={{
              width: "100%",
              marginTop: "16px",
              padding: "10px 14px",
              backgroundColor: "var(--bg-card)",
              border: "1.5px solid var(--accent-gold)",
              borderRadius: "14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              boxShadow: "0 4px 18px var(--mushaf-gold-glow)",
              boxSizing: "border-box",
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "13px",
                fontWeight: 800,
                color: "var(--accent-gold)",
                fontFamily: "'Aref Ruqaa', serif",
              }}
            >
              <Headphones size={15} />
              <span>الآية {activeVerseKey}</span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
              {/* Listen button */}
              <button
                onClick={() => onPlayAyah(activeVerseKey)}
                style={{
                  background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: "8px",
                  padding: "6px 11px",
                  fontSize: "11.5px",
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <Play size={12} fill="#FFFFFF" />
                <span>استماع</span>
              </button>

              {/* Repetition for memorization */}
              <button
                onClick={onIncrementRepetition}
                style={{
                  background: "linear-gradient(135deg, #D97706 0%, #B45309 100%)",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: "8px",
                  padding: "6px 11px",
                  fontSize: "11.5px",
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <RotateCcw size={12} />
                <span>تكرار ({toArabicNumerals(repetitionCount)})</span>
              </button>

              {/* Tafsir button */}
              <button
                onClick={() => {
                  const match = pageData?.ayahs?.find((a) => a.verseKey === activeVerseKey);
                  handleOpenTafsir(activeVerseKey, match?.text || "");
                }}
                style={{
                  background: "linear-gradient(135deg, #B8860B 0%, #8C6708 100%)",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: "8px",
                  padding: "6px 11px",
                  fontSize: "11.5px",
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <BookOpen size={12} />
                <span>تفسير</span>
              </button>

              {/* Bookmark button */}
              <button
                onClick={onToggleBookmark}
                style={{
                  background: isBookmarked ? "var(--primary)" : "var(--bg-card-subtle)",
                  color: isBookmarked ? "#FFFFFF" : "var(--text)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  padding: "6px 9px",
                  fontSize: "11.5px",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "3px",
                }}
              >
                <Bookmark size={12} />
                <span>فاصل</span>
              </button>

              {/* Copy button */}
              <button
                onClick={(e) => {
                  const match = pageData?.ayahs?.find((a) => a.verseKey === activeVerseKey);
                  if (match) handleCopyAyah(e, match.text, activeVerseKey);
                }}
                style={{
                  background: "var(--bg-card-subtle)",
                  color: "var(--text)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  padding: "6px 9px",
                  fontSize: "11.5px",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "3px",
                }}
              >
                <Copy size={12} />
                <span>{copiedKey === activeVerseKey ? "تم النسخ" : "نسخ"}</span>
              </button>
            </div>
          </div>
        )}

        {/* =========================================================================
            ORAL RECITATION TESTING DOCK (عند إخفاء النص للتسميع - لو اتسمعت صح تبان)
            ========================================================================= */}
        {hideTextForRecall && currentTargetAyah && (
          <div
            style={{
              marginTop: "16px",
              padding: "14px 16px",
              backgroundColor: isDark ? "#090D16" : "#F0FDF4",
              border: `2px solid ${isListeningRecitation ? "#10B981" : isDark ? "#D97706" : "#059669"}`,
              borderRadius: "14px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Mic size={15} color="#D97706" />
                <span style={{ fontSize: "13px", fontWeight: 900, color: isDark ? "#FCD34D" : "#065F46" }}>
                  الآية التي عليها الدور: الآية {toArabicNumerals(currentTargetAyah.numberInSurah)}
                </span>
              </div>

              <button
                onClick={() => handleRevealSingleAyah(currentTargetAyah.verseKey)}
                style={{
                  background: "transparent",
                  border: isDark ? "1px solid #334155" : "1px solid #CBD5E1",
                  borderRadius: "6px",
                  padding: "3px 8px",
                  fontSize: "10.5px",
                  color: isDark ? "#94A3B8" : "#64748B",
                  cursor: "pointer",
                }}
              >
                كشف الآية للمساعدة
              </button>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <button
                onClick={isListeningRecitation ? handleStopRecitation : handleStartRecitation}
                style={{
                  backgroundColor: isListeningRecitation ? "#EF4444" : "#059669",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: "10px",
                  padding: "9px 18px",
                  fontSize: "13px",
                  fontWeight: 900,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: isListeningRecitation
                    ? "0 0 14px rgba(239, 68, 68, 0.6)"
                    : "0 2px 8px rgba(5, 150, 105, 0.3)",
                }}
              >
                {isListeningRecitation ? <Square size={14} /> : <Mic size={15} />}
                <span>{isListeningRecitation ? "إنهاء التسميع والتحقق" : "سَمّع الآية بالمايكروفون"}</span>
              </button>

              <button
                onClick={handleManualPassAyah}
                style={{
                  backgroundColor: isDark ? "#1E293B" : "#F8FAFC",
                  color: isDark ? "#34D399" : "#059669",
                  border: isDark ? "1px solid #059669" : "1px solid #10B981",
                  borderRadius: "10px",
                  padding: "9px 16px",
                  fontSize: "12.5px",
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                }}
              >
                <Check size={14} strokeWidth={2.5} />
                <span>أتقنت الآية (تأكيد الحفظ)</span>
              </button>
            </div>

            {/* Transcript preview */}
            {spokenTranscript && (
              <div
                style={{
                  fontSize: "12px",
                  color: isDark ? "#F1F5F9" : "#1F2937",
                  backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#FFFFFF",
                  padding: "6px 10px",
                  borderRadius: "8px",
                  border: isDark ? "1px solid #334155" : "1px solid #E2E8F0",
                }}
              >
                صوتك: «{spokenTranscript}»
              </div>
            )}

            {/* Feedback message */}
            {recitationFeedback && (
              <div
                style={{
                  padding: "8px 12px",
                  borderRadius: "10px",
                  backgroundColor:
                    recitationFeedback.type === "success"
                      ? isDark
                        ? "rgba(16, 185, 129, 0.2)"
                        : "#DCFCE7"
                      : isDark
                      ? "rgba(220, 38, 38, 0.2)"
                      : "#FEE2E2",
                  border: `1px solid ${recitationFeedback.type === "success" ? "#22C55E" : "#EF4444"}`,
                  fontSize: "12px",
                  fontWeight: 700,
                  color:
                    recitationFeedback.type === "success"
                      ? isDark
                        ? "#86EFAC"
                        : "#15803D"
                      : isDark
                      ? "#FCA5A5"
                      : "#991B1B",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                {recitationFeedback.type === "success" ? <Check size={14} /> : <AlertCircle size={14} />}
                <span>
                  <strong>{recitationFeedback.title}</strong> — {recitationFeedback.desc}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Page Footer Frame */}
        <div
          style={{
            marginTop: "20px",
            paddingTop: "12px",
            borderTop: isDark ? "1px dashed #78350F" : "1px dashed #C29B38",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "12px",
            color: isDark ? "#94A3B8" : "#64748B",
            fontWeight: 700,
          }}
        >
          <span>الجزء {toArabicNumerals(pageData?.juz || surahMeta.juz || 1)}</span>
          <span
            style={{
              fontFamily: "'Aref Ruqaa', serif",
              fontSize: "15px",
              fontWeight: 900,
              color: isDark ? "#FCD34D" : "#064E3B",
            }}
          >
            — {toArabicNumerals(currentPage)} —
          </span>
          <span>الحزب {toArabicNumerals(Math.ceil(((pageData?.juz || 1) - 1) * 2 + 1))}</span>
        </div>
      </div>
    </div>

      {/* Memorization Repetition Counter Dock */}
      {mode === "memorization" && !hideTextForRecall && (
        <div
          style={{
            width: "100%",
            marginTop: "12px",
            padding: "12px 16px",
            backgroundColor: isDark ? "#090D16" : "#FFFFFF",
            borderRadius: "16px",
            border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid #E2E8F0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: isDark ? "0 2px 8px rgba(0,0,0,0.3)" : "0 2px 8px rgba(0,0,0,0.04)",
          }}
        >
          <div>
            <div style={{ fontSize: "11px", color: isDark ? "#94A3B8" : "#64748B", fontWeight: 700 }}>
              عداد تكرار الحفظ
            </div>
            <div
              style={{
                fontSize: "15px",
                fontWeight: 900,
                color: isDark ? "#FCD34D" : "#064E3B",
                fontFamily: "'Aref Ruqaa', serif",
              }}
            >
              {toArabicNumerals(repetitionCount)} من {toArabicNumerals(targetRepetitions)} تكرارات
            </div>
          </div>

          <button
            onClick={() => {
              playCounterTick();
              onIncrementRepetition();
            }}
            style={{
              backgroundColor: isDark ? "#059669" : "#064E3B",
              color: "#FFFFFF",
              border: "none",
              borderRadius: "10px",
              padding: "8px 16px",
              fontSize: "12.5px",
              fontWeight: 800,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "5px",
            }}
          >
            <RotateCcw size={14} />
            <span>+1 تكرار</span>
          </button>
        </div>
      )}

      {/* Navigation Buttons */}
      <div
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: "12px",
          gap: "10px",
        }}
      >
        <button
          onClick={handleNext}
          disabled={currentPage >= 604}
          className="wird-nav-btn"
          style={{
            flex: 1,
            backgroundColor: currentPage >= 604
              ? (isDark ? "#1E293B" : "#F1F5F9")
              : (isDark ? "#090D16" : "#FFFFFF"),
            color: currentPage >= 604
              ? (isDark ? "#64748B" : "#94A3B8")
              : (isDark ? "#F1F5F9" : "#0F172A"),
            border: isDark ? "1px solid #334155" : "1px solid #CBD5E1",
            borderRadius: "10px",
            padding: "10px 16px",
            fontSize: "13px",
            fontWeight: 800,
            cursor: currentPage >= 604 ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "5px",
            minHeight: "46px",
          }}
        >
          <ChevronRight size={15} />
          <span>الصفحة التالية ({currentPage < 604 ? toArabicNumerals(currentPage + 1) : "—"})</span>
        </button>

        <button
          onClick={handlePrev}
          disabled={currentPage <= 1}
          className="wird-nav-btn"
          style={{
            flex: 1,
            backgroundColor: currentPage <= 1
              ? (isDark ? "#1E293B" : "#F1F5F9")
              : (isDark ? "#090D16" : "#FFFFFF"),
            color: currentPage <= 1
              ? (isDark ? "#64748B" : "#94A3B8")
              : (isDark ? "#F1F5F9" : "#0F172A"),
            border: isDark ? "1px solid #334155" : "1px solid #CBD5E1",
            borderRadius: "10px",
            padding: "10px 16px",
            fontSize: "13px",
            fontWeight: 800,
            cursor: currentPage <= 1 ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "5px",
            minHeight: "46px",
          }}
        >
          <span>({currentPage > 1 ? toArabicNumerals(currentPage - 1) : "—"}) الصفحة السابقة</span>
          <ChevronLeft size={15} />
        </button>
      </div>

      {/* Tafsir Al-Muyassar Modal */}
      {isTafsirOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            zIndex: 2500,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
            direction: "rtl",
          }}
          onClick={() => setIsTafsirOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: isDark ? "#141009" : "#FDFBF7",
              border: "2px solid var(--accent-gold)",
              borderRadius: "18px",
              maxWidth: "520px",
              width: "100%",
              padding: "20px",
              boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: "1px solid var(--border)",
                paddingBottom: "10px",
                marginBottom: "14px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <BookOpen size={18} color="var(--accent-gold)" />
                <h3
                  style={{
                    margin: 0,
                    fontFamily: "'Aref Ruqaa', serif",
                    fontSize: "17px",
                    fontWeight: 900,
                    color: isDark ? "#FDE68A" : "#664903",
                  }}
                >
                  التفسير الميسر — الآية {tafsirData?.verseKey}
                </h3>
              </div>
              <button
                onClick={() => setIsTafsirOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  padding: "4px",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div
              style={{
                fontFamily: "'Amiri Quran', serif",
                fontSize: "19px",
                lineHeight: 2.1,
                color: isDark ? "#FCD34D" : "#78350F",
                marginBottom: "14px",
                padding: "10px 14px",
                backgroundColor: isDark ? "rgba(212, 175, 55, 0.08)" : "rgba(198, 146, 20, 0.06)",
                borderRadius: "10px",
                border: "1px dashed var(--border)",
              }}
            >
              {tafsirData?.ayahText}
            </div>

            <div
              style={{
                fontSize: "14px",
                lineHeight: 1.85,
                color: "var(--text)",
                maxHeight: "260px",
                overflowY: "auto",
                padding: "0 4px",
              }}
            >
              {tafsirData?.loading ? (
                <div style={{ textAlign: "center", padding: "26px", color: "var(--accent-gold)" }}>
                  <Loader2 size={24} className="wird-spin" style={{ margin: "0 auto 8px" }} />
                  <div>جاري جلب التفسير الميسر...</div>
                </div>
              ) : (
                tafsirData?.text
              )}
            </div>

            <button
              onClick={() => setIsTafsirOpen(false)}
              style={{
                marginTop: "18px",
                width: "100%",
                padding: "10px",
                backgroundColor: "var(--primary)",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "10px",
                fontWeight: 800,
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              إغلاق النافذة
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
