import { Helmet } from "react-helmet-async";
import ProductGallery from "../components/ProductGallery";
import SellerCard from "../components/seller/SellerCard";
import MessageBox from "../components/MessageBox";
import OrderBox from "../components/OrderBox";

import { Link, useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

import {
  doc,
  getDoc,
  updateDoc,
  increment,
  addDoc,
  collection,
  query,
  where,
  getDocs
} from "firebase/firestore";

import { auth, db } from "../firebase";

import "../App.css";

function DetailPage() {

  const { id } = useParams();
  const navigate = useNavigate();

  const [ilan, setIlan] = useState(null);

  const [mesaj, setMesaj] = useState("");

  const [yorumlar, setYorumlar] = useState([]);

  const [puan, setPuan] = useState(5);

  const [yorum, setYorum] = useState("");

  const [takipEdiyor] = useState(false);

  useEffect(() => {

    getir();

  }, [id]);

  async function getir() {

    const ref = doc(db, "ilanlar", id);

    const snap = await getDoc(ref);

    if (!snap.exists()) return;

    try {

      await updateDoc(ref, {

        goruntulenme: increment(1)

      });

    } catch (e) {}

    const data = {

      id: snap.id,

      ...snap.data()

    };

    setIlan(data);

    const yorumQuery = query(

      collection(db, "yorumlar"),

      where("ilanId", "==", id)

    );

    const yorumSnap = await getDocs(yorumQuery);

    setYorumlar(

      yorumSnap.docs.map(d => ({

        id: d.id,

        ...d.data()

      }))

    );

  }

  async function mesajGonder() {

    if (!auth.currentUser) {

      alert("Önce giriş yap");

      return;

    }

    if (!mesaj.trim()) {

      alert("Mesaj yaz");

      return;

    }

    await addDoc(

      collection(db, "mesajlar"),

      {

        gonderen: auth.currentUser.email,

        alan: ilan.sahip,

        ilanId: ilan.id,

        ilanNo: ilan.ilanNo,

        ilanBaslik: ilan.baslik,

        mesaj,

        tarih: new Date(),

        okundu: false

      }

    );

    alert("Mesaj gönderildi ✅");

    setMesaj("");

  }
  async function yorumGonder() {

    if (!auth.currentUser) {

      alert("Önce giriş yap.");

      return;

    }

    if (yorum.trim() === "") {

      alert("Yorum yaz.");

      return;

    }

    await addDoc(

      collection(db, "yorumlar"),

      {

        ilanId: id,

        kullanici: auth.currentUser.email,

        puan,

        yorum,

        tarih: new Date()

      }

    );

    setYorum("");

    setPuan(5);

    const yorumQuery = query(

      collection(db, "yorumlar"),

      where("ilanId", "==", id)

    );

    const yorumSnap = await getDocs(yorumQuery);

    setYorumlar(

      yorumSnap.docs.map((d) => ({

        id: d.id,

        ...d.data()

      }))

    );

  }

  async function sepeteEkle() {

    if (!auth.currentUser) {

      alert("Önce giriş yap");

      return;

    }

    if (auth.currentUser.email === ilan.sahip) {

      alert("Kendi ürününü sepete ekleyemezsin.");

      return;

    }

    const q = query(

      collection(db, "sepet"),

      where("kullanici", "==", auth.currentUser.email),

      where("ilanId", "==", ilan.id)

    );

    const snap = await getDocs(q);

    if (!snap.empty) {

      alert("Bu ürün zaten sepetinizde.");

      return;

    }

    const fiyat =

      parseFloat(

        String(ilan.fiyat)

          .replace(/[^\d.,]/g, "")

          .replace(",", ".")

      ) || 0;

    await addDoc(

      collection(db, "sepet"),

      {

        kullanici: auth.currentUser.email,

        ilanId: ilan.id,

        baslik: ilan.baslik,

        fiyat,

        resim: ilan.resim || "",

        satici: ilan.sahip,

        adet: 1,

        eklenmeTarihi: new Date()

      }

    );

    alert("🛒 Ürün sepete eklendi.");

  }
  async function satinAl() {

    if (!auth.currentUser) {

      alert("Önce giriş yap");

      return;

    }

    if (auth.currentUser.email === ilan.sahip) {

      alert("Kendi ilanınızı satın alamazsınız.");

      return;

    }

    const fiyat =
      parseFloat(
        String(ilan.fiyat)
          .replace(/[^\d.,]/g, "")
          .replace(",", ".")
      ) || 0;

    const komisyon = fiyat * 0.05;

    const netTutar = fiyat - komisyon;

    const siparisRef = await addDoc(

      collection(db, "siparisler"),

      {

        ilanId: ilan.id,

        ilanBaslik: ilan.baslik,

        magazaId: ilan.magazaId || "",

        satici: ilan.sahip,

        alici: auth.currentUser.email,

        fiyat,

        komisyon,

        netTutar,

        durum: "Ödeme Bekleniyor",

        odemeDurumu: false,

        kargoNo: "",

        teslimEdildi: false,

        olusturmaTarihi: new Date()

      }

    );

    navigate(`/odeme?siparisId=${siparisRef.id}`);

  }

  function takipEt() {

    alert("Takip sistemi sonraki aşamada bağlanacak.");

  }

  function takipBirak() {

    alert("Takip sistemi sonraki aşamada bağlanacak.");

  }

  if (!ilan) {

    return <h2>İlan yükleniyor...</h2>;

  }
const fiyat =
  parseFloat(
    String(ilan?.fiyat || 0)
      .replace(/[^\d.,]/g, "")
      .replace(",", ".")
  ) || 0;
  return (

    <>

      <Helmet>

        <title>{ilan.baslik} | HediyeAlSat</title>

        <meta

          name="description"

          content={

            ilan.aciklama ||

            `${ilan.baslik} uygun fiyatla HediyeAlSat'ta`

          }

        />

        <meta

          name="keywords"

          content={`${ilan.baslik}, ${ilan.kategori}, hediye`}

        />

        <link

          rel="canonical"

          href={`https://hediyealsat.com/ilan/${ilan.id}`}

        />

        <meta property="og:type" content="product" />

        <meta property="og:title" content={ilan.baslik} />

        <meta

          property="og:description"

          content={ilan.aciklama || ilan.baslik}

        />

        <meta

          property="og:image"

          content={ilan.resimler?.[0] || ilan.resim}

        />

        <meta

          property="og:url"

          content={`https://hediyealsat.com/ilan/${ilan.id}`}

        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Product",
              name: ilan.baslik,
              image: ilan.resimler?.length
                ? ilan.resimler
                : [ilan.resim],
              description: ilan.aciklama || "",
              sku: ilan.ilanNo || ilan.id,
              brand: {
                "@type": "Brand",
                name: "HediyeAlSat"
              },
              offers: {
                "@type": "Offer",
                price: Number(ilan.fiyat),
                priceCurrency: "TRY",
                availability:
                  ilan.stok > 0
                    ? "https://schema.org/InStock"
                    : "https://schema.org/OutOfStock",
                url: `https://hediyealsat.com/ilan/${ilan.id}`
              }
            })
          }}
        />

      </Helmet>

      <div className="page">

        <Link to="/">

          ← Ana Sayfa

        </Link>

        <div className="detail-container">

          <ProductGallery ilan={ilan} />

          <div className="detail-info">

            <h1>{ilan.baslik}</h1>

            <div className="price-box">

              <h2>
  ₺{fiyat.toLocaleString("tr-TR")}
</h2>

            </div>

            <div className="info-badges">

              <span>⭐ {ilan.puan || 5}</span>

              <span>👁 {ilan.goruntulenme || 0}</span>

              <span>❤️ {ilan.favoriSayisi || 0}</span>

              <span>

                {ilan.stok > 0

                  ? "🟢 Stokta"

                  : "🔴 Tükendi"}

              </span>

            </div>

            <p>📍 Konum: {ilan.sehir}</p>

            <p>📦 Kategori: {ilan.kategori}</p>

            <p>🏷️ Tür: {ilan.tip}</p>

            <SellerCard
              ilan={ilan}
              takipEdiyor={takipEdiyor}
              takipEt={takipEt}
              takipBirak={takipBirak}
            />

            <MessageBox
              mesaj={mesaj}
              setMesaj={setMesaj}
              mesajGonder={mesajGonder}
            />
            <hr />

            <h3>⭐ Ürün Değerlendirmeleri</h3>

            <div className="yorum-ekle">

              <select
                value={puan}
                onChange={(e) => setPuan(Number(e.target.value))}
              >
                <option value={5}>⭐⭐⭐⭐⭐</option>
                <option value={4}>⭐⭐⭐⭐</option>
                <option value={3}>⭐⭐⭐</option>
                <option value={2}>⭐⭐</option>
                <option value={1}>⭐</option>
              </select>

              <textarea
                placeholder="Ürün hakkında yorum yaz..."
                value={yorum}
                onChange={(e) => setYorum(e.target.value)}
              />

              <button onClick={yorumGonder}>
                Yorum Yap
              </button>

            </div>

            <div className="yorum-listesi">

              {

                yorumlar.length === 0

                  ? (

                    <p>

                      Henüz yorum yapılmamış.

                    </p>

                  )

                  : (

                    yorumlar.map((y) => (

                      <div
                        key={y.id}
                        className="yorum-karti"
                      >

                        <h4>

                          {"⭐".repeat(y.puan)}

                        </h4>

                        <p>

                          {y.yorum}

                        </p>

                        <small>

                          {y.kullanici}

                        </small>

                      </div>

                    ))

                  )

              }

            </div>
            <h3>📅 İlan Tarihi</h3>

            <p>

              {ilan.tarih?.toDate
                ? ilan.tarih.toDate().toLocaleDateString("tr-TR")
                : "Yeni"}

            </p>

            <OrderBox
              ilan={ilan}
              satinAl={satinAl}
              sepeteEkle={sepeteEkle}
            />

          </div>

        </div>

      </div>
    </>

  );

}
export default DetailPage;