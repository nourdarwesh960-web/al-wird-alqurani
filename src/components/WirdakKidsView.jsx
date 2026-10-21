// Wirdak for Kids (وضع وردك للأطفال)
// Simplified, high-encouragement memorization interface with Oral Recitation
// Supports ALL 114 Surahs of the Holy Quran, Zero Emojis
// Smart Ayah Reveal on Correct Recitation (لو اتسمعت صح تبان، ولو خطأ متظهرش)
import { useState, useEffect, useRef, useMemo } from "react";
import {
  Baby,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Headphones,
  Mic,
  MicOff,
  Pause,
  Repeat,
  RotateCcw,
  Search,
  Square,
  Volume2,
  X,
  Award,
  AlertCircle,
} from "lucide-react";
import { getSurahAyahs, toArabicNumerals } from "../lib/mushafService";
import {
  playSuccessChime,
  playPageFlipSound,
  playTryAgainSound,
} from "../lib/soundEffects";
import { checkAyahRecitationMatch } from "../lib/arabicMatcher";
import { SURAHS_LIST } from "../data/surahs";

export default function WirdakKidsView({ onExitKidsMode, isDark = false }) {
  const [selectedSurahNum, setSelectedSurahNum] = useState(1);
  const [activeCategory, setActiveCategory] = useState("short"); // "short" | "amma" | "tabarak" | "all"
  const [surahSearch, setSurahSearch] = useState("");
  const [surahData, setSurahData] = useState(null);
  const [currentAyahIndex, setCurrentAyahIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  // Memorization Mode: Hide Text until correctly recited
  const [isHideMode, setIsHideMode] = useState(true);
  const [revealedAyahs, setRevealedAyahs] = useState({}); // map: { [ayahNumberInSurah]: boolean }

  // Audio Playback
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [repsTarget, setRepsTarget] = useState(3);
  const [currentRep, setCurrentRep] = useState(0);
  const audioRef = useRef(null);

  // Speech Recognition & Oral Recitation
  const [isListening, setIsListening] = useState(false);
  const [spokenText, setSpokenText] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [score, setScore] = useState(() => {
    return parseInt(localStorage.getItem("wirdak_kids_score") || "0", 10);
  });
  const [recordedAudioUrl, setRecordedAudioUrl] = useState(null);
  const [isPlayingRecording, setIsPlayingRecording] = useState(false);

  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingPlayerRef = useRef(null);
  const spokenTextRef = useRef("");

  // Filtered Surahs based on category & search
  const visibleSurahs = useMemo(() => {
    let list = SURAHS_LIST;
    if (activeCategory === "short") {
      list = SURAHS_LIST.filter((s) => s.number === 1 || s.number >= 103);
    } else if (activeCategory === "amma") {
      list = SURAHS_LIST.filter((s) => s.number >= 78);
    } else if (activeCategory === "tabarak") {
      list = SURAHS_LIST.filter((s) => s.number >= 67 && s.number <= 77);
    }

    if (surahSearch.trim()) {
      const q = surahSearch.trim();
      return list.filter(
        (s) => s.name.includes(q) || String(s.number).includes(q)
      );
    }
    return list;
  }, [activeCategory, surahSearch]);

  // 1. Load Surah Ayahs & Reset Revealed State
  useEffect(() => {
    let active = true;
    setLoading(true);
    setSpokenText("");
    spokenTextRef.current = "";
    setFeedback(null);
    setRecordedAudioUrl(null);
    setRevealedAyahs({});
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    }

    getSurahAyahs(selectedSurahNum).then((data) => {
      if (!active) return;
      setSurahData(data);
      setCurrentAyahIndex(0);
      setLoading(false);
    });

    return () => {
      active = false;
      if (audioRef.current) audioRef.current.pause();
    };
  }, [selectedSurahNum]);

  const currentAyah = surahData?.ayahs?.[currentAyahIndex] || null;
  const currentSurahMeta =
    SURAHS_LIST.find((s) => s.number === selectedSurahNum) || SURAHS_LIST[0];

  const isCurrentAyahRevealed =
    !isHideMode || Boolean(revealedAyahs[currentAyah?.numberInSurah]);

  // 2. Play Current Ayah Audio
  const handlePlayAyah = () => {
    if (!currentAyah) return;

    if (isPlayingAudio) {
      audioRef.current?.pause();
      setIsPlayingAudio(false);
      return;
    }

    const surahPad = String(selectedSurahNum).padStart(3, "0");
    const ayahPad = String(currentAyah.numberInSurah).padStart(3, "0");
    const url = `https://everyayah.com/data/Minshawy_Teacher_128kbps/${surahPad}${ayahPad}.mp3`;

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(url);
    audioRef.current = audio;
    setIsPlayingAudio(true);

    let count = 0;
    const playOnce = () => {
      count += 1;
      setCurrentRep(count);
      audio.currentTime = 0;
      audio.play().catch(() => setIsPlayingAudio(false));
    };

    audio.onended = () => {
      if (count < repsTarget) {
        setTimeout(playOnce, 900);
      } else {
        setIsPlayingAudio(false);
        setCurrentRep(0);
      }
    };

    playOnce();
  };

  // 3. Oral Recitation (التسميع الشفوي)
  const startOralRecitation = async () => {
    if (isListening) {
      stopOralRecitation();
      return;
    }

    setSpokenText("");
    spokenTextRef.current = "";
    setFeedback(null);
    setRecordedAudioUrl(null);

    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = "ar-SA";
        recognition.continuous = false;
        recognition.interimResults = true;
        recognitionRef.current = recognition;

        recognition.onresult = (e) => {
          const transcript = Array.from(e.results)
            .map((r) => r[0].transcript)
            .join("");
          setSpokenText(transcript);
          spokenTextRef.current = transcript;
        };

        recognition.onerror = (e) => {
          console.warn("Speech recognition error:", e);
          setIsListening(false);
          const msg =
            e?.error === "not-allowed"
              ? "يرجى منح الإذن للمايكروفون من إعدادات جهازك."
              : e?.error === "no-speech"
              ? "لم يتم سماع صوت واضح. يرجى التحدث بوضوح قرب المايكروفون أو الضغط على زر 'أتقنت التسميع'."
              : "تعذر التقاط الصوت، يمكنك إعادة المحاولة أو تأكيد الحفظ بالزر الذهبي.";
          setFeedback({
            type: "error",
            title: "تنبيه المايكروفون",
            desc: msg,
          });
        };

        recognition.onend = () => {
          finishRecitation();
        };

        recognition.start();
        setIsListening(true);
      } catch (err) {
        console.warn("Speech recognition error:", err);
        setIsListening(false);
        setFeedback({
          type: "error",
          title: "تعذر بدء المايكروفون",
          desc: "يرجى التأكد من صلاحية المايك، أو استخدام زر 'أتقنت التسميع' لتأكيد الحفظ مباشرة.",
        });
      }
    } else {
      // Fallback: If SpeechRecognition not available in browser/webview
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioChunksRef.current = [];
        const mr = new MediaRecorder(stream);
        mediaRecorderRef.current = mr;

        mr.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };

        mr.onstop = () => {
          const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          setRecordedAudioUrl(URL.createObjectURL(blob));
          stream.getTracks().forEach((t) => t.stop());
        };

        mr.start();
        setIsListening(true);
      } catch (e) {
        setFeedback({
          type: "error",
          title: "المايكروفون غير متاح",
          desc: "يمكنك قراءة الآية شفوياً ثم الضغط على زر 'أتقنت التسميع' بالأسفل لإظهار الآية.",
        });
      }
    }
  };

  const stopOralRecitation = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    setIsListening(false);
    finishRecitation();
  };

  // 4. Verify Recitation Match: Reveal Ayah IF CORRECT, keep hidden IF WRONG
  const finishRecitation = () => {
    setIsListening(false);
    const transcript = spokenTextRef.current || spokenText;

    if (!currentAyah) return;

    if (!transcript.trim()) {
      setFeedback({
        type: "error",
        title: "لم يتم التقاط صوت التسميع",
        desc: "تحدث بوضوح قرب المايكروفون، أو اضغط زر 'أتقنت التسميع وحفظت الآية' لتأكيد حفظها مباشرة.",
      });
      return;
    }

    const isCorrect = checkAyahRecitationMatch(transcript, currentAyah.text);

    if (isCorrect) {
      // ✅ SUCCESS: Reveal this Ayah!
      playSuccessChime();
      setRevealedAyahs((prev) => ({
        ...prev,
        [currentAyah.numberInSurah]: true,
      }));

      const isLastAyah =
        currentAyahIndex >= (surahData?.ayahs?.length || 1) - 1;

      setFeedback({
        type: "success",
        title: "أحسنت يا بطل! التسميع صحيح",
        desc: isLastAyah
          ? `ما شاء الله تبارك الله! أتممت تسميع سورة ${currentSurahMeta.name} كاملة بنجاح!`
          : "ظهرت الآية بنجاح لأنك قرأتها بالشكل الصحيح، بارك الله فيك!",
      });

      setScore((s) => {
        const next = s + 1;
        localStorage.setItem("wirdak_kids_score", String(next));
        return next;
      });

      // Auto-advance to the next Ayah after 1.8 seconds if not last
      if (!isLastAyah) {
        setTimeout(() => {
          handleNextAyah();
        }, 1800);
      }
    } else {
      // ❌ INCORRECT: Ayah DOES NOT appear! It stays hidden!
      playTryAgainSound();
      setFeedback({
        type: "error",
        title: "القراءة غير مطابقة للآية المطلوبة",
        desc: "الآية لم تظهر لأن التسميع غير دقيق. حاول مجدداً وسَمّع الآية بصوتك حتى تتقنها وتظهر!",
      });
    }
  };

  // 5. Manual Pass Fallback: Confirms the kid has recited and memorized the Ayah
  const handleManualPassRecitation = () => {
    if (!currentAyah) return;
    playSuccessChime();
    setRevealedAyahs((prev) => ({
      ...prev,
      [currentAyah.numberInSurah]: true,
    }));

    const isLastAyah =
      currentAyahIndex >= (surahData?.ayahs?.length || 1) - 1;

    setFeedback({
      type: "success",
      title: "ما شاء الله! تم اعتماد التسميع وحفظ الآية",
      desc: isLastAyah
        ? `مبارك يا بطل! ختمت تسميع سورة ${currentSurahMeta.name} بنجاح!`
        : `ظهرت الآية رقم ${toArabicNumerals(currentAyah.numberInSurah)} بنجاح، بارك الله فيك!`,
    });

    setScore((s) => {
      const next = s + 1;
      localStorage.setItem("wirdak_kids_score", String(next));
      return next;
    });

    if (!isLastAyah) {
      setTimeout(() => {
        handleNextAyah();
      }, 1800);
    }
  };

  const handleNextAyah = () => {
    if (currentAyahIndex < (surahData?.ayahs?.length || 1) - 1) {
      playPageFlipSound();
      setCurrentAyahIndex((i) => i + 1);
      setSpokenText("");
      spokenTextRef.current = "";
      setFeedback(null);
      setRecordedAudioUrl(null);
    }
  };

  const handlePrevAyah = () => {
    if (currentAyahIndex > 0) {
      playPageFlipSound();
      setCurrentAyahIndex((i) => i - 1);
      setSpokenText("");
      spokenTextRef.current = "";
      setFeedback(null);
      setRecordedAudioUrl(null);
    }
  };

  // Helper to reveal current ayah if child needs a hint
  const handleRevealCurrentAyahHint = () => {
    if (!currentAyah) return;
    setRevealedAyahs((prev) => ({
      ...prev,
      [currentAyah.numberInSurah]: true,
    }));
  };

  const totalAyahsCount = surahData?.ayahs?.length || 1;
  const revealedCount = Object.keys(revealedAyahs).length;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        maxWidth: "760px",
        margin: "0 auto",
        direction: "rtl",
        boxSizing: "border-box",
      }}
    >
      {/* Top Welcome & Navigation Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px",
          backgroundColor: isDark ? "#090D16" : "#FFFFFF",
          borderRadius: "16px",
          border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid #E2E8F0",
          marginBottom: "12px",
          boxShadow: isDark ? "0 4px 14px rgba(0,0,0,0.4)" : "0 4px 14px rgba(0,0,0,0.04)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              backgroundColor: "#10B981",
              color: "#FFFFFF",
              display: "grid",
              placeItems: "center",
            }}
          >
            <Baby size={18} />
          </div>
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: "16px",
                fontWeight: 900,
                color: isDark ? "#A7F3D0" : "#065F46",
                fontFamily: "'Aref Ruqaa', serif",
              }}
            >
              وِردك للأبطال الصغار
            </h2>
            <span style={{ fontSize: "11px", color: isDark ? "#94A3B8" : "#047857" }}>
              سَمّع الآية صح تظهر أمامك مباشرة!
            </span>
          </div>
        </div>

        {/* Score, Mode Toggle & Exit Button */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              backgroundColor: isDark ? "rgba(217, 119, 6, 0.2)" : "#FEF3C7",
              color: isDark ? "#FDE68A" : "#92400E",
              padding: "4px 8px",
              borderRadius: "999px",
              fontWeight: 900,
              fontSize: "12px",
            }}
          >
            <Award size={13} color="#F59E0B" />
            <span>{toArabicNumerals(score)} نقطة</span>
          </div>

          <button
            onClick={onExitKidsMode}
            title="الرجوع للوضع العام"
            style={{
              background: isDark ? "#1E293B" : "#F8FAFC",
              border: `1px solid ${isDark ? "#334155" : "#CBD5E1"}`,
              borderRadius: "8px",
              padding: "5px 9px",
              fontSize: "11.5px",
              fontWeight: 700,
              color: isDark ? "#F8FAFC" : "#334155",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "3px",
            }}
          >
            <X size={13} />
            <span>خروج</span>
          </button>
        </div>
      </div>

      {/* Category Pills & Surah Search */}
      <div
        style={{
          marginBottom: "12px",
          backgroundColor: isDark ? "#090D16" : "#FFFFFF",
          padding: "10px 12px",
          borderRadius: "14px",
          border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid #E2E8F0",
        }}
      >
        <div style={{ display: "flex", gap: "4px", marginBottom: "6px", overflowX: "auto", scrollbarWidth: "none" }}>
          {[
            { id: "short", label: "قصار السور" },
            { id: "amma", label: "جزء عمّ" },
            { id: "tabarak", label: "تبارك" },
            { id: "all", label: "القرآن كاملاً (١١٤)" },
          ].map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                style={{
                  padding: "4px 8px",
                  borderRadius: "6px",
                  border: "none",
                  backgroundColor: isActive
                    ? "#059669"
                    : isDark
                    ? "#1E293B"
                    : "#F1F5F9",
                  color: isActive ? "#FFFFFF" : isDark ? "#94A3B8" : "#475569",
                  fontSize: "10.5px",
                  fontWeight: 800,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Search Input for Surahs */}
        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
          <Search size={12} style={{ position: "absolute", right: "8px", color: isDark ? "#64748B" : "#94A3B8" }} />
          <input
            type="text"
            value={surahSearch}
            onChange={(e) => setSurahSearch(e.target.value)}
            placeholder="ابحث عن أي سورة (مثال: الإخلاص، النبأ، الفاتحة)..."
            style={{
              width: "100%",
              padding: "6px 26px 6px 8px",
              borderRadius: "8px",
              border: isDark ? "1px solid #334155" : "1px solid #CBD5E1",
              backgroundColor: isDark ? "#0F172A" : "#F8FAFC",
              color: isDark ? "#FFFFFF" : "#0F172A",
              fontSize: "11px",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Surahs Horizontal Chips */}
        <div
          style={{
            display: "flex",
            gap: "4px",
            overflowX: "auto",
            paddingTop: "6px",
            paddingBottom: "2px",
            scrollbarWidth: "none",
          }}
        >
          {visibleSurahs.map((s) => {
            const isSelected = selectedSurahNum === s.number;
            return (
              <button
                key={s.number}
                onClick={() => setSelectedSurahNum(s.number)}
                style={{
                  flexShrink: 0,
                  padding: "4px 8px",
                  borderRadius: "8px",
                  border: isSelected
                    ? "2px solid #059669"
                    : `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "#E2E8F0"}`,
                  backgroundColor: isSelected
                    ? (isDark ? "rgba(5, 150, 105, 0.25)" : "#ECFDF5")
                    : isDark
                    ? "#1E293B"
                    : "#FFFFFF",
                  color: isSelected
                    ? (isDark ? "#34D399" : "#065F46")
                    : isDark
                    ? "#F8FAFC"
                    : "#1E293B",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <span
                  style={{
                    fontFamily: "'Aref Ruqaa', serif",
                    fontWeight: 900,
                    fontSize: "11.5px",
                  }}
                >
                  سورة {s.name}
                </span>
                <span
                  style={{
                    fontSize: "9px",
                    color: isDark ? "#94A3B8" : "#64748B",
                  }}
                >
                  ({toArabicNumerals(s.ayahs)})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recitation Mode Bar: Toggle Hide Text & Progress */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "6px 10px",
          backgroundColor: isDark ? "#090D16" : "#FFFFFF",
          borderRadius: "10px",
          border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid #E2E8F0",
          marginBottom: "8px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <button
            onClick={() => setIsHideMode(!isHideMode)}
            style={{
              backgroundColor: isHideMode
                ? (isDark ? "rgba(217, 119, 6, 0.25)" : "#FEF3C7")
                : (isDark ? "#1E293B" : "#F1F5F9"),
              color: isHideMode ? "#D97706" : (isDark ? "#94A3B8" : "#475569"),
              border: isHideMode ? "1px solid #D97706" : `1px solid ${isDark ? "#334155" : "#CBD5E1"}`,
              borderRadius: "6px",
              padding: "4px 8px",
              fontSize: "10.5px",
              fontWeight: 800,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "3px",
            }}
          >
            {isHideMode ? <EyeOff size={11} /> : <Eye size={11} />}
            <span>{isHideMode ? "الكلام مخفي للتسميع" : "إظهار النص"}</span>
          </button>
        </div>

        <div style={{ fontSize: "11px", color: isDark ? "#94A3B8" : "#64748B", fontWeight: 700 }}>
          تم تسميع: {toArabicNumerals(revealedCount)} من {toArabicNumerals(totalAyahsCount)} آيات
        </div>
      </div>

      {/* Main Ayah Presentation Card */}
      <div
        style={{
          backgroundColor: isDark ? "#000000" : "#FFFFFF",
          border: isDark ? "3px double #B45309" : "3px double #C29B38",
          borderRadius: "20px",
          boxShadow: isDark
            ? "0 8px 30px rgba(0,0,0,0.8), inset 0 0 50px rgba(217, 119, 6, 0.08)"
            : "0 8px 30px rgba(0,0,0,0.06)",
          padding: "20px 16px",
          textAlign: "center",
          boxSizing: "border-box",
        }}
      >
        {loading ? (
          <div style={{ padding: "60px 20px", color: isDark ? "#34D399" : "#064E3B" }}>
            <RotateCcw size={28} className="wird-spin" style={{ margin: "0 auto 8px" }} />
            <div style={{ fontSize: "14px", fontWeight: 700 }}>جاري تجهيز سورة {currentSurahMeta.name}...</div>
          </div>
        ) : (
          <div>
            {/* Surah Header Label */}
            <div style={{ marginBottom: "12px" }}>
              <div
                style={{
                  display: "inline-block",
                  padding: "4px 14px",
                  borderRadius: "10px",
                  backgroundColor: isDark ? "rgba(217, 119, 6, 0.16)" : "rgba(194, 155, 56, 0.1)",
                  border: isDark ? "1px solid #D97706" : "1px solid #C29B38",
                  color: isDark ? "#FDE68A" : "#78350F",
                  fontFamily: "'Aref Ruqaa', serif",
                  fontSize: "16px",
                  fontWeight: 900,
                }}
              >
                سُورَةُ {currentSurahMeta.name}
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: isDark ? "#94A3B8" : "#64748B",
                  marginTop: "4px",
                }}
              >
                الآية التي عليها الدور: {toArabicNumerals(currentAyahIndex + 1)} من {toArabicNumerals(totalAyahsCount)}
              </div>
            </div>

            {/* Ayah Text Display: Shown if Revealed OR HideMode is Off */}
            {isCurrentAyahRevealed ? (
              <div style={{ padding: "10px 6px 16px" }}>
                <div
                  style={{
                    fontFamily: "'Amiri Quran', serif",
                    fontSize: "clamp(22px, 5vw, 29px)",
                    lineHeight: 2.3,
                    color: isDark ? "#FFFFFF" : "#0F172A",
                    userSelect: "none",
                  }}
                >
                  {currentAyah?.text}
                </div>

                {isHideMode && (
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      backgroundColor: isDark ? "rgba(16, 185, 129, 0.2)" : "#ECFDF5",
                      color: isDark ? "#34D399" : "#047857",
                      padding: "3px 10px",
                      borderRadius: "999px",
                      fontSize: "11px",
                      fontWeight: 800,
                      marginTop: "10px",
                      border: "1px solid #10B981",
                    }}
                  >
                    <Check size={12} strokeWidth={3} />
                    <span>تم التسميع بنجاح وظهرت الآية</span>
                  </div>
                )}
              </div>
            ) : (
              /* HIDDEN AYAH PLACEHOLDER: Text is hidden until correctly recited */
              <div
                style={{
                  padding: "26px 14px",
                  margin: "10px 0 16px",
                  borderRadius: "14px",
                  border: `2px dashed ${isDark ? "#D97706" : "#F59E0B"}`,
                  backgroundColor: isDark ? "rgba(217, 119, 6, 0.08)" : "#FFFBEB",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
              >
                <EyeOff size={24} color="#D97706" />
                <div
                  style={{
                    fontSize: "16px",
                    fontWeight: 900,
                    color: isDark ? "#FDE68A" : "#92400E",
                    fontFamily: "'Aref Ruqaa', serif",
                  }}
                >
                  الآية مخفية لاختبار الحفظ
                </div>
                <div style={{ fontSize: "11.5px", color: isDark ? "#94A3B8" : "#78350F", maxWidth: "420px", lineHeight: 1.5 }}>
                  سَمّع الآية في خانة التسميع بالمايكروفون بالأسفل، وإذا قُرئت صحيحة ستظهر الآية أمامك فوراً!
                </div>

                <button
                  onClick={handleRevealCurrentAyahHint}
                  style={{
                    marginTop: "6px",
                    background: "transparent",
                    border: isDark ? "1px solid #475569" : "1px solid #CBD5E1",
                    borderRadius: "8px",
                    padding: "4px 10px",
                    fontSize: "10.5px",
                    color: isDark ? "#CBD5E1" : "#64748B",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "3px",
                  }}
                >
                  <Eye size={12} />
                  <span>كشف الآية للمساعدة</span>
                </button>
              </div>
            )}

            {/* Audio Playback & Repetition Controls (Help teacher) */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                marginBottom: "12px",
                flexWrap: "wrap",
              }}
            >
              <button
                onClick={handlePlayAyah}
                style={{
                  backgroundColor: isPlayingAudio ? "#DC2626" : "#059669",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: "8px",
                  padding: "7px 14px",
                  fontSize: "12px",
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                }}
              >
                {isPlayingAudio ? <Pause size={13} /> : <Volume2 size={13} />}
                <span>
                  {isPlayingAudio
                    ? `استماع (${toArabicNumerals(currentRep)}/${toArabicNumerals(repsTarget)})`
                    : "صوت الشيخ المعلم"}
                </span>
              </button>

              <button
                onClick={() => setRepsTarget((r) => (r >= 10 ? 1 : r === 1 ? 3 : r === 3 ? 5 : 10))}
                title="تغيير عدد التكرار"
                style={{
                  backgroundColor: isDark ? "#1E293B" : "#F8FAFC",
                  border: `1px solid ${isDark ? "#334155" : "#CBD5E1"}`,
                  borderRadius: "8px",
                  padding: "7px 12px",
                  fontSize: "12px",
                  fontWeight: 800,
                  color: isDark ? "#F8FAFC" : "#1E293B",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <Repeat size={13} color="#F59E0B" />
                <span>تكرار: {toArabicNumerals(repsTarget)}</span>
              </button>
            </div>

            {/* ========================================================
                KHANAT AL-TASMEE' (خانة التسميع الشفوي المباشر)
                ======================================================== */}
            <div
              style={{
                backgroundColor: isDark ? "#090D16" : "#F0FDF4",
                border: `2px dashed ${isListening ? "#10B981" : isDark ? "#1E293B" : "#86EFAC"}`,
                borderRadius: "14px",
                padding: "14px 10px",
                marginTop: "8px",
              }}
            >
              <div style={{ marginBottom: "10px" }}>
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: 900,
                    color: isListening ? "#10B981" : isDark ? "#E2E8F0" : "#166534",
                    marginBottom: "3px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "5px",
                  }}
                >
                  <Mic size={14} />
                  <span>
                    {isListening ? "جاري الاستماع... تكلّم بالآية الآن" : "خانة التسميع الشفوي"}
                  </span>
                </div>
                <span style={{ fontSize: "11px", color: isDark ? "#94A3B8" : "#4B5563" }}>
                  {isListening
                    ? "انطق الآية بلسانك ثم اضغط إنهاء لتظهر"
                    : "اضغط على الزر وسَمّع الآية (لو صح تبان، ولو خطأ متظهرش)"}
                </span>
              </div>

              {/* Action Buttons: Mic Recitation + Manual Pass Confirmation */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", flexWrap: "wrap" }}>
                {/* Mic Action Button */}
                <button
                  onClick={isListening ? stopOralRecitation : startOralRecitation}
                  className="wird-kids-mic-btn"
                  style={{
                    backgroundColor: isListening ? "#EF4444" : "#D97706",
                    color: "#FFFFFF",
                    border: "none",
                    borderRadius: "999px",
                    padding: "9px 20px",
                    fontSize: "13px",
                    fontWeight: 900,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    boxShadow: isListening
                      ? "0 0 14px rgba(239, 68, 68, 0.5)"
                      : "0 3px 12px rgba(217, 119, 6, 0.35)",
                  }}
                >
                  {isListening ? <Square size={14} /> : <Mic size={15} />}
                  <span>{isListening ? "إنهاء والتحقق" : "تسميع شفوي بالمايك"}</span>
                </button>

                {/* Manual Pass Button */}
                <button
                  onClick={handleManualPassRecitation}
                  style={{
                    backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
                    color: isDark ? "#FCD34D" : "#D97706",
                    border: isDark ? "1px solid #D97706" : "1.5px solid #F59E0B",
                    borderRadius: "999px",
                    padding: "9px 18px",
                    fontSize: "12.5px",
                    fontWeight: 900,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                >
                  <Check size={14} strokeWidth={2.5} />
                  <span>أتقنت التسميع وحفظت الآية</span>
                </button>
              </div>

              {/* Spoken Text Display */}
              {spokenText && (
                <div
                  style={{
                    marginTop: "12px",
                    padding: "8px 12px",
                    backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#FFFFFF",
                    borderRadius: "10px",
                    fontSize: "13px",
                    color: isDark ? "#F1F5F9" : "#1F2937",
                    border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "#E2E8F0"}`,
                    display: "inline-block",
                    maxWidth: "90%",
                  }}
                >
                  <span style={{ fontSize: "10.5px", color: "#64748B", display: "block" }}>
                    صوتك:
                  </span>
                  «{spokenText}»
                </div>
              )}

              {/* Feedback Alert: Success vs Error */}
              {feedback && (
                <div
                  style={{
                    marginTop: "12px",
                    padding: "10px 14px",
                    backgroundColor:
                      feedback.type === "success"
                        ? isDark
                          ? "rgba(16, 185, 129, 0.2)"
                          : "#DCFCE7"
                        : isDark
                        ? "rgba(220, 38, 38, 0.2)"
                        : "#FEE2E2",
                    borderRadius: "12px",
                    border: `1.5px solid ${feedback.type === "success" ? "#22C55E" : "#EF4444"}`,
                  }}
                >
                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: 900,
                      color:
                        feedback.type === "success"
                          ? isDark
                            ? "#86EFAC"
                            : "#15803D"
                          : isDark
                          ? "#FCA5A5"
                          : "#991B1B",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "5px",
                    }}
                  >
                    {feedback.type === "success" ? <Check size={15} /> : <AlertCircle size={15} />}
                    <span>{feedback.title}</span>
                  </div>
                  <div
                    style={{
                      fontSize: "11.5px",
                      color:
                        feedback.type === "success"
                          ? isDark
                            ? "#E2E8F0"
                            : "#166534"
                          : isDark
                          ? "#FECACA"
                          : "#B91C1C",
                      marginTop: "2px",
                    }}
                  >
                    {feedback.desc}
                  </div>

                  {recordedAudioUrl && (
                    <div style={{ marginTop: "8px" }}>
                      <button
                        onClick={() => {
                          if (recordingPlayerRef.current) {
                            if (isPlayingRecording) {
                              recordingPlayerRef.current.pause();
                              setIsPlayingRecording(false);
                            } else {
                              recordingPlayerRef.current.currentTime = 0;
                              recordingPlayerRef.current.play();
                              setIsPlayingRecording(true);
                            }
                          }
                        }}
                        style={{
                          backgroundColor: "#10B981",
                          color: "#FFFFFF",
                          border: "none",
                          borderRadius: "8px",
                          padding: "5px 12px",
                          fontSize: "11px",
                          fontWeight: 800,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <Headphones size={12} />
                        <span>{isPlayingRecording ? "إيقاف الصوت" : "استمع لتسجيل صوتك"}</span>
                      </button>
                      <audio
                        ref={recordingPlayerRef}
                        src={recordedAudioUrl}
                        onEnded={() => setIsPlayingRecording(false)}
                        style={{ display: "none" }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Ayah Navigation Buttons */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: "16px",
                paddingTop: "12px",
                borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "#E2E8F0"}`,
              }}
            >
              <button
                onClick={handlePrevAyah}
                disabled={currentAyahIndex === 0}
                style={{
                  backgroundColor: currentAyahIndex === 0 ? "transparent" : isDark ? "#1E293B" : "#F1F5F9",
                  border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "#CBD5E1"}`,
                  borderRadius: "10px",
                  padding: "9px 16px",
                  fontSize: "12.5px",
                  fontWeight: 800,
                  color: currentAyahIndex === 0 ? "#94A3B8" : isDark ? "#F8FAFC" : "#334155",
                  cursor: currentAyahIndex === 0 ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                }}
              >
                <span>الآية السابقة</span>
                <ChevronLeft size={14} />
              </button>

              <button
                onClick={handleNextAyah}
                disabled={currentAyahIndex >= (surahData?.ayahs?.length || 1) - 1}
                style={{
                  backgroundColor:
                    currentAyahIndex >= (surahData?.ayahs?.length || 1) - 1
                      ? "transparent"
                      : isDark
                      ? "#1E293B"
                      : "#F1F5F9",
                  border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "#CBD5E1"}`,
                  borderRadius: "10px",
                  padding: "9px 16px",
                  fontSize: "12.5px",
                  fontWeight: 800,
                  color:
                    currentAyahIndex >= (surahData?.ayahs?.length || 1) - 1
                      ? "#94A3B8"
                      : isDark
                      ? "#F8FAFC"
                      : "#334155",
                  cursor:
                    currentAyahIndex >= (surahData?.ayahs?.length || 1) - 1
                      ? "not-allowed"
                      : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                }}
              >
                <ChevronRight size={14} />
                <span>الآية التالية</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
