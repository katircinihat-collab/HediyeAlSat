import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { getSeoListings } from "../services/seoListings";
import { uniqueShowcaseListings } from "../seo/listingMatcher";


import seoPages from "../seo/seoPages";
import ProductCard from "../components/ProductCard";
import SEO from "../components/SEO";

import { sortListingsByBoost } from "../utils/listingBoost";

import "../styles/pages/seo-landing.css";
import "../styles/pages/product.css";


function SeoLandingPage() {
  const location = useLocation();
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

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
  GERÇEK İLANLARI FIRESTORE'DAN GETİR
  ==================================================
  */

  useEffect(() => {
    if (!page?.showcaseEnabled) {
      setIlanlarYukleniyor(false);
      return;
    }

    let aktif = true;


    async function ilanlariGetir() {
      try {
        setIlanlarYukleniyor(true);

        setError("");
        const veriler = await getSeoListings();
        if (!aktif) return;
        setIlanlar(veriler);

      } catch (error) {
        console.error(
          "SEO sayfası ilanları alınamadı:",
          error
        );

        if (aktif) {
          setIlanlar([]);
          setError("Ürünler şu anda alınamıyor. Lütfen tekrar deneyin.");
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

  }, [page, retry]);


  /*
  ==================================================
  SEO SAYFASINA UYGUN İLANLARI FİLTRELE
  ==================================================
  */

  const seoIlanlari =
    useMemo(() => {
      if (!page) return [];


      const uygunIlanlar = uniqueShowcaseListings(ilanlar, page);

      return sortListingsByBoost(
        uygunIlanlar
      ).slice(0, 12);

    }, [
      ilanlar,
      page
    ]);


  /*
  ==================================================
  SAYFA BULUNAMADI
  ==================================================
  */

  if (!page) {
    return (
      <>
        <SEO
          title="Sayfa Bulunamadı | HediyeAlSat"
          description="Aradığınız sayfa bulunamadı."
          robots="noindex,follow"
        />
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
      </>
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
    <>
      <SEO
        title={page.title}
        description={page.description}
        canonical={`https://hediyealsat.com/${encodeURIComponent(slug)}`}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Ana Sayfa", item: "https://hediyealsat.com/" },
            { "@type": "ListItem", position: 2, name: page.h1, item: `https://hediyealsat.com/${encodeURIComponent(slug)}` }
          ]
        }}
      />
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


      {page.showcaseEnabled && <section className="seo-products">

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


        {error ? <div role="alert">{error} <button type="button" onClick={() => setRetry(value => value + 1)}>Tekrar Dene</button></div> : ilanlarYukleniyor ? (

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
              Şu anda bu seçime uygun ürün bulunmuyor.
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

      </section>}

      <section className="seo-battle-cta">
        <h2>⚔️ İki hediye arasında mı kaldın?</h2>
        <p>Beğendiğin iki ürünü sepete ekle. HediyeAlSat topluluğu hangisinin daha iyi hediye olduğunu oylasın.</p>
        <Link to="/ilanlar">🎁 Hediyeleri Seç</Link>
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
    </>
  );
}


export default SeoLandingPage;
