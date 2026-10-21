// App Root for Wirdak — Quran Reading, Memorization & Full Surah Offline Audio
// Zero Emojis, Zero Sparkles, Ruq'ah & Amiri Quran Typography
// Supports True Dark Mode for Eye Comfort, All 114 Surahs in Kids Mode, Quran Search, Quick Auth & Last Read Banner
import { useEffect, useRef, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import WirdakHeader from "./components/WirdakHeader";
import MushafViewer from "./components/MushafViewer";
import SurahPlayerView from "./components/SurahPlayerView";
import PlanSetupModal from "./components/PlanSetupModal";
import SurahIndexDrawer from "./components/SurahIndexDrawer";
import ReciterSelectModal from "./components/ReciterSelectModal";
import AudioReciterBar from "./components/AudioReciterBar";
import WirdakKidsView from "./components/WirdakKidsView";
import QuranSearchModal from "./components/QuranSearchModal";
import QuickAuthModal from "./components/QuickAuthModal";
import {
  loadWirdState,
  saveWirdState,
  getCurrentUser,
  getDefaultWirdState,
} from "./lib/wirdStorage";
import {
  getReminderSchedule,
  initReminderWatcher,
  isNotificationGranted,
  requestNotificationPermission,
} from "./lib/notificationManager";
import { RECITERS_LIST, SURAHS_LIST } from "./data/surahs";
import { playSuccessChime } from "./lib/soundEffects";
import { toArabicNumerals } from "./lib/mushafService";
import "./App.css";

export default function App() {
  const [wirdState, setWirdState] = useState(loadWirdState);
  const [schedule, setSchedule] = useState(getReminderSchedule);
  const [currentUser, setCurrentUserState] = useState(getCurrentUser);

  // Theme & Kids Mode states
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("wirdak_theme") || "light";
  });
  const [isKidsMode, setIsKidsMode] = useState(false);

  // Sync theme with document element
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("wirdak_theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  // Modals & Drawers
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isIndexOpen, setIsIndexOpen] = useState(false);
  const [isReciterModalOpen, setIsReciterModalOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  // Ayah Audio recitation state
  const [activeVerseKey, setActiveVerseKey] = useState(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioRepetitions, setAudioRepetitions] = useState(1);
  const [currentRepCount, setCurrentRepCount] = useState(0);
  const audioObjRef = useRef(null);

  // Save state whenever modified
  useEffect(() => {
    saveWirdState(wirdState);
  }, [wirdState]);

  // Initialize Background Reminder Watcher
  useEffect(() => {
    const cleanup = initReminderWatcher((firedSchedule) => {
      console.log("Daily wird reminder triggered for:", firedSchedule.time);
    });
    return cleanup;
  }, []);

  // 1. Page Navigation & Last Read Position Tracking
  const handlePageChange = (newPage) => {
    const validPage = Math.max(1, Math.min(604, newPage));
    const currentSurah =
      SURAHS_LIST.slice()
        .reverse()
        .find((s) => s.startPage <= validPage) || SURAHS_LIST[0];

    setWirdState((prev) => ({
      ...prev,
      currentPage: validPage,
      lastReadPage: validPage,
      lastReadSurah: currentSurah.name,
    }));
    stopAudio();
  };

  // 2. Toggle Bookmark
  const handleToggleBookmark = () => {
    setWirdState((prev) => {
      const page = prev.currentPage;
      const exists = prev.bookmarks.includes(page);
      const nextBookmarks = exists
        ? prev.bookmarks.filter((p) => p !== page)
        : [...prev.bookmarks, page].sort((a, b) => a - b);
      return { ...prev, bookmarks: nextBookmarks };
    });
  };

  // 3. Mark Page Completed
  const handleToggleComplete = () => {
    setWirdState((prev) => {
      const page = prev.currentPage;
      const wasCompleted = prev.completedPages.includes(page);
      const nextCompleted = wasCompleted
        ? prev.completedPages.filter((p) => p !== page)
        : [...prev.completedPages, page];

      if (!wasCompleted && nextCompleted.length >= (prev.dailyGoalPages || 20)) {
        playSuccessChime();
        setShowCelebration(true);
      }

      return {
        ...prev,
        completedPages: nextCompleted,
        totalReadPagesCount: (prev.totalReadPagesCount || 0) + (wasCompleted ? -1 : 1),
      };
    });
  };

  // 4. Repetition Counter in Memorization Mode
  const handleIncrementRepetition = () => {
    setWirdState((prev) => {
      const current = prev.memorizeConfig?.completedRepsCount || 0;
      const target = prev.memorizeConfig?.targetRepetitions || 5;
      const next = current + 1;
      if (next >= target) {
        playSuccessChime();
      }
      return {
        ...prev,
        memorizeConfig: {
          ...prev.memorizeConfig,
          completedRepsCount: next,
        },
      };
    });
  };

  // 5. Play Ayah Audio (Fixed so Ayah recitation plays the exact Ayah and does not restart from the whole Surah beginning)
  const playAyahAudio = (verseKey) => {
    if (!verseKey) return;
    const parts = String(verseKey).split(":");
    if (parts.length < 2) return;

    const surahPad = String(parts[0]).padStart(3, "0");
    const ayahPad = String(parts[1]).padStart(3, "0");

    const reciter =
      RECITERS_LIST.find((r) => r.id === wirdState.reciterId) || RECITERS_LIST[0];

    // For verse-by-verse recitation and memorization repetition:
    // If reciter has EveryAyah folder, use it; otherwise use Alafasy for accurate verse audio
    const folder = reciter.folder || "Alafasy_128kbps";
    const audioUrl = `https://everyayah.com/data/${folder}/${surahPad}${ayahPad}.mp3`;

    if (audioObjRef.current) {
      audioObjRef.current.pause();
    }

    const audio = new Audio(audioUrl);
    audioObjRef.current = audio;
    setActiveVerseKey(verseKey);
    setIsPlayingAudio(true);

    let count = 0;
    const repsTarget = Math.max(1, audioRepetitions || 1);

    const playLoop = () => {
      count += 1;
      setCurrentRepCount(count);
      audio.currentTime = 0;
      audio.play().catch((err) => {
        console.warn("Audio play prevented:", err);
        setIsPlayingAudio(false);
      });
    };

    audio.onended = () => {
      if (count < repsTarget) {
        setTimeout(playLoop, 800);
      } else {
        setIsPlayingAudio(false);
      }
    };

    audio.onerror = () => {
      setIsPlayingAudio(false);
    };

    playLoop();
  };

  const stopAudio = () => {
    if (audioObjRef.current) {
      audioObjRef.current.pause();
      audioObjRef.current.currentTime = 0;
    }
    setIsPlayingAudio(false);
    setActiveVerseKey(null);
  };

  const toggleAudioPlayback = () => {
    if (isPlayingAudio) {
      audioObjRef.current?.pause();
      setIsPlayingAudio(false);
    } else if (activeVerseKey) {
      playAyahAudio(activeVerseKey);
    } else {
      playAyahAudio("1:1");
    }
  };

  const isDark = theme === "dark";

  return (
    <div className={`wirdak-app-container ${isDark ? "theme-dark" : "theme-light"}`}>
      {/* Top Header Navigation */}
      <WirdakHeader
        mode={wirdState.mode}
        onModeChange={(mode) => {
          setWirdState((prev) => ({ ...prev, mode }));
          stopAudio();
        }}
        streak={wirdState.streak}
        completedCount={wirdState.completedPages.length}
        dailyGoal={wirdState.dailyGoalPages}
        onOpenPlanSetup={() => setIsPlanModalOpen(true)}
        onOpenIndex={() => setIsIndexOpen(true)}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        currentUser={currentUser}
        lastReadPage={wirdState.lastReadPage || wirdState.currentPage || 1}
        lastReadSurah={wirdState.lastReadSurah || "الفاتحة"}
        onResumeLastRead={() => handlePageChange(wirdState.lastReadPage || wirdState.currentPage || 1)}
        selectedReciterId={wirdState.reciterId}
        onOpenReciterModal={() => setIsReciterModalOpen(true)}
        isDark={isDark}
        onToggleTheme={toggleTheme}
        isKidsMode={isKidsMode}
        onToggleKidsMode={() => setIsKidsMode((v) => !v)}
      />

      {/* Main Content Area */}
      <main className="wirdak-main-content">
        {isKidsMode ? (
          /* Mode 4: Kids Mode (وضع الأطفال) with Oral Recitation & All 114 Surahs */
          <WirdakKidsView
            onExitKidsMode={() => setIsKidsMode(false)}
            isDark={isDark}
          />
        ) : wirdState.mode === "listening" ? (
          /* Mode 3: Full Surahs Offline & Online Listening */
          <SurahPlayerView
            selectedReciterId={wirdState.reciterId}
            onOpenReciterModal={() => setIsReciterModalOpen(true)}
            isDark={isDark}
          />
        ) : (
          /* Mode 1 & 2: Reading & Memorization Mushaf */
          <MushafViewer
            currentPage={wirdState.currentPage}
            onPageChange={handlePageChange}
            isCompleted={wirdState.completedPages.includes(wirdState.currentPage)}
            onToggleComplete={handleToggleComplete}
            isBookmarked={wirdState.bookmarks.includes(wirdState.currentPage)}
            onToggleBookmark={handleToggleBookmark}
            mode={wirdState.mode}
            activeVerseKey={activeVerseKey}
            onSelectVerse={(key) => setActiveVerseKey(key)}
            repetitionCount={wirdState.memorizeConfig?.completedRepsCount || 0}
            targetRepetitions={wirdState.memorizeConfig?.targetRepetitions || 5}
            onIncrementRepetition={handleIncrementRepetition}
            onPlayAyah={playAyahAudio}
            isDark={isDark}
          />
        )}
      </main>

      {/* Audio Recitation Floating Dock for Ayah Repetitions */}
      {!isKidsMode && wirdState.mode !== "listening" && (isPlayingAudio || activeVerseKey) && (
        <AudioReciterBar
          isPlaying={isPlayingAudio}
          onTogglePlay={toggleAudioPlayback}
          onStop={stopAudio}
          currentVerseKey={activeVerseKey}
          selectedReciter={wirdState.reciterId}
          onChangeReciter={(id) => setWirdState((prev) => ({ ...prev, reciterId: id }))}
          repetitions={audioRepetitions}
          onChangeRepetitions={(r) => setAudioRepetitions(r)}
        />
      )}

      {/* Goal Celebration Modal: Zero Emojis */}
      {showCelebration && (
        <div
          onClick={() => setShowCelebration(false)}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.75)",
            backdropFilter: "blur(6px)",
            zIndex: 10001,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: isDark ? "#090D16" : "#FFFFFF",
              borderRadius: "22px",
              padding: "26px 22px",
              textAlign: "center",
              maxWidth: "380px",
              border: `2px solid ${isDark ? "#D97706" : "#064E3B"}`,
              boxShadow: "0 20px 50px rgba(0,0,0,0.4)",
              direction: "rtl",
            }}
          >
            <div
              style={{
                width: "50px",
                height: "50px",
                borderRadius: "50%",
                backgroundColor: isDark ? "rgba(217, 119, 6, 0.15)" : "rgba(6, 78, 59, 0.1)",
                color: isDark ? "#FBBF24" : "#064E3B",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 12px",
              }}
            >
              <CheckCircle2 size={28} />
            </div>
            <h3
              style={{
                margin: "0 0 8px",
                fontSize: "18px",
                fontWeight: 900,
                color: isDark ? "#FBBF24" : "#064E3B",
                fontFamily: "'Aref Ruqaa', serif",
              }}
            >
              أتممت وِرْدَك اليومي المبارك
            </h3>
            <p style={{ fontSize: "12.5px", color: isDark ? "#94A3B8" : "#64748B", margin: "0 0 16px", lineHeight: 1.6 }}>
              قرأت {toArabicNumerals(wirdState.dailyGoalPages)} صفحات اليوم بتوفيق الله وتيسيره.
            </p>
            <button
              onClick={() => setShowCelebration(false)}
              style={{
                backgroundColor: isDark ? "#D97706" : "#064E3B",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "10px",
                padding: "9px 24px",
                fontWeight: 800,
                fontSize: "13px",
                cursor: "pointer",
                fontFamily: "'Aref Ruqaa', serif",
              }}
            >
              الحمد لله
            </button>
          </div>
        </div>
      )}

      {/* Plan Setup Wizard Modal */}
      <PlanSetupModal
        isOpen={isPlanModalOpen}
        onClose={() => {
          setIsPlanModalOpen(false);
          setSchedule(getReminderSchedule());
        }}
        wirdState={wirdState}
        isDark={isDark}
        onSavePlan={(plan) => {
          setWirdState((prev) => ({
            ...prev,
            ...plan,
          }));
        }}
      />

      {/* Surah & Juz Navigation Drawer */}
      <SurahIndexDrawer
        isOpen={isIndexOpen}
        onClose={() => setIsIndexOpen(false)}
        currentPage={wirdState.currentPage}
        onSelectPage={handlePageChange}
        bookmarks={wirdState.bookmarks}
        isDark={isDark}
      />

      {/* Prominent Reciters Selection Modal */}
      <ReciterSelectModal
        isOpen={isReciterModalOpen}
        onClose={() => setIsReciterModalOpen(false)}
        selectedReciterId={wirdState.reciterId}
        onSelectReciter={(id) => setWirdState((prev) => ({ ...prev, reciterId: id }))}
        isDark={isDark}
      />

      {/* Quran Verse Word/Phrase Search Modal */}
      <QuranSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectPage={handlePageChange}
        isDark={isDark}
      />

      {/* Quick Phone + Password Authentication Modal */}
      <QuickAuthModal
        isOpen={isAuthOpen}
        onClose={() => {
          setIsAuthOpen(false);
          setCurrentUserState(getCurrentUser());
        }}
        wirdState={wirdState}
        onApplyWirdState={(serverState) => {
          setWirdState((prev) => ({ ...prev, ...serverState }));
        }}
        isDark={isDark}
      />
    </div>
  );
}
