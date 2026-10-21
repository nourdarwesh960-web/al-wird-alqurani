// MushafViewer: Authentic Medina Quran Page Renderer with Natural Text Flow
// Zero Emojis, Zero Pulsing Animations, Ruq'ah and Amiri Quran Typography
// Fully Supports True Dark Mode: Deep Black Background & Crisp Pure White Ayahs Text
// Smart Recitation Verification: Ayah appears IF recited correctly, stays hidden IF wrong (لو اتسمعت صح تبان، ولو خطأ متظهرش)
import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Bookmark,
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
} from "lucide-react";
import { getMushafPage, toArabicNumerals } from "../lib/mushafService";
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

      {/* Main Mushaf Page Frame — True Pure Black Background in Dark Mode with Swipe Handlers */}
      <div
        className="wird-mushaf-card"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          position: "relative",
          width: "100%",
          minHeight: "520px",
          backgroundColor: isDark ? "#000000" : "#FFFEF9",
          border: isDark ? "3px double #B45309" : "3px double #C29B38",
          borderRadius: "14px",
          boxShadow: isDark
            ? "0 8px 30px rgba(0,0,0,0.85), inset 0 0 50px rgba(217, 119, 6, 0.08)"
            : "0 8px 30px rgba(0,0,0,0.06), inset 0 0 45px rgba(194, 155, 56, 0.04)",
          padding: "16px 10px",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          transition: "background-color 0.2s ease, border-color 0.2s ease",
        }}
      >
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
                  {/* Surah Header Banner if first ayah in Surah */}
                  {ayah.isFirstAyahInSurah && (
                    <div
                      style={{
                        display: "block",
                        width: "100%",
                        margin: idx === 0 ? "0 0 16px" : "24px 0 16px",
                        textAlign: "center",
                      }}
                    >
                      <div
                        style={{
                          display: "inline-block",
                          width: "94%",
                          maxWidth: "460px",
                          padding: "6px 14px",
                          border: isDark ? "2px solid #D97706" : "2px solid #C29B38",
                          borderRadius: "14px",
                          backgroundColor: isDark
                            ? "rgba(217, 119, 6, 0.16)"
                            : "rgba(194, 155, 56, 0.08)",
                          color: isDark ? "#FDE68A" : "#78350F",
                        }}
                      >
                        <div
                          style={{
                            fontFamily: "'Aref Ruqaa', serif",
                            fontSize: "21px",
                            fontWeight: 900,
                          }}
                        >
                          سُورَةُ {ayah.surah?.name?.replace("سُورَةُ ", "")}
                        </div>
                        <div
                          style={{
                            fontSize: "11px",
                            color: isDark ? "#FCD34D" : "#92400E",
                            marginTop: "2px",
                          }}
                        >
                          {ayah.surah?.revelationType === "Meccan" ? "مكية" : "مدنية"} • آياتها {toArabicNumerals(ayah.surah?.numberOfAyahs || 0)}
                        </div>
                      </div>

                      {/* Basmala Display */}
                      {ayah.hasBasmalaHeader && (
                        <div
                          style={{
                            fontFamily: "'Amiri Quran', serif",
                            fontSize: "22px",
                            color: isDark ? "#FDE68A" : "#064E3B",
                            margin: "12px 0 8px",
                            textAlign: "center",
                          }}
                        >
                          بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
                        </div>
                      )}
                    </div>
                  )}

                  {/* Ayah Text and Circular Badge — Reveals IF Correct, Stays Hidden IF Wrong */}
                  <span
                    onClick={() => {
                      onSelectVerse(ayah.verseKey);
                      if (hideTextForRecall && !isRevealed) {
                        // Select as current recitation target
                      } else {
                        onPlayAyah(ayah.verseKey);
                      }
                    }}
                    style={{
                      fontFamily: "'Amiri Quran', 'Aref Ruqaa', serif",
                      fontSize: `${quranFontSize}px`,
                      lineHeight: `${Math.max(2.35, quranFontSize * 0.09)}`,
                      color: isDark
                        ? (isSelected ? "#FDE68A" : "#FFFFFF")
                        : (isSelected ? "#92400E" : "#0F172A"),
                      backgroundColor: isSelected
                        ? (isDark ? "rgba(217, 119, 6, 0.3)" : "rgba(245, 158, 11, 0.16)")
                        : isTargetTurn
                        ? (isDark ? "rgba(217, 119, 6, 0.25)" : "rgba(245, 158, 11, 0.12)")
                        : "transparent",
                      borderRadius: "6px",
                      padding: "2px 4px",
                      cursor: "pointer",
                      transition: "background 0.15s ease",
                      display: "inline",
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
                          color: isDark ? "#94A3B8" : "#64748B",
                          fontFamily: "monospace",
                        }}
                      >
                        ••••••••••••
                      </span>
                    )}{" "}
                    {/* Ayah Badge Number — Warm Gold in Dark Mode */}
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "24px",
                        height: "24px",
                        borderRadius: "50%",
                        border: isRevealed
                          ? (isDark ? "1px solid #10B981" : "1px solid #059669")
                          : (isDark ? "1px solid #D97706" : "1px solid #C29B38"),
                        color: isRevealed
                          ? (isDark ? "#34D399" : "#059669")
                          : (isDark ? "#FDE68A" : "#92400E"),
                        fontSize: "12px",
                        fontWeight: 700,
                        margin: "0 4px",
                        verticalAlign: "middle",
                        fontFamily: "'IBM Plex Sans Arabic', sans-serif",
                        backgroundColor: isSelected
                          ? (isDark ? "rgba(217, 119, 6, 0.45)" : "rgba(245, 158, 11, 0.25)")
                          : (isDark ? "rgba(217, 119, 6, 0.18)" : "rgba(194, 155, 56, 0.08)"),
                      }}
                    >
                      {toArabicNumerals(ayah.numberInSurah)}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Selected Ayah Quick Control Bar (in standard reading mode) */}
        {!hideTextForRecall && activeVerseKey && (
          <div
            style={{
              marginTop: "16px",
              padding: "8px 12px",
              backgroundColor: isDark ? "#0F172A" : "#FFFFFF",
              border: isDark ? "1px solid #D97706" : "1px solid #C29B38",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "12px",
                fontWeight: 800,
                color: isDark ? "#FCD34D" : "#064E3B",
              }}
            >
              <Headphones size={13} />
              <span>الآية {activeVerseKey}</span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <button
                onClick={() => onPlayAyah(activeVerseKey)}
                style={{
                  background: "#059669",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: "8px",
                  padding: "5px 10px",
                  fontSize: "11px",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "3px",
                }}
              >
                <Play size={11} />
                <span>استماع</span>
              </button>

              <button
                onClick={(e) => {
                  const match = pageData?.ayahs?.find((a) => a.verseKey === activeVerseKey);
                  if (match) handleCopyAyah(e, match.text, activeVerseKey);
                }}
                style={{
                  background: isDark ? "#1E293B" : "#F8FAFC",
                  color: isDark ? "#E2E8F0" : "#475569",
                  border: isDark ? "1px solid #334155" : "1px solid #CBD5E1",
                  borderRadius: "8px",
                  padding: "5px 8px",
                  fontSize: "11px",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "3px",
                }}
              >
                <Copy size={11} />
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
    </div>
  );
}
