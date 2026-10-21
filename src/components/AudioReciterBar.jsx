// Audio Recitation Bar with Reciter Selection and Ayah Loop
import { useState } from "react";
import { Headphones, Pause, Play, Repeat, Volume2, X } from "lucide-react";
import { RECITERS_LIST } from "../data/surahs";

export default function AudioReciterBar({
  isPlaying,
  onTogglePlay,
  onStop,
  currentVerseKey,
  selectedReciter,
  onChangeReciter,
  repetitions,
  onChangeRepetitions,
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="wird-audio-bar-dock"
      style={{
        position: "fixed",
        bottom: "max(12px, env(safe-area-inset-bottom, 0px))",
        left: "12px",
        right: "12px",
        margin: "0 auto",
        maxWidth: "620px",
        background: "rgba(6, 78, 59, 0.95)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        border: "1.5px solid rgba(245, 158, 11, 0.4)",
        borderRadius: "999px",
        padding: "4px 10px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        color: "#FFFFFF",
        boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
        zIndex: 50,
        direction: "rtl",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
        {/* Play/Pause Button */}
        <button
          onClick={onTogglePlay}
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            background: "#F59E0B",
            color: "#000000",
            border: "none",
            display: "grid",
            placeItems: "center",
            cursor: "pointer",
            flexShrink: 0,
            boxShadow: "0 2px 6px rgba(245, 158, 11, 0.4)",
          }}
        >
          {isPlaying ? <Pause size={15} /> : <Play size={15} />}
        </button>

        {/* Reciter & Current Ayah Info */}
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "12.5px", fontWeight: 800, color: "#FDE68A" }}>
              {selectedReciter === "ar.luhaidan"
                ? `تلاوة الشيخ محمد اللحيدان ${currentVerseKey ? `(آية ${currentVerseKey})` : ""}`
                : currentVerseKey
                ? `تلاوة الآية ${currentVerseKey}`
                : "مشغل التلاوة القرآني"}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <select
              value={selectedReciter}
              onChange={(e) => onChangeReciter(e.target.value)}
              style={{
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: "8px",
                color: "#FFFFFF",
                fontSize: "11px",
                padding: "2px 6px",
                outline: "none",
                cursor: "pointer",
              }}
            >
              {RECITERS_LIST.map((r) => (
                <option key={r.id} value={r.id} style={{ background: "#064E3B", color: "#FFFFFF" }}>
                  الشيخ {r.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Repetition Selector & Close */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <button
          onClick={() => {
            const next = repetitions >= 10 ? 1 : repetitions === 1 ? 3 : repetitions === 3 ? 5 : 10;
            onChangeRepetitions(next);
          }}
          title="تكرار الآية"
          style={{
            background: repetitions > 1 ? "rgba(245, 158, 11, 0.25)" : "rgba(255,255,255,0.1)",
            border: `1px solid ${repetitions > 1 ? "#F59E0B" : "rgba(255,255,255,0.2)"}`,
            borderRadius: "999px",
            padding: "4px 10px",
            color: repetitions > 1 ? "#FDE68A" : "#FFFFFF",
            fontSize: "11px",
            fontWeight: 800,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <Repeat size={13} />
          <span>{repetitions}x</span>
        </button>

        <button
          onClick={onStop}
          title="إغلاق المشغل"
          style={{
            background: "none",
            border: "none",
            color: "rgba(255,255,255,0.7)",
            cursor: "pointer",
            padding: "4px",
          }}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
