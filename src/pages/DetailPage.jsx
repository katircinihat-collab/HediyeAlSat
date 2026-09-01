
import { Helmet } from "react-helmet-async";

import ProductGallery from "../components/ProductGallery";
import SellerCard from "../components/seller/SellerCard";
import MessageBox from "../components/MessageBox";
import OrderBox from "../components/OrderBox";

import {
  Link,
  useParams,
  useNavigate
} from "react-router-dom";

import {
  useEffect,
  useState
} from "react";

import {
  doc,
  getDoc,
  addDoc,
  collection,
  query,
  where,
  getDocs
} from "firebase/firestore";

import { auth, db } from "../firebase";
import { formatListingCategory } from "../data/categories";
import useFavorite from "../hooks/useFavorite";

import "../App.css";


function DetailPage() {

  const { id } = useParams();

  const navigate = useNavigate();


  /* =========================
     STATE
  ========================= */

  const [ilan, setIlan] = useState(null);

  const [mesaj, setMesaj] = useState("");

  const [yorumlar, setYorumlar] = useState([]);

  const [puan, setPuan] = useState(5);

  const [yorum, setYorum] = useState("");

  const [yorumGonderiliyor, setYorumGonderiliyor] =
    useState(false);

  const [takipEdiyor] = useState(false);

  const {
    favori,
    favoriDegistir,
    favoriIslemi
  } = useFavorite(ilan);


  /* =========================
     İLANI GETİR
  ========================= */

  useEffect(() => {

    getir();

  // Reload only when the route id changes; `getir` is scoped to this render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);


  async function getir() {

    try {

      const ref = doc(
        db,
        "ilanlar",
        id
      );

      const snap = await getDoc(ref);

      if (!snap.exists()) {

        return;

      }


      // TODO: Görüntülenme sayacı güvenilir bir backend işlemi veya
      // Cloud Function üzerinden atomik olarak artırılmalı.


      const data = {

        id: snap.id,

        ...snap.data()

      };


      setIlan(data);


      /* YORUMLARI GETİR */

      await yorumlariGetir();

    } catch (error) {

      console.error(
        "İlan yükleme hatası:",
        error
      );

    }

  }


  /* =========================
     YORUMLARI GETİR
  ========================= */

  async function yorumlariGetir() {

    try {

      const yorumQuery = query(

        collection(
          db,
          "yorumlar"
        ),

        where(
          "ilanId",
          "==",
          id
        )

      );


      const yorumSnap =
        await getDocs(
          yorumQuery
        );


      const liste =
        yorumSnap.docs.map(
          (d) => ({

            id: d.id,

            ...d.data()

          })
        );


      /* YENİ YORUMLAR ÜSTTE */

      liste.sort(
        (a, b) => {

          const tarihA =
            a.tarih?.toDate
              ? a.tarih.toDate()
              : new Date(
                  a.tarih || 0
                );


          const tarihB =
            b.tarih?.toDate
              ? b.tarih.toDate()
              : new Date(
                  b.tarih || 0
                );


          return (
            tarihB - tarihA
          );

        }
      );


      setYorumlar(liste);


      return liste;

    } catch (error) {

      console.error(
        "Yorumlar alınamadı:",
        error
      );

      setYorumlar([]);

      return [];

    }

  }


  /* =========================
     MESAJ GÖNDER
  ========================= */

  async function mesajGonder() {

    if (!auth.currentUser) {

      alert(
        "Önce giriş yapmalısınız."
      );

      return;

    }


    if (!mesaj.trim()) {

      alert(
        "Lütfen mesaj yazınız."
      );

      return;

    }


    try {

      await addDoc(

        collection(
          db,
          "mesajlar"
        ),

        {

          gonderen:
            auth.currentUser.email,

          alan:
            ilan.sahip,

          ilanId:
            ilan.id,

          ilanNo:
            ilan.ilanNo || "",

          ilanBaslik:
            ilan.baslik,

          mesaj:
            mesaj.trim(),

          tarih:
            new Date(),

          okundu:
            false

        }

      );


      alert(
        "Mesaj gönderildi ✅"
      );


      setMesaj("");

    } catch (error) {

      console.error(
        "Mesaj gönderme hatası:",
        error
      );

      alert(
        "Mesaj gönderilemedi."
      );

    }

  }


  /* =========================
     YORUM + PUAN GÖNDER
  ========================= */

  async function yorumGonder() {

    if (yorumGonderiliyor) {

      return;

    }


    if (!auth.currentUser) {

      alert(
        "Önce giriş yapmalısınız."
      );

      return;

    }


    if (!yorum.trim()) {

      alert(
        "Lütfen yorumunuzu yazın."
      );

      return;

    }


    if (yorum.trim().length < 3) {

      alert(
        "Yorum en az 3 karakter olmalıdır."
      );

      return;

    }


    try {

      setYorumGonderiliyor(true);


      /* =========================
         YORUMU FIREBASE'E KAYDET
      ========================= */

      await addDoc(

        collection(
          db,
          "yorumlar"
        ),

        {

          ilanId:
            id,

          kullanici:
            auth.currentUser.email,

          kullaniciAdi:
            auth.currentUser.displayName ||
            "HediyeAlSat Kullanıcısı",

          puan:
            Number(puan),

          yorum:
            yorum.trim(),

          tarih:
            new Date()

        }

      );


      /* =========================
         YORUMLARI YENİDEN GETİR
      ========================= */

      const yeniYorumlar =
        await yorumlariGetir();


      /* =========================
         ORTALAMA PUAN
      ========================= */

      const toplamPuan =
        yeniYorumlar.reduce(

          (toplam, item) => {

            return (
              toplam +
              Number(
                item.puan || 0
              )
            );

          },

          0

        );


      const yorumSayisi =
        yeniYorumlar.length;


      const ortalama =
        yorumSayisi > 0

          ? Number(
              (
                toplamPuan /
                yorumSayisi
              ).toFixed(1)
            )

          : 0;


      // TODO: İlan puanı ve yorum sayısı güvenilir bir backend işlemi veya
      // Cloud Function tarafından yorum belgelerinden hesaplanmalı.


      /* =========================
         EKRANDAKİ İLANI GÜNCELLE
      ========================= */

      setIlan(
        (eski) => ({

          ...eski,

          puan:
            ortalama,

          yorumSayisi:
            yorumSayisi

        })
      );


      /* =========================
         FORMU TEMİZLE
      ========================= */

      setYorum("");

      setPuan(5);


      alert(
        "⭐ Değerlendirmeniz başarıyla gönderildi."
      );


    } catch (error) {

      console.error(
        "Yorum gönderme hatası:",
        error
      );

      alert(
        "Yorum gönderilirken bir hata oluştu."
      );

    } finally {

      setYorumGonderiliyor(false);

    }

  }


  /* =========================
     SEPETE EKLE
  ========================= */

  async function sepeteEkle() {

    if (!auth.currentUser) {

      alert(
        "Önce giriş yapmalısınız."
      );

      return;

    }


    if (
      auth.currentUser.email ===
      ilan.sahip
    ) {

      alert(
        "Kendi ürününüzü sepete ekleyemezsiniz."
      );

      return;

    }


    try {

      const q = query(

        collection(
          db,
          "sepet"
        ),

        where(
          "kullanici",
          "==",
          auth.currentUser.email
        ),

        where(
          "ilanId",
          "==",
          ilan.id
        )

      );


      const snap =
        await getDocs(q);


      if (!snap.empty) {

        alert(
          "Bu ürün zaten sepetinizde."
        );

        return;

      }


      const fiyat =

        parseFloat(

          String(
            ilan.fiyat || 0
          )

            .replace(
              /[^\d.,]/g,
              ""
            )

            .replace(
              ",",
              "."
            )

        ) || 0;


      await addDoc(

        collection(
          db,
          "sepet"
        ),

        {

          kullanici:
            auth.currentUser.email,

          ilanId:
            ilan.id,

          baslik:
            ilan.baslik,

          fiyat:
            fiyat,

          resim:
            ilan.resim || "",

          satici:
            ilan.sahip || "",

          adet:
            1,

          eklenmeTarihi:
            new Date()

        }

      );


      alert(
        "🛒 Ürün sepete eklendi."
      );

    } catch (error) {

      console.error(
        "Sepet hatası:",
        error
      );

      alert(
        "Ürün sepete eklenemedi."
      );

    }

  }


  /* =========================
     SATIN AL
  ========================= */

  async function satinAl() {

    if (!auth.currentUser) {

      alert(
        "Önce giriş yapmalısınız."
      );

      return;

    }


    if (
      auth.currentUser.email ===
      ilan.sahip
    ) {

      alert(
        "Kendi ilanınızı satın alamazsınız."
      );

      return;

    }


    try {

      const fiyat =

        parseFloat(

          String(
            ilan.fiyat || 0
          )

            .replace(
              /[^\d.,]/g,
              ""
            )

            .replace(
              ",",
              "."
            )

        ) || 0;


      const komisyon =
        fiyat * 0.05;


      const netTutar =
        fiyat - komisyon;


      const siparisRef =
        await addDoc(

          collection(
            db,
            "siparisler"
          ),

          {

            ilanId:
              ilan.id,

            ilanBaslik:
              ilan.baslik,

            magazaId:
              ilan.magazaId || "",

            satici:
              ilan.sahip,

            alici:
              auth.currentUser.email,

            fiyat:
              fiyat,

            komisyon:
              komisyon,

            netTutar:
              netTutar,

            durum:
              "Ödeme Bekleniyor",

            odemeDurumu:
              false,

            kargoNo:
              "",

            teslimEdildi:
              false,

            olusturmaTarihi:
              new Date()

          }

        );


      navigate(
        `/odeme?siparisId=${siparisRef.id}`
      );

    } catch (error) {

      console.error(
        "Satın alma hatası:",
        error
      );

      alert(
        "Satın alma işlemi başlatılamadı."
      );

    }

  }


  /* =========================
     TAKİP
  ========================= */

  function takipEt() {

    alert(
      "Takip sistemi sonraki aşamada bağlanacak."
    );

  }


  function takipBirak() {

    alert(
      "Takip sistemi sonraki aşamada bağlanacak."
    );

  }


  /* =========================
     YÜKLENİYOR
  ========================= */

  if (!ilan) {

    return (

      <div className="page">

        <h2>
          İlan yükleniyor...
        </h2>

      </div>

    );

  }


  /* =========================
     FİYAT
  ========================= */

  const fiyat =

    parseFloat(

      String(
        ilan.fiyat || 0
      )

        .replace(
          /[^\d.,]/g,
          ""
        )

        .replace(
          ",",
          "."
        )

    ) || 0;


  /* =========================
     PUAN HESAPLA
  ========================= */

  const hesaplananPuan =

    yorumlar.length > 0

      ? (
          yorumlar.reduce(
            (toplam, item) =>
              toplam +
              Number(
                item.puan || 0
              ),
            0
          ) /
          yorumlar.length
        ).toFixed(1)

      : Number(
          ilan.puan || 0
        ).toFixed(1);


  const toplamDegerlendirme =
    yorumlar.length;


  /* =========================
     SAYFA
  ========================= */

  return (

    <>

      <Helmet>

        <title>
          {ilan.baslik} | HediyeAlSat
        </title>


        <meta
          name="description"
          content={
            ilan.aciklama ||
            `${ilan.baslik} uygun fiyatla HediyeAlSat'ta`
          }
        />


        <meta
          name="keywords"
          content={
            `${ilan.baslik}, ${formatListingCategory(ilan)}, hediye`
          }
        />


        <meta
          property="og:type"
          content="product"
        />


        <meta
          property="og:title"
          content={ilan.baslik}
        />


        <meta
          property="og:description"
          content={
            ilan.aciklama ||
            ilan.baslik
          }
        />


        <meta
          property="og:image"
          content={
            ilan.resimler?.[0] ||
            ilan.resim ||
            ""
          }
        />

      </Helmet>


      <div className="page">


        <Link to="/">

          ← Ana Sayfa

        </Link>


        <div className="detail-container">


          <ProductGallery
            ilan={ilan}
          />


          <div className="detail-info">


            <h1>
              {ilan.baslik}
            </h1>

            <button
              type="button"
              className={`detail-favorite-btn ${favori ? "active" : ""}`}
              onClick={favoriDegistir}
              disabled={favoriIslemi}
            >
              {favori ? "❤️ Favorilerimde" : "♡ Favorilere Ekle"}
            </button>


            {/* FİYAT */}

            <div className="price-box">

              <h2>

                ₺
                {fiyat.toLocaleString(
                  "tr-TR"
                )}

              </h2>

            </div>


            {/* BİLGİLER */}

            <div className="info-badges">

              <span>

                ⭐ {hesaplananPuan}

              </span>


              <span>

                👁{" "}
                {ilan.goruntulenme || 0}

              </span>


              <span>

                ❤️{" "}
                {ilan.favoriSayisi || 0}

              </span>


              <span>

                {Number(
                  ilan.stok || 0
                ) > 0

                  ? "🟢 Stokta"

                  : "🔴 Tükendi"}

              </span>

            </div>


            <p>

              📍 Konum:
              {" "}
              {ilan.sehir}

            </p>


            <p>

              📦 Kategori:
              {" "}
              {formatListingCategory(ilan)}

            </p>


            <p>

              🏷️ Tür:
              {" "}
              {ilan.tip}

            </p>


            {/* =========================
                SATICININ ÜRÜN AÇIKLAMASI
            ========================= */}

            {ilan.aciklama &&
              ilan.aciklama.trim() && (

              <section className="urun-aciklama">

                <div className="urun-aciklama-baslik">

                  <div className="aciklama-icon">
                    📝
                  </div>

                  <div>

                    <h3>
                      Ürün Açıklaması
                    </h3>

                    <p>
                      Satıcının ürün hakkında yazdığı bilgiler
                    </p>

                  </div>

                </div>


                <div className="urun-aciklama-metin">

                  {ilan.aciklama}

                </div>

              </section>

            )}


            {/* SATICI */}

            <SellerCard

              ilan={ilan}

              takipEdiyor={
                takipEdiyor
              }

              takipEt={
                takipEt
              }

              takipBirak={
                takipBirak
              }

            />


            {/* MESAJ */}

            <MessageBox

              mesaj={mesaj}

              setMesaj={
                setMesaj
              }

              mesajGonder={
                mesajGonder
              }

            />


            <hr />


            {/* =========================
                ÜRÜN DEĞERLENDİRMELERİ
            ========================= */}

            <section className="urun-degerlendirmeleri">


              <div className="yorum-baslik">

                <div>

                  <h3>

                    ⭐ Ürün Değerlendirmeleri

                  </h3>


                  <p>

                    Müşterilerin gerçek
                    deneyimlerini inceleyin.

                  </p>

                </div>


                <div className="ortalama-puan">

                  <strong>

                    {hesaplananPuan}

                  </strong>

                  <span>
                    / 5
                  </span>

                </div>

              </div>


              {/* DEĞERLENDİRME SAYISI */}

              <div className="degerlendirme-sayisi">

                <strong>

                  {toplamDegerlendirme}

                </strong>

                {" "}
                değerlendirme

              </div>


              {/* YORUM FORMU */}

              <div className="yorum-formu">


                <h4>

                  Bu ürünü değerlendirin

                </h4>


                <p>

                  Deneyiminizi diğer
                  müşterilerle paylaşın.

                </p>


                {/* PUAN */}

                <div className="puan-secimi">

                  {[1, 2, 3, 4, 5].map(
                    (sayi) => (

                      <button

                        key={sayi}

                        type="button"

                        className={
                          sayi <= puan
                            ? "puan-yildiz aktif"
                            : "puan-yildiz"
                        }

                        onClick={() =>
                          setPuan(sayi)
                        }

                      >

                        ★

                      </button>

                    )
                  )}


                  <span>

                    {puan} / 5

                  </span>

                </div>


                {/* YORUM */}

                <textarea

                  value={yorum}

                  onChange={(e) =>
                    setYorum(
                      e.target.value
                    )
                  }

                  placeholder="Ürün hakkında deneyiminizi yazın..."

                  maxLength={1000}

                />


                <div className="yorum-alt">

                  <span>

                    {yorum.length}/1000

                  </span>


                  <button

                    type="button"

                    onClick={
                      yorumGonder
                    }

                    disabled={
                      yorumGonderiliyor
                    }

                  >

                    {yorumGonderiliyor

                      ? "Gönderiliyor..."

                      : "⭐ Yorum ve Puan Gönder"}

                  </button>

                </div>

              </div>


              {/* YORUMLAR */}

              <div className="yorum-listesi">


                {yorumlar.length === 0 ? (

                  <div className="yorum-yok">

                    <div>
                      ⭐
                    </div>

                    <h4>
                      Henüz değerlendirme yok
                    </h4>

                    <p>
                      Bu ürünü ilk değerlendiren
                      siz olun.
                    </p>

                  </div>

                ) : (

                  yorumlar.map(
                    (item) => {

                      const kullaniciAdi =
                        item.kullaniciAdi ||
                        (
                          item.kullanici
                            ? item.kullanici.split("@")[0]
                            : "HediyeAlSat Kullanıcısı"
                        );


                      const tarih =
                        item.tarih?.toDate

                          ? item.tarih
                              .toDate()
                              .toLocaleDateString(
                                "tr-TR"
                              )

                          : item.tarih

                          ? new Date(
                              item.tarih
                            ).toLocaleDateString(
                              "tr-TR"
                            )

                          : "";


                      const itemPuan =
                        Math.min(
                          5,
                          Math.max(
                            0,
                            Number(
                              item.puan || 0
                            )
                          )
                        );


                      return (

                        <div

                          key={
                            item.id
                          }

                          className="yorum-karti"

                        >

                          <div className="yorum-kullanici">

                            <div className="kullanici-avatar">

                              {kullaniciAdi
                                .charAt(0)
                                .toUpperCase()}

                            </div>


                            <div>

                              <strong>

                                {kullaniciAdi}

                              </strong>


                              <div className="yorum-yildizlari">

                                {"★".repeat(
                                  itemPuan
                                )}

                                {"☆".repeat(
                                  5 - itemPuan
                                )}

                              </div>

                            </div>

                          </div>


                          <p className="yorum-metni">

                            {item.yorum}

                          </p>


                          <small>

                            {tarih}

                          </small>

                        </div>

                      );

                    }

                  )

                )}

              </div>

            </section>


            {/* İLAN TARİHİ */}

            <h3>
              📅 İlan Tarihi
            </h3>


            <p>

              {ilan.tarih?.toDate

                ? ilan.tarih
                    .toDate()
                    .toLocaleDateString(
                      "tr-TR"
                    )

                : "Yeni"}

            </p>


            {/* SİPARİŞ */}

            <OrderBox

              ilan={ilan}

              satinAl={
                satinAl
              }

              sepeteEkle={
                sepeteEkle
              }

            />


          </div>

        </div>

      </div>

    </>

  );

}


export default DetailPage;
