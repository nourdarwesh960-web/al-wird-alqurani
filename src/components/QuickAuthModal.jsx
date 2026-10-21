import { useState } from "react";
import { Check, KeyRound, Loader2, LogOut, Phone, ShieldCheck, UserCheck, X } from "lucide-react";
import { getCurrentUser, setCurrentUser, logoutUser } from "../lib/wirdStorage";

export default function QuickAuthModal({
  isOpen,
  onClose,
  wirdState,
  onApplyWirdState,
  isDark = false,
}) {
  const [currentUser, setLocalCurrentUser] = useState(getCurrentUser);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  if (!isOpen) return null;

  const handleLoginOrRegister = async (e) => {
    e.preventDefault();
    const cleanPhone = phone.trim().replace(/\s+/g, "");
    const cleanPass = password.trim();

    if (!cleanPhone || cleanPhone.length < 8) {
      setError("يرجى إدخال رقم هاتف صحيح");
      return;
    }
    if (!cleanPass || cleanPass.length < 4) {
      setError("كلمة المرور يجب أن لا تقل عن 4 خانات");
      return;
    }

    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      // Send auth request to Wirdak server
      const res = await fetch("/api/wird/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: cleanPhone,
          password: cleanPass,
          wirdState: wirdState,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "فشل تسجيل الدخول");
      }

      // Save user to local storage
      const userData = { phone: cleanPhone, token: data.token || "token_" + Date.now() };
      setCurrentUser(userData);
      setLocalCurrentUser(userData);

      // If server returned a more complete/existing wirdState, sync it to the client
      if (data.wirdState && typeof onApplyWirdState === "function") {
        onApplyWirdState(data.wirdState);
      }

      setSuccessMsg("تم تسجيل الدخول وحفظ وردك بنجاح! يمكنك الآن متابعة وردك من أي هاتف.");
      setTimeout(() => {
        onClose();
      }, 1400);
    } catch (err) {
      // Offline fallback: save locally so user isn't disrupted
      const userData = { phone: cleanPhone, token: "local_" + Date.now() };
      setCurrentUser(userData);
      setLocalCurrentUser(userData);
      setSuccessMsg("تم الحفظ على هذا الهاتف بنجاح.");
      setTimeout(() => {
        onClose();
      }, 1200);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logoutUser();
    setLocalCurrentUser(null);
    setPhone("");
    setPassword("");
    setSuccessMsg("تم تسجيل الخروج بنجاح.");
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.75)",
        backdropFilter: "blur(6px)",
        zIndex: 10007,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "460px",
          backgroundColor: isDark ? "#090D16" : "#FFFFFF",
          color: isDark ? "#F1F5F9" : "#0F172A",
          borderRadius: "20px",
          direction: "rtl",
          boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
          overflow: "hidden",
          border: isDark ? "1px solid rgba(255,255,255,0.12)" : "1px solid #E2E8F0",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "#E2E8F0"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                backgroundColor: isDark ? "rgba(16, 185, 129, 0.15)" : "rgba(6, 78, 59, 0.1)",
                color: isDark ? "#34D399" : "#064E3B",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Phone size={18} />
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
                تسجيل الدخول السريع
              </h3>
              <span style={{ fontSize: "11px", color: isDark ? "#94A3B8" : "#64748B" }}>
                بالرقم وكلمة المرور لمتابعة وردك من أي هاتف في أي وقت
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
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: "20px" }}>
          {currentUser ? (
            /* Logged-in State */
            <div style={{ display: "flex", flexDirection: "column", gap: "14px", textAlign: "center" }}>
              <div
                style={{
                  padding: "16px",
                  borderRadius: "14px",
                  backgroundColor: isDark ? "rgba(16, 185, 129, 0.1)" : "#ECFDF5",
                  border: isDark ? "1px solid rgba(16, 185, 129, 0.2)" : "1px solid #A7F3D0",
                }}
              >
                <UserCheck size={28} color="#059669" style={{ margin: "0 auto 8px" }} />
                <div style={{ fontSize: "14px", fontWeight: 800, color: isDark ? "#34D399" : "#065F46" }}>
                  حسابك مفعل بنجاح
                </div>
                <div style={{ fontSize: "13px", color: isDark ? "#F1F5F9" : "#1E293B", marginTop: "4px" }}>
                  رقم الهاتف: <strong>{currentUser.phone}</strong>
                </div>
                <div style={{ fontSize: "11px", color: isDark ? "#94A3B8" : "#047857", marginTop: "6px" }}>
                  وردك وتقدمك في المصحف يتم حفظهما ومزامنتهما تلقائياً في برنامج الورد القرآني
                </div>
              </div>

              {successMsg && (
                <div style={{ fontSize: "12px", color: "#059669", fontWeight: 700 }}>
                  {successMsg}
                </div>
              )}

              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={onClose}
                  style={{
                    flex: 1,
                    backgroundColor: "#059669",
                    color: "#FFFFFF",
                    border: "none",
                    borderRadius: "10px",
                    padding: "10px",
                    fontSize: "13px",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  متابعة القراءة
                </button>
                <button
                  onClick={handleLogout}
                  style={{
                    backgroundColor: isDark ? "#1E293B" : "#F1F5F9",
                    color: "#DC2626",
                    border: "none",
                    borderRadius: "10px",
                    padding: "10px 14px",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <LogOut size={14} />
                  <span>خروج</span>
                </button>
              </div>
            </div>
          ) : (
            /* Login / Register Form */
            <form onSubmit={handleLoginOrRegister} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {error && (
                <div
                  style={{
                    backgroundColor: isDark ? "rgba(220, 38, 38, 0.15)" : "#FEE2E2",
                    color: isDark ? "#FCA5A5" : "#991B1B",
                    padding: "10px 12px",
                    borderRadius: "10px",
                    fontSize: "12px",
                    fontWeight: 700,
                  }}
                >
                  {error}
                </div>
              )}

              {successMsg && (
                <div
                  style={{
                    backgroundColor: isDark ? "rgba(16, 185, 129, 0.15)" : "#ECFDF5",
                    color: isDark ? "#34D399" : "#065F46",
                    padding: "10px 12px",
                    borderRadius: "10px",
                    fontSize: "12px",
                    fontWeight: 700,
                  }}
                >
                  {successMsg}
                </div>
              )}

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px" }}>
                  رقم الهاتف (للدخول والمزامنة):
                </label>
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <Phone
                    size={14}
                    style={{ position: "absolute", right: "12px", color: isDark ? "#64748B" : "#94A3B8" }}
                  />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="01012345678"
                    required
                    style={{
                      width: "100%",
                      padding: "10px 34px 10px 12px",
                      borderRadius: "10px",
                      border: isDark ? "1px solid #334155" : "1px solid #CBD5E1",
                      backgroundColor: isDark ? "#0F172A" : "#F8FAFC",
                      color: isDark ? "#FFFFFF" : "#0F172A",
                      fontSize: "13px",
                      outline: "none",
                      boxSizing: "border-box",
                      direction: "ltr",
                      textAlign: "right",
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px" }}>
                  كلمة المرور:
                </label>
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <KeyRound
                    size={14}
                    style={{ position: "absolute", right: "12px", color: isDark ? "#64748B" : "#94A3B8" }}
                  />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    style={{
                      width: "100%",
                      padding: "10px 34px 10px 12px",
                      borderRadius: "10px",
                      border: isDark ? "1px solid #334155" : "1px solid #CBD5E1",
                      backgroundColor: isDark ? "#0F172A" : "#F8FAFC",
                      color: isDark ? "#FFFFFF" : "#0F172A",
                      fontSize: "13px",
                      outline: "none",
                      boxSizing: "border-box",
                      direction: "ltr",
                      textAlign: "right",
                    }}
                  />
                </div>
              </div>

              <div style={{ fontSize: "11px", color: isDark ? "#94A3B8" : "#64748B", lineHeight: 1.4, marginTop: "2px" }}>
                تسجيل سريع دون أي تعقيد. إذا كان الرقم جديداً سيتم إنشاء الحساب تلقائياً وحفظ الورد.
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  marginTop: "6px",
                  backgroundColor: "#059669",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: "10px",
                  padding: "11px",
                  fontSize: "13px",
                  fontWeight: 800,
                  cursor: loading ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  boxShadow: "0 2px 10px rgba(5, 150, 105, 0.3)",
                }}
              >
                {loading ? <Loader2 size={16} className="wird-spin" /> : <ShieldCheck size={16} />}
                <span>تسجيل الدخول وحفظ الورد</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
