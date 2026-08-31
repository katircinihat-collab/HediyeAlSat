import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { useLocation } from "react-router-dom";
import { apiUrl } from "../config/api";
import "../styles/pages/checkout.css";

import {
  collection,
  query,
  where,
  getDocs,
  addDoc
} from "firebase/firestore";

function Checkout() {

  const location = useLocation();

  // ==================================================
  // SPONSOR ÖDEME KONTROLÜ
  // ==================================================

  const sponsorData = location.state?.sponsor
    ? location.state
    : null;

  const sponsorOdeme = Boolean(sponsorData);

  // ==================================================
  // NORMAL SEPET
  // ==================================================

  const [urunler, setUrunler] = useState([]);

  const [loading, setLoading] = useState(false);

  // ==================================================
  // TESLİMAT / İLETİŞİM BİLGİLERİ
  // ==================================================

  const [adSoyad, setAdSoyad] = useState(
    sponsorData?.yetkiliAdi || ""
  );

  const [telefon, setTelefon] = useState(
    sponsorData?.telefon || ""
  );

  const [adres, setAdres] = useState("");

  const [il, setIl] = useState("");

  const [ilce, setIlce] = useState("");

  const [kargo, setKargo] = useState("MNG");

  const [not, setNot] = useState("");

  const [kupon, setKupon] = useState("");

  // ==================================================
  // NORMAL SEPETİ GETİR
  // ==================================================

  useEffect(() => {

    if (
      auth.currentUser &&
      !sponsorOdeme
    ) {
      sepetiGetir();
    }

  }, [sponsorOdeme]);

  async function sepetiGetir() {

    try {

      if (!auth.currentUser) {
        return;
      }

      const q = query(
        collection(db, "sepet"),
        where(
          "kullanici",
          "==",
          auth.currentUser.email
        )
      );

      const snap = await getDocs(q);

      setUrunler(
        snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        }))
      );

    } catch (error) {

      console.error(
        "Sepet alınamadı:",
        error
      );

    }

  }

  // ==================================================
  // NORMAL SİPARİŞ HESAPLARI
  // ==================================================

  const araToplam = urunler.reduce(
    (t, u) =>
      t +
      (
        Number(u.fiyat || 0) *
        Number(u.adet || 0)
      ),
    0
  );

  const indirim =
    kupon.trim().toUpperCase() === "HEDIYE10"
      ? araToplam * 0.10
      : 0;

  const kargoUcreti =
    araToplam > 1000
      ? 0
      : 79.90;

  const normalGenelToplam =
    araToplam -
    indirim +
    kargoUcreti;

  // ==================================================
  // SPONSOR PAKET FİYATI
  // ==================================================

  const sponsorFiyat =
    sponsorData?.fiyat
      ? Number(sponsorData.fiyat)
      : 0;

  // ==================================================
  // ÖDENECEK TUTAR
  // ==================================================

  const genelToplam = sponsorOdeme
    ? sponsorFiyat
    : normalGenelToplam;

  // ==================================================
  // ÖDEME
  // ==================================================

  async function odemeYap() {

    if (!auth.currentUser) {

      alert(
        "Lütfen önce giriş yapınız."
      );

      return;
    }

    if (loading) {
      return;
    }

    // ==================================================
    // SPONSOR ÖDEMESİ
    // ==================================================

    if (sponsorOdeme) {

      if (!sponsorData.sponsorBasvuruId) {

        alert(
          "Sponsor başvuru bilgisi bulunamadı."
        );

        return;
      }

      if (!sponsorData.fiyat) {

        alert(
          "Sponsor paket fiyatı bulunamadı."
        );

        return;
      }

      setLoading(true);

      try {

        const adParcalari =
          (
            sponsorData.yetkiliAdi ||
            auth.currentUser.displayName ||
            "Müşteri"
          )
            .trim()
            .split(/\s+/);

        const buyerName =
          adParcalari.shift() ||
          "Müşteri";

        const buyerSurname =
          adParcalari.join(" ") ||
          "-";

        const response = await fetch(
          apiUrl("/api/payment"),
          {
            method: "POST",

            headers: {
              "Content-Type": "application/json"
            },

            body: JSON.stringify({

              sponsor: true,

              sponsorBasvuruId:
                sponsorData.sponsorBasvuruId,

              paketId:
                sponsorData.paketId,

              paketAdi:
                sponsorData.paketAdi,

              sure:
                sponsorData.sure,

              price:
                Number(sponsorFiyat).toFixed(2),

              buyerName,

              buyerSurname,

              email:
                sponsorData.email ||
                auth.currentUser.email,

              productName:
                `HediyeAlSat ${sponsorData.paketAdi}`,

              basketItems: [
                {
                  id:
                    `SPONSOR-${sponsorData.paketId}`,

                  name:
                    sponsorData.paketAdi,

                  category1:
                    "Sponsor Mağaza",

                  category2:
                    "Reklam",

                  itemType:
                    "VIRTUAL",

                  price:
                    Number(
                      sponsorFiyat
                    ).toFixed(2)
                }
              ]
            })
          }
        );

        const data =
          await response.json();

        console.log(
          "Sponsor ödeme cevabı:",
          data
        );

        if (data.paymentPageUrl) {

          window.location.href =
            data.paymentPageUrl;

        } else {

          console.error(
            "Sponsor ödeme oluşturulamadı:",
            data
          );

          alert(
            data.error ||
            data.message ||
            "Sponsor ödeme sayfası oluşturulamadı."
          );
        }

      } catch (error) {

        console.error(
          "Sponsor ödeme hatası:",
          error
        );

        alert(
          "Sponsor ödeme sırasında bir hata oluştu."
        );

      } finally {

        setLoading(false);

      }

      return;
    }

    // ==================================================
    // NORMAL ÜRÜN ÖDEMESİ
    // ==================================================

    if (urunler.length === 0) {

      alert(
        "Sepetiniz boş."
      );

      return;
    }

    if (!adSoyad.trim()) {

      alert(
        "Lütfen Ad Soyad bilgilerinizi giriniz."
      );

      return;
    }

    if (!telefon.trim()) {

      alert(
        "Lütfen telefon numaranızı giriniz."
      );

      return;
    }

    if (!il.trim()) {

      alert(
        "Lütfen ilinizi giriniz."
      );

      return;
    }

    if (!ilce.trim()) {

      alert(
        "Lütfen ilçenizi giriniz."
      );

      return;
    }

    if (!adres.trim()) {

      alert(
        "Lütfen teslimat adresinizi giriniz."
      );

      return;
    }

    setLoading(true);

    try {

      const adParcalari =
        adSoyad
          .trim()
          .split(/\s+/);

      const buyerName =
        adParcalari.shift() ||
        "";

      const buyerSurname =
        adParcalari.join(" ") ||
        "-";

      const siparisler = [];

      // ==================================================
      // SİPARİŞLERİ FIREBASE'E KAYDET
      // ==================================================

      for (const urun of urunler) {

        const ref =
          await addDoc(
            collection(
              db,
              "siparisler"
            ),
            {

              alici:
                auth.currentUser.email,

              satici:
                urun.satici,

              ilanId:
                urun.ilanId,

              ilanBaslik:
                urun.baslik,

              fiyat:
                Number(urun.fiyat),

              adet:
                Number(urun.adet),

              toplam:
                Number(urun.fiyat) *
                Number(urun.adet),

              adSoyad,

              telefon,

              adres,

              il,

              ilce,

              kargo,

              siparisNotu:
                not,

              durum:
                "Ödeme Bekleniyor",

              odemeDurumu:
                false,

              tarih:
                new Date()
            }
          );

        siparisler.push(
          ref.id
        );
      }

      // ==================================================
      // NORMAL İYZICO ÖDEMESİ
      // ==================================================

      const response =
        await fetch(
          apiUrl("/api/payment"),
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body: JSON.stringify({

              sponsor: false,

              siparisIds:
                siparisler,

              price:
                Number(
                  genelToplam
                ).toFixed(2),

              buyerName,

              buyerSurname,

              email:
                auth.currentUser.email,

              productName:
                "HediyeAlSat Siparişi",

              basketItems: [

                ...urunler.map(
                  (u) => ({

                    id:
                      u.id,

                    name:
                      u.baslik,

                    category1:
                      "Genel",

                    itemType:
                      "PHYSICAL",

                    price:
                      (
                        Number(u.fiyat) *
                        Number(u.adet)
                      ).toFixed(2)
                  })
                ),

                ...(kargoUcreti > 0
                  ? [
                      {
                        id:
                          "KARGO",

                        name:
                          "Kargo Ücreti",

                        category1:
                          "Kargo",

                        itemType:
                          "VIRTUAL",

                        price:
                          Number(
                            kargoUcreti
                          ).toFixed(2)
                      }
                    ]
                  : [])
              ]
            })
          }
        );

      const data =
        await response.json();

      console.log(
        "Ödeme cevabı:",
        data
      );

      if (data.paymentPageUrl) {

        window.location.href =
          data.paymentPageUrl;

      } else {

        console.error(
          "Ödeme oluşturulamadı:",
          data
        );

        alert(
          data.error ||
          data.message ||
          "Ödeme oluşturulamadı."
        );
      }

    } catch (error) {

      console.error(
        "Ödeme hatası:",
        error
      );

      alert(
        "Ödeme sırasında hata oluştu."
      );

    } finally {

      setLoading(false);
    }
  }

  // ==================================================
  // EKRAN
  // ==================================================

  return (

    <div className="checkout-page">

      <h1>
        {sponsorOdeme
          ? "🏪 Sponsor Mağaza Ödemesi"
          : "💳 Güvenli Ödeme"}
      </h1>

      {/* =================================================
          SPONSOR ÖDEME EKRANI
      ================================================= */}

      {sponsorOdeme ? (

        <div className="checkout-layout">

          <div className="checkout-left">

            <div className="checkout-box">

              <h2>
                👑 Sponsor Paketiniz
              </h2>

              <div
                style={{
                  padding: "20px",
                  borderRadius: "14px",
                  background: "#fff7ed",
                  border: "1px solid #fed7aa"
                }}
              >

                <h2 style={{ marginTop: 0 }}>
                  {sponsorData.paketAdi}
                </h2>

                <p>
                  ⏱ Sponsor Süresi:{" "}
                  <strong>
                    {sponsorData.sure} gün
                  </strong>
                </p>

                <p>
                  🏪 Mağaza:{" "}
                  <strong>
                    {sponsorData.magazaAdi}
                  </strong>
                </p>

                <p>
                  👤 Yetkili:{" "}
                  <strong>
                    {sponsorData.yetkiliAdi}
                  </strong>
                </p>

              </div>

            </div>

            <div className="checkout-box">

              <h2>
                👤 İletişim Bilgileri
              </h2>

              <input
                placeholder="Ad Soyad"
                value={adSoyad}
                onChange={(e) =>
                  setAdSoyad(e.target.value)
                }
              />

              <input
                placeholder="Telefon"
                value={telefon}
                onChange={(e) =>
                  setTelefon(e.target.value)
                }
              />

              <input
                placeholder="E-posta"
                value={
                  sponsorData.email ||
                  auth.currentUser?.email ||
                  ""
                }
                readOnly
              />

            </div>

          </div>

          <div className="checkout-right">

            <div className="checkout-summary">

              <h2>
                📋 Ödeme Özeti
              </h2>

              <div className="summary-row">

                <span>
                  Paket
                </span>

                <b>
                  {sponsorData.paketAdi}
                </b>

              </div>

              <div className="summary-row">

                <span>
                  Sponsor Süresi
                </span>

                <b>
                  {sponsorData.sure} gün
                </b>

              </div>

              <hr />

              <div className="summary-row total">

                <span>
                  Ödenecek Tutar
                </span>

                <b>
                  {sponsorFiyat.toLocaleString(
                    "tr-TR",
                    {
                      minimumFractionDigits: 2
                    }
                  )} TL
                </b>

              </div>

              <div className="secure-box">

                <p>
                  🛡 SSL Güvenlik Sertifikası
                </p>

                <p>
                  💳 iyzico Güvenli Ödeme
                </p>

                <p>
                  🏪 Sponsor Mağaza Hizmeti
                </p>

              </div>

              <button
                className="checkout-btn"
                disabled={loading}
                onClick={odemeYap}
              >

                {loading
                  ? "⏳ Ödeme Hazırlanıyor..."
                  : `💳 ${sponsorFiyat.toLocaleString(
                      "tr-TR"
                    )} TL Güvenli Ödeme`
                }

              </button>

              <p
                style={{
                  marginTop: "15px",
                  fontSize: "13px",
                  color: "#777",
                  textAlign: "center"
                }}
              >
                Ödeme işleminiz iyzico güvenli
                ödeme altyapısı üzerinden
                gerçekleştirilecektir.
              </p>

            </div>

          </div>

        </div>

      ) : (

        // =================================================
        // NORMAL SEPET ÖDEME EKRANI
        // =================================================

        urunler.length === 0 ? (

          <h2>
            Sepetiniz boş.
          </h2>

        ) : (

          <div className="checkout-layout">

            <div className="checkout-left">

              <div className="checkout-box">

                <h2>
                  📦 Teslimat Bilgileri
                </h2>

                <input
                  placeholder="Ad Soyad"
                  value={adSoyad}
                  onChange={(e) =>
                    setAdSoyad(e.target.value)
                  }
                />

                <input
                  placeholder="Telefon"
                  value={telefon}
                  onChange={(e) =>
                    setTelefon(e.target.value)
                  }
                />

                <input
                  placeholder="İl"
                  value={il}
                  onChange={(e) =>
                    setIl(e.target.value)
                  }
                />

                <input
                  placeholder="İlçe"
                  value={ilce}
                  onChange={(e) =>
                    setIlce(e.target.value)
                  }
                />

                <textarea
                  placeholder="Teslimat Adresi"
                  rows="4"
                  value={adres}
                  onChange={(e) =>
                    setAdres(e.target.value)
                  }
                />

              </div>

              <div className="checkout-box">

                <h2>
                  🚚 Kargo Firması
                </h2>

                <select
                  value={kargo}
                  onChange={(e) =>
                    setKargo(e.target.value)
                  }
                >

                  <option>MNG</option>
                  <option>Aras</option>
                  <option>Yurtiçi</option>
                  <option>Sürat</option>
                  <option>PTT</option>

                </select>

              </div>

              <div className="checkout-box">

                <h2>
                  📝 Sipariş Notu
                </h2>

                <textarea
                  rows="3"
                  placeholder="Satıcıya notunuz"
                  value={not}
                  onChange={(e) =>
                    setNot(e.target.value)
                  }
                />

              </div>

            </div>

            <div className="checkout-right">

              <div className="checkout-summary">

                <h2>
                  📋 Sipariş Özeti
                </h2>

                <div className="summary-row">

                  <span>
                    Ara Toplam
                  </span>

                  <b>
                    {araToplam.toFixed(2)} TL
                  </b>

                </div>

                <div className="summary-row">

                  <span>
                    Kargo
                  </span>

                  <b>
                    {kargoUcreti === 0
                      ? "Ücretsiz"
                      : `${kargoUcreti.toFixed(2)} TL`
                    }
                  </b>

                </div>

                <div className="summary-row">

                  <span>
                    İndirim
                  </span>

                  <b
                    style={{
                      color: "green"
                    }}
                  >
                    -{indirim.toFixed(2)} TL
                  </b>

                </div>

                <div className="coupon-box">

                  <input
                    placeholder="🎁 İndirim Kodu"
                    value={kupon}
                    onChange={(e) =>
                      setKupon(e.target.value)
                    }
                  />

                </div>

                <hr />

                <div className="summary-row total">

                  <span>
                    Genel Toplam
                  </span>

                  <b>
                    {genelToplam.toFixed(2)} TL
                  </b>

                </div>

                <div className="secure-box">

                  <p>
                    🛡 SSL Güvenlik Sertifikası
                  </p>

                  <p>
                    💳 iyzico Güvenli Ödeme
                  </p>

                  <p>
                    🚚 Ücretsiz Kargo
                  </p>

                  <p>
                    ↩ 14 Gün Kolay İade
                  </p>

                </div>

                <button
                  className="checkout-btn"
                  disabled={loading}
                  onClick={odemeYap}
                >

                  {loading
                    ? "⏳ Ödeme Hazırlanıyor..."
                    : "💳 Güvenli Ödemeye Geç"
                  }

                </button>

              </div>

            </div>

          </div>

        )
      )}

    </div>
  );
}

export default Checkout;
