import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  where
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase";

function favoriteQuery(userEmail, listingId) {
  return query(
    collection(db, "favoriler"),
    where("kullanici", "==", userEmail),
    where("ilanId", "==", listingId)
  );
}

export default function useFavorite(ilan) {
  const navigate = useNavigate();
  const [favori, setFavori] = useState(false);
  const [favoriIslemi, setFavoriIslemi] = useState(false);
  const islemKilidi = useRef(false);

  useEffect(() => {
    let favoriDinleyici = null;

    const authDinleyici = onAuthStateChanged(auth, (user) => {
      if (favoriDinleyici) favoriDinleyici();

      if (!user || !ilan?.id) {
        setFavori(false);
        return;
      }

      favoriDinleyici = onSnapshot(
        favoriteQuery(user.email, ilan.id),
        (snapshot) => setFavori(!snapshot.empty),
        (error) => console.error("Favori durumu alınamadı:", error)
      );
    });

    return () => {
      authDinleyici();
      if (favoriDinleyici) favoriDinleyici();
    };
  }, [ilan?.id]);

  async function favoriDegistir(event) {
    event?.preventDefault();
    event?.stopPropagation();

    const user = auth.currentUser;
    if (!user) {
      navigate("/login");
      return;
    }

    if (!ilan?.id || islemKilidi.current) return;

    islemKilidi.current = true;
    setFavoriIslemi(true);

    try {
      const snapshot = await getDocs(favoriteQuery(user.email, ilan.id));

      if (!snapshot.empty) {
        await Promise.all(
          snapshot.docs.map((favorite) =>
            deleteDoc(doc(db, "favoriler", favorite.id))
          )
        );
      } else {
        const favoriteId = `${user.uid}_${ilan.id}`;
        await setDoc(doc(db, "favoriler", favoriteId), {
            kullanici: user.email,
            ilanId: ilan.id,
            baslik: ilan.baslik || "",
            fiyat: Number(ilan.fiyat || 0),
            resim: ilan.resim || ilan.resimler?.[0] || "",
            sehir: ilan.sehir || "",
            tarih: new Date()
          });
      }
    } catch (error) {
      console.error("Favori işlemi başarısız:", error);
      alert("Favori işlemi tamamlanamadı. Lütfen tekrar deneyin.");
    } finally {
      islemKilidi.current = false;
      setFavoriIslemi(false);
    }
  }

  return { favori, favoriDegistir, favoriIslemi };
}
