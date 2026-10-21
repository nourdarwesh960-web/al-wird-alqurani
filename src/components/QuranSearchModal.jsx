import { useState } from "react";
import { Search, X, Loader2, BookOpen, ChevronLeft } from "lucide-react";
import { toArabicNumerals } from "../lib/mushafService";
import { SURAHS_LIST } from "../data/surahs";

export default function QuranSearchModal({
  isOpen,
  onClose,
  onSelectPage,
  isDark = false,
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  if (!isOpen) return null;

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    const q = query.trim();
    if (!q || q.length < 2) {
      setError("يرجى إدخال كلمتين أو حرفين على الأقل للبحث");
      return;
    }

    setLoading(true);
    setError("");
    setHasSearched(true);

    try {
      // Search in simplified Quranic text
      const res = await fetch(
        `https://api.alquran.cloud/v1/search/${encodeURIComponent(q)}/all/quran-simple`
      );
      if (!res.ok) {
        throw new Error(`تعذر إجراء البحث (${res.status})`);
      }
      const data = await res.json();
      const matches = data?.data?.matches || [];

      // Enrich top 30 matches with page numbers
      const topMatches = matches.slice(0, 30);

      // Fetch page info for top results
      const resolved = await Promise.all(
        topMatches.map(async (m) => {
          try {
            const ayahRes = await fetch(
              `https://api.alquran.cloud/v1/ayah/${m.number}`
            );
            if (ayahRes.ok) {
              const ayahData = await ayahRes.json();
              return {
                ...m,
                page: ayahData?.data?.page || 1,
              };
            }
          } catch {}

          // Fallback approximate page from surah start
          const surahMeta = SURAHS_LIST.find((s) => s.number === m.surah.number);
          return {
            ...m,
            page: surahMeta?.startPage || 1,
          };
        })
      );

      setResults(resolved);
    } catch (err) {
      setError("حدث خطأ أثناء البحث. يرجى التحقق من اتصال الإنترنت.");
    } finally {
      setLoading(false);
    }
  };

  const handleJumpToPage = (pageNum) => {
    onSelectPage(pageNum);
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
        zIndex: 10006,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "640px",
          maxHeight: "88vh",
          backgroundColor: isDark ? "#090D16" : "#FFFFFF",
          color: isDark ? "#F1F5F9" : "#0F172A",
          borderTopLeftRadius: "22px",
          borderTopRightRadius: "22px",
          display: "flex",
          flexDirection: "column",
          direction: "rtl",
          boxShadow: "0 -10px 40px rgba(0,0,0,0.3)",
          paddingBottom: "max(16px, env(safe-area-inset-bottom))",
          overflow: "hidden",
          border: isDark ? "1px solid rgba(255,255,255,0.1)" : "none",
        }}
      >
        {/* Top Header */}
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

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "10px",
                  backgroundColor: isDark
                    ? "rgba(16, 185, 129, 0.15)"
                    : "rgba(6, 78, 59, 0.1)",
                  color: isDark ? "#34D399" : "#064E3B",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Search size={16} />
              </div>
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: "16px",
                    fontWeight: 900,
                    fontFamily: "'Aref Ruqaa', serif",
                    color: isDark ? "#FCD34D" : "#0F172A",
                  }}
                >
                  البحث في آيات القرآن الكريم
                </h3>
                <span style={{ fontSize: "11px", color: isDark ? "#94A3B8" : "#64748B" }}>
                  ابحث بأي كلمة أو جملة من الآية للوصول إليها مباشرة
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

          {/* Search Form */}
          <form
            onSubmit={handleSearch}
            style={{
              marginTop: "12px",
              position: "relative",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <div style={{ position: "relative", flex: 1, display: "flex", alignItems: "center" }}>
              <Search
                size={14}
                style={{
                  position: "absolute",
                  right: "12px",
                  color: isDark ? "#64748B" : "#94A3B8",
                }}
              />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="اكتب كلمات من الآية (مثال: الله نور، إياك نعبد، تبارك الذي)..."
                autoFocus
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

            <button
              type="submit"
              disabled={loading}
              style={{
                backgroundColor: "#059669",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "12px",
                padding: "10px 16px",
                fontSize: "12.5px",
                fontWeight: 800,
                cursor: loading ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                flexShrink: 0,
              }}
            >
              {loading ? <Loader2 size={14} className="wird-spin" /> : <Search size={14} />}
              <span>بحث</span>
            </button>
          </form>
        </div>

        {/* Search Results List */}
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
          {loading && (
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <Loader2 size={24} className="wird-spin" style={{ margin: "0 auto 8px", color: "#10B981" }} />
              <div style={{ fontSize: "13px", color: isDark ? "#94A3B8" : "#64748B" }}>
                جاري البحث في المصحف الشريف...
              </div>
            </div>
          )}

          {error && (
            <div
              style={{
                backgroundColor: isDark ? "rgba(220, 38, 38, 0.15)" : "#FEE2E2",
                color: isDark ? "#FCA5A5" : "#991B1B",
                padding: "10px 14px",
                borderRadius: "10px",
                fontSize: "12px",
                fontWeight: 700,
              }}
            >
              {error}
            </div>
          )}

          {!loading && hasSearched && results.length === 0 && !error && (
            <div
              style={{
                textAlign: "center",
                padding: "40px 20px",
                color: isDark ? "#94A3B8" : "#64748B",
              }}
            >
              <div style={{ fontSize: "14px", fontWeight: 700 }}>لم يتم العثور على نتائج</div>
              <div style={{ fontSize: "12px", marginTop: "4px" }}>
                تأكد من كتابة الكلمات بدون تشكيل أو جرّب كلمة أخرى من الآية
              </div>
            </div>
          )}

          {!loading &&
            results.map((item) => (
              <div
                key={`${item.surah.number}:${item.numberInSurah}`}
                onClick={() => handleJumpToPage(item.page)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                  padding: "12px 14px",
                  borderRadius: "12px",
                  border: isDark ? "1px solid #1E293B" : "1px solid #E2E8F0",
                  backgroundColor: isDark ? "#0F172A" : "#FFFFFF",
                  cursor: "pointer",
                  transition: "background-color 0.15s ease",
                }}
              >
                {/* Verse Meta Row */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: "12px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span
                      style={{
                        fontWeight: 900,
                        color: isDark ? "#FCD34D" : "#064E3B",
                        fontFamily: "'Aref Ruqaa', serif",
                      }}
                    >
                      {item.surah.name?.replace("سُورَةُ ", "سورة ")}
                    </span>
                    <span
                      style={{
                        fontSize: "11px",
                        color: isDark ? "#94A3B8" : "#64748B",
                      }}
                    >
                      الآية {toArabicNumerals(item.numberInSurah)}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      backgroundColor: isDark ? "#1E293B" : "#F1F5F9",
                      color: isDark ? "#34D399" : "#065F46",
                      padding: "3px 8px",
                      borderRadius: "6px",
                      fontSize: "11px",
                      fontWeight: 800,
                    }}
                  >
                    <BookOpen size={11} />
                    <span>صفحة {toArabicNumerals(item.page)}</span>
                    <ChevronLeft size={11} />
                  </div>
                </div>

                {/* Ayah Text */}
                <div
                  style={{
                    fontFamily: "'Amiri Quran', serif",
                    fontSize: "17px",
                    lineHeight: "1.8",
                    color: isDark ? "#F1F5F9" : "#1E293B",
                  }}
                >
                  {item.text}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
