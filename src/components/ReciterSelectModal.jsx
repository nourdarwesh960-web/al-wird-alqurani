import { useState } from "react";
import { Check, Headphones, Search, X } from "lucide-react";
import { RECITERS_LIST } from "../data/surahs";

export default function ReciterSelectModal({
  isOpen,
  onClose,
  selectedReciterId,
  onSelectReciter,
  isDark = false,
}) {
  const [search, setSearch] = useState("");

  if (!isOpen) return null;

  const filtered = RECITERS_LIST.filter((r) =>
    r.name.includes(search.trim()) || r.title.includes(search.trim())
  );

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.75)",
        backdropFilter: "blur(6px)",
        zIndex: 10005,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "600px",
          maxHeight: "88vh",
          backgroundColor: isDark ? "#090D16" : "#FFFFFF",
          color: isDark ? "#F1F5F9" : "#0F172A",
          borderTopLeftRadius: "22px",
          borderTopRightRadius: "22px",
          display: "flex",
          flexDirection: "column",
          direction: "rtl",
          boxShadow: "0 -10px 40px rgba(0,0,0,0.35)",
          paddingBottom: "max(16px, env(safe-area-inset-bottom))",
          overflow: "hidden",
          border: isDark ? "1px solid rgba(255,255,255,0.1)" : "none",
        }}
      >
        {/* Top Drag Handle & Title */}
        <div
          style={{
            padding: "16px 20px 12px",
            borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "#E2E8F0"}`,
          }}
        >
          <div
            style={{
              width: "36px",
              height: "4px",
              backgroundColor: isDark ? "#334155" : "#CBD5E1",
              borderRadius: "999px",
              margin: "0 auto 12px",
            }}
          />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  backgroundColor: isDark
                    ? "rgba(16, 185, 129, 0.15)"
                    : "rgba(6, 78, 59, 0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: isDark ? "#34D399" : "#064E3B",
                }}
              >
                <Headphones size={18} />
              </div>
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: "16px",
                    fontWeight: 900,
                    color: isDark ? "#FCD34D" : "#0F172A",
                    fontFamily: "'Aref Ruqaa', serif",
                  }}
                >
                  اختيار القارئ
                </h3>
                <span style={{ fontSize: "11px", color: isDark ? "#94A3B8" : "#64748B" }}>
                  حدد القارئ المفضل للاستماع والتكرار
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: "transparent",
                border: "none",
                padding: "6px",
                cursor: "pointer",
                color: isDark ? "#94A3B8" : "#64748B",
                borderRadius: "8px",
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Search Bar */}
          <div
            style={{
              marginTop: "12px",
              position: "relative",
              display: "flex",
              alignItems: "center",
            }}
          >
            <Search
              size={14}
              style={{ position: "absolute", right: "12px", color: isDark ? "#64748B" : "#94A3B8" }}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث عن اسم القارئ أو الشيخ..."
              style={{
                width: "100%",
                padding: "10px 34px 10px 12px",
                borderRadius: "12px",
                border: isDark ? "1px solid #334155" : "1px solid #CBD5E1",
                fontSize: "13px",
                outline: "none",
                backgroundColor: isDark ? "#0F172A" : "#F8FAFC",
                color: isDark ? "#FFFFFF" : "#0F172A",
                boxSizing: "border-box",
              }}
            />
          </div>
        </div>

        {/* Reciters List */}
        <div
          style={{
            overflowY: "auto",
            padding: "12px 16px",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          {filtered.map((reciter) => {
            const isSelected = reciter.id === selectedReciterId;
            return (
              <div
                key={reciter.id}
                onClick={() => {
                  onSelectReciter(reciter.id);
                  onClose();
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 14px",
                  borderRadius: "12px",
                  border: isSelected
                    ? "2px solid #059669"
                    : `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "#E2E8F0"}`,
                  backgroundColor: isSelected
                    ? (isDark ? "rgba(5, 150, 105, 0.18)" : "rgba(6, 78, 59, 0.05)")
                    : (isDark ? "#0F172A" : "#FFFFFF"),
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div
                    style={{
                      width: "34px",
                      height: "34px",
                      borderRadius: "10px",
                      backgroundColor: isSelected
                        ? "#059669"
                        : isDark
                        ? "#1E293B"
                        : "#F1F5F9",
                      color: isSelected ? "#FFFFFF" : isDark ? "#F8FAFC" : "#475569",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: "12.5px",
                    }}
                  >
                    {reciter.name.charAt(0)}
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span
                        style={{
                          fontSize: "14px",
                          fontWeight: 800,
                          color: isDark ? "#F8FAFC" : "#0F172A",
                          fontFamily: "'Aref Ruqaa', serif",
                        }}
                      >
                        {reciter.title || reciter.name}
                      </span>
                      {reciter.featured && (
                        <span
                          style={{
                            fontSize: "10px",
                            backgroundColor: isDark ? "rgba(217, 119, 6, 0.2)" : "#FEF3C7",
                            color: isDark ? "#FDE68A" : "#92400E",
                            padding: "2px 6px",
                            borderRadius: "999px",
                            fontWeight: 700,
                          }}
                        >
                          مفضل
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: "10.5px", color: isDark ? "#94A3B8" : "#64748B", marginTop: "2px" }}>
                      متاح للاستماع الكامل والتكرار
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    border: isSelected ? "2px solid #059669" : `2px solid ${isDark ? "#475569" : "#CBD5E1"}`,
                    backgroundColor: isSelected ? "#059669" : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#FFFFFF",
                  }}
                >
                  {isSelected && <Check size={12} strokeWidth={3} />}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
