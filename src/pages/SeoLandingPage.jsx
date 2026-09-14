import { useEffect, useMemo } from "react";
import { useLocation, Link } from "react-router-dom";
import seoPages from "../seo/seoPages";
import "../styles/pages/seo-landing.css";

function SeoLandingPage() {
  const location = useLocation();

  const slug = useMemo(() => {
    return location.pathname.replace(/^\/+|\/+$/g, "").trim();
  }, [location.pathname]);

  const page = seoPages[slug];

  useEffect(() => {
    if (!page) return;

    const oldTitle = document.title;

    let metaDescription = document.querySelector(
      'meta[name="description"]'
    );

    const oldDescription = metaDescription?.getAttribute("content") || "";

    if (!metaDescription) {
      metaDescription = document.createElement("meta");
      metaDescription.name = "description";
      document.head.appendChild(metaDescription);
    }

    document.title = page.title;
    metaDescription.setAttribute("content", page.description);

    let canonical = document.querySelector('link[rel="canonical"]');

    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }

    canonical.setAttribute(
      "href",
      `https://hediyealsat.com/${slug}`
    );

    return () => {
      document.title = oldTitle;

      if (oldDescription) {
        metaDescription.setAttribute("content", oldDescription);
      }
    };
  }, [page, slug]);

  if (!page) {
    return (
      <main className="page seo-landing-page">
        <section className="seo-content">
          <h1>Sayfa bulunamadı</h1>
          <p>Aradığınız hediye sayfası bulunamadı.</p>
          <Link to="/">Ana Sayfaya Dön</Link>
        </section>
      </main>
    );
  }

  const content = Array.isArray(page.content)
    ? page.content
    : [
        "Hediye seçerken kişinin ilgi alanlarını, yaşını, tarzını ve hediyenin verileceği özel günü düşünmek önemlidir. HediyeAlSat üzerinde farklı satıcıların sunduğu ürünleri inceleyerek bütçenize ve aradığınız hediye türüne uygun seçenekleri keşfedebilirsiniz.",
        "Kişiye özel, romantik, kullanışlı, eğlenceli veya uygun fiyatlı hediyeler arasından seçim yapabilir ve farklı hediye fikirlerini tek yerde karşılaştırabilirsiniz."
      ];

  const related = Array.isArray(page.related)
    ? page.related
    : [
        ["sevgiliye-hediye", "Sevgiliye Hediye"],
        ["kadina-hediye", "Kadına Hediye"],
        ["erkege-hediye", "Erkeğe Hediye"],
        ["anneye-hediye", "Anneye Hediye"],
        ["babaya-hediye", "Babaya Hediye"]
      ];

  return (
    <main className="page seo-landing-page">
      <section className="seo-hero">
        <span className="seo-badge">🎁 Hediye Rehberi</span>

        <h1>{page.h1}</h1>

        <p>{page.intro}</p>
      </section>

      <section className="seo-content">
        <h2>
          {page.subheading || `${page.h1} Nasıl Seçilir?`}
        </h2>

        {content.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </section>

      <section className="seo-related">
        <h2>Diğer Hediye Fikirleri</h2>

        <div className="seo-related-links">
          {related.map(([relatedSlug, label]) => (
            <Link
              key={relatedSlug}
              to={`/${relatedSlug}`}
            >
              {label}
            </Link>
          ))}
        </div>
      </section>

      <section className="seo-home-link">
        <Link to="/">← HediyeAlSat Ana Sayfa</Link>
      </section>
    </main>
  );
}

export default SeoLandingPage;