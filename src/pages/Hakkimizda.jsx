import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../styles/pages/legal-page.css";

function Hakkimizda() {
  return (
    <>
      <Navbar />

      <main className="legal-page">
        <div className="legal-container">

          <div className="legal-header">
            <h1>Hakkımızda</h1>

            <p>
              HediyeAlSat hakkında bilgiler, işletme bilgileri ve
              iletişim kanallarımız.
            </p>
          </div>

          <section className="legal-card">

            <h2>HediyeAlSat</h2>

            <p>
              HediyeAlSat, kullanıcıların hediye, çiçek, oyuncak,
              el yapımı ürünler ve kişiye özel ürünleri keşfedebildiği
              ve satıcıların ürünlerini yayınlayabildiği online bir
              pazaryeri platformudur.
            </p>

            <p>
              Amacımız, alıcılarla satıcıları güvenli, kolay ve
              kullanıcı dostu bir platformda buluşturmaktır.
            </p>

            <h2>HediyeAlSat'ın Amacı</h2>

            <p>
              Özel günlerde ve günlük hayatta hediye arayan kullanıcıların
              farklı ürünleri tek bir platform üzerinden bulabilmesini
              sağlamayı hedefliyoruz.
            </p>

            <h2>Satıcılar</h2>

            <p>
              Satıcılar platform üzerinden mağaza oluşturabilir,
              ürünlerini yayınlayabilir ve müşterilerden gelen
              siparişleri takip edebilir.
            </p>

            <h2>Güvenli Ödeme</h2>

            <p>
              HediyeAlSat üzerinden gerçekleştirilen online ödemelerde
              güvenli ödeme altyapısı kullanılmaktadır. Ödeme işlemlerinde
              iyzico ödeme altyapısından yararlanılabilir.
            </p>

            <h2>Platform ve İşletme Bilgileri</h2>

            <div className="legal-info-box">

              <p>
                <strong>Platform:</strong> HediyeAlSat
              </p>

              <p>
                <strong>İşletme Sahibi:</strong>{" "}
                Nihat Katırcı – HediyenOlsun
              </p>

              <p>
                <strong>Vergi Dairesi:</strong>{" "}
                Gümrükönü Vergi Dairesi Müdürlüğü
              </p>

              <p>
                <strong>Vergi Kimlik Numarası:</strong>{" "}
                5280116562
              </p>

              <p>
                <strong>Adres:</strong>{" "}
                Semerciler Mah. Dr. Nuri Bayar Cad.
                Bırkent Pasajı Kapı No:22 Daire No:407
                Adapazarı/Sakarya
              </p>

              <p>
                <strong>Telefon:</strong>{" "}
                0 (532) 409 32 33 – 0 (553) 022 99 50
              </p>

              <p>
                <strong>E-posta:</strong>{" "}
                katircinihat@gmail.com
              </p>

              <p>
                <strong>KEP Adresi:</strong>{" "}
                nihat.katirci@hs01.kep.tr
              </p>

              <p>
                <strong>MERSİS No:</strong>{" "}
                MERSİS numarası bulunmamaktadır.
              </p>

            </div>

            <h2>İletişim</h2>

            <p>
              HediyeAlSat ile ilgili soru, öneri, sipariş ve destek
              talepleriniz için iletişim sayfamız üzerinden bizimle
              iletişime geçebilirsiniz.
            </p>

            <p>
              İşletme ve resmi iletişim bilgilerimiz yukarıda
              belirtilmiştir.
            </p>

            <div className="legal-footer">
              <strong>Son Güncelleme:</strong> 27 Ağustos 2026
            </div>

          </section>

        </div>
      </main>

      <Footer />
    </>
  );
}

export default Hakkimizda;