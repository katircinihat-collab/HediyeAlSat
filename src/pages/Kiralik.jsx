import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

import { db } from "../firebase";
import cities from "../data/cities";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { isA4Listing, isLegacySecondHandListing } from "../data/categories";

import "../styles/pages/kiralik.css";

function Kiralik() {

  const navigate = useNavigate();

  const [ilanlar, setIlanlar] = useState([]);
  const [filtreliIlanlar, setFiltreliIlanlar] = useState([]);

  const [arama, setArama] = useState("");
  const [kategori, setKategori] = useState("");
  const [sehir, setSehir] = useState("");
  const [sirala, setSirala] = useState("yeni");

  const [yukleniyor, setYukleniyor] = useState(true);

  useEffect(() => {
    getir();
  }, []);

  async function getir() {

    try {

      setYukleniyor(true);

      const snap = await getDocs(
        query(collection(db, "ilanlar"), where("onay", "==", true))
      );

      const liste = snap.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter((ilan) =>
          ilan.tip === "Kiralık" &&
          !isLegacySecondHandListing(ilan) &&
          !isA4Listing(ilan)
        );

      setIlanlar(liste);
      setFiltreliIlanlar(liste);

    } catch (error) {

      console.error(
        "Kiralık ilanlar alınamadı:",
        error
      );

    } finally {

      setYukleniyor(false);

    }

  }

  useEffect(() => {

    let sonuc = [...ilanlar];

    if (arama.trim()) {

      const kelime =
        arama.toLowerCase().trim();

      sonuc = sonuc.filter((ilan) => {

        const metin = (

          (ilan.baslik || "") +
          " " +
          (ilan.aciklama || "") +
          " " +
          (ilan.kategori || "") +
          " " +
          (ilan.altKategori || "") +
          " " +
          (ilan.sehir || "") +
          " " +
          (ilan.marka || "")

        ).toLowerCase();

        return metin.includes(kelime);

      });

    }

    if (kategori) {

      sonuc = sonuc.filter(
        (ilan) =>
          ilan.kategori === kategori
      );

    }

    if (sehir) {

      sonuc = sonuc.filter(
        (ilan) =>
          ilan.sehir === sehir
      );

    }

    if (sirala === "fiyatArtan") {

      sonuc.sort(
        (a, b) =>
          Number(a.fiyat || 0) -
          Number(b.fiyat || 0)
      );

    }

    if (sirala === "fiyatAzalan") {

      sonuc.sort(
        (a, b) =>
          Number(b.fiyat || 0) -
          Number(a.fiyat || 0)
      );

    }

    if (sirala === "populer") {

      sonuc.sort(
        (a, b) =>
          Number(b.goruntulenme || 0) -
          Number(a.goruntulenme || 0)
      );

    }

    if (sirala === "yeni") {

      sonuc.sort((a, b) => {

        const ta =
          a.tarih?.seconds ||
          0;

        const tb =
          b.tarih?.seconds ||
          0;

        return tb - ta;

      });

    }

    setFiltreliIlanlar(sonuc);

  }, [
    ilanlar,
    arama,
    kategori,
    sehir,
    sirala
  ]);

  const kategoriler = [
    ...new Set(
      ilanlar
        .map((ilan) => ilan.kategori)
        .filter(Boolean)
    )
  ];

  const sehirSayisi = new Set(
    ilanlar
      .map((ilan) => ilan.sehir)
      .filter(Boolean)
  ).size;

  function temizle() {

    setArama("");
    setKategori("");
    setSehir("");
    setSirala("yeni");

  }

  function fiyatGoster(fiyat) {

    const sayi =
      Number(fiyat || 0);

    return sayi.toLocaleString(
      "tr-TR",
      {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      }
    );

  }

  function resimBul(ilan) {

    if (
      ilan.resimler &&
      ilan.resimler.length > 0
    ) {

      return ilan.resimler[0];

    }

    if (ilan.resim) {

      return ilan.resim;

    }

    return "https://via.placeholder.com/600x450?text=HediyeAlSat";

  }

  return (

    <div className="kiralik-page">

      <Navbar />

      {/* HERO */}

      <section className="kiralik-hero">

        <div className="kiralik-hero-content">

          <span className="kiralik-badge">
            🏠 KİRALIK ÜRÜNLER
          </span>

          <h1>
            Kiralık Hediyeler
          </h1>

          <p>
            Özel günler, organizasyonlar,
            etkinlikler ve kısa süreli
            ihtiyaçlarınız için kiralık
            ürünleri keşfedin.
          </p>

          <div className="kiralik-hero-stats">

            <div>
              <strong>
                {ilanlar.length}
              </strong>

              <span>
                Kiralık İlan
              </span>
            </div>

            <div>
              <strong>
                {kategoriler.length}
              </strong>

              <span>
                Kategori
              </span>
            </div>

            <div>
              <strong>
                {sehirSayisi}
              </strong>

              <span>
                Şehir
              </span>
            </div>

          </div>

        </div>

      </section>


      {/* ANA ALAN */}

      <main className="kiralik-container">

        {/* ARAMA */}

        <div className="kiralik-toolbar">

          <div className="kiralik-search">

            <span>
              🔍
            </span>

            <input
              type="text"
              placeholder="Kiralık ürün ara..."
              value={arama}
              onChange={(e) =>
                setArama(e.target.value)
              }
            />

          </div>

          <div className="kiralik-sort">

            <label>
              Sırala:
            </label>

            <select
              value={sirala}
              onChange={(e) =>
                setSirala(e.target.value)
              }
            >

              <option value="yeni">
                En Yeni
              </option>

              <option value="fiyatArtan">
                Fiyat: Düşükten Yükseğe
              </option>

              <option value="fiyatAzalan">
                Fiyat: Yüksekten Düşüğe
              </option>

              <option value="populer">
                En Çok Görüntülenen
              </option>

            </select>

          </div>

        </div>


        <div className="kiralik-layout">


          {/* FİLTRELER */}

          <aside className="kiralik-filters">

            <div className="filter-title">

              <h3>
                🔎 Filtrele
              </h3>

              <button
                type="button"
                onClick={temizle}
              >
                Temizle
              </button>

            </div>


            <div className="filter-group">

              <label>
                Kategori
              </label>

              <select
                value={kategori}
                onChange={(e) =>
                  setKategori(e.target.value)
                }
              >

                <option value="">
                  Tüm Kategoriler
                </option>

                {kategoriler.map((item) => (

                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>

                ))}

              </select>

            </div>


            <div className="filter-group">

              <label>
                Şehir
              </label>

              <select
                value={sehir}
                onChange={(e) =>
                  setSehir(e.target.value)
                }
              >

                <option value="">
                  Tüm Şehirler
                </option>

                {cities.map((item) => (

                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>

                ))}

              </select>

            </div>


            <button
              className="filter-apply"
              type="button"
              onClick={() => {
                setKategori(kategori);
                setSehir(sehir);
              }}
            >
              Filtreleri Uygula
            </button>

          </aside>


          {/* SONUÇLAR */}

          <section className="kiralik-results">

            <div className="results-header">

              <div>

                <h2>
                  🏠 Kiralık İlanlar
                </h2>

                <p>
                  {filtreliIlanlar.length} ürün bulundu
                </p>

              </div>

            </div>


            {yukleniyor ? (

              <div className="kiralik-loading">

                <div className="loading-spinner">
                  ⏳
                </div>

                <h3>
                  Kiralık ilanlar yükleniyor...
                </h3>

                <p>
                  Lütfen bekleyin.
                </p>

              </div>

            ) : filtreliIlanlar.length === 0 ? (

              <div className="kiralik-empty">

                <div className="empty-icon">
                  🏠
                </div>

                <h3>
                  Kiralık ilan bulunamadı
                </h3>

                <p>
                  Arama veya filtrelerinizi
                  değiştirmeyi deneyin.
                </p>

                <button
                  type="button"
                  onClick={temizle}
                >
                  Filtreleri Temizle
                </button>

              </div>

            ) : (

              <div className="kiralik-grid">

                {filtreliIlanlar.map((ilan) => (

                  <div
                    key={ilan.id}
                    className="kiralik-card"
                    onClick={() =>
                      navigate(`/ilan/${ilan.id}`)
                    }
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {

                      if (
                        e.key === "Enter"
                      ) {

                        navigate(
                          `/ilan/${ilan.id}`
                        );

                      }

                    }}
                  >

                    <div className="kiralik-image">

                      <img
                        src={resimBul(ilan)}
                        alt={
                          ilan.baslik ||
                          "Kiralık ürün"
                        }
                      />

                      <span className="kiralik-label">
                        🏠 Kiralık
                      </span>

                      {ilan.oneCikan && (

                        <span className="featured-label">
                          ⭐ Öne Çıkan
                        </span>

                      )}

                    </div>


                    <div className="kiralik-card-content">

                      <span className="card-category">
                        {ilan.kategori ||
                          "Hediye"}
                      </span>

                      <h3>
                        {ilan.baslik ||
                          "İsimsiz ürün"}
                      </h3>

                      <p className="card-location">
                        📍{" "}
                        {ilan.sehir ||
                          "Şehir belirtilmemiş"}
                      </p>


                      <div className="card-bottom">

                        <div className="card-price">

                          <strong>
                            {fiyatGoster(
                              ilan.fiyat
                            )} TL
                          </strong>

                          <span>
                            Kiralama fiyatı
                          </span>

                        </div>

                        <div className="card-arrow">
                          →
                        </div>

                      </div>

                    </div>

                  </div>

                ))}

              </div>

            )}

          </section>

        </div>

      </main>

      <Footer />

    </div>

  );

}

export default Kiralik;
