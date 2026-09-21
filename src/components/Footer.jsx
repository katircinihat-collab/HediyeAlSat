
import "../styles/layout/footer.css";
import { Link } from "react-router-dom";
import { useOnboarding } from "../context/onboardingContext";

function Footer() {
  const { startWelcomeTour } = useOnboarding();

  return (

    <footer className="footer">

      <div className="footer-top">


        {/* =========================
            LOGO / AÇIKLAMA
        ========================= */}

        <div className="footer-logo">

          <h2>🎁 HediyeAlSat</h2>

          <p>
            Hediye ürünlerini ve bağımsız mağazaları tek platformda keşfedin.
          </p>

        </div>


        {/* =========================
            KURUMSAL
        ========================= */}

        <div>

          <h3>Kurumsal</h3>

          <Link to="/hakkimizda">
            Hakkımızda
          </Link>

          <Link to="/iletisim">
            İletişim
          </Link>

        </div>


        {/* =========================
            YARDIM
        ========================= */}

        <div>

          <h3>Yardım</h3>

          <Link to="/iletisim">
            İletişim
          </Link>

          <Link to="/gizlilik">
            Gizlilik Politikası
          </Link>

          <Link to="/teslimat-iade">
            Teslimat ve İade Şartları
          </Link>

          <Link to="/mesafeli-satis">
            Mesafeli Satış Sözleşmesi
          </Link>

          <button type="button" className="onboarding-replay" onClick={() => startWelcomeTour(true)}>
            ❓ HediyeAlSat’ı Tanı
          </button>

        </div>


        {/* =========================
            ALIŞVERİŞ
        ========================= */}

        <div>

          <h3>Alışveriş</h3>

          <Link to="/teslimat-iade">
            Teslimat ve İade
          </Link>

          <Link to="/mesafeli-satis">
            Mesafeli Satış Sözleşmesi
          </Link>

          <Link to="/gizlilik">
            Gizlilik Politikası
          </Link>

        </div>


        {/* =========================
            SATICI
        ========================= */}

        <div>

          <h3>Satıcı</h3>

          <Link to="/magaza-olustur" data-tour="open-store">
            Mağaza Aç
          </Link>

          <Link to="/seller">
            Satıcı Paneli
          </Link>

          <Link to="/ilan-ver">
            Ürün Yayınla
          </Link>

        </div>


      </div>


      {/* =========================
          GÜVENLİ ÖDEME
      ========================= */}

      <div className="payment-section">

        <h3>
          Güvenli Ödeme
        </h3>


        <img
          src="/images/payment-logos.png"
          alt="iyzico, Visa, Mastercard, American Express ve Troy"
          className="payment-logos"
        />


        <div className="iyzico-payment">

          <span>
            Ödemeleriniz
          </span>

          <strong>
            iyzico ile Öde
          </strong>

        </div>

      </div>


      {/* =========================
          ALT
      ========================= */}

      <div className="footer-bottom">

        © 2026 HediyeAlSat • Tüm Hakları Saklıdır.

      </div>


    </footer>

  );

}


export default Footer;
