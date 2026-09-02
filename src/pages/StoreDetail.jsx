import { Helmet } from "react-helmet-async";
import { Link, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { auth, db } from "../firebase";
import { getListingMainCategory, isA4Listing, isDigitalA4Listing, isLegacySecondHandListing } from "../data/categories";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import StoreHero from "../components/StoreHero";
import StoreStats from "../components/StoreStats";
import StoreAbout from "../components/StoreAbout";
import StoreRating from "../components/StoreRating";
import StoreComments from "../components/StoreComments";
import StoreProducts from "../components/StoreProducts";
import "../styles/pages/store-detail.css";

function StoreDetail() {
  const { id } = useParams();
  const [magaza, setMagaza] = useState(null);
  const [ilanlar, setIlanlar] = useState([]);
  const [yorumlar, setYorumlar] = useState([]);
  const [yorum, setYorum] = useState("");
  const [ortalamaPuan, setOrtalamaPuan] = useState(null);
  const [oySayisi, setOySayisi] = useState(0);
  const [puanVerdiMi, setPuanVerdiMi] = useState(false);
  const [takipEdiyor, setTakipEdiyor] = useState(false);
  const [takipDoc, setTakipDoc] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState("");
  const [urunSekmesi, setUrunSekmesi] = useState("urunler");

  const kategoriler = useMemo(
    () => [...new Set(ilanlar.map(getListingMainCategory).filter(Boolean))],
    [ilanlar]
  );

  const dijitalTasarımlar = useMemo(
    () => ilanlar.filter(isDigitalA4Listing),
    [ilanlar]
  );

  const normalUrunler = useMemo(
    () => ilanlar.filter((ilan) => !isA4Listing(ilan)),
    [ilanlar]
  );

  useEffect(() => {
    let aktif = true;

    async function sayfayiGetir() {
      setYukleniyor(true);
      setHata("");

      try {
        const magazaSnap = await getDoc(doc(db, "magazalar", id));
        if (!aktif) return;

        if (!magazaSnap.exists()) {
          setMagaza(null);
          return;
        }

        const magazaData = { id: magazaSnap.id, ...magazaSnap.data() };
        setMagaza(magazaData);

        if (magazaData.aktif === false) {
          setIlanlar([]);
          setYorumlar([]);
          setOySayisi(0);
          setOrtalamaPuan(null);
          return;
        }

        const [ilanSnap, puanSnap, yorumSnap] = await Promise.all([
          getDocs(query(collection(db, "ilanlar"), where("magazaId", "==", id), where("onay", "==", true))),
          getDocs(query(collection(db, "magazaPuanlari"), where("magazaId", "==", id))),
          getDocs(query(collection(db, "magazaYorumlari"), where("magazaId", "==", id)))
        ]);

        if (!aktif) return;

        setIlanlar(
          ilanSnap.docs
            .map((belge) => ({ id: belge.id, ...belge.data() }))
            .filter((ilan) => !isLegacySecondHandListing(ilan))
        );

        const puanlar = puanSnap.docs.map((belge) => belge.data());
        setOySayisi(puanlar.length);
        setOrtalamaPuan(
          puanlar.length > 0
            ? (puanlar.reduce((toplam, kayit) => toplam + Number(kayit.puan || 0), 0) / puanlar.length).toFixed(1)
            : null
        );
        setPuanVerdiMi(
          Boolean(auth.currentUser && puanlar.some((kayit) => kayit.kullanici === auth.currentUser.email))
        );

        setYorumlar(
          yorumSnap.docs
            .map((belge) => ({ id: belge.id, ...belge.data() }))
            .sort((a, b) => (b.tarih?.seconds || 0) - (a.tarih?.seconds || 0))
            .slice(0, 20)
        );

        if (auth.currentUser) {
          const takipSnap = await getDocs(query(
            collection(db, "takipciler"),
            where("magazaId", "==", id),
            where("kullanici", "==", auth.currentUser.email)
          ));
          if (aktif && !takipSnap.empty) {
            setTakipEdiyor(true);
            setTakipDoc(takipSnap.docs[0].id);
          }
        }
      } catch (error) {
        console.error("Mağaza bilgileri alınamadı:", error);
        if (aktif) setHata("Mağaza bilgileri şu anda yüklenemiyor. Lütfen tekrar deneyin.");
      } finally {
        if (aktif) setYukleniyor(false);
      }
    }

    sayfayiGetir();
    return () => { aktif = false; };
  }, [id]);

  async function takipEt() {
    if (!auth.currentUser) {
      alert("Önce giriş yap.");
      return;
    }

    const yeniTakip = await addDoc(collection(db, "takipciler"), {
      magazaId: id,
      kullanici: auth.currentUser.email,
      tarih: new Date()
    });
    setTakipDoc(yeniTakip.id);
    setTakipEdiyor(true);
  }

  async function takipBirak() {
    if (!takipDoc) return;
    await deleteDoc(doc(db, "takipciler", takipDoc));
    setTakipEdiyor(false);
    setTakipDoc(null);
  }

  async function puanVer(puan) {
    if (!auth.currentUser) {
      alert("Önce giriş yap.");
      return;
    }
    if (puanVerdiMi) {
      alert("Bu mağazayı zaten puanladınız.");
      return;
    }

    await addDoc(collection(db, "magazaPuanlari"), {
      magazaId: id,
      kullanici: auth.currentUser.email,
      puan,
      tarih: new Date()
    });

    const yeniOySayisi = oySayisi + 1;
    const oncekiToplam = Number(ortalamaPuan || 0) * oySayisi;
    setOySayisi(yeniOySayisi);
    setOrtalamaPuan(((oncekiToplam + puan) / yeniOySayisi).toFixed(1));
    setPuanVerdiMi(true);
  }

  async function yorumGonder() {
    if (!auth.currentUser) {
      alert("Önce giriş yap.");
      return;
    }
    if (!yorum.trim()) {
      alert("Yorum yazınız.");
      return;
    }

    const tarih = new Date();
    const yeniYorum = await addDoc(collection(db, "magazaYorumlari"), {
      magazaId: id,
      kullanici: auth.currentUser.email,
      yorum: yorum.trim(),
      tarih
    });
    setYorumlar((onceki) => [{ id: yeniYorum.id, kullanici: auth.currentUser.email, yorum: yorum.trim(), tarih }, ...onceki].slice(0, 20));
    setYorum("");
  }

  const magazaAdi = magaza?.magazaAdi || magaza?.adi || "Mağaza";
  const logo = magaza?.logo || "";

  return (
    <>
      <Navbar />
      <main className="store-page">
        {yukleniyor ? (
          <div className="store-page-state"><span className="store-loading-spinner" /><h1>Mağaza yükleniyor</h1><p>Vitrin hazırlanıyor, lütfen bekleyin.</p></div>
        ) : hata ? (
          <div className="store-page-state store-error-state"><span>⚠️</span><h1>Bir sorun oluştu</h1><p>{hata}</p></div>
        ) : !magaza ? (
          <div className="store-page-state"><span>🏪</span><h1>Mağaza bulunamadı</h1><p>Bu mağaza kaldırılmış veya bağlantı geçersiz olabilir.</p><Link to="/magazalar">Mağazalara dön</Link></div>
        ) : magaza.aktif === false ? (
          <div className="store-page-state store-closed-state"><span>🔒</span><h1>Bu mağaza şu anda aktif değil.</h1><p>Mağaza geçici olarak ziyaretçilere kapatılmıştır.</p><Link to="/magazalar">Aktif mağazaları keşfet</Link></div>
        ) : (
          <>
            <Helmet>
              <title>{magazaAdi} | HediyeAlSat</title>
              <meta name="description" content={magaza.aciklama || `${magazaAdi} mağazasını ziyaret edin.`} />
              <link rel="canonical" href={`https://hediyealsat.com/magaza/${id}`} />
              <meta property="og:type" content="website" />
              <meta property="og:title" content={magazaAdi} />
              <meta property="og:description" content={magaza.aciklama || magazaAdi} />
              {logo && <meta property="og:image" content={logo} />}
            </Helmet>

            <Link to="/magazalar" className="store-back-link">← Mağazalara Dön</Link>
            <div className="store-content">
              <StoreHero magaza={magaza} takipEdiyor={takipEdiyor} takipEt={takipEt} takipBirak={takipBirak} ortalamaPuan={ortalamaPuan} oySayisi={oySayisi} ilanSayisi={ilanlar.length} kategoriler={kategoriler} />
              <StoreStats ilanSayisi={ilanlar.length} ortalamaPuan={ortalamaPuan} oySayisi={oySayisi} />
              <section className="store-catalog" aria-label="Mağaza ürünleri">
                <div className="store-catalog-tabs" role="tablist" aria-label="Ürün türü">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={urunSekmesi === "urunler"}
                    className={urunSekmesi === "urunler" ? "active" : ""}
                    onClick={() => setUrunSekmesi("urunler")}
                  >
                    Ürünler <span>{normalUrunler.length}</span>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={urunSekmesi === "dijital"}
                    className={urunSekmesi === "dijital" ? "active" : ""}
                    onClick={() => setUrunSekmesi("dijital")}
                  >
                    Dijital Tasarımlar <span>{dijitalTasarımlar.length}</span>
                  </button>
                </div>

                {urunSekmesi === "urunler" ? (
                  <StoreProducts key="urunler" ilanlar={normalUrunler} />
                ) : (
                <StoreProducts
                  key="dijital"
                  ilanlar={dijitalTasarımlar}
                  baslik="Dijital Tasarımlar"
                  altMetin="Bu mağazanın dijital A4 tasarımları"
                  kicker="DİJİTAL VİTRİN"
                  bosBaslik="Bu mağazada henüz dijital tasarım yok."
                  bosMetin="Yeni dijital tasarımlar eklendiğinde burada gösterilecek."
                  bosIkon="🎨"
                />
                )}
              </section>

              <div className="store-information-grid">
                <div className="store-information-main">
                  <StoreAbout magaza={magaza} />
                  <StoreComments yorumlar={yorumlar} yorum={yorum} setYorum={setYorum} yorumGonder={yorumGonder} />
                </div>
                <aside className="store-information-side">
                  <StoreRating puanVer={puanVer} puanVerdiMi={puanVerdiMi} />
                </aside>
              </div>
            </div>
          </>
        )}
      </main>
      <Footer />
    </>
  );
}

export default StoreDetail;
