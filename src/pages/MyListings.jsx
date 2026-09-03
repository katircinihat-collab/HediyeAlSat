import { useEffect, useMemo, useState } from "react";
import { auth, db } from "../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

import { Link } from "react-router-dom";
import { isA4Listing } from "../data/categories";

function MyListings() {
  const [ilanlar, setIlanlar] = useState([]);
  const [aktifSekme, setAktifSekme] = useState("urun");
  const [yukleniyor, setYukleniyor] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setIlanlar([]);
        setYukleniyor(false);
        return;
      }

      try {
        setYukleniyor(true);

        const q = query(
          collection(db, "ilanlar"),
          where("sahip", "==", user.email)
        );

        const snap = await getDocs(q);

        setIlanlar(
          snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          }))
        );
      } catch (error) {
        console.error("İlanlar getirilemedi:", error);
        setIlanlar([]);
      } finally {
        setYukleniyor(false);
      }
    });

    return () => unsubscribe();
  }, []);

  async function sil(id) {
    if (!window.confirm("Bu ilan silinsin mi?")) return;

    try {
      await deleteDoc(doc(db, "ilanlar", id));

      setIlanlar((onceki) =>
        onceki.filter((ilan) => ilan.id !== id)
      );
    } catch (error) {
      console.error("İlan silinemedi:", error);
      window.alert("İlan silinirken bir hata oluştu.");
    }
  }

  const urunIlanlari = useMemo(
    () => ilanlar.filter((ilan) => !isA4Listing(ilan)),
    [ilanlar]
  );

  const a4Tasarımlari = useMemo(
    () => ilanlar.filter((ilan) => isA4Listing(ilan)),
    [ilanlar]
  );

  const gosterilenIlanlar =
    aktifSekme === "a4"
      ? a4Tasarımlari
      : urunIlanlari;

  return (
    <>
      <style>{`
        .my-listings-page {
          width: calc(100% - 48px);
          max-width: 1560px;
          margin: 0 auto;
          padding: 26px 0 42px;
          box-sizing: border-box;
        }

        .my-listings-home-link {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          margin-bottom: 14px;
          padding: 7px 11px;
          border: 1px solid #e1e3e6;
          border-radius: 8px;
          background: #ffffff;
          color: #555555;
          text-decoration: none;
          font-size: 12px;
          font-weight: 700;
          transition:
            color 0.2s ease,
            border-color 0.2s ease,
            background 0.2s ease;
        }

        .my-listings-home-link:hover {
          color: #c1121f;
          border-color: #c1121f;
          background: #fff8f7;
        }

        .my-listings-title {
          margin: 0 0 16px;
          font-size: 27px;
          font-weight: 800;
          color: #171717;
        }

        .my-listings-tabs {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 20px;
          padding-bottom: 11px;
          border-bottom: 1px solid #e3e5e8;
        }

        .my-listings-tab {
          min-height: 38px;
          padding: 7px 15px;
          border: 1px solid #d9dce1;
          border-radius: 9px;
          background: #ffffff;
          color: #444;
          font-size: 12px;
          font-weight: 750;
          cursor: pointer;
          transition:
            background 0.2s ease,
            color 0.2s ease,
            border-color 0.2s ease;
        }

        .my-listings-tab:hover {
          border-color: #c1121f;
          color: #c1121f;
        }

        .my-listings-tab.active {
          background: linear-gradient(
            135deg,
            #c1121f,
            #e34a20
          );
          border-color: transparent;
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(193, 18, 31, 0.18);
        }

        .my-listings-tab-count {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 20px;
          height: 20px;
          margin-left: 5px;
          padding: 0 5px;
          border-radius: 999px;
          background: #f0f1f3;
          color: #555;
          font-size: 10px;
          box-sizing: border-box;
        }

        .my-listings-tab.active .my-listings-tab-count {
          background: rgba(255, 255, 255, 0.2);
          color: #ffffff;
        }

        .my-listings-section-title {
          margin: 0 0 14px;
          font-size: 16px;
          font-weight: 800;
          color: #242424;
        }

        .my-listings-loading,
        .my-listings-empty {
          padding: 30px 20px;
          background: #ffffff;
          border: 1px solid #e7e7e7;
          border-radius: 14px;
          text-align: center;
          color: #666666;
          font-size: 14px;
        }

        .my-listings-grid {
          display: grid;
          grid-template-columns: repeat(
            auto-fill,
            minmax(195px, 215px)
          );
          gap: 16px;
          justify-content: start;
          align-items: start;
        }

        .my-listing-card {
          width: 100%;
          max-width: 215px;
          min-width: 0;
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 13px;
          overflow: hidden;
          box-sizing: border-box;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.055);
          display: flex;
          flex-direction: column;
          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease;
        }

        .my-listing-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 7px 18px rgba(0, 0, 0, 0.09);
        }

        .my-listing-image-box,
        .my-listing-no-image {
          width: 100%;
          height: 145px;
          background: #f7f7f8;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          border-bottom: 1px solid #eeeeee;
        }

        .my-listing-no-image {
          color: #9ca3af;
          font-size: 12px;
        }

        .my-listing-image {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: contain;
          padding: 5px;
          box-sizing: border-box;
        }

        .my-listing-content {
          padding: 10px 11px 11px;
          display: flex;
          flex-direction: column;
          flex: 1;
          box-sizing: border-box;
        }

        .my-listing-type {
          display: inline-flex;
          align-items: center;
          width: fit-content;
          min-height: 21px;
          padding: 3px 7px;
          margin-bottom: 6px;
          border-radius: 6px;
          background: #fff1ec;
          color: #c23a17;
          font-size: 9px;
          font-weight: 800;
        }

        .my-listing-name {
          margin: 0 0 6px;
          min-height: 34px;
          color: #171717;
          font-size: 14px;
          line-height: 1.25;
          font-weight: 750;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .my-listing-price {
          margin: 0 0 6px;
          font-size: 16px;
          font-weight: 800;
          color: #c1121f;
        }

        .my-listing-info {
          display: flex;
          flex-direction: column;
          gap: 3px;
          margin-bottom: 6px;
        }

        .my-listing-info-row {
          margin: 0;
          font-size: 11px;
          line-height: 1.25;
          color: #60646c;
        }

        .my-listing-status {
          display: inline-flex;
          align-items: center;
          width: fit-content;
          min-height: 22px;
          padding: 3px 7px;
          margin-top: 1px;
          border-radius: 6px;
          box-sizing: border-box;
          font-size: 10px;
          font-weight: 700;
        }

        .my-listing-status.is-live {
          background: #ecfdf3;
          color: #17803d;
        }

        .my-listing-status.is-pending {
          background: #fff7e6;
          color: #a15c00;
        }

        .my-listing-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 5px;
          margin-top: 5px;
          padding-top: 5px;
        }

        .my-listing-actions a {
          text-decoration: none;
          min-width: 0;
        }

        .my-listing-button {
          width: 100%;
          min-height: 30px;
          padding: 5px;
          border: 1px solid #d7d9dd;
          border-radius: 7px;
          background: #ffffff;
          color: #242424;
          font-size: 10px;
          font-weight: 700;
          cursor: pointer;
          box-sizing: border-box;
        }

        .my-listing-button:hover {
          background: #f5f5f5;
          border-color: #c5c5c5;
        }

        .my-listing-delete {
          grid-column: 1 / -1;
          border-color: #f1c4c8;
          color: #b4232d;
          background: #fff7f7;
        }

        .my-listing-delete:hover {
          background: #ffecec;
          border-color: #e9aeb4;
        }

        @media (max-width: 768px) {
          .my-listings-page {
            width: calc(100% - 28px);
            padding-top: 22px;
          }

          .my-listings-title {
            font-size: 23px;
            margin-bottom: 16px;
          }

          .my-listings-tabs {
            overflow-x: auto;
            padding-bottom: 9px;
          }

          .my-listings-tab {
            flex: 0 0 auto;
            padding: 7px 12px;
          }

          .my-listings-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
          }

          .my-listing-card {
            max-width: none;
          }

          .my-listing-image-box,
          .my-listing-no-image {
            height: 140px;
          }
        }

        @media (max-width: 430px) {
          .my-listings-page {
            width: calc(100% - 20px);
          }

          .my-listings-grid {
            gap: 8px;
          }

          .my-listing-image-box,
          .my-listing-no-image {
            height: 125px;
          }

          .my-listing-content {
            padding: 8px;
          }

          .my-listing-name {
            font-size: 12px;
            min-height: 30px;
          }

          .my-listing-price {
            font-size: 14px;
          }

          .my-listing-info-row {
            font-size: 10px;
          }

          .my-listing-actions {
            grid-template-columns: 1fr;
          }

          .my-listing-delete {
            grid-column: auto;
          }
        }
      `}</style>

      <main className="my-listings-page">
        <Link to="/" className="my-listings-home-link">
          ← Ana Sayfaya Dön
        </Link>

        <h1 className="my-listings-title">
          📦 İlanlarım
        </h1>

        <div className="my-listings-tabs">
          <button
            type="button"
            className={
              aktifSekme === "urun"
                ? "my-listings-tab active"
                : "my-listings-tab"
            }
            onClick={() => setAktifSekme("urun")}
          >
            📦 Ürün İlanlarım

            <span className="my-listings-tab-count">
              {urunIlanlari.length}
            </span>
          </button>

          <button
            type="button"
            className={
              aktifSekme === "a4"
                ? "my-listings-tab active"
                : "my-listings-tab"
            }
            onClick={() => setAktifSekme("a4")}
          >
            🎨 A4 Tasarımlarım

            <span className="my-listings-tab-count">
              {a4Tasarımlari.length}
            </span>
          </button>
        </div>

        <h2 className="my-listings-section-title">
          {aktifSekme === "a4"
            ? "A4 Tasarımlarım"
            : "Ürün İlanlarım"}
        </h2>

        {yukleniyor ? (
          <div className="my-listings-loading">
            İlanlarınız yükleniyor...
          </div>
        ) : gosterilenIlanlar.length === 0 ? (
          <div className="my-listings-empty">
            {aktifSekme === "a4"
              ? "Henüz A4 tasarım ilanınız bulunmuyor."
              : "Henüz ürün ilanınız bulunmuyor."}
          </div>
        ) : (
          <div className="my-listings-grid">
            {gosterilenIlanlar.map((ilan) => {
              const resim =
                ilan.resim ||
                (Array.isArray(ilan.resimler)
                  ? ilan.resimler[0]
                  : null);

              const a4Mu = isA4Listing(ilan);

              return (
                <article
                  className="my-listing-card"
                  key={ilan.id}
                >
                  {resim ? (
                    <div className="my-listing-image-box">
                      <img
                        className="my-listing-image"
                        src={resim}
                        alt={ilan.baslik || "İlan görseli"}
                      />
                    </div>
                  ) : (
                    <div className="my-listing-no-image">
                      Görsel yok
                    </div>
                  )}

                  <div className="my-listing-content">
                    {a4Mu && (
                      <span className="my-listing-type">
                        🎨 A4 TASARIM
                      </span>
                    )}

                    <h2 className="my-listing-name">
                      {ilan.baslik || "Başlıksız ilan"}
                    </h2>

                    <p className="my-listing-price">
                      {ilan.fiyat} TL
                    </p>

                    <div className="my-listing-info">
                      <p className="my-listing-info-row">
                        📍 {ilan.sehir || "Konum belirtilmedi"}
                      </p>

                      <p className="my-listing-info-row">
                        👁️ {ilan.goruntulenme || 0} görüntülenme
                      </p>

                      <span
                        className={
                          ilan.onay
                            ? "my-listing-status is-live"
                            : "my-listing-status is-pending"
                        }
                      >
                        {ilan.onay
                          ? "✅ Yayında"
                          : "🟡 Onay Bekliyor"}
                      </span>
                    </div>

                    <div className="my-listing-actions">
                      <Link to={`/ilan/${ilan.id}`}>
                        <button
                          type="button"
                          className="my-listing-button"
                        >
                          👁 Görüntüle
                        </button>
                      </Link>

                      <Link to={`/duzenle/${ilan.id}`}>
                        <button
                          type="button"
                          className="my-listing-button"
                        >
                          ✏️ Düzenle
                        </button>
                      </Link>

                      <button
                        type="button"
                        className="my-listing-button my-listing-delete"
                        onClick={() => sil(ilan.id)}
                      >
                        🗑️ Sil
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}

export default MyListings;