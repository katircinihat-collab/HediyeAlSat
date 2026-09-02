
import { useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { Link, useNavigate } from "react-router-dom";

import Navbar from "../components/Navbar";
import { db, auth } from "../firebase";

import "../styles/pages/sponsor-application.css";

function SponsorApplication() {

  const navigate = useNavigate();

  const paketler = [
    {
      id: "standart",
      ikon: "⭐",
      ad: "Standart Sponsor",
      fiyat: 499,
      sure: 7,
      aciklama: "Mağazanız 7 gün boyunca sponsor alanında öne çıkar."
    },
    {
      id: "premium",
      ikon: "👑",
      ad: "Premium Sponsor",
      fiyat: 999,
      sure: 15,
      aciklama: "Mağazanız 15 gün boyunca daha görünür şekilde öne çıkar."
    },
    {
      id: "vip",
      ikon: "💎",
      ad: "VIP Sponsor",
      fiyat: 1999,
      sure: 30,
      aciklama: "Mağazanız 30 gün boyunca ana sayfada güçlü şekilde öne çıkar."
    }
  ];

  const [paket, setPaket] = useState("premium");

  const [form, setForm] = useState({
    magazaAdi: "",
    yetkiliAdi: "",
    telefon: "",
    webSitesi: "",
    hakkinda: ""
  });

  const [gonderiliyor, setGonderiliyor] = useState(false);

  const secilenPaket =
    paketler.find((x) => x.id === paket) || paketler[1];

  function degistir(e) {

    const { name, value } = e.target;

    setForm((eski) => ({
      ...eski,
      [name]: value
    }));

  }

  async function basvuruGonder(e) {

    e.preventDefault();

    const kullanici = auth.currentUser;
    if (!kullanici?.email) {
      alert("Sponsor başvurusu için giriş yapmalısınız.");
      return;
    }

    if (
      !form.magazaAdi.trim() ||
      !form.yetkiliAdi.trim() ||
      !form.telefon.trim() ||
      !form.hakkinda.trim()
    ) {

      alert("Lütfen yıldızlı (*) alanların tamamını doldurun.");

      return;

    }

    if (form.hakkinda.trim().length < 20) {

      alert(
        "Mağazanız hakkında en az 20 karakter bilgi yazınız."
      );

      return;

    }

    if (gonderiliyor) {
      return;
    }

    try {

      setGonderiliyor(true);

      const kullaniciId = kullanici.uid;
      const hesapEmail = kullanici.email;

      const basvuruRef = await addDoc(
        collection(db, "sponsorBasvurular"),
        {
          magazaAdi: form.magazaAdi.trim(),

          yetkiliAdi:
            form.yetkiliAdi.trim(),

          telefon:
            form.telefon.trim(),

          email:
            hesapEmail,

          webSitesi:
            form.webSitesi.trim(),

          hakkinda:
            form.hakkinda.trim(),

          kullaniciId,

          paketId:
            secilenPaket.id,

          paketAdi:
            secilenPaket.ad,

          paketFiyati:
            secilenPaket.fiyat,

          sponsorSuresi:
            secilenPaket.sure,

          durum:
            "Ödeme Bekliyor",

          odemeDurumu:
            false,

          odemeTarihi:
            null,

          basvuruTarihi:
            serverTimestamp(),

          okunmadi:
            true
        }
      );

      /*
      ==========================================
      ÖDEME AŞAMASINA GEÇİŞ
      ==========================================
      */

      navigate("/odeme", {
        state: {
          sponsorBasvuruId:
            basvuruRef.id,

          sponsor: true,

          paketId:
            secilenPaket.id,

          paketAdi:
            secilenPaket.ad,

          fiyat:
            secilenPaket.fiyat,

          sure:
            secilenPaket.sure,

          magazaAdi:
            form.magazaAdi.trim(),

          yetkiliAdi:
            form.yetkiliAdi.trim(),

          email:
            hesapEmail,

          telefon:
            form.telefon.trim()
        }
      });

    } catch (error) {

      console.error(
        "Sponsor mağaza başvuru hatası:",
        error
      );

      alert(
        "❌ Başvurunuz oluşturulamadı. Lütfen tekrar deneyin."
      );

    } finally {

      setGonderiliyor(false);

    }

  }

  return (

    <>
      <Navbar />

      <main className="sponsor-application-page">

        <div className="sponsor-application-container">

          <Link
            to="/sponsor-magaza"
            className="sponsor-application-back"
          >
            ← Sponsor Mağaza
          </Link>


          {/* HERO */}

          <section className="sponsor-application-hero">

            <div className="sponsor-application-icon">
              🏪
            </div>

            <h1>
              Sponsor Mağaza Başvurusu
            </h1>

            <p>
              Mağazanızı HediyeAlSat'ta öne çıkarın.
              Daha fazla müşteriye ulaşın ve
              satışlarınızı artırın.
            </p>

          </section>


          {/* AVANTAJLAR */}

          <section className="sponsor-application-benefits">

            <div className="sponsor-benefit">

              <span>⭐</span>

              <div>

                <strong>
                  Öne Çıkın
                </strong>

                <p>
                  Mağazanız ana sayfada daha görünür olsun.
                </p>

              </div>

            </div>


            <div className="sponsor-benefit">

              <span>👥</span>

              <div>

                <strong>
                  Daha Fazla Müşteri
                </strong>

                <p>
                  Ürünlerinizi daha fazla kişiye ulaştırın.
                </p>

              </div>

            </div>


            <div className="sponsor-benefit">

              <span>📈</span>

              <div>

                <strong>
                  Satışlarınızı Artırın
                </strong>

                <p>
                  Sponsor mağaza avantajlarından yararlanın.
                </p>

              </div>

            </div>

          </section>


          {/* PAKETLER */}

          <section className="sponsor-package-section">

            <div className="sponsor-form-title">

              <span>💰</span>

              <div>

                <h2>
                  Sponsor Paketini Seçin
                </h2>

                <p>
                  Mağazanızın ne kadar süre öne
                  çıkarılacağını seçin.
                </p>

              </div>

            </div>


            <div className="sponsor-package-grid">

              {paketler.map((item) => (

                <button
                  type="button"
                  key={item.id}
                  className={
                    "sponsor-package-card " +
                    (paket === item.id
                      ? "selected"
                      : "")
                  }
                  onClick={() =>
                    setPaket(item.id)
                  }
                >

                  <div className="sponsor-package-icon">
                    {item.ikon}
                  </div>

                  <h3>
                    {item.ad}
                  </h3>

                  <div className="sponsor-package-price">
                    {item.fiyat.toLocaleString("tr-TR")} TL
                  </div>

                  <div className="sponsor-package-duration">
                    {item.sure} gün
                  </div>

                  <p>
                    {item.aciklama}
                  </p>

                  {paket === item.id && (

                    <div className="sponsor-package-selected">
                      ✓ Seçildi
                    </div>

                  )}

                </button>

              ))}

            </div>

          </section>


          {/* FORM */}

          <section className="sponsor-application-form-section">

            <div className="sponsor-form-title">

              <span>📝</span>

              <div>

                <h2>
                  Başvuru Formu
                </h2>

                <p>
                  Mağazanız hakkında bilgileri
                  doldurarak başvurunuzu gönderin.
                </p>

              </div>

            </div>


            <form
              className="sponsor-application-form"
              onSubmit={basvuruGonder}
            >

              <div className="sponsor-form-grid">


                <div className="sponsor-form-group">

                  <label>
                    Mağaza Adı *
                  </label>

                  <input
                    type="text"
                    name="magazaAdi"
                    value={form.magazaAdi}
                    onChange={degistir}
                    placeholder="Örn. Nihat Hediyelik"
                    maxLength={100}
                  />

                </div>


                <div className="sponsor-form-group">

                  <label>
                    Yetkili Adı *
                  </label>

                  <input
                    type="text"
                    name="yetkiliAdi"
                    value={form.yetkiliAdi}
                    onChange={degistir}
                    placeholder="Ad Soyad"
                    maxLength={100}
                  />

                </div>


                <div className="sponsor-form-group">

                  <label>
                    Telefon *
                  </label>

                  <input
                    type="tel"
                    name="telefon"
                    value={form.telefon}
                    onChange={degistir}
                    placeholder="05XX XXX XX XX"
                    maxLength={20}
                  />

                </div>


                <div className="sponsor-form-group">

                  <label>
                    E-posta *
                  </label>

                  <input
                    type="email"
                    name="email"
                    value={auth.currentUser?.email || ""}
                    readOnly
                    placeholder="ornek@mail.com"
                    maxLength={150}
                  />

                </div>


                <div className="sponsor-form-group sponsor-full">

                  <label>
                    Web Sitesi
                  </label>

                  <input
                    type="url"
                    name="webSitesi"
                    value={form.webSitesi}
                    onChange={degistir}
                    placeholder="https://..."
                    maxLength={250}
                  />

                </div>


                <div className="sponsor-form-group sponsor-full">

                  <label>
                    Mağazanız Hakkında *
                  </label>

                  <textarea
                    name="hakkinda"
                    value={form.hakkinda}
                    onChange={degistir}
                    placeholder="Mağazanız, sattığınız ürünler ve neden sponsor mağaza olmak istediğiniz hakkında kısa bilgi..."
                    maxLength={1000}
                    rows={7}
                  />

                  <div className="sponsor-character-count">
                    {form.hakkinda.length}/1000
                  </div>

                </div>

              </div>


              {/* ÖDEME ÖZETİ */}

              <div className="sponsor-payment-summary">

                <div>

                  <span>
                    Seçilen Paket
                  </span>

                  <strong>
                    {secilenPaket.ikon}{" "}
                    {secilenPaket.ad}
                  </strong>

                </div>


                <div>

                  <span>
                    Süre
                  </span>

                  <strong>
                    {secilenPaket.sure} gün
                  </strong>

                </div>


                <div>

                  <span>
                    Ödenecek Tutar
                  </span>

                  <strong className="sponsor-total-price">
                    {secilenPaket.fiyat.toLocaleString("tr-TR")} TL
                  </strong>

                </div>

              </div>


              <button
                type="submit"
                className="sponsor-application-submit"
                disabled={gonderiliyor}
              >

                {gonderiliyor
                  ? "⏳ Başvurunuz hazırlanıyor..."
                  : `🚀 Başvur ve Ödemeye Geç — ${secilenPaket.fiyat.toLocaleString("tr-TR")} TL`}

              </button>


              <p className="sponsor-application-note">

                Başvurunuz oluşturulduktan sonra
                ödeme işlemi güvenli ödeme sistemi
                üzerinden gerçekleştirilecektir.

              </p>

            </form>

          </section>

        </div>

      </main>

    </>

  );

}

export default SponsorApplication;
