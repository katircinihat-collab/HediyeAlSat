import { auth } from "../firebase";
import { useState } from "react";

import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where
} from "firebase/firestore";

import { db } from "../firebase";
import categories from "../data/categories";
import cities from "../data/cities";

import "../App.css";

const CLOUD_NAME = "dsncigidz";
const UPLOAD_PRESET = "zcqdaoum";

const ozelGunListesi = [
  {
    id: "dogum-gunu",
    icon: "🎂",
    ad: "Doğum Günü"
  },
  {
    id: "sevgililer-gunu",
    icon: "❤️",
    ad: "Sevgililer Günü"
  },
  {
    id: "anneler-gunu",
    icon: "🌹",
    ad: "Anneler Günü"
  },
  {
    id: "babalar-gunu",
    icon: "👔",
    ad: "Babalar Günü"
  },
  {
    id: "mezuniyet",
    icon: "🎓",
    ad: "Mezuniyet"
  },
  {
    id: "yilbasi",
    icon: "🎄",
    ad: "Yılbaşı"
  },
  {
    id: "yildonumu",
    icon: "💍",
    ad: "Yıldönümü"
  },
  {
    id: "surpriz",
    icon: "🎉",
    ad: "Sürpriz"
  }
];

function AddListing() {

  const [a4HakOnayi, setA4HakOnayi] = useState(false);
  const [fotograflarYukleniyor, setFotograflarYukleniyor] = useState(false);

  const [ilan, setIlan] = useState({

    baslik: "",
    fiyat: "",
    kategori: "",
    altKategori: "",
    tip: "Satılık",
    sehir: "",
    telefon: "",
    adet: "",
    marka: "",
    renk: "",
    aciklama: "",
    resim: "",
    resimler: [],
    video: "",
    ozelGunler: []

  });

  const altKategoriler =
    categories[ilan.kategori] || [];

  const a4Tasarlaniyor =
    ilan.kategori === "A4 Tasarım";


  /* ===========================
     FOTOĞRAF YÜKLE
  =========================== */

  async function fotoCokluYukle(e) {

    const dosyalar =
      Array.from(e.target.files || []);

    e.target.value = "";

    if (dosyalar.length === 0 || fotograflarYukleniyor) return;

    const kalanFotoSiniri =
      5 - ilan.resimler.length;

    if (dosyalar.length > kalanFotoSiniri) {

      alert(
        kalanFotoSiniri > 0
          ? `En fazla ${kalanFotoSiniri} fotoğraf daha yükleyebilirsin. Toplam sınır 5 fotoğraftır.`
          : "En fazla 5 fotoğraf yükleyebilirsin."
      );

      return;

    }

    setFotograflarYukleniyor(true);

    try {

      const yuklemeSonuclari = await Promise.allSettled(
        dosyalar.map(async (dosya) => {
          let sonHata;

          for (let deneme = 0; deneme < 2; deneme += 1) {
            try {
              const formData = new FormData();

              formData.append("file", dosya);
              formData.append("upload_preset", UPLOAD_PRESET);

              const cevap = await fetch(
                `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
                {
                  method: "POST",
                  body: formData
                }
              );

              if (!cevap.ok) {
                throw new Error(`Fotoğraf yüklenemedi (${cevap.status}).`);
              }

              const veri = await cevap.json();

              if (!veri.secure_url) {
                throw new Error("Yükleme servisi fotoğraf adresi döndürmedi.");
              }

              return veri.secure_url;
            } catch (hata) {
              sonHata = hata;
            }
          }

          throw sonHata;
        })
      );

      const yuklenenFotolar = yuklemeSonuclari
        .filter((sonuc) => sonuc.status === "fulfilled")
        .map((sonuc) => sonuc.value);

      if (yuklenenFotolar.length > 0) {
        setIlan((onceki) => {
          const tumFotolar = [
            ...onceki.resimler,
            ...yuklenenFotolar
          ].slice(0, 5);

          return {
            ...onceki,
            resimler: tumFotolar,
            resim: tumFotolar[0] || ""
          };
        });

        alert(`${yuklenenFotolar.length} fotoğraf yüklendi ✅`);
      }

      const basarisizSayisi =
        yuklemeSonuclari.length - yuklenenFotolar.length;

      if (basarisizSayisi > 0) {
        alert(
          `${basarisizSayisi} fotoğraf yüklenemedi. Lütfen tekrar deneyin.`
        );
      }

    } catch (hata) {
      console.error("Fotoğraf yükleme hatası:", hata);
      alert("Fotoğraflar yüklenemedi. Lütfen tekrar deneyin.");
    } finally {
      setFotograflarYukleniyor(false);
    }

  }


  /* ===========================
     VİDEO YÜKLE
  =========================== */

  async function videoYukle(e) {

    const dosya =
      e.target.files[0];

    if (!dosya) return;

    const formData =
      new FormData();

    formData.append(
      "file",
      dosya
    );

    formData.append(
      "upload_preset",
      UPLOAD_PRESET
    );

    const cevap = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`,
      {
        method: "POST",
        body: formData
      }
    );

    const veri =
      await cevap.json();

    if (veri.secure_url) {

      setIlan({

        ...ilan,

        video:
          veri.secure_url

      });

      alert(
        "🎥 Video başarıyla yüklendi."
      );

    }

  }


  /* ===========================
     ÖZEL GÜN SEÇ
  =========================== */

  function ozelGunSec(id) {

    setIlan((onceki) => {

      const secili =
        onceki.ozelGunler.includes(id);

      return {

        ...onceki,

        ozelGunler: secili

          ? onceki.ozelGunler.filter(
              (gun) => gun !== id
            )

          : [
              ...onceki.ozelGunler,
              id
            ]

      };

    });

  }


  /* ===========================
     İLAN KAYDET
  =========================== */

  async function kaydet(e) {

    e.preventDefault();

    if (!auth.currentUser) {

      alert(
        "Önce giriş yap."
      );

      return;

    }

    if (fotograflarYukleniyor) {

      alert(
        "Fotoğrafların yüklenmesi tamamlanıyor, lütfen bekleyin."
      );

      return;

    }

    if (!ilan.kategori || !ilan.altKategori) {

      alert(
        "Ana kategori ve alt kategori seçmelisiniz."
      );

      return;

    }

    if (a4Tasarlaniyor && !a4HakOnayi) {

      alert(
        "A4 tasarımınızı satışa sunabilmek için tasarım hakları onayını vermeniz gerekiyor."
      );

      return;

    }

    if (
      ilan.resimler.length === 0
    ) {

      alert(
        "En az 1 fotoğraf yüklemelisiniz."
      );

      return;

    }


    /* ===========================
       İLAN NUMARASI
    =========================== */

    // Security Rules ile uyum için tüm ilanlar koleksiyonu taranmaz.
    // Firestore belge kimliği otomatik kalırken ilan numarası zaman tabanlı üretilir.
    const yeniNo = String(Date.now());


    /* ===========================
       MAĞAZAYI BUL
    =========================== */

    let magazaId = "";
    let magazaAdi = "";

    const uidMagazaSnap =
      await getDocs(

        query(

          collection(
            db,
            "magazalar"
          ),

          where(
            "sahipUid",
            "==",
            auth.currentUser.uid
          )

        )

      );

    const emailMagazaSnap = uidMagazaSnap.empty
      ? await getDocs(query(
        collection(db, "magazalar"),
        where("sahip", "==", auth.currentUser.email)
      ))
      : null;

    let magazaBelgesi = !uidMagazaSnap.empty
      ? uidMagazaSnap.docs[0]
      : emailMagazaSnap?.docs[0];

    if (!magazaBelgesi) {
      const legacySnap = await getDoc(
        doc(db, "magazalar", auth.currentUser.email)
      );

      if (legacySnap.exists()) magazaBelgesi = legacySnap;
    }

    if (magazaBelgesi) {

      const magazaVerisi = magazaBelgesi.data();

      if (magazaVerisi.aktif === false) {

        alert("Mağazanız şu anda kapalı olduğu için yeni ilan veremezsiniz.");

        return;

      }

      magazaId =
        magazaBelgesi.id;

      magazaAdi =
        magazaVerisi.magazaAdi || magazaVerisi.adi || "";

    }


    /* ===========================
       FIREBASE KAYDI
    =========================== */

    const yeniIlan = {

      ilanNo: yeniNo,

      baslik:
        ilan.baslik,

      fiyat:
        Number(ilan.fiyat),

      eskiFiyat: 0,

      kategori:
        ilan.kategori,

      altKategori:
        ilan.altKategori,

      tip:
        ilan.tip,

      sehir:
        ilan.sehir,

      telefon:
        ilan.telefon,

      adet:
        Number(
          ilan.adet || 1
        ),

      stok:
        Number(
          ilan.adet || 1
        ),

      marka:
        ilan.marka,

      renk:
        ilan.renk,

      aciklama:
        ilan.aciklama,

      resim:
        ilan.resim,

      resimler:
        ilan.resimler,

      video:
        ilan.video,

      /* ⭐ ÖZEL GÜNLER */
      ozelGunler:
        ilan.ozelGunler,

      sahip:
        auth.currentUser.email,

      sahipUid:
        auth.currentUser.uid,

      magazaId:
        magazaId,

      magazaAdi:
        magazaAdi,

      paraBirimi:
        "TRY",

      puan: 5,

      yorumSayisi: 0,

      favoriSayisi: 0,

      satisSayisi: 0,

      goruntulenme: 0,

      onay: false,

      oneCikan: false,

      trend: false,

      kampanyali: false,

      indirim: 0,

      ucretsizKargo: false,

      ayniGunKargo: false,

      guvenliOdeme: true,

      kargoUcreti: 0,

      teslimatSuresi:
        "1-3 Gün",

      aktif: true,

      tarih:
        new Date()

    };


    try {

      await addDoc(

        collection(
          db,
          "ilanlar"
        ),

        yeniIlan

      );

      alert(
        "✅ İlan başarıyla gönderildi."
      );


      /* ===========================
         FORM TEMİZLE
      =========================== */

      setIlan({

        baslik: "",
        fiyat: "",
        kategori: "",
        altKategori: "",
        tip: "Satılık",
        sehir: "",
        telefon: "",
        adet: "",
        marka: "",
        renk: "",
        aciklama: "",
        resim: "",
        resimler: [],
        video: "",
        ozelGunler: []

      });

      setA4HakOnayi(false);

    }

    catch (err) {

      console.log(err);

      alert(
        "Kayıt sırasında hata oluştu."
      );

    }

  }


  return (

    <div className="ilan-form">

      <h2>
        🎁 İlan Ver
      </h2>


      <form
        onSubmit={kaydet}
      >

        <input
          placeholder="İlan Başlığı"
          value={ilan.baslik}
          onChange={(e) =>
            setIlan({
              ...ilan,
              baslik:
                e.target.value
            })
          }
        />


        <input
          placeholder="Fiyat"
          value={ilan.fiyat}
          onChange={(e) =>
            setIlan({
              ...ilan,
              fiyat:
                e.target.value
            })
          }
        />


        <input
          placeholder="Telefon"
          value={ilan.telefon}
          onChange={(e) =>
            setIlan({
              ...ilan,
              telefon:
                e.target.value
            })
          }
        />


        <input
          placeholder="Adet"
          value={ilan.adet}
          onChange={(e) =>
            setIlan({
              ...ilan,
              adet:
                e.target.value
            })
          }
        />


        <input
          placeholder="Marka"
          value={ilan.marka}
          onChange={(e) =>
            setIlan({
              ...ilan,
              marka:
                e.target.value
            })
          }
        />


        <input
          placeholder="Renk"
          value={ilan.renk}
          onChange={(e) =>
            setIlan({
              ...ilan,
              renk:
                e.target.value
            })
          }
        />


        <textarea
          placeholder="Ürün Açıklaması"
          value={ilan.aciklama}
          onChange={(e) =>
            setIlan({
              ...ilan,
              aciklama:
                e.target.value
            })
          }
        />


        <label>
          📂 Ana Kategori
        </label>


        <select
          value={ilan.kategori}
          required
          onChange={(e) => {
            setA4HakOnayi(false);
            setIlan({

              ...ilan,

              kategori:
                e.target.value,

              altKategori: ""

            });
          }}
        >

          <option value="">
            Kategori Seçiniz
          </option>

          {
            Object.keys(
              categories
            ).map((k) => (

              <option
                key={k}
                value={k}
              >
                {k}
              </option>

            ))
          }

        </select>


        <label>
          📁 Alt Kategori
        </label>


        <select
          value={ilan.altKategori}
          disabled={!ilan.kategori}
          required
          onChange={(e) =>
            setIlan({

              ...ilan,

              altKategori:
                e.target.value

            })
          }
        >

          <option value="">
            Alt Kategori Seçiniz
          </option>


          {
            altKategoriler.map(
              (k) => (

                <option
                  key={k}
                  value={k}
                >
                  {k}
                </option>

              )
            )
          }

        </select>


        <label>
          🏷️ İlan Tipi
        </label>


        <select
          value={ilan.tip}
          onChange={(e) =>
            setIlan({

              ...ilan,

              tip:
                e.target.value

            })
          }
        >

          <option>
            Satılık
          </option>

          <option>
            Kiralık
          </option>

        </select>


        <select
          value={ilan.sehir}
          onChange={(e) =>
            setIlan({

              ...ilan,

              sehir:
                e.target.value

            })
          }
        >

          <option value="">
            Şehir Seçiniz
          </option>

          {cities.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}

        </select>


        {/* ===========================
            ÖZEL GÜNLER
        =========================== */}

        <div
          className="ozel-gunler"
          style={{
            marginTop: "20px",
            marginBottom: "20px"
          }}
        >

          <label
            style={{
              display: "block",
              marginBottom: "12px",
              fontWeight: "700"
            }}
          >
            🎁 Bu ürün hangi özel günler için uygun?
          </label>


          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(2, minmax(0, 1fr))",
              gap: "10px"
            }}
          >

            {
              ozelGunListesi.map(
                (gun) => {

                  const secili =
                    ilan.ozelGunler.includes(
                      gun.id
                    );

                  return (

                    <label
                      key={gun.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "12px",
                        border:
                          secili
                            ? "2px solid #ff4d5a"
                            : "1px solid #ddd",
                        borderRadius: "10px",
                        cursor: "pointer",
                        background:
                          secili
                            ? "#fff3f4"
                            : "#fff"
                      }}
                    >

                      <input
                        type="checkbox"
                        checked={secili}
                        onChange={() =>
                          ozelGunSec(
                            gun.id
                          )
                        }
                      />

                      <span>
                        {gun.icon} {gun.ad}
                      </span>

                    </label>

                  );

                }
              )
            }

          </div>

        </div>


        {a4Tasarlaniyor ? (
          <div className="a4-upload-intro">
            <label>
              🎨 A4 Tasarımını Yükle
            </label>
            <p>
              Satışa sunmak istediğin A4 tasarımının görselini buradan yükle. Müşteriler ilanında bu görselleri görecek.
            </p>
          </div>
        ) : (
          <label>
            📷 Ürün Fotoğrafları
            (En fazla 5)
          </label>
        )}


        <input
          type="file"
          accept="image/*"
          multiple
          disabled={fotograflarYukleniyor}
          onChange={
            fotoCokluYukle
          }
        />

        {fotograflarYukleniyor && (
          <p className="photo-upload-status" role="status">
            Fotoğraflar yükleniyor...
          </p>
        )}


        <div
          className="foto-onizleme"
        >

          {
            ilan.resimler.map(
              (foto, index) => (

                <img
                  key={index}
                  src={foto}
                  alt=""
                  width="100"
                  style={{
                    margin: "5px",
                    borderRadius:
                      "8px"
                  }}
                />

              )
            )
          }

        </div>

        {a4Tasarlaniyor && (
          <>
            <p className="a4-upload-limit">
              En fazla 5 görsel ekleyebilirsin. Tasarımını net göstermek için mümkünse dikey A4 oranında ve kaliteli bir önizleme kullan.
            </p>

            <div className="a4-protection-tip">
              <h3>💡 Tasarımını Koru</h3>
              <p>
                Tasarımının yüksek çözünürlüklü orijinalini ilan görseli olarak yüklemek zorunda değilsin. İstersen düşük çözünürlüklü veya filigranlı bir önizleme kullanabilirsin.
              </p>
            </div>

            <div className="a4-rights-notice">
              <h3>🛡️ Tasarım Hakları Onayı</h3>
              <p>
                Bu tasarımın satışa sunulması için gerekli satış ve kullanım haklarına sahip olduğumu; gerekli izinlere sahip olmadığım üçüncü kişilere ait telif hakkı, marka, logo, karakter, fotoğraf, çizim veya diğer korunan içerikleri kullanmadığımı beyan ve kabul ediyorum.
              </p>

              <label>
                <input
                  type="checkbox"
                  checked={a4HakOnayi}
                  onChange={(e) => setA4HakOnayi(e.target.checked)}
                />
                <span>
                  Tasarımın satışa sunulması için gerekli hak ve yetkilere sahip olduğumu onaylıyorum.
                </span>
              </label>

              <small>
                Bu onay yalnızca A4 Tasarım ilanları için zorunludur.
              </small>
            </div>
          </>
        )}


        <label>
          🎥 Ürün Videosu
          (İsteğe Bağlı)
        </label>


        <input
          type="file"
          accept="video/*"
          onChange={
            videoYukle
          }
        />


        {
          ilan.video && (

            <div
              style={{
                marginTop: "15px"
              }}
            >

              <video
                src={ilan.video}
                controls
                width="320"
                style={{
                  borderRadius:
                    "10px"
                }}
              />

            </div>

          )
        }


        <button
          type="submit"
          className="ilan-kaydet-btn"
        >

          🚀 İlanı Yayınla

        </button>


      </form>

    </div>

  );

}

export default AddListing;
