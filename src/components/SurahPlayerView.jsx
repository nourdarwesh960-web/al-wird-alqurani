import { useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  Download,
  Headphones,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  Search,
  Trash2,
  Volume2,
} from "lucide-react";
import { SURAHS_LIST, RECITERS_LIST } from "../data/surahs";
import {
  downloadSurahForOffline,
  getSurahAudioUrl,
  isSurahOffline,
  deleteSurahOffline,
} from "../lib/offlineSurahs";
import { toArabicNumerals } from "../lib/mushafService";

export default function SurahPlayerView({
  selectedReciterId,
  onOpenReciterModal,
  isDark = false,
}) {
  const [search, setSearch] = useState("");
  const [activeSurahNumber, setActiveSurahNumber] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState("");
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLooping, setIsLooping] = useState(false);

  // Offline status tracking: map of surahNumber -> boolean
  const [offlineMap, setOfflineMap] = useState({});
  // Downloading progress: map of surahNumber -> progress percentage
  const [downloadProgress, setDownloadProgress] = useState({});

  const audioRef = useRef(null);
  const prevReciterRef = useRef(selectedReciterId);

  const currentReciter =
    RECITERS_LIST.find((r) => r.id === selectedReciterId) || RECITERS_LIST[0];

  // Check offline status for all Surahs when reciter changes
  useEffect(() => {
    let isMounted = true;
    async function checkStatuses() {
      const map = {};
      for (const surah of SURAHS_LIST) {
        map[surah.number] = await isSurahOffline(currentReciter.id, surah.number);
      }
      if (isMounted) setOfflineMap(map);
    }
    checkStatuses();
    return () => {
      isMounted = false;
    };
  }, [currentReciter.id]);

  // Seamlessly switch reciter audio without resetting to the beginning (من الأول)
  useEffect(() => {
    if (prevReciterRef.current !== selectedReciterId) {
      prevReciterRef.current = selectedReciterId;

      if (activeSurahNumber) {
        const savedTime = audioRef.current?.currentTime || 0;
        const wasPlaying = isPlaying;

        getSurahAudioUrl(currentReciter, activeSurahNumber).then((url) => {
          setAudioUrl(url);
          if (audioRef.current) {
            audioRef.current.src = url;
            audioRef.current.playbackRate = playbackRate;
            audioRef.current.onloadedmetadata = () => {
              if (savedTime > 0) {
                audioRef.current.currentTime = savedTime;
              }
              if (wasPlaying) {
                audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
              }
            };
          }
        });
      }
    }
  }, [selectedReciterId, activeSurahNumber, isPlaying, playbackRate, currentReciter]);

  // Handle Play Surah
  const handlePlaySurah = async (surahNumber) => {
    if (activeSurahNumber === surahNumber) {
      if (isPlaying) {
        audioRef.current?.pause();
        setIsPlaying(false);
      } else {
        audioRef.current?.play().then(() => setIsPlaying(true)).catch(() => {});
      }
      return;
    }

    // Load new Surah audio
    setActiveSurahNumber(surahNumber);
    setIsPlaying(false);
    setCurrentTime(0);

    const url = await getSurahAudioUrl(currentReciter, surahNumber);
    setAudioUrl(url);

    if (audioRef.current) {
      audioRef.current.src = url;
      audioRef.current.playbackRate = playbackRate;
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((e) => console.warn("Audio play prevented:", e));
    }
  };

  // Handle Download for Offline
  const handleDownload = async (e, surahNumber) => {
    e.stopPropagation();
    if (downloadProgress[surahNumber] !== undefined) return;

    setDownloadProgress((prev) => ({ ...prev, [surahNumber]: 0 }));
    try {
      await downloadSurahForOffline(currentReciter, surahNumber, (progress) => {
        setDownloadProgress((prev) => ({ ...prev, [surahNumber]: progress }));
      });
      setOfflineMap((prev) => ({ ...prev, [surahNumber]: true }));
    } catch (err) {
      alert("تعذر حفظ السورة: " + err.message);
    } finally {
      setDownloadProgress((prev) => {
        const copy = { ...prev };
        delete copy[surahNumber];
        return copy;
      });
    }
  };

  // Handle Delete Offline Cache
  const handleDeleteOffline = async (e, surahNumber) => {
    e.stopPropagation();
    await deleteSurahOffline(currentReciter.id, surahNumber);
    setOfflineMap((prev) => ({ ...prev, [surahNumber]: false }));
  };

  const formatTime = (secs) => {
    if (isNaN(secs)) return "00:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const filteredSurahs = SURAHS_LIST.filter(
    (s) =>
      s.name.includes(search.trim()) ||
      String(s.number).includes(search.trim())
  );

  const activeSurahMeta = SURAHS_LIST.find((s) => s.number === activeSurahNumber);

  return (
    <div style={{ width: "100%", maxWidth: "800px", margin: "0 auto", direction: "rtl" }}>
      {/* Reciter Selector Card */}
      <div
        onClick={onOpenReciterModal}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 14px",
          backgroundColor: isDark ? "#090D16" : "#FFFFFF",
          borderRadius: "16px",
          border: isDark ? "1.5px solid #059669" : "1.5px solid #064E3B",
          cursor: "pointer",
          marginBottom: "14px",
          boxShadow: isDark ? "0 4px 12px rgba(0,0,0,0.3)" : "0 4px 12px rgba(6, 78, 59, 0.08)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              backgroundColor: isDark ? "#059669" : "#064E3B",
              color: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Headphones size={18} />
          </div>
          <div>
            <div style={{ fontSize: "11px", color: isDark ? "#94A3B8" : "#64748B", fontWeight: 700 }}>
              القارئ المختار
            </div>
            <div
              style={{
                fontSize: "15px",
                fontWeight: 900,
                color: isDark ? "#FCD34D" : "#064E3B",
                fontFamily: "'Aref Ruqaa', serif",
              }}
            >
              {currentReciter.title || currentReciter.name}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            fontSize: "11.5px",
            fontWeight: 800,
            color: isDark ? "#34D399" : "#064E3B",
            backgroundColor: isDark ? "rgba(16, 185, 129, 0.15)" : "rgba(6, 78, 59, 0.08)",
            padding: "5px 10px",
            borderRadius: "999px",
          }}
        >
          <span>تغيير الشيخ</span>
          <ChevronDown size={13} />
        </div>
      </div>

      {/* Search Input */}
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          marginBottom: "14px",
        }}
      >
        <Search size={14} style={{ position: "absolute", right: "12px", color: isDark ? "#64748B" : "#94A3B8" }} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث عن اسم السورة (مثل: الكهف، يس، الملك)..."
          style={{
            width: "100%",
            padding: "10px 36px 10px 12px",
            borderRadius: "12px",
            border: isDark ? "1px solid #334155" : "1px solid #CBD5E1",
            backgroundColor: isDark ? "#090D16" : "#FFFFFF",
            color: isDark ? "#FFFFFF" : "#0F172A",
            fontSize: "13px",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* Surahs List */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          paddingBottom: activeSurahNumber ? "140px" : "40px",
        }}
      >
        {filteredSurahs.map((surah) => {
          const isCurrentActive = activeSurahNumber === surah.number;
          const isOffline = offlineMap[surah.number];
          const isDownloading = downloadProgress[surah.number] !== undefined;

          return (
            <div
              key={surah.number}
              onClick={() => handlePlaySurah(surah.number)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 14px",
                backgroundColor: isCurrentActive
                  ? (isDark ? "rgba(5, 150, 105, 0.18)" : "rgba(6, 78, 59, 0.06)")
                  : (isDark ? "#090D16" : "#FFFFFF"),
                borderRadius: "12px",
                border: isCurrentActive
                  ? "2px solid #059669"
                  : `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "#E2E8F0"}`,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {/* Surah Number & Name */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "8px",
                    backgroundColor: isCurrentActive
                      ? "#059669"
                      : isDark
                      ? "#1E293B"
                      : "#F1F5F9",
                    color: isCurrentActive
                      ? "#FFFFFF"
                      : isDark
                      ? "#F8FAFC"
                      : "#0F172A",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: "12px",
                  }}
                >
                  {toArabicNumerals(surah.number)}
                </div>

                <div>
                  <div
                    style={{
                      fontFamily: "'Aref Ruqaa', serif",
                      fontSize: "15px",
                      fontWeight: 900,
                      color: isDark ? "#F8FAFC" : "#0F172A",
                    }}
                  >
                    سورة {surah.name}
                  </div>
                  <div
                    style={{
                      fontSize: "10.5px",
                      color: isDark ? "#94A3B8" : "#64748B",
                      display: "flex",
                      gap: "6px",
                      marginTop: "2px",
                    }}
                  >
                    <span>{surah.type}</span>
                    <span>•</span>
                    <span>{toArabicNumerals(surah.ayahs)} آية</span>
                    <span>•</span>
                    <span>صفحة {toArabicNumerals(surah.startPage)}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Play + Offline Download */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                {isOffline ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                    <span
                      style={{
                        fontSize: "10.5px",
                        backgroundColor: isDark ? "rgba(5, 150, 105, 0.2)" : "#ECFDF5",
                        color: isDark ? "#34D399" : "#047857",
                        padding: "3px 6px",
                        borderRadius: "6px",
                        fontWeight: 800,
                        display: "flex",
                        alignItems: "center",
                        gap: "2px",
                      }}
                    >
                      <Check size={11} strokeWidth={3} />
                      <span>بدون نت</span>
                    </span>
                    <button
                      onClick={(e) => handleDeleteOffline(e, surah.number)}
                      title="حذف من التحميلات"
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "#94A3B8",
                        cursor: "pointer",
                        padding: "5px",
                        borderRadius: "6px",
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ) : isDownloading ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "3px",
                      fontSize: "10.5px",
                      color: "#059669",
                      fontWeight: 800,
                      backgroundColor: isDark ? "rgba(5, 150, 105, 0.15)" : "rgba(6, 78, 59, 0.08)",
                      padding: "3px 6px",
                      borderRadius: "6px",
                    }}
                  >
                    <Loader2 size={11} className="wird-spin" />
                    <span>{downloadProgress[surah.number]}%</span>
                  </div>
                ) : (
                  <button
                    onClick={(e) => handleDownload(e, surah.number)}
                    title="تحميل للاستماع بدون إنترنت"
                    style={{
                      background: "transparent",
                      border: isDark ? "1px solid #334155" : "1px solid #CBD5E1",
                      borderRadius: "7px",
                      padding: "5px 8px",
                      fontSize: "10.5px",
                      color: isDark ? "#CBD5E1" : "#475569",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "3px",
                    }}
                  >
                    <Download size={11} />
                    <span>تحميل</span>
                  </button>
                )}

                {/* Play / Pause Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlaySurah(surah.number);
                  }}
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    backgroundColor: isCurrentActive && isPlaying
                      ? "#059669"
                      : isDark
                      ? "#1E293B"
                      : "#F1F5F9",
                    color: isCurrentActive && isPlaying
                      ? "#FFFFFF"
                      : isDark
                      ? "#34D399"
                      : "#064E3B",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {isCurrentActive && isPlaying ? <Pause size={14} /> : <Play size={14} />}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Surah Audio Player Dock */}
      {activeSurahNumber && activeSurahMeta && (
        <div
          style={{
            position: "fixed",
            bottom: "max(10px, env(safe-area-inset-bottom))",
            left: "10px",
            right: "10px",
            maxWidth: "760px",
            margin: "0 auto",
            backgroundColor: isDark ? "#090D16" : "#064E3B",
            color: "#FFFFFF",
            borderRadius: "18px",
            padding: "12px 16px",
            boxShadow: "0 10px 40px rgba(0,0,0,0.45)",
            zIndex: 9999,
            direction: "rtl",
            border: isDark ? "1px solid rgba(255,255,255,0.12)" : "none",
          }}
        >
          {/* Header in player */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
            <div>
              <div style={{ fontSize: "15px", fontWeight: 900, fontFamily: "'Aref Ruqaa', serif", color: "#FCD34D" }}>
                سورة {activeSurahMeta.name}
              </div>
              <div style={{ fontSize: "10.5px", opacity: 0.85 }}>
                {currentReciter.title || currentReciter.name}
                {offlineMap[activeSurahNumber] && " • تشغيل بدون نت"}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              {/* Playback speed toggle */}
              <button
                onClick={() => {
                  const nextRate = playbackRate === 1 ? 1.25 : playbackRate === 1.25 ? 1.5 : 1;
                  setPlaybackRate(nextRate);
                  if (audioRef.current) audioRef.current.playbackRate = nextRate;
                }}
                style={{
                  background: "rgba(255,255,255,0.15)",
                  border: "none",
                  borderRadius: "6px",
                  padding: "3px 6px",
                  color: "#FFFFFF",
                  fontSize: "10px",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                {playbackRate}x
              </button>

              {/* Loop toggle */}
              <button
                onClick={() => {
                  setIsLooping(!isLooping);
                  if (audioRef.current) audioRef.current.loop = !isLooping;
                }}
                style={{
                  background: isLooping ? "#F59E0B" : "rgba(255,255,255,0.15)",
                  border: "none",
                  borderRadius: "6px",
                  padding: "5px",
                  color: "#FFFFFF",
                  cursor: "pointer",
                }}
                title="تكرار السورة"
              >
                <RotateCcw size={12} />
              </button>
            </div>
          </div>

          {/* Timeline Seek Bar */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: "4px 0" }}>
            <span style={{ fontSize: "10px", opacity: 0.8, minWidth: "30px" }}>
              {formatTime(currentTime)}
            </span>
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={(e) => {
                const target = Number(e.target.value);
                setCurrentTime(target);
                if (audioRef.current) audioRef.current.currentTime = target;
              }}
              style={{
                flex: 1,
                accentColor: "#F59E0B",
                height: "3px",
                cursor: "pointer",
              }}
            />
            <span style={{ fontSize: "10px", opacity: 0.8, minWidth: "30px" }}>
              {formatTime(duration)}
            </span>
          </div>

          {/* Controls: Skip -10s, Play/Pause, Skip +10s */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "16px", marginTop: "2px" }}>
            <button
              onClick={() => {
                if (audioRef.current) audioRef.current.currentTime = Math.max(0, currentTime - 10);
              }}
              style={{ background: "transparent", border: "none", color: "#FFFFFF", cursor: "pointer", fontSize: "11px", fontWeight: 700 }}
            >
              -10 ثواني
            </button>

            <button
              onClick={() => handlePlaySurah(activeSurahNumber)}
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "50%",
                backgroundColor: "#FFFFFF",
                color: "#064E3B",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} />}
            </button>

            <button
              onClick={() => {
                if (audioRef.current) audioRef.current.currentTime = Math.min(duration, currentTime + 10);
              }}
              style={{ background: "transparent", border: "none", color: "#FFFFFF", cursor: "pointer", fontSize: "11px", fontWeight: 700 }}
            >
              +10 ثواني
            </button>
          </div>
        </div>
      )}

      {/* Hidden Audio Tag */}
      <audio
        ref={audioRef}
        onTimeUpdate={() => {
          if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
        }}
        onLoadedMetadata={() => {
          if (audioRef.current) setDuration(audioRef.current.duration);
        }}
        onEnded={() => {
          if (!isLooping) setIsPlaying(false);
        }}
        onError={() => {
          setIsPlaying(false);
        }}
      />
    </div>
  );
}
