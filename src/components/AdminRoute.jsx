import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";
import { adminApi } from "../config/adminApi";

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

  if (durum === "kontrol") return <div className="page">Yetki kontrol ediliyor...</div>;
  if (durum === "giris") return <Navigate to="/login" replace />;
  if (durum === "yasak") return <Navigate to="/" replace />;

  return children;
}

export default AdminRoute;
