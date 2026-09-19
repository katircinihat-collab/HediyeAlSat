import { Helmet } from "react-helmet-async";

function SEO({

  title,

  description,

  canonical,

  image = "https://hediyealsat.com/og-image.svg",

  robots = "index,follow",

  type = "website",

  jsonLd = []

}){

  const structuredData = Array.isArray(jsonLd) ? jsonLd : [jsonLd];

  return(

    <Helmet>

      <title>{title}</title>

      <meta
        name="description"
        content={description}
      />

      <meta
        name="robots"
        content={robots}
      />

      {canonical && <link rel="canonical" href={canonical} />}

      <meta
        property="og:title"
        content={title}
      />

      <meta
        property="og:description"
        content={description}
      />

      {canonical && <meta property="og:url" content={canonical} />}

      <meta property="og:site_name" content="HediyeAlSat" />

      <meta property="og:locale" content="tr_TR" />

      <meta
        property="og:image"
        content={image}
      />

      <meta
        property="og:type"
        content={type}
      />

      <meta
        name="twitter:card"
        content="summary_large_image"
      />

      <meta
        name="twitter:title"
        content={title}
      />

      <meta
        name="twitter:description"
        content={description}
      />

      <meta
        name="twitter:image"
        content={image}
      />

      {structuredData.filter(Boolean).map((data, index) => (
        <script
          key={`${data["@type"] || "structured-data"}-${index}`}
          type="application/ld+json"
        >
          {JSON.stringify(data).replace(/</g, "\\u003c")}
        </script>
      ))}

    </Helmet>

  );

}

export default SEO;
