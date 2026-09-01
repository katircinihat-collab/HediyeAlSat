import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";
import { adminApi } from "../config/adminApi";
import "../styles/pages/admin.css";

function AdminRoute({ children }) {
  const [durum, setDurum] = useState("kontrol");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setDurum("giris");
        return;
      }

      try {
        await adminApi("/me");
        setDurum("admin");
      } catch {
        setDurum("yasak");
      }
    });

    return unsubscribe;
  }, []);

  if (durum === "kontrol") {
    return (
      <main className="admin-auth-loading" role="status" aria-live="polite">
        <section className="admin-auth-loading-card">
          <div className="admin-auth-spinner" aria-hidden="true" />
          <h1>Yönetici yetkisi kontrol ediliyor</h1>
          <p>Sunucu ilk kez uyanıyorsa bu işlem birkaç saniye sürebilir.</p>
        </section>
      </main>
    );
  }
  if (durum === "giris") return <Navigate to="/login" replace />;
  if (durum === "yasak") return <Navigate to="/" replace />;

  return children;
}

export default AdminRoute;
