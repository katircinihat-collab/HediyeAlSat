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

  const [urunTuru, setUrunTuru] = useState("normal");
  const [a4HakOnayi, setA4HakOnayi] = useState(false);

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


  /* ===========================
     FOTOĞRAF YÜKLE
  =========================== */

  async function fotoCokluYukle(e) {

    const dosyalar =
      Array.from(e.target.files);

    if (dosyalar.length > 5) {

      alert(
        "En fazla 5 fotoğraf yükleyebilirsin."
      );

      return;

    }

    let fotolar = [];

    for (const dosya of dosyalar) {

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
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        {
          method: "POST",
          body: formData
        }
      );

      const veri =
        await cevap.json();

      if (veri.secure_url) {

        fotolar.push(
          veri.secure_url
        );

      }

    }

    setIlan({

      ...ilan,

      resimler: fotolar,

      resim:
        fotolar[0] || ""

    });

    alert(
      fotolar.length +
      " fotoğraf yüklendi ✅"
    );

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

    if (ilan.kategori === "A4 Tasarım" && !a4HakOnayi) {

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

      magazaId =
        magazaBelgesi.id;

      magazaAdi =
        magazaBelgesi.data().magazaAdi;

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

      setUrunTuru("normal");
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

        <label>
          🧩 Ürün Türü
        </label>

        <select
          value={urunTuru}
          onChange={(e) => {
            const yeniTur = e.target.value;

            setUrunTuru(yeniTur);
            setA4HakOnayi(false);
            setIlan((onceki) => ({
              ...onceki,
              kategori: yeniTur === "a4-tasarim"
                ? "A4 Tasarım"
                : onceki.kategori === "A4 Tasarım"
                  ? ""
                  : onceki.kategori,
              altKategori: yeniTur === "a4-tasarim"
                ? ""
                : onceki.altKategori
            }));
          }}
        >
          <option value="normal">Normal Ürün</option>
          <option value="a4-tasarim">A4 Tasarım</option>
        </select>

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
          disabled={urunTuru === "a4-tasarim"}
          onChange={(e) =>
            setIlan({

              ...ilan,

              kategori:
                e.target.value,

              altKategori: ""

            })
          }
        >

          <option value="">
            Kategori Seçiniz
          </option>

          {urunTuru === "a4-tasarim" && (
            <option value="A4 Tasarım">A4 Tasarım</option>
          )}


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

          <option>
            Sakarya
          </option>

          <option>
            İstanbul
          </option>

          <option>
            Ankara
          </option>

          <option>
            İzmir
          </option>

          <option>
            Bursa
          </option>

          <option>
            Kocaeli
          </option>

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


        {ilan.kategori === "A4 Tasarım" ? (
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
          onChange={
            fotoCokluYukle
          }
        />


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

        {ilan.kategori === "A4 Tasarım" && (
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
