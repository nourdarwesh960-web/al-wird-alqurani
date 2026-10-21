// Surahs, Juz, and Bookmarks Index Navigation Drawer
// Supports True Dark Mode and Compact Mobile Typography
import { useState } from "react";
import { Bookmark, BookOpen, Layers, Search, X } from "lucide-react";
import { SURAHS_LIST, JUZ_LIST } from "../data/surahs";
import { toArabicNumerals } from "../lib/mushafService";

export default function SurahIndexDrawer({
  isOpen,
  onClose,
  currentPage,
  onSelectPage,
  bookmarks = [],
  isDark = false,
}) {
  if (!isOpen) return null;

  const [tab, setTab] = useState("surahs"); // "surahs" | "juz" | "bookmarks"
  const [query, setQuery] = useState("");

  const filteredSurahs = SURAHS_LIST.filter((s) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return s.name.includes(q) || s.number.toString().includes(q);
  });

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.65)",
        backdropFilter: "blur(4px)",
        zIndex: 10008,
        display: "flex",
        justifyContent: "flex-end",
        direction: "rtl",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(380px, 86vw)",
          height: "100%",
          background: isDark ? "#090D16" : "#FFFFFF",
          color: isDark ? "#F1F5F9" : "#0F172A",
          display: "flex",
          flexDirection: "column",
          boxShadow: "-10px 0 30px rgba(0,0,0,0.4)",
          borderLeft: isDark ? "1px solid rgba(255,255,255,0.1)" : "none",
        }}
      >
        {/* Drawer Header */}
        <div
          style={{
            padding: "14px 16px",
            background: isDark ? "#052219" : "#064E3B",
            color: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <BookOpen size={18} color="#FCD34D" />
            <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 900, fontFamily: "'Aref Ruqaa', serif" }}>
              فهرس المصحف الشريف
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "#FFFFFF", cursor: "pointer", padding: "4px" }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div
          style={{
            padding: "8px 12px",
            borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "#E2E8F0"}`,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: isDark ? "#0F172A" : "#F8FAFC",
              border: isDark ? "1px solid #334155" : "1px solid #E2E8F0",
              borderRadius: "10px",
              padding: "6px 10px",
            }}
          >
            <Search size={14} color="#94A3B8" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث عن اسم السورة أو رقمها..."
              style={{
                border: "none",
                outline: "none",
                background: "transparent",
                fontSize: "12.5px",
                flex: 1,
                color: isDark ? "#FFFFFF" : "#0F172A",
                fontFamily: "inherit",
              }}
            />
          </div>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "#E2E8F0"}`,
            background: isDark ? "#0B111D" : "#F8FAFC",
          }}
        >
          <button
            onClick={() => setTab("surahs")}
            style={{
              flex: 1,
              padding: "9px",
              background: "transparent",
              border: "none",
              borderBottom: tab === "surahs" ? "3px solid #059669" : "3px solid transparent",
              color: tab === "surahs" ? "#059669" : isDark ? "#94A3B8" : "#64748B",
              fontWeight: 800,
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            السور ({toArabicNumerals(114)})
          </button>
          <button
            onClick={() => setTab("juz")}
            style={{
              flex: 1,
              padding: "9px",
              background: "transparent",
              border: "none",
              borderBottom: tab === "juz" ? "3px solid #059669" : "3px solid transparent",
              color: tab === "juz" ? "#059669" : isDark ? "#94A3B8" : "#64748B",
              fontWeight: 800,
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            الأجزاء ({toArabicNumerals(30)})
          </button>
          <button
            onClick={() => setTab("bookmarks")}
            style={{
              flex: 1,
              padding: "9px",
              background: "transparent",
              border: "none",
              borderBottom: tab === "bookmarks" ? "3px solid #059669" : "3px solid transparent",
              color: tab === "bookmarks" ? "#059669" : isDark ? "#94A3B8" : "#64748B",
              fontWeight: 800,
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            الفواصل ({toArabicNumerals(bookmarks.length)})
          </button>
        </div>

        {/* List Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
          {tab === "surahs" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {filteredSurahs.map((s) => {
                const isCurrent =
                  currentPage >= s.startPage &&
                  (s.number === 114 || currentPage < (SURAHS_LIST[s.number]?.startPage || 605));
                return (
                  <div
                    key={s.number}
                    onClick={() => {
                      onSelectPage(s.startPage);
                      onClose();
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 10px",
                      borderRadius: "10px",
                      background: isCurrent
                        ? (isDark ? "rgba(5, 150, 105, 0.2)" : "rgba(6, 78, 59, 0.08)")
                        : (isDark ? "#0F172A" : "#FFFFFF"),
                      border: isCurrent
                        ? "1.5px solid #059669"
                        : `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "#F1F5F9"}`,
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span
                        style={{
                          width: "26px",
                          height: "26px",
                          borderRadius: "6px",
                          background: isCurrent ? "#059669" : isDark ? "#1E293B" : "#F1F5F9",
                          color: isCurrent ? "#FFFFFF" : isDark ? "#94A3B8" : "#64748B",
                          fontSize: "11px",
                          fontWeight: 800,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {toArabicNumerals(s.number)}
                      </span>
                      <div>
                        <div
                          style={{
                            fontWeight: 900,
                            fontSize: "13.5px",
                            color: isDark ? "#F8FAFC" : "#0F172A",
                            fontFamily: "'Aref Ruqaa', serif",
                          }}
                        >
                          سورة {s.name}
                        </div>
                        <div style={{ fontSize: "10px", color: isDark ? "#94A3B8" : "#64748B" }}>
                          {s.type} • {toArabicNumerals(s.ayahs)} آية
                        </div>
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 800,
                        color: isDark ? "#34D399" : "#065F46",
                        background: isDark ? "#1E293B" : "#ECFDF5",
                        padding: "2px 7px",
                        borderRadius: "6px",
                      }}
                    >
                      ص {toArabicNumerals(s.startPage)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {tab === "juz" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {JUZ_LIST.map((j) => (
                <div
                  key={j.juzNumber}
                  onClick={() => {
                    onSelectPage(j.startPage);
                    onClose();
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 12px",
                    borderRadius: "10px",
                    background: isDark ? "#0F172A" : "#FFFFFF",
                    border: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "#F1F5F9"}`,
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Layers size={14} color="#059669" />
                    <span style={{ fontWeight: 800, fontSize: "13px", color: isDark ? "#F8FAFC" : "#0F172A" }}>
                      الجزء {toArabicNumerals(j.juzNumber)}
                    </span>
                  </div>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: isDark ? "#94A3B8" : "#64748B" }}>
                    يبدأ من ص {toArabicNumerals(j.startPage)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {tab === "bookmarks" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {bookmarks.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 10px", color: isDark ? "#94A3B8" : "#64748B", fontSize: "12px" }}>
                  لا توجد فواصل محفوظة حالياً. يمكنك حفظ أي صفحة بالضغط على زر "فاصل" في صفحة المصحف.
                </div>
              ) : (
                bookmarks.map((p) => (
                  <div
                    key={p}
                    onClick={() => {
                      onSelectPage(p);
                      onClose();
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 12px",
                      borderRadius: "10px",
                      background: isDark ? "#0F172A" : "#FFFFFF",
                      border: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "#F1F5F9"}`,
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Bookmark size={14} color="#D97706" />
                      <span style={{ fontWeight: 800, fontSize: "13px", color: isDark ? "#F8FAFC" : "#0F172A" }}>
                        فاصل القراءة — صفحة {toArabicNumerals(p)}
                      </span>
                    </div>
                    <span style={{ fontSize: "11px", color: "#059669", fontWeight: 700 }}>
                      انتقال
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
