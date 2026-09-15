import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  collection,
  getDocs,
  query,
  where
} from "firebase/firestore";

import { db } from "../firebase";
import seoPages from "../seo/seoPages";
import ProductCard from "../components/ProductCard";

import {
  listingMatchesSearch,
  normalizeSearchText
} from "../utils/search";

import { isListingPublished } from "../utils/listingAvailability";
import { sortListingsByBoost } from "../utils/listingBoost";

import {
  getListingSubcategory,
  isLegacySecondHandListing
} from "../data/categories";

import "../styles/pages/seo-landing.css";
import "../styles/pages/product.css";


/*
==================================================
SEO SAYFASI -> İLAN ARAMA KELİMELERİ
==================================================
*/

const SEO_SEARCH_TERMS = {
  "sevgiliye-hediye": [
    "sevgili",
    "romantik",
    "kişiye özel"
  ],

  "kadina-hediye": [
    "kadın",
    "kadına",
    "bayan"
  ],

  "erkege-hediye": [
    "erkek",
    "erkeğe"
  ],

  "anneye-hediye": [
    "anne",
    "anneye"
  ],

  "babaya-hediye": [
    "baba",
    "babaya"
  ],

  "ese-hediye": [
    "eş",
    "eşe",
    "romantik"
  ],

  "arkadasa-hediye": [
    "arkadaş",
    "arkadaşa"
  ],

  "kiz-arkadasa-hediye": [
    "kız arkadaş",
    "sevgili",
    "romantik"
  ],

  "erkek-arkadasa-hediye": [
    "erkek arkadaş",
    "sevgili"
  ],

  "cocuga-hediye": [
    "çocuk",
    "çocuğa"
  ],

  "ogretmene-hediye": [
    "öğretmen",
    "öğretmene"
  ],

  "is-arkadasina-hediye": [
    "iş arkadaşı",
    "ofis"
  ],

  "dogum-gunu-hediyeleri": [
    "doğum günü"
  ],

  "yil-donumu-hediyeleri": [
    "yıl dönümü",
    "yıldönümü",
    "romantik"
  ],

  "sevgililer-gunu-hediyeleri": [
    "sevgililer günü",
    "sevgili",
    "romantik"
  ],

  "anneler-gunu-hediyeleri": [
    "anneler günü",
    "anne"
  ],

  "babalar-gunu-hediyeleri": [
    "babalar günü",
    "baba"
  ],

  "ogretmenler-gunu-hediyeleri": [
    "öğretmenler günü",
    "öğretmen"
  ],

  "yeni-yil-hediyeleri": [
    "yeni yıl",
    "yılbaşı"
  ],

  "mezuniyet-hediyeleri": [
    "mezuniyet"
  ],

  "dugun-hediyeleri": [
    "düğün",
    "evlilik"
  ],

  "nisan-hediyeleri": [
    "nişan"
  ],

  "yeni-ev-hediyesi": [
    "yeni ev",
    "ev hediyesi",
    "dekorasyon"
  ],

  "gecmis-olsun-hediyesi": [
    "geçmiş olsun"
  ],

  "tesekkur-hediyesi": [
    "teşekkür"
  ],

  "uygun-fiyatli-hediyeler": [
    "uygun fiyat",
    "hediye"
  ],

  "kisiye-ozel-hediyeler": [
    "kişiye özel",
    "kişiselleştirilmiş"
  ],

  "romantik-hediyeler": [
    "romantik",
    "sevgili"
  ],

  "anlamli-hediyeler": [
    "anlamlı",
    "kişiye özel"
  ],

  "ilginc-hediyeler": [
    "ilginç",
    "farklı"
  ],

  "eglenceli-hediyeler": [
    "eğlenceli"
  ],

  "el-yapimi-hediyeler": [
    "el yapımı",
    "handmade"
  ],

  "dijital-hediyeler": [
    "dijital",
    "tasarım",
    "poster"
  ],

  "son-dakika-hediyeleri": [
    "dijital",
    "hızlı teslimat"
  ],

  "sevgiliye-dogum-gunu-hediyesi": [
    "sevgili",
    "romantik"
  ],

  "kadina-dogum-gunu-hediyesi": [
    "kadın",
    "kadına",
    "bayan"
  ],

  "erkege-dogum-gunu-hediyesi": [
    "erkek",
    "erkeğe"
  ],

  "anneye-dogum-gunu-hediyesi": [
    "anne",
    "anneye"
  ],

  "babaya-dogum-gunu-hediyesi": [
    "baba",
    "babaya"
  ],

  "sevgiliye-yil-donumu-hediyesi": [
    "sevgili",
    "romantik"
  ],

  "ese-yil-donumu-hediyesi": [
    "eş",
    "eşe",
    "romantik"
  ],

  "kadina-kisiye-ozel-hediye": [
    "kadın",
    "kadına",
    "kişiye özel"
  ],

  "erkege-kisiye-ozel-hediye": [
    "erkek",
    "erkeğe",
    "kişiye özel"
  ],

  "sevgiliye-uygun-fiyatli-hediye": [
    "sevgili",
    "romantik"
  ],

  "arkadasa-dogum-gunu-hediyesi": [
    "arkadaş",
    "arkadaşa"
  ]
};


/*
==================================================
FİYAT SAYFALARI
==================================================
*/

const PRICE_LIMITS = {
  "100-tl-alti-hediyeler": 100,
  "200-tl-alti-hediyeler": 200,
  "300-tl-alti-hediyeler": 300,
  "500-tl-alti-hediyeler": 500,
  "1000-tl-alti-hediyeler": 1000,
  "uygun-fiyatli-hediyeler": 500
};


/*
==================================================
SEO SAYFASI -> HEDEF KİŞİ EŞLEŞMESİ
==================================================
*/

const TARGET_PERSON_BY_SLUG = {
  "sevgiliye-hediye": "sevgili",
  "kadina-hediye": "kadin",
  "erkege-hediye": "erkek",
  "anneye-hediye": "anne",
  "babaya-hediye": "baba",
  "ese-hediye": "es",
  "arkadasa-hediye": "arkadas",
  "kiz-arkadasa-hediye": "sevgili",
  "erkek-arkadasa-hediye": "sevgili",
  "cocuga-hediye": "cocuk",
  "ogretmene-hediye": "ogretmen",
  "is-arkadasina-hediye": "is-arkadasi",
  "sevgiliye-dogum-gunu-hediyesi": "sevgili",
  "kadina-dogum-gunu-hediyesi": "kadin",
  "erkege-dogum-gunu-hediyesi": "erkek",
  "anneye-dogum-gunu-hediyesi": "anne",
  "babaya-dogum-gunu-hediyesi": "baba",
  "arkadasa-dogum-gunu-hediyesi": "arkadas",
  "sevgiliye-yil-donumu-hediyesi": "sevgili",
  "ese-yil-donumu-hediyesi": "es",
  "kadina-kisiye-ozel-hediye": "kadin",
  "erkege-kisiye-ozel-hediye": "erkek",
  "sevgiliye-uygun-fiyatli-hediye": "sevgili"
};


/*
==================================================
SEO SAYFASI -> ÖZEL GÜN EŞLEŞMESİ
==================================================
*/

const SPECIAL_DAY_BY_SLUG = {
  "dogum-gunu-hediyeleri": "dogum-gunu",
  "sevgililer-gunu-hediyeleri": "sevgililer-gunu",
  "anneler-gunu-hediyeleri": "anneler-gunu",
  "babalar-gunu-hediyeleri": "babalar-gunu",
  "mezuniyet-hediyeleri": "mezuniyet",
  "yeni-yil-hediyeleri": "yilbasi",
  "yil-donumu-hediyeleri": "yildonumu",

  "sevgiliye-dogum-gunu-hediyesi": "dogum-gunu",
  "kadina-dogum-gunu-hediyesi": "dogum-gunu",
  "erkege-dogum-gunu-hediyesi": "dogum-gunu",
  "anneye-dogum-gunu-hediyesi": "dogum-gunu",
  "babaya-dogum-gunu-hediyesi": "dogum-gunu",
  "arkadasa-dogum-gunu-hediyesi": "dogum-gunu",

  "sevgiliye-yil-donumu-hediyesi": "yildonumu",
  "ese-yil-donumu-hediyesi": "yildonumu"
};


/*
==================================================
SADECE ÖZEL GÜNE GÖRE FİLTRELENECEK SAYFALAR
==================================================
*/

const SPECIAL_DAY_ONLY_SLUGS = new Set([
  "dogum-gunu-hediyeleri",
  "yil-donumu-hediyeleri",
  "sevgililer-gunu-hediyeleri",
  "anneler-gunu-hediyeleri",
  "babalar-gunu-hediyeleri",
  "mezuniyet-hediyeleri",
  "yeni-yil-hediyeleri"
]);


/*
==================================================
İLAN FİYATINI GÜVENLİ ŞEKİLDE AL
==================================================
*/

function getListingPrice(ilan) {
  const rawPrice =
    ilan?.fiyat ??
    ilan?.price ??
    ilan?.urunFiyati ??
    0;

  if (typeof rawPrice === "number") {
    return rawPrice;
  }

  const normalized = String(rawPrice)
    .replace(/\s/g, "")
    .replace("₺", "")
    .replace(/\./g, "")
    .replace(",", ".");

  const value = Number(normalized);

  return Number.isFinite(value) ? value : 0;
}


/*
==================================================
İLANIN ÖZEL GÜN BİLGİLERİNİ AL
==================================================
*/

function getListingSpecialDays(ilan) {
  const values = [];

  if (Array.isArray(ilan?.ozelGunler)) {
    values.push(...ilan.ozelGunler);
  }

  if (ilan?.ozelGun) {
    values.push(ilan.ozelGun);
  }

  return values
    .map((value) => normalizeSearchText(value))
    .filter(Boolean);
}


/*
==================================================
İLAN ÖZEL GÜNE UYGUN MU?
==================================================
*/

function matchesSpecialDay(ilan, specialDay) {
  if (!specialDay) {
    return true;
  }

  const listingSpecialDays =
    getListingSpecialDays(ilan);

  const normalizedSpecialDay =
    normalizeSearchText(specialDay);

  return listingSpecialDays.includes(
    normalizedSpecialDay
  );
}


/*
==================================================
İLANIN HEDEF KİŞİ BİLGİLERİNİ AL
==================================================
*/

function getListingTargetPeople(ilan) {
  const values = Array.isArray(ilan?.hedefKisiler)
    ? ilan.hedefKisiler
    : [];

  return values
    .map((value) => normalizeSearchText(value))
    .filter(Boolean);
}


/*
==================================================
İLAN HEDEF KİŞİYE UYGUN MU?
==================================================
*/

function matchesTargetPerson(ilan, targetPerson) {
  if (!targetPerson) {
    return true;
  }

  const listingTargetPeople = getListingTargetPeople(ilan);
  const normalizedTargetPerson = normalizeSearchText(targetPerson);

  return listingTargetPeople.includes(normalizedTargetPerson);
}


/*
==================================================
SEO ARAMA KELİMELERİNE UYGUN MU?
==================================================
*/

function matchesSearchTerms(ilan, slug) {
  const searchTerms =
    SEO_SEARCH_TERMS[slug] || [];

  if (searchTerms.length === 0) {
    return false;
  }

  const extraValues =
    getListingSubcategory(ilan);

  return searchTerms.some((term) =>
    listingMatchesSearch(
      ilan,
      term,
      extraValues
    )
  );
}


/*
==================================================
SEO SAYFASINA UYGUN İLAN MI?
==================================================
*/

function matchesSeoPage(ilan, slug) {
  const priceLimit = PRICE_LIMITS[slug];

  if (priceLimit) {
    const fiyat = getListingPrice(ilan);
    return fiyat > 0 && fiyat <= priceLimit;
  }

  const specialDay = SPECIAL_DAY_BY_SLUG[slug];
  const targetPerson = TARGET_PERSON_BY_SLUG[slug];

  if (
    specialDay &&
    SPECIAL_DAY_ONLY_SLUGS.has(slug)
  ) {
    return matchesSpecialDay(ilan, specialDay);
  }

  if (specialDay && targetPerson) {
    return (
      matchesSpecialDay(ilan, specialDay) &&
      matchesTargetPerson(ilan, targetPerson)
    );
  }

  if (
    targetPerson &&
    (
      slug === "kadina-kisiye-ozel-hediye" ||
      slug === "erkege-kisiye-ozel-hediye"
    )
  ) {
    return (
      matchesTargetPerson(ilan, targetPerson) &&
      matchesSearchTerms(ilan, slug)
    );
  }

  if (
    slug === "sevgiliye-uygun-fiyatli-hediye" &&
    targetPerson
  ) {
    const fiyat = getListingPrice(ilan);

    return (
      fiyat > 0 &&
      fiyat <= 500 &&
      matchesTargetPerson(ilan, targetPerson)
    );
  }

  if (targetPerson) {
    return matchesTargetPerson(ilan, targetPerson);
  }

  return matchesSearchTerms(ilan, slug);
}


function SeoLandingPage() {
  const location = useLocation();

  const [ilanlar, setIlanlar] =
    useState([]);

  const [
    ilanlarYukleniyor,
    setIlanlarYukleniyor
  ] = useState(true);


  const slug = useMemo(() => {
    return location.pathname
      .replace(/^\/+|\/+$/g, "")
      .trim();
  }, [location.pathname]);


  const page = seoPages[slug];


  /*
  ==================================================
  SEO META BİLGİLERİ
  ==================================================
  */

  useEffect(() => {
    if (!page) return;

    const oldTitle =
      document.title;

    let metaDescription =
      document.querySelector(
        'meta[name="description"]'
      );

    const oldDescription =
      metaDescription?.getAttribute(
        "content"
      ) || "";

    if (!metaDescription) {
      metaDescription =
        document.createElement("meta");

      metaDescription.name =
        "description";

      document.head.appendChild(
        metaDescription
      );
    }

    document.title =
      page.title;

    metaDescription.setAttribute(
      "content",
      page.description
    );


    let canonical =
      document.querySelector(
        'link[rel="canonical"]'
      );

    const oldCanonical =
      canonical?.getAttribute("href") || "";

    const canonicalWasCreated =
      !canonical;

    if (!canonical) {
      canonical =
        document.createElement("link");

      canonical.rel =
        "canonical";

      document.head.appendChild(
        canonical
      );
    }

    canonical.setAttribute(
      "href",
      `https://hediyealsat.com/${slug}`
    );


    return () => {
      document.title =
        oldTitle;

      if (oldDescription) {
        metaDescription.setAttribute(
          "content",
          oldDescription
        );
      } else {
        metaDescription.removeAttribute(
          "content"
        );
      }

      if (canonicalWasCreated) {
        canonical.remove();
      } else if (oldCanonical) {
        canonical.setAttribute(
          "href",
          oldCanonical
        );
      }
    };
  }, [page, slug]);


  /*
  ==================================================
  GERÇEK İLANLARI FIRESTORE'DAN GETİR
  ==================================================
  */

  useEffect(() => {
    if (!page) {
      setIlanlarYukleniyor(false);
      return;
    }

    let aktif = true;


    async function ilanlariGetir() {
      try {
        setIlanlarYukleniyor(true);

        const snapshot =
          await getDocs(
            query(
              collection(
                db,
                "ilanlar"
              ),
              where(
                "onay",
                "==",
                true
              )
            )
          );

        if (!aktif) return;


        const veriler =
          snapshot.docs.map(
            (belge) => ({
              id: belge.id,
              ...belge.data()
            })
          );

        setIlanlar(veriler);

      } catch (error) {
        console.error(
          "SEO sayfası ilanları alınamadı:",
          error
        );

        if (aktif) {
          setIlanlar([]);
        }

      } finally {
        if (aktif) {
          setIlanlarYukleniyor(false);
        }
      }
    }


    ilanlariGetir();


    return () => {
      aktif = false;
    };

  }, [page]);


  /*
  ==================================================
  SEO SAYFASINA UYGUN İLANLARI FİLTRELE
  ==================================================
  */

  const seoIlanlari =
    useMemo(() => {
      if (!page) return [];


      const uygunIlanlar =
        ilanlar.filter(
          (ilan) => {

            if (
              !isListingPublished(ilan)
            ) {
              return false;
            }


            if (
              isLegacySecondHandListing(
                ilan
              )
            ) {
              return false;
            }


            return matchesSeoPage(
              ilan,
              slug
            );
          }
        );


      return sortListingsByBoost(
        uygunIlanlar
      ).slice(0, 12);

    }, [
      ilanlar,
      page,
      slug
    ]);


  /*
  ==================================================
  SAYFA BULUNAMADI
  ==================================================
  */

  if (!page) {
    return (
      <main className="page seo-landing-page">

        <section className="seo-content">

          <h1>
            Sayfa bulunamadı
          </h1>

          <p>
            Aradığınız hediye sayfası
            bulunamadı.
          </p>

          <Link to="/">
            Ana Sayfaya Dön
          </Link>

        </section>

      </main>
    );
  }


  /*
  ==================================================
  SEO METİNLERİ
  ==================================================
  */

  const content =
    Array.isArray(page.content)
      ? page.content
      : [
          "Hediye seçerken kişinin ilgi alanlarını, yaşını, tarzını ve hediyenin verileceği özel günü düşünmek önemlidir. HediyeAlSat üzerinde farklı satıcıların sunduğu ürünleri inceleyerek bütçenize ve aradığınız hediye türüne uygun seçenekleri keşfedebilirsiniz.",
          "Kişiye özel, romantik, kullanışlı, eğlenceli veya uygun fiyatlı hediyeler arasından seçim yapabilir ve farklı hediye fikirlerini tek yerde karşılaştırabilirsiniz."
        ];


  const related =
    Array.isArray(page.related)
      ? page.related
      : [
          [
            "sevgiliye-hediye",
            "Sevgiliye Hediye"
          ],
          [
            "kadina-hediye",
            "Kadına Hediye"
          ],
          [
            "erkege-hediye",
            "Erkeğe Hediye"
          ],
          [
            "anneye-hediye",
            "Anneye Hediye"
          ],
          [
            "babaya-hediye",
            "Babaya Hediye"
          ]
        ];


  /*
  ==================================================
  SAYFA
  ==================================================
  */

  return (
    <main className="page seo-landing-page">

      <section className="seo-hero">

        <span className="seo-badge">
          🎁 Hediye Rehberi
        </span>

        <h1>
          {page.h1}
        </h1>

        <p>
          {page.intro}
        </p>

      </section>


      <section className="seo-content">

        <h2>
          {page.subheading ||
            `${page.h1} Nasıl Seçilir?`}
        </h2>

        {content.map(
          (paragraph, index) => (
            <p key={index}>
              {paragraph}
            </p>
          )
        )}

      </section>


      <section className="seo-products">

        <div className="seo-products-heading">

          <div>

            <span className="seo-products-kicker">
              🎁 HediyeAlSat'tan
            </span>

            <h2>
              {page.h1} İçin Ürünleri Keşfet
            </h2>

          </div>


          {!ilanlarYukleniyor &&
            seoIlanlari.length > 0 && (

              <strong>
                {seoIlanlari.length} ürün
              </strong>

            )}

        </div>


        {ilanlarYukleniyor ? (

          <div className="seo-products-status">
            ⏳ Ürünler yükleniyor...
          </div>

        ) : seoIlanlari.length > 0 ? (

          <div className="seo-products-grid">

            {seoIlanlari.map(
              (ilan) => (

                <ProductCard
                  key={ilan.id}
                  ilan={ilan}
                />

              )
            )}

          </div>

        ) : (

          <div className="seo-products-empty">

            <h3>
              Bu hediye türünde yeni ürünler
              hazırlanıyor.
            </h3>

            <p>
              HediyeAlSat'taki diğer güncel
              ürünleri inceleyebilirsiniz.
            </p>

            <Link to="/ilanlar">
              Tüm İlanları Gör
            </Link>

          </div>

        )}

      </section>


      <section className="seo-related">

        <h2>
          Diğer Hediye Fikirleri
        </h2>

        <div className="seo-related-links">

          {related.map(
            ([relatedSlug, label]) => (

              <Link
                key={relatedSlug}
                to={`/${relatedSlug}`}
              >
                {label}
              </Link>

            )
          )}

        </div>

      </section>


      <section className="seo-home-link">

        <Link to="/">
          ← HediyeAlSat Ana Sayfa
        </Link>

      </section>

    </main>
  );
}


export default SeoLandingPage;