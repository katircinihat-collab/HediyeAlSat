import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../styles/base/typography.css";

function Iletisim() {
  return (
    <>
      <Navbar />

      <main
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          padding: "50px 24px",
          minHeight: "600px"
        }}
      >

        <h1
          style={{
            fontSize: "42px",
            marginBottom: "20px",
            color: "#111827"
          }}
        >
          İletişim
        </h1>


        <p
          style={{
            fontSize: "16px",
            lineHeight: "1.8",
            color: "#5f6b7a",
            marginBottom: "35px"
          }}
        >
          HediyeAlSat ile ilgili soru, öneri, sipariş, ürün ve
          müşteri hizmetleri talepleriniz için aşağıdaki iletişim
          kanallarından bizimle iletişime geçebilirsiniz.
        </p>


        {/* İŞLETME BİLGİLERİ */}

        <div
          style={{
            background: "#ffffff",
            borderRadius: "12px",
            padding: "30px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
            marginBottom: "30px"
          }}
        >

          <h2
            style={{
              fontSize: "24px",
              marginBottom: "25px",
              color: "#111827"
            }}
          >
            İşletme Bilgileri
          </h2>


          <div
            style={{
              lineHeight: "2"
            }}
          >

            <p>
              <strong>Platform:</strong>{" "}
              HediyeAlSat
            </p>


            <p>
              <strong>İşletme Sahibi / Ünvan:</strong>{" "}
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
              0 (532) 409 32 33
            </p>


            <p>
              <strong>Alternatif Telefon:</strong>{" "}
              0 (553) 022 99 50
            </p>


            <p>
              <strong>E-posta:</strong>{" "}
              <a
                href="mailto:katircinihat@gmail.com"
                style={{
                  color: "#2563eb",
                  textDecoration: "none"
                }}
              >
                katircinihat@gmail.com
              </a>
            </p>


            <p>
              <strong>KEP Adresi:</strong>{" "}
              <a
                href="mailto:nihat.katirci@hs01.kep.tr"
                style={{
                  color: "#2563eb",
                  textDecoration: "none"
                }}
              >
                nihat.katirci@hs01.kep.tr
              </a>
            </p>


            <p>
              <strong>MERSİS Numarası:</strong>{" "}
              Bulunmamaktadır.
            </p>

          </div>

        </div>


        {/* MESLEK ODASI */}

        <div
          style={{
            background: "#f8f9fa",
            borderRadius: "12px",
            padding: "25px",
            marginBottom: "30px"
          }}
        >

          <h2
            style={{
              fontSize: "22px",
              marginBottom: "15px",
              color: "#111827"
            }}
          >
            Meslek Odası Bilgisi
          </h2>


          <p
            style={{
              color: "#5f6b7a",
              lineHeight: "1.8",
              margin: 0
            }}
          >
            İşletme sahibinin Sakarya ilinde aktif meslek odası
            kaydı bulunmamaktadır. Önceki Kocaeli esnaf ve sanatkârlar
            odası kaydı aktif değildir.
          </p>

        </div>


        {/* MÜŞTERİ HİZMETLERİ */}

        <div
          style={{
            background: "#ffffff",
            borderRadius: "12px",
            padding: "30px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.08)"
          }}
        >

          <h2
            style={{
              fontSize: "22px",
              marginBottom: "15px",
              color: "#111827"
            }}
          >
            Müşteri Hizmetleri
          </h2>


          <p
            style={{
              color: "#5f6b7a",
              lineHeight: "1.7",
              marginBottom: "15px"
            }}
          >
            Siparişleriniz, ürünlerimiz, ödeme işlemleri,
            teslimat, iade ve platformumuzla ilgili tüm
            sorularınız için bizimle iletişime geçebilirsiniz.
          </p>


          <p
            style={{
              color: "#5f6b7a",
              lineHeight: "1.7",
              margin: 0
            }}
          >
            <strong>E-posta:</strong>{" "}
            <a
              href="mailto:katircinihat@gmail.com"
              style={{
                color: "#2563eb",
                textDecoration: "none"
              }}
            >
              katircinihat@gmail.com
            </a>
          </p>


          <p
            style={{
              color: "#5f6b7a",
              lineHeight: "1.7",
              margin: "8px 0 0 0"
            }}
          >
            <strong>Telefon:</strong>{" "}
            0 (532) 409 32 33
          </p>


          <p
            style={{
              color: "#5f6b7a",
              lineHeight: "1.7",
              margin: "8px 0 0 0"
            }}
          >
            <strong>KEP:</strong>{" "}
            <a
              href="mailto:nihat.katirci@hs01.kep.tr"
              style={{
                color: "#2563eb",
                textDecoration: "none"
              }}
            >
              nihat.katirci@hs01.kep.tr
            </a>
          </p>

        </div>


        {/* SON GÜNCELLEME */}

        <p
          style={{
            textAlign: "right",
            marginTop: "25px",
            color: "#6b7280",
            fontSize: "14px"
          }}
        >
          Son Güncelleme: 27 Ağustos 2026
        </p>

      </main>

      <Footer />
    </>
  );
}

export default Iletisim;