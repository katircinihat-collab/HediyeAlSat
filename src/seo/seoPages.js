import { buildShowcaseConfig } from './showcaseConfig.js';
const seoPages = {
  "sevgiliye-hediye": {
    title: "Sevgiliye Hediye Fikirleri | HediyeAlSat",
    description:
      "Sevgiliye özel, anlamlı, romantik ve uygun fiyatlı hediye fikirlerini keşfet. HediyeAlSat'ta farklı satıcılardan yüzlerce hediye seçeneği.",
    h1: "Sevgiliye Hediye Fikirleri",
    intro:
      "Sevgilinize özel ve anlamlı bir hediye arıyorsanız romantik, kişiye özel, eğlenceli ve farklı seçenekleri bir arada keşfedebilirsiniz.",
    subheading: "Sevgiliye Hediye Seçerken Nelere Dikkat Edilmeli?",
    content: [
      "Sevgiliye hediye seçerken ilişkinizin tarzını, birlikte paylaştığınız anıları ve karşınızdaki kişinin ilgi alanlarını düşünmek doğru seçimi yapmayı kolaylaştırır. Romantik hediyeler kadar günlük hayatta kullanılabilecek ürünler de kalıcı bir mutluluk yaratabilir.",
      "Kişiye özel ürünler, ortak anıları hatırlatan tasarımlar, dekoratif hediyeler ve uygun fiyatlı sürprizler arasından bütçenize uygun bir seçim yapabilirsiniz. Hediyenin fiyatından çok, karşı taraf için taşıdığı anlam önemlidir."
    ],
    related: [
      ["sevgiliye-dogum-gunu-hediyesi", "Sevgiliye Doğum Günü Hediyesi"],
      ["sevgiliye-yil-donumu-hediyesi", "Sevgiliye Yıl Dönümü Hediyesi"],
      ["romantik-hediyeler", "Romantik Hediyeler"],
      ["kisiye-ozel-hediyeler", "Kişiye Özel Hediyeler"],
      ["sevgiliye-uygun-fiyatli-hediye", "Sevgiliye Uygun Fiyatlı Hediye"]
    ]
  },

  "kadina-hediye": {
    title: "Kadına Hediye Fikirleri | HediyeAlSat",
    description:
      "Kadına hediye seçeneklerini keşfet. Doğum günü, yıl dönümü ve özel günler için anlamlı ve şık hediyeler HediyeAlSat'ta.",
    h1: "Kadına Hediye Fikirleri",
    intro:
      "Kadınlara alınabilecek şık, anlamlı, kişiye özel ve uygun fiyatlı hediye seçeneklerini bir arada keşfedin.",
    subheading: "Kadına Hediye Nasıl Seçilir?",
    content: [
      "Kadına hediye seçerken kişinin tarzı, hobileri ve günlük yaşamında severek kullandığı ürünler iyi bir başlangıç noktasıdır. Zarif, kullanışlı veya duygusal değeri yüksek seçenekler farklı özel günlerde tercih edilebilir.",
      "Doğum günü, yıl dönümü, Anneler Günü veya sadece küçük bir sürpriz için kişiye özel ürünlerden dekoratif hediyelere kadar birçok alternatif arasından seçim yapabilirsiniz."
    ],
    related: [
      ["kadina-dogum-gunu-hediyesi", "Kadına Doğum Günü Hediyesi"],
      ["kadina-kisiye-ozel-hediye", "Kadına Kişiye Özel Hediye"],
      ["anlamli-hediyeler", "Anlamlı Hediyeler"],
      ["kisiye-ozel-hediyeler", "Kişiye Özel Hediyeler"],
      ["500-tl-alti-hediyeler", "500 TL Altı Hediyeler"]
    ]
  },

  "erkege-hediye": {
    title: "Erkeğe Hediye Fikirleri | HediyeAlSat",
    description:
      "Erkeğe hediye arayanlar için farklı, kullanışlı ve anlamlı seçenekler. Doğum günü ve özel gün hediyelerini HediyeAlSat'ta keşfet.",
    h1: "Erkeğe Hediye Fikirleri",
    intro:
      "Erkeklere alınabilecek kullanışlı, anlamlı, eğlenceli ve kişiye özel hediye fikirlerini keşfedin.",
    subheading: "Erkeğe Hediye Seçerken Nelere Bakılmalı?",
    content: [
      "Erkeğe hediye alırken hobiler, günlük alışkanlıklar, meslek ve kişisel tarz önemli ipuçları verir. Kullanışlı ürünler, kişiye özel tasarımlar ve ilgi alanlarına hitap eden hediyeler güçlü seçeneklerdir.",
      "Doğum günü veya özel bir kutlama için hediyenin hem kullanışlı hem de kişisel bir anlam taşıması seçimi daha özel hale getirebilir."
    ],
    related: [
      ["erkege-dogum-gunu-hediyesi", "Erkeğe Doğum Günü Hediyesi"],
      ["erkege-kisiye-ozel-hediye", "Erkeğe Kişiye Özel Hediye"],
      ["ilginc-hediyeler", "İlginç Hediyeler"],
      ["kisiye-ozel-hediyeler", "Kişiye Özel Hediyeler"],
      ["500-tl-alti-hediyeler", "500 TL Altı Hediyeler"]
    ]
  },

  "anneye-hediye": {
    title: "Anneye Hediye Fikirleri | HediyeAlSat",
    description:
      "Anneye özel anlamlı, duygusal ve kullanışlı hediye seçeneklerini keşfet. Anneler Günü ve doğum günü için hediye fikirleri.",
    h1: "Anneye Hediye Fikirleri",
    intro:
      "Annenizi mutlu edecek anlamlı, duygusal ve kullanışlı hediye seçeneklerini keşfedin.",
    subheading: "Anneye Anlamlı Bir Hediye Nasıl Seçilir?",
    content: [
      "Anneye alınacak hediyelerde duygusal değer çoğu zaman en önemli unsurdur. Birlikte geçirilen anıları hatırlatan ürünler, kişiye özel tasarımlar veya günlük yaşamını kolaylaştıracak hediyeler tercih edilebilir.",
      "Anneler Günü, doğum günü veya özel bir teşekkür için seçilen hediyenin annenizin zevklerine uygun olması hediyeyi çok daha özel kılar."
    ],
    related: [
      ["anneler-gunu-hediyeleri", "Anneler Günü Hediyeleri"],
      ["anneye-dogum-gunu-hediyesi", "Anneye Doğum Günü Hediyesi"],
      ["anlamli-hediyeler", "Anlamlı Hediyeler"],
      ["kisiye-ozel-hediyeler", "Kişiye Özel Hediyeler"],
      ["uygun-fiyatli-hediyeler", "Uygun Fiyatlı Hediyeler"]
    ]
  },

  "babaya-hediye": {
    title: "Babaya Hediye Fikirleri | HediyeAlSat",
    description:
      "Babaya alınabilecek anlamlı, kullanışlı ve farklı hediye seçeneklerini HediyeAlSat'ta keşfet.",
    h1: "Babaya Hediye Fikirleri",
    intro:
      "Babanız için kullanışlı, anlamlı ve farklı hediye alternatiflerini bir arada keşfedin.",
    subheading: "Babaya Hediye Seçerken Nelere Dikkat Edilmeli?",
    content: [
      "Babaya hediye seçerken günlük alışkanlıkları, hobileri ve ihtiyaçları önemli ipuçları verir. Kullanışlı ürünler, kişiye özel hediyeler ve sevdiği aktivitelerle ilgili seçenekler tercih edilebilir.",
      "Babalar Günü, doğum günü veya özel bir teşekkür için seçilen hediyenin kişisel bir anlam taşıması hediyeyi daha değerli hale getirir."
    ],
    related: [
      ["babalar-gunu-hediyeleri", "Babalar Günü Hediyeleri"],
      ["babaya-dogum-gunu-hediyesi", "Babaya Doğum Günü Hediyesi"],
      ["erkege-hediye", "Erkeğe Hediye"],
      ["anlamli-hediyeler", "Anlamlı Hediyeler"],
      ["uygun-fiyatli-hediyeler", "Uygun Fiyatlı Hediyeler"]
    ]
  },

  "ese-hediye": {
    title: "Eşe Hediye Fikirleri | HediyeAlSat",
    description:
      "Eşe alınabilecek romantik, anlamlı ve kişiye özel hediye fikirlerini keşfet. Yıl dönümü, doğum günü ve özel günler için seçenekler.",
    h1: "Eşe Hediye Fikirleri",
    intro:
      "Eşinizi mutlu edecek romantik, anlamlı ve kişiye özel hediye seçeneklerini keşfedin.",
    content: [
      "Eşe hediye seçerken ortak anılar, ilişkinizin önemli tarihleri ve eşinizin kişisel zevkleri doğru seçimi yapmada yardımcı olur.",
      "Romantik hediyeler, kişiye özel tasarımlar ve günlük yaşamda kullanılabilecek şık ürünler yıl dönümü ve doğum günü gibi özel günlerde tercih edilebilir."
    ],
    related: [
      ["ese-yil-donumu-hediyesi", "Eşe Yıl Dönümü Hediyesi"],
      ["yil-donumu-hediyeleri", "Yıl Dönümü Hediyeleri"],
      ["romantik-hediyeler", "Romantik Hediyeler"],
      ["kisiye-ozel-hediyeler", "Kişiye Özel Hediyeler"]
    ]
  },

  "arkadasa-hediye": {
    title: "Arkadaşa Hediye Fikirleri | HediyeAlSat",
    description:
      "Arkadaşa alınabilecek eğlenceli, anlamlı ve uygun fiyatlı hediye fikirlerini HediyeAlSat'ta keşfet.",
    h1: "Arkadaşa Hediye Fikirleri",
    intro:
      "Yakın arkadaşınıza, dostunuza veya iş arkadaşınıza verebileceğiniz farklı hediye fikirlerini keşfedin.",
    content: [
      "Arkadaşa hediye seçerken arkadaşlığınızı yansıtan küçük detaylar hediyeyi çok daha özel hale getirir. Ortak bir espri, sevdiği bir hobi veya birlikte yaşadığınız bir anı ilham kaynağı olabilir.",
      "Eğlenceli, kişiye özel veya uygun fiyatlı ürünler doğum günü ve kutlamalarda iyi alternatifler sunar."
    ],
    related: [
      ["arkadasa-dogum-gunu-hediyesi", "Arkadaşa Doğum Günü Hediyesi"],
      ["eglenceli-hediyeler", "Eğlenceli Hediyeler"],
      ["uygun-fiyatli-hediyeler", "Uygun Fiyatlı Hediyeler"],
      ["kisiye-ozel-hediyeler", "Kişiye Özel Hediyeler"]
    ]
  },

  "kiz-arkadasa-hediye": {
    title: "Kız Arkadaşa Hediye Fikirleri | HediyeAlSat",
    description:
      "Kız arkadaşa romantik, anlamlı ve özel hediye fikirlerini keşfet. Doğum günü ve özel günler için farklı seçenekler.",
    h1: "Kız Arkadaşa Hediye Fikirleri",
    intro:
      "Kız arkadaşınızı mutlu edecek romantik, zarif ve kişiye özel hediye seçeneklerini keşfedin.",
    content: [
      "Kız arkadaşa hediye seçerken onun tarzını, sevdiği renkleri ve ilgi alanlarını düşünmek doğru seçimi kolaylaştırır.",
      "Romantik tasarımlar, kişiselleştirilebilir ürünler ve ortak anılara gönderme yapan hediyeler özel günlerde anlamlı bir sürprize dönüşebilir."
    ],
    related: [
      ["sevgiliye-hediye", "Sevgiliye Hediye"],
      ["romantik-hediyeler", "Romantik Hediyeler"],
      ["kadina-hediye", "Kadına Hediye"],
      ["kisiye-ozel-hediyeler", "Kişiye Özel Hediyeler"]
    ]
  },

  "erkek-arkadasa-hediye": {
    title: "Erkek Arkadaşa Hediye Fikirleri | HediyeAlSat",
    description:
      "Erkek arkadaşa alınabilecek romantik, kullanışlı ve kişiye özel hediye fikirlerini keşfet.",
    h1: "Erkek Arkadaşa Hediye Fikirleri",
    intro:
      "Erkek arkadaşınıza özel, kullanışlı, romantik ve farklı hediye seçeneklerini keşfedin.",
    content: [
      "Erkek arkadaşa hediye alırken hobileri, teknoloji ilgisi, günlük alışkanlıkları ve kişisel tarzı iyi bir rehber olabilir.",
      "Kişiye özel tasarımlar ve ilişkinize anlam katan küçük detaylar, hediyeyi sıradan bir üründen özel bir hatıraya dönüştürebilir."
    ],
    related: [
      ["sevgiliye-hediye", "Sevgiliye Hediye"],
      ["erkege-hediye", "Erkeğe Hediye"],
      ["romantik-hediyeler", "Romantik Hediyeler"],
      ["kisiye-ozel-hediyeler", "Kişiye Özel Hediyeler"]
    ]
  },

  "cocuga-hediye": {
    title: "Çocuğa Hediye Fikirleri | HediyeAlSat",
    description:
      "Çocuklar için eğlenceli, yaratıcı ve farklı hediye fikirlerini keşfet. Yaşa ve ilgi alanlarına uygun seçenekler.",
    h1: "Çocuğa Hediye Fikirleri",
    intro:
      "Çocukların yaşına, ilgi alanlarına ve gelişimine uygun eğlenceli hediye seçeneklerini keşfedin.",
    content: [
      "Çocuğa hediye seçerken yaş grubu ve ilgi alanı en önemli kriterlerdir. Yaratıcılığı destekleyen, eğlendiren ve günlük hayatta kullanılabilen ürünler tercih edilebilir.",
      "Hediyenin güvenli, yaşa uygun ve çocuğun gerçekten ilgisini çekecek bir seçenek olması daha keyifli bir deneyim sunar."
    ],
    related: [
      ["dogum-gunu-hediyeleri", "Doğum Günü Hediyeleri"],
      ["eglenceli-hediyeler", "Eğlenceli Hediyeler"],
      ["uygun-fiyatli-hediyeler", "Uygun Fiyatlı Hediyeler"]
    ]
  },

  "ogretmene-hediye": {
    title: "Öğretmene Hediye Fikirleri | HediyeAlSat",
    description:
      "Öğretmene alınabilecek anlamlı, zarif ve uygun fiyatlı hediye fikirlerini keşfet.",
    h1: "Öğretmene Hediye Fikirleri",
    intro:
      "Öğretmeninize teşekkür etmek için anlamlı, zarif ve kullanışlı hediye seçeneklerini keşfedin.",
    content: [
      "Öğretmene hediye seçerken sade, zarif ve teşekkür duygusunu yansıtan ürünler tercih edilebilir. Kişiye özel küçük hediyeler bu tür günlerde güzel bir hatıra bırakabilir.",
      "Öğretmenler Günü, dönem sonu veya özel bir teşekkür için bütçenize uygun birçok alternatif değerlendirilebilir."
    ],
    related: [
      ["ogretmenler-gunu-hediyeleri", "Öğretmenler Günü Hediyeleri"],
      ["tesekkur-hediyesi", "Teşekkür Hediyesi"],
      ["anlamli-hediyeler", "Anlamlı Hediyeler"],
      ["uygun-fiyatli-hediyeler", "Uygun Fiyatlı Hediyeler"]
    ]
  },

  "is-arkadasina-hediye": {
    title: "İş Arkadaşına Hediye Fikirleri | HediyeAlSat",
    description:
      "İş arkadaşına alınabilecek sade, şık ve uygun fiyatlı hediye seçeneklerini keşfet.",
    h1: "İş Arkadaşına Hediye Fikirleri",
    intro:
      "İş arkadaşınıza verebileceğiniz kullanışlı, zarif ve samimi hediye fikirlerini keşfedin.",
    content: [
      "İş arkadaşına hediye seçerken fazla kişisel olmayan ancak düşünceli görünen ürünler iyi bir tercih olabilir.",
      "Masaüstü ürünleri, küçük dekoratif hediyeler ve günlük kullanıma uygun seçenekler doğum günü, terfi veya teşekkür gibi durumlarda tercih edilebilir."
    ],
    related: [
      ["arkadasa-hediye", "Arkadaşa Hediye"],
      ["tesekkur-hediyesi", "Teşekkür Hediyesi"],
      ["uygun-fiyatli-hediyeler", "Uygun Fiyatlı Hediyeler"]
    ]
  },

  "dogum-gunu-hediyeleri": {
    title: "Doğum Günü Hediyeleri ve Fikirleri | HediyeAlSat",
    description:
      "Doğum günü için farklı, anlamlı ve kişiye özel hediye seçeneklerini keşfet.",
    h1: "Doğum Günü Hediyeleri",
    intro:
      "Sevdiklerinizin doğum gününü özel kılacak farklı hediye seçeneklerini bir arada keşfedin.",
    content: [
      "Doğum günü hediyesi seçerken kişinin yaşı, hobileri, tarzı ve aranızdaki ilişki dikkate alınmalıdır. Doğru seçim, hediyenin kişisel ve düşünülmüş görünmesini sağlar.",
      "Kişiye özel ürünlerden uygun fiyatlı sürprizlere kadar geniş bir seçenek arasından doğum gününe uygun hediyeyi bulabilirsiniz."
    ],
    related: [
      ["sevgiliye-dogum-gunu-hediyesi", "Sevgiliye Doğum Günü Hediyesi"],
      ["kadina-dogum-gunu-hediyesi", "Kadına Doğum Günü Hediyesi"],
      ["erkege-dogum-gunu-hediyesi", "Erkeğe Doğum Günü Hediyesi"],
      ["arkadasa-dogum-gunu-hediyesi", "Arkadaşa Doğum Günü Hediyesi"]
    ]
  },

  "yil-donumu-hediyeleri": {
    title: "Yıl Dönümü Hediyeleri | HediyeAlSat",
    description:
      "Yıl dönümü için romantik, anlamlı ve kişiye özel hediye fikirlerini keşfet.",
    h1: "Yıl Dönümü Hediyeleri",
    intro:
      "Birlikte geçirdiğiniz zamanı kutlayacak romantik ve anlamlı yıl dönümü hediyelerini keşfedin.",
    content: [
      "Yıl dönümü hediyelerinde ortak anılar ve ilişkinin özel detayları öne çıkar. Birlikte yaşadığınız güzel anları hatırlatan tasarımlar kalıcı bir değer oluşturabilir.",
      "Romantik, kişiye özel veya kullanışlı hediyeler arasından ilişkinize en uygun seçeneği belirleyebilirsiniz."
    ],
    related: [
      ["sevgiliye-yil-donumu-hediyesi", "Sevgiliye Yıl Dönümü Hediyesi"],
      ["ese-yil-donumu-hediyesi", "Eşe Yıl Dönümü Hediyesi"],
      ["romantik-hediyeler", "Romantik Hediyeler"],
      ["sevgiliye-hediye", "Sevgiliye Hediye"]
    ]
  },

  "sevgililer-gunu-hediyeleri": {
    title: "Sevgililer Günü Hediyeleri | HediyeAlSat",
    description:
      "Sevgililer Günü için romantik, kişiye özel ve anlamlı hediye fikirlerini keşfet.",
    h1: "Sevgililer Günü Hediyeleri",
    intro:
      "14 Şubat için romantik, anlamlı ve farklı hediye seçeneklerini keşfedin.",
    content: [
      "Sevgililer Günü hediyesi seçerken ilişkinizin tarzını ve sevgilinizin zevklerini dikkate almak hediyeyi daha anlamlı hale getirir.",
      "Kişiye özel ürünler, romantik tasarımlar ve küçük sürprizler farklı bütçelere uygun seçenekler sunar."
    ],
    related: [
      ["sevgiliye-hediye", "Sevgiliye Hediye"],
      ["romantik-hediyeler", "Romantik Hediyeler"],
      ["kisiye-ozel-hediyeler", "Kişiye Özel Hediyeler"],
      ["500-tl-alti-hediyeler", "500 TL Altı Hediyeler"]
    ]
  },

  "anneler-gunu-hediyeleri": {
    title: "Anneler Günü Hediyeleri | HediyeAlSat",
    description:
      "Anneler Günü için anlamlı, duygusal ve kişiye özel hediye seçeneklerini keşfet.",
    h1: "Anneler Günü Hediyeleri",
    intro:
      "Anneler Günü'nde annenize sevginizi gösterecek özel hediye fikirlerini keşfedin.",
    content: [
      "Anneler Günü hediyelerinde duygusal anlam ve kişisel detaylar öne çıkar. Annenizin sevdiği şeyleri ve günlük yaşamını düşünerek seçim yapabilirsiniz.",
      "Kişiye özel tasarımlar, dekoratif ürünler ve kullanışlı hediyeler farklı bütçelere uygun alternatifler sunar."
    ],
    related: [
      ["anneye-hediye", "Anneye Hediye"],
      ["anneye-dogum-gunu-hediyesi", "Anneye Doğum Günü Hediyesi"],
      ["anlamli-hediyeler", "Anlamlı Hediyeler"]
    ]
  },

  "babalar-gunu-hediyeleri": {
    title: "Babalar Günü Hediyeleri | HediyeAlSat",
    description:
      "Babalar Günü için kullanışlı, anlamlı ve kişiye özel hediye fikirlerini keşfet.",
    h1: "Babalar Günü Hediyeleri",
    intro:
      "Babanıza sevginizi gösterecek kullanışlı ve anlamlı hediye seçeneklerini keşfedin.",
    content: [
      "Babalar Günü için hediye seçerken babanızın hobileri, işi ve günlük alışkanlıkları iyi bir rehber olabilir.",
      "Kişiye özel ürünlerden günlük kullanıma uygun hediyelere kadar birçok farklı seçeneği değerlendirebilirsiniz."
    ],
    related: [
      ["babaya-hediye", "Babaya Hediye"],
      ["babaya-dogum-gunu-hediyesi", "Babaya Doğum Günü Hediyesi"],
      ["erkege-hediye", "Erkeğe Hediye"]
    ]
  },

  "ogretmenler-gunu-hediyeleri": {
    title: "Öğretmenler Günü Hediyeleri | HediyeAlSat",
    description:
      "Öğretmenler Günü için zarif, anlamlı ve uygun fiyatlı hediye seçeneklerini keşfet.",
    h1: "Öğretmenler Günü Hediyeleri",
    intro:
      "Öğretmeninize teşekkürünüzü gösterecek anlamlı hediye seçeneklerini keşfedin.",
    content: [
      "Öğretmenler Günü hediyesi seçerken sade, zarif ve teşekkür duygusunu yansıtan ürünler öne çıkar.",
      "Küçük kişiye özel hediyeler, masaüstü ürünleri ve dekoratif seçenekler uygun alternatifler olabilir."
    ],
    related: [
      ["ogretmene-hediye", "Öğretmene Hediye"],
      ["tesekkur-hediyesi", "Teşekkür Hediyesi"],
      ["uygun-fiyatli-hediyeler", "Uygun Fiyatlı Hediyeler"]
    ]
  },

  "yeni-yil-hediyeleri": {
    title: "Yeni Yıl Hediyeleri | HediyeAlSat",
    description:
      "Yeni yıl için eğlenceli, anlamlı ve uygun fiyatlı hediye seçeneklerini keşfet.",
    h1: "Yeni Yıl Hediyeleri",
    intro:
      "Yeni yıl heyecanını paylaşabileceğiniz farklı ve keyifli hediye fikirlerini keşfedin.",
    content: [
      "Yeni yıl hediyelerinde eğlenceli, sıcak ve samimi seçenekler öne çıkar. Arkadaşlara, aileye veya iş arkadaşlarına uygun farklı hediyeler bulunabilir.",
      "Uygun fiyatlı küçük sürprizlerden kişiye özel tasarımlara kadar farklı bütçelere hitap eden alternatifler değerlendirilebilir."
    ],
    related: [
      ["arkadasa-hediye", "Arkadaşa Hediye"],
      ["is-arkadasina-hediye", "İş Arkadaşına Hediye"],
      ["uygun-fiyatli-hediyeler", "Uygun Fiyatlı Hediyeler"]
    ]
  },

  "mezuniyet-hediyeleri": {
    title: "Mezuniyet Hediyeleri | HediyeAlSat",
    description:
      "Mezuniyet için anlamlı, hatıra niteliğinde ve kullanışlı hediye fikirlerini keşfet.",
    h1: "Mezuniyet Hediyeleri",
    intro:
      "Yeni bir başlangıcı kutlamak için anlamlı ve hatıra niteliğinde mezuniyet hediyelerini keşfedin.",
    content: [
      "Mezuniyet hediyesi, önemli bir başarıyı kutlarken yeni bir döneme başlangıcı da temsil eder. Hatıra değeri taşıyan veya yeni yaşam döneminde kullanılabilecek ürünler tercih edilebilir.",
      "Kişiye özel tasarımlar ve motive edici hediyeler mezuniyet gününü daha unutulmaz hale getirebilir."
    ],
    related: [
      ["anlamli-hediyeler", "Anlamlı Hediyeler"],
      ["kisiye-ozel-hediyeler", "Kişiye Özel Hediyeler"],
      ["arkadasa-hediye", "Arkadaşa Hediye"]
    ]
  },

  "dugun-hediyeleri": {
    title: "Düğün Hediyeleri | HediyeAlSat",
    description:
      "Yeni evlenen çiftler için kullanışlı, şık ve anlamlı düğün hediyesi fikirlerini keşfet.",
    h1: "Düğün Hediyeleri",
    intro:
      "Yeni evlenen çiftlere verebileceğiniz şık, kullanışlı ve anlamlı hediye seçeneklerini keşfedin.",
    content: [
      "Düğün hediyesi seçerken çiftin ortak zevkleri ve yeni evlerinde kullanabilecekleri ürünler iyi bir tercih olabilir.",
      "Dekoratif ürünler, kişiye özel tasarımlar ve hatıra değeri taşıyan hediyeler düğün kutlamaları için değerlendirilebilir."
    ],
    related: [
      ["yeni-ev-hediyesi", "Yeni Ev Hediyesi"],
      ["kisiye-ozel-hediyeler", "Kişiye Özel Hediyeler"],
      ["anlamli-hediyeler", "Anlamlı Hediyeler"]
    ]
  },

  "nisan-hediyeleri": {
    title: "Nişan Hediyeleri | HediyeAlSat",
    description:
      "Nişanlanan çiftler için romantik, zarif ve anlamlı hediye seçeneklerini keşfet.",
    h1: "Nişan Hediyeleri",
    intro:
      "Nişanlanan çiftlere özel romantik ve zarif hediye fikirlerini keşfedin.",
    content: [
      "Nişan hediyesi seçerken çiftin birlikte kullanabileceği veya bu özel günü hatırlatacak ürünler tercih edilebilir.",
      "Kişiye özel hediyeler ve dekoratif ürünler nişan kutlamaları için anlamlı seçenekler sunar."
    ],
    related: [
      ["dugun-hediyeleri", "Düğün Hediyeleri"],
      ["romantik-hediyeler", "Romantik Hediyeler"],
      ["kisiye-ozel-hediyeler", "Kişiye Özel Hediyeler"]
    ]
  },

  "yeni-ev-hediyesi": {
    title: "Yeni Ev Hediyesi Fikirleri | HediyeAlSat",
    description:
      "Yeni eve taşınanlar için kullanışlı, dekoratif ve anlamlı ev hediyesi fikirlerini keşfet.",
    h1: "Yeni Ev Hediyesi Fikirleri",
    intro:
      "Yeni bir eve taşınan sevdiklerinize verebileceğiniz kullanışlı ve dekoratif hediye seçeneklerini keşfedin.",
    content: [
      "Yeni ev hediyesi seçerken evde günlük olarak kullanılabilecek veya dekorasyona katkı sağlayacak ürünler iyi bir tercih olabilir.",
      "Dekoratif aksesuarlar, kişiye özel tasarımlar ve kullanışlı ev ürünleri farklı bütçelere uygun alternatifler sunar."
    ],
    related: [
      ["dugun-hediyeleri", "Düğün Hediyeleri"],
      ["kisiye-ozel-hediyeler", "Kişiye Özel Hediyeler"],
      ["uygun-fiyatli-hediyeler", "Uygun Fiyatlı Hediyeler"]
    ]
  },

  "gecmis-olsun-hediyesi": {
    title: "Geçmiş Olsun Hediyesi Fikirleri | HediyeAlSat",
    description:
      "Geçmiş olsun dileklerinizi iletmek için düşünceli ve anlamlı hediye fikirlerini keşfet.",
    h1: "Geçmiş Olsun Hediyesi Fikirleri",
    intro:
      "Sevdiklerinize geçmiş olsun dileklerinizi gösterebileceğiniz düşünceli hediye seçeneklerini keşfedin.",
    content: [
      "Geçmiş olsun hediyelerinde amaç moral vermek ve karşınızdaki kişiye yanında olduğunuzu hissettirmektir.",
      "Sade, sıcak ve düşünceli hediyeler bu tür durumlarda uygun olabilir."
    ],
    related: [
      ["anlamli-hediyeler", "Anlamlı Hediyeler"],
      ["arkadasa-hediye", "Arkadaşa Hediye"],
      ["uygun-fiyatli-hediyeler", "Uygun Fiyatlı Hediyeler"]
    ]
  },

  "tesekkur-hediyesi": {
    title: "Teşekkür Hediyesi Fikirleri | HediyeAlSat",
    description:
      "Teşekkür etmek için zarif, anlamlı ve uygun fiyatlı hediye seçeneklerini keşfet.",
    h1: "Teşekkür Hediyesi Fikirleri",
    intro:
      "Bir teşekkürün değerini artıracak küçük, anlamlı ve zarif hediye fikirlerini keşfedin.",
    content: [
      "Teşekkür hediyesi büyük veya pahalı olmak zorunda değildir. Düşünülerek seçilmiş küçük bir hediye samimiyetinizi gösterebilir.",
      "Kişiye özel, dekoratif veya günlük kullanıma uygun ürünler farklı teşekkür durumlarında tercih edilebilir."
    ],
    related: [
      ["ogretmene-hediye", "Öğretmene Hediye"],
      ["is-arkadasina-hediye", "İş Arkadaşına Hediye"],
      ["anlamli-hediyeler", "Anlamlı Hediyeler"]
    ]
  },

  "100-tl-alti-hediyeler": {
    title: "100 TL Altı Hediyeler | HediyeAlSat",
    description:
      "100 TL altı uygun fiyatlı hediye seçeneklerini keşfet. Küçük bütçelerle anlamlı sürprizler.",
    h1: "100 TL Altı Hediyeler",
    intro:
      "Bütçenizi aşmadan küçük ve anlamlı hediye seçeneklerini keşfedin.",
    content: [
      "Uygun fiyatlı bir hediye seçerken ürünün fiyatından çok verdiği mesaj önemlidir. Küçük ama düşünülmüş bir hediye güçlü bir etki bırakabilir.",
      "100 TL altındaki seçeneklerde dekoratif ürünler, dijital hediyeler ve küçük sürprizler değerlendirilebilir."
    ],
    related: [
      ["200-tl-alti-hediyeler", "200 TL Altı Hediyeler"],
      ["300-tl-alti-hediyeler", "300 TL Altı Hediyeler"],
      ["uygun-fiyatli-hediyeler", "Uygun Fiyatlı Hediyeler"]
    ]
  },

  "200-tl-alti-hediyeler": {
    title: "200 TL Altı Hediyeler | HediyeAlSat",
    description:
      "200 TL altı hediye fikirlerini keşfet. Uygun fiyatlı ve farklı seçenekler HediyeAlSat'ta.",
    h1: "200 TL Altı Hediyeler",
    intro:
      "200 TL bütçeyle alabileceğiniz anlamlı ve farklı hediye fikirlerini keşfedin.",
    content: [
      "200 TL altındaki hediyelerde hem kullanışlı hem de kişisel alternatifler bulmak mümkündür.",
      "Doğum günü, teşekkür veya küçük sürprizler için farklı kategorilerde uygun fiyatlı seçenekleri değerlendirebilirsiniz."
    ],
    related: [
      ["100-tl-alti-hediyeler", "100 TL Altı Hediyeler"],
      ["300-tl-alti-hediyeler", "300 TL Altı Hediyeler"],
      ["uygun-fiyatli-hediyeler", "Uygun Fiyatlı Hediyeler"]
    ]
  },

  "300-tl-alti-hediyeler": {
    title: "300 TL Altı Hediyeler | HediyeAlSat",
    description:
      "300 TL altı anlamlı ve uygun fiyatlı hediye seçeneklerini keşfet.",
    h1: "300 TL Altı Hediyeler",
    intro:
      "300 TL bütçeyle seçebileceğiniz kullanışlı, şık ve anlamlı hediyeleri keşfedin.",
    content: [
      "300 TL bütçe aralığında farklı kategorilerde çok sayıda hediye alternatifi bulunabilir.",
      "Kişiye özel, dekoratif ve günlük kullanıma uygun ürünler arasında karşılaştırma yaparak ihtiyacınıza uygun hediyeyi seçebilirsiniz."
    ],
    related: [
      ["200-tl-alti-hediyeler", "200 TL Altı Hediyeler"],
      ["500-tl-alti-hediyeler", "500 TL Altı Hediyeler"],
      ["uygun-fiyatli-hediyeler", "Uygun Fiyatlı Hediyeler"]
    ]
  },

  "500-tl-alti-hediyeler": {
    title: "500 TL Altı Hediyeler | HediyeAlSat",
    description:
      "500 TL altı şık, anlamlı ve kişiye özel hediye seçeneklerini keşfet.",
    h1: "500 TL Altı Hediyeler",
    intro:
      "500 TL bütçeyle alabileceğiniz farklı, şık ve anlamlı hediye seçeneklerini keşfedin.",
    content: [
      "500 TL altındaki hediye seçeneklerinde kişiye özel ürünlerden daha kapsamlı ve kullanışlı hediyelere kadar birçok alternatif bulunabilir.",
      "Bütçenizi belirleyip kişinin zevklerine uygun ürünleri karşılaştırmak doğru hediyeyi seçmeyi kolaylaştırır."
    ],
    related: [
      ["300-tl-alti-hediyeler", "300 TL Altı Hediyeler"],
      ["1000-tl-alti-hediyeler", "1000 TL Altı Hediyeler"],
      ["uygun-fiyatli-hediyeler", "Uygun Fiyatlı Hediyeler"]
    ]
  },

  "1000-tl-alti-hediyeler": {
    title: "1000 TL Altı Hediyeler | HediyeAlSat",
    description:
      "1000 TL altı kaliteli, anlamlı ve farklı hediye seçeneklerini keşfet.",
    h1: "1000 TL Altı Hediyeler",
    intro:
      "1000 TL bütçeye kadar farklı ve özel hediye alternatiflerini keşfedin.",
    content: [
      "1000 TL'ye kadar olan bütçelerde daha geniş ürün seçeneklerini karşılaştırabilir, kişiye özel ve kaliteli alternatiflere ulaşabilirsiniz.",
      "Özel günün önemine ve alıcının zevklerine göre farklı fiyat aralıklarındaki ürünleri değerlendirebilirsiniz."
    ],
    related: [
      ["500-tl-alti-hediyeler", "500 TL Altı Hediyeler"],
      ["kisiye-ozel-hediyeler", "Kişiye Özel Hediyeler"],
      ["anlamli-hediyeler", "Anlamlı Hediyeler"]
    ]
  },

  "uygun-fiyatli-hediyeler": {
    title: "Uygun Fiyatlı Hediyeler | HediyeAlSat",
    description:
      "Uygun fiyatlı, anlamlı ve farklı hediye fikirlerini keşfet. Her bütçeye uygun seçenekler.",
    h1: "Uygun Fiyatlı Hediyeler",
    intro:
      "Bütçenizi zorlamadan sevdiklerinizi mutlu edecek hediye fikirlerini keşfedin.",
    content: [
      "Güzel bir hediye için yüksek bütçe şart değildir. Doğru seçilmiş küçük bir ürün, kişisel anlam taşıdığında çok daha değerli olabilir.",
      "Farklı fiyat aralıklarında ürünleri karşılaştırarak bütçenize uygun hediyeyi bulabilirsiniz."
    ],
    related: [
      ["100-tl-alti-hediyeler", "100 TL Altı Hediyeler"],
      ["200-tl-alti-hediyeler", "200 TL Altı Hediyeler"],
      ["300-tl-alti-hediyeler", "300 TL Altı Hediyeler"],
      ["500-tl-alti-hediyeler", "500 TL Altı Hediyeler"]
    ]
  },

  "kisiye-ozel-hediyeler": {
    title: "Kişiye Özel Hediyeler | HediyeAlSat",
    description:
      "İsim, tarih veya özel mesajla kişiselleştirilebilen hediye seçeneklerini keşfet.",
    h1: "Kişiye Özel Hediyeler",
    intro:
      "İsim, tarih ve özel detaylarla kişiselleştirilebilen anlamlı hediye seçeneklerini keşfedin.",
    content: [
      "Kişiye özel hediyeler alıcının ismini, özel bir tarihi veya anlamlı bir mesajı taşıdığı için daha kişisel bir değer oluşturur.",
      "Doğum günü, yıl dönümü, düğün veya özel kutlamalarda kişiselleştirilmiş ürünler kalıcı bir hatıra olabilir."
    ],
    related: [
      ["kadina-kisiye-ozel-hediye", "Kadına Kişiye Özel Hediye"],
      ["erkege-kisiye-ozel-hediye", "Erkeğe Kişiye Özel Hediye"],
      ["anlamli-hediyeler", "Anlamlı Hediyeler"],
      ["sevgiliye-hediye", "Sevgiliye Hediye"]
    ]
  },

  "romantik-hediyeler": {
    title: "Romantik Hediyeler | HediyeAlSat",
    description:
      "Sevgiliye ve eşe alınabilecek romantik ve anlamlı hediye seçeneklerini keşfet.",
    h1: "Romantik Hediyeler",
    intro:
      "Sevginizi gösterecek romantik, duygusal ve kişiye özel hediye fikirlerini keşfedin.",
    content: [
      "Romantik hediyeler ilişkinizdeki özel anıları ve duyguları ifade etmenin güzel bir yoludur.",
      "Kişiye özel tasarımlar, ortak anıları yansıtan ürünler ve küçük sürprizler romantik bir hediye seçimi için değerlendirilebilir."
    ],
    related: [
      ["sevgiliye-hediye", "Sevgiliye Hediye"],
      ["ese-hediye", "Eşe Hediye"],
      ["yil-donumu-hediyeleri", "Yıl Dönümü Hediyeleri"],
      ["sevgililer-gunu-hediyeleri", "Sevgililer Günü Hediyeleri"]
    ]
  },

  "anlamli-hediyeler": {
    title: "Anlamlı Hediyeler | HediyeAlSat",
    description:
      "Duygusal değeri yüksek, düşünülmüş ve anlamlı hediye fikirlerini keşfet.",
    h1: "Anlamlı Hediyeler",
    intro:
      "Sadece bir ürün değil, özel bir mesaj taşıyan anlamlı hediye seçeneklerini keşfedin.",
    content: [
      "Anlamlı bir hediyenin değeri çoğu zaman fiyatından değil, taşıdığı düşünceden gelir. Ortak bir anıya veya kişisel bir detaya gönderme yapan ürünler güçlü bir etki bırakabilir.",
      "Kişiye özel tasarımlar ve duygusal anlam taşıyan hediyeler farklı özel günlerde tercih edilebilir."
    ],
    related: [
      ["kisiye-ozel-hediyeler", "Kişiye Özel Hediyeler"],
      ["romantik-hediyeler", "Romantik Hediyeler"],
      ["tesekkur-hediyesi", "Teşekkür Hediyesi"]
    ]
  },

  "ilginc-hediyeler": {
    title: "İlginç Hediye Fikirleri | HediyeAlSat",
    description:
      "Sıradan olmayan, dikkat çekici ve farklı hediye seçeneklerini keşfet.",
    h1: "İlginç Hediye Fikirleri",
    intro:
      "Sıradan hediyelerden farklı, dikkat çekici ve özgün seçenekleri keşfedin.",
    content: [
      "İlginç hediyeler özellikle klasik seçeneklerden sıkılan kişiler için iyi bir alternatiftir.",
      "Farklı tasarımlar, yaratıcı ürünler ve kişiye özel seçenekler hediyeyi daha akılda kalıcı hale getirebilir."
    ],
    related: [
      ["eglenceli-hediyeler", "Eğlenceli Hediyeler"],
      ["kisiye-ozel-hediyeler", "Kişiye Özel Hediyeler"],
      ["erkege-hediye", "Erkeğe Hediye"]
    ]
  },

  "eglenceli-hediyeler": {
    title: "Eğlenceli Hediye Fikirleri | HediyeAlSat",
    description:
      "Gülümseten, eğlenceli ve farklı hediye fikirlerini keşfet.",
    h1: "Eğlenceli Hediye Fikirleri",
    intro:
      "Sevdiklerinizi gülümsetecek eğlenceli ve yaratıcı hediye seçeneklerini keşfedin.",
    content: [
      "Eğlenceli hediyeler arkadaşlar, sevgililer ve yakın çevre için samimi bir sürpriz olabilir.",
      "Ortak esprileri hatırlatan veya yaratıcı tasarımlara sahip ürünler hediyeyi daha keyifli hale getirebilir."
    ],
    related: [
      ["arkadasa-hediye", "Arkadaşa Hediye"],
      ["ilginc-hediyeler", "İlginç Hediyeler"],
      ["uygun-fiyatli-hediyeler", "Uygun Fiyatlı Hediyeler"]
    ]
  },

  "el-yapimi-hediyeler": {
    title: "El Yapımı Hediye Fikirleri | HediyeAlSat",
    description:
      "El emeği, özgün ve özel tasarım hediye seçeneklerini keşfet.",
    h1: "El Yapımı Hediye Fikirleri",
    intro:
      "El emeği ve özgün tasarımlardan oluşan özel hediye seçeneklerini keşfedin.",
    content: [
      "El yapımı hediyeler seri üretim ürünlerden farklı olarak daha özgün ve kişisel bir his verebilir.",
      "Özel tasarım, butik üretim ve el emeği ürünler anlamlı bir hediye arayanlar için değerlendirilebilir."
    ],
    related: [
      ["kisiye-ozel-hediyeler", "Kişiye Özel Hediyeler"],
      ["anlamli-hediyeler", "Anlamlı Hediyeler"],
      ["ilginc-hediyeler", "İlginç Hediyeler"]
    ]
  },

  "dijital-hediyeler": {
    title: "Dijital Hediyeler | HediyeAlSat",
    description:
      "Online teslim edilebilen dijital hediye ve tasarım seçeneklerini keşfet.",
    h1: "Dijital Hediyeler",
    intro:
      "Fiziksel kargo beklemeden teslim edilebilen dijital hediye seçeneklerini keşfedin.",
    content: [
      "Dijital hediyeler hızlı teslimat ve kolay erişim avantajı sunar. Özellikle son dakika hediyesi arayanlar için pratik bir alternatiftir.",
      "Dijital tasarımlar, kişiselleştirilebilir dosyalar ve indirilebilir içerikler farklı ihtiyaçlara uygun olabilir."
    ],
    related: [
      ["son-dakika-hediyeleri", "Son Dakika Hediyeleri"],
      ["kisiye-ozel-hediyeler", "Kişiye Özel Hediyeler"],
      ["uygun-fiyatli-hediyeler", "Uygun Fiyatlı Hediyeler"]
    ]
  },

  "son-dakika-hediyeleri": {
    title: "Son Dakika Hediye Fikirleri | HediyeAlSat",
    description:
      "Acil hediye arayanlar için hızlı ve pratik hediye seçeneklerini keşfet.",
    h1: "Son Dakika Hediye Fikirleri",
    intro:
      "Hediye almak için çok az zaman kaldığında değerlendirebileceğiniz pratik seçenekleri keşfedin.",
    content: [
      "Son dakika hediyesi seçerken hızlı teslimat, dijital ürünler ve kolay kişiselleştirilebilen seçenekler avantaj sağlar.",
      "Hediye seçiminin aceleye gelmiş görünmemesi için alıcının zevklerine uygun küçük detaylara dikkat edebilirsiniz."
    ],
    related: [
      ["dijital-hediyeler", "Dijital Hediyeler"],
      ["uygun-fiyatli-hediyeler", "Uygun Fiyatlı Hediyeler"],
      ["dogum-gunu-hediyeleri", "Doğum Günü Hediyeleri"]
    ]
  },

  "sevgiliye-dogum-gunu-hediyesi": {
    title: "Sevgiliye Doğum Günü Hediyesi | HediyeAlSat",
    description:
      "Sevgilinizin doğum günü için romantik, anlamlı ve kişiye özel hediye fikirlerini keşfet.",
    h1: "Sevgiliye Doğum Günü Hediyesi",
    intro:
      "Sevgilinizin doğum gününü özel kılacak romantik ve kişisel hediye fikirlerini keşfedin.",
    content: [
      "Sevgiliye doğum günü hediyesinde ilişkinize özel detayları kullanmak hediyeyi çok daha anlamlı hale getirebilir.",
      "Romantik, kişiye özel ve ortak anıları hatırlatan hediyeler doğum günü için güçlü seçeneklerdir."
    ],
    related: [
      ["sevgiliye-hediye", "Sevgiliye Hediye"],
      ["dogum-gunu-hediyeleri", "Doğum Günü Hediyeleri"],
      ["romantik-hediyeler", "Romantik Hediyeler"]
    ]
  },

  "kadina-dogum-gunu-hediyesi": {
    title: "Kadına Doğum Günü Hediyesi | HediyeAlSat",
    description:
      "Kadına doğum günü için şık, anlamlı ve kişiye özel hediye fikirlerini keşfet.",
    h1: "Kadına Doğum Günü Hediyesi",
    intro:
      "Kadınlar için doğum gününe özel şık ve anlamlı hediye seçeneklerini keşfedin.",
    content: [
      "Kadına doğum günü hediyesi seçerken kişisel tarzı, hobileri ve günlük yaşamında sevdiği şeyler dikkate alınabilir.",
      "Kişiye özel, dekoratif veya kullanışlı seçenekler arasından anlamlı bir hediye seçebilirsiniz."
    ],
    related: [
      ["kadina-hediye", "Kadına Hediye"],
      ["dogum-gunu-hediyeleri", "Doğum Günü Hediyeleri"],
      ["kadina-kisiye-ozel-hediye", "Kadına Kişiye Özel Hediye"]
    ]
  },

  "erkege-dogum-gunu-hediyesi": {
    title: "Erkeğe Doğum Günü Hediyesi | HediyeAlSat",
    description:
      "Erkeğe doğum günü için kullanışlı, farklı ve kişiye özel hediye fikirlerini keşfet.",
    h1: "Erkeğe Doğum Günü Hediyesi",
    intro:
      "Erkekler için doğum gününe özel kullanışlı ve farklı hediye seçeneklerini keşfedin.",
    content: [
      "Erkeğe doğum günü hediyesi seçerken hobileri, işi ve kişisel tarzı göz önünde bulundurmak doğru seçime yardımcı olur.",
      "Kişiye özel ürünler ve günlük hayatta kullanılabilecek hediyeler iyi alternatifler sunar."
    ],
    related: [
      ["erkege-hediye", "Erkeğe Hediye"],
      ["dogum-gunu-hediyeleri", "Doğum Günü Hediyeleri"],
      ["erkege-kisiye-ozel-hediye", "Erkeğe Kişiye Özel Hediye"]
    ]
  },

  "anneye-dogum-gunu-hediyesi": {
    title: "Anneye Doğum Günü Hediyesi | HediyeAlSat",
    description:
      "Annenizin doğum günü için anlamlı, duygusal ve kişiye özel hediye fikirlerini keşfet.",
    h1: "Anneye Doğum Günü Hediyesi",
    intro:
      "Annenizin doğum gününü özel kılacak anlamlı hediye seçeneklerini keşfedin.",
    content: [
      "Anneye doğum günü hediyesi seçerken duygusal değeri yüksek ve annenizin zevklerine uygun ürünler tercih edilebilir.",
      "Kişiye özel tasarımlar ve günlük yaşamda kullanabileceği hediyeler güzel alternatifler olabilir."
    ],
    related: [
      ["anneye-hediye", "Anneye Hediye"],
      ["anneler-gunu-hediyeleri", "Anneler Günü Hediyeleri"],
      ["dogum-gunu-hediyeleri", "Doğum Günü Hediyeleri"]
    ]
  },

  "babaya-dogum-gunu-hediyesi": {
    title: "Babaya Doğum Günü Hediyesi | HediyeAlSat",
    description:
      "Babanızın doğum günü için kullanışlı, anlamlı ve kişiye özel hediye fikirlerini keşfet.",
    h1: "Babaya Doğum Günü Hediyesi",
    intro:
      "Babanızın doğum günü için kullanışlı ve anlamlı hediye seçeneklerini keşfedin.",
    content: [
      "Babaya doğum günü hediyesi seçerken günlük alışkanlıkları ve hobileri iyi bir rehber olabilir.",
      "Kişiye özel veya kullanışlı ürünler babanıza düşünülmüş bir hediye sunmanızı sağlar."
    ],
    related: [
      ["babaya-hediye", "Babaya Hediye"],
      ["babalar-gunu-hediyeleri", "Babalar Günü Hediyeleri"],
      ["dogum-gunu-hediyeleri", "Doğum Günü Hediyeleri"]
    ]
  },

  "sevgiliye-yil-donumu-hediyesi": {
    title: "Sevgiliye Yıl Dönümü Hediyesi | HediyeAlSat",
    description:
      "Sevgiliye yıl dönümü için romantik, anlamlı ve kişiye özel hediye fikirlerini keşfet.",
    h1: "Sevgiliye Yıl Dönümü Hediyesi",
    intro:
      "Yıl dönümünüzü unutulmaz kılacak romantik ve anlamlı hediye seçeneklerini keşfedin.",
    content: [
      "Yıl dönümü hediyesinde birlikte geçirdiğiniz zamanı ve ilişkinizin özel anlarını yansıtan detaylar önemlidir.",
      "Romantik ve kişiye özel hediyeler yıl dönümü kutlamalarına daha kişisel bir anlam katabilir."
    ],
    related: [
      ["yil-donumu-hediyeleri", "Yıl Dönümü Hediyeleri"],
      ["sevgiliye-hediye", "Sevgiliye Hediye"],
      ["romantik-hediyeler", "Romantik Hediyeler"]
    ]
  },

  "ese-yil-donumu-hediyesi": {
    title: "Eşe Yıl Dönümü Hediyesi | HediyeAlSat",
    description:
      "Eşe yıl dönümü için romantik, şık ve anlamlı hediye fikirlerini keşfet.",
    h1: "Eşe Yıl Dönümü Hediyesi",
    intro:
      "Eşinizle geçirdiğiniz zamanı kutlayacak anlamlı yıl dönümü hediyelerini keşfedin.",
    content: [
      "Eşe yıl dönümü hediyesi seçerken evlilik hayatınızdaki özel anılar ve eşinizin zevkleri iyi bir rehber olabilir.",
      "Kişiye özel ve romantik ürünler bu özel günü daha unutulmaz hale getirebilir."
    ],
    related: [
      ["ese-hediye", "Eşe Hediye"],
      ["yil-donumu-hediyeleri", "Yıl Dönümü Hediyeleri"],
      ["romantik-hediyeler", "Romantik Hediyeler"]
    ]
  },

  "kadina-kisiye-ozel-hediye": {
    title: "Kadına Kişiye Özel Hediye | HediyeAlSat",
    description:
      "Kadınlar için isim, tarih ve özel mesajla kişiselleştirilebilen hediye seçeneklerini keşfet.",
    h1: "Kadına Kişiye Özel Hediye",
    intro:
      "Kadınlara özel kişiselleştirilebilen anlamlı ve zarif hediye seçeneklerini keşfedin.",
    content: [
      "İsim, tarih veya özel bir mesajla kişiselleştirilen hediyeler daha duygusal ve özel bir anlam taşıyabilir.",
      "Doğum günü, yıl dönümü ve diğer kutlamalarda kişiye özel ürünler kalıcı bir hatıra olabilir."
    ],
    related: [
      ["kadina-hediye", "Kadına Hediye"],
      ["kisiye-ozel-hediyeler", "Kişiye Özel Hediyeler"],
      ["kadina-dogum-gunu-hediyesi", "Kadına Doğum Günü Hediyesi"]
    ]
  },

  "erkege-kisiye-ozel-hediye": {
    title: "Erkeğe Kişiye Özel Hediye | HediyeAlSat",
    description:
      "Erkekler için isim, tarih veya özel detaylarla kişiselleştirilebilen hediye seçeneklerini keşfet.",
    h1: "Erkeğe Kişiye Özel Hediye",
    intro:
      "Erkeklere özel kişiselleştirilebilen farklı ve anlamlı hediye seçeneklerini keşfedin.",
    content: [
      "Erkeğe kişiye özel hediye seçerken isminin, özel bir tarihin veya ilgi alanlarının tasarıma eklenmesi hediyeyi daha kişisel hale getirebilir.",
      "Doğum günü ve özel günlerde kişiselleştirilmiş ürünler kalıcı bir hatıra oluşturabilir."
    ],
    related: [
      ["erkege-hediye", "Erkeğe Hediye"],
      ["kisiye-ozel-hediyeler", "Kişiye Özel Hediyeler"],
      ["erkege-dogum-gunu-hediyesi", "Erkeğe Doğum Günü Hediyesi"]
    ]
  },

  "sevgiliye-uygun-fiyatli-hediye": {
    title: "Sevgiliye Uygun Fiyatlı Hediye | HediyeAlSat",
    description:
      "Sevgiliye uygun fiyatlı, romantik ve anlamlı hediye fikirlerini keşfet.",
    h1: "Sevgiliye Uygun Fiyatlı Hediye",
    intro:
      "Bütçenizi zorlamadan sevgilinizi mutlu edecek romantik hediye seçeneklerini keşfedin.",
    content: [
      "Sevgiliye alınacak hediyenin pahalı olması gerekmez. Küçük ama ilişkinize özel bir detay taşıyan hediye çok daha anlamlı olabilir.",
      "Uygun fiyatlı kişiye özel ve romantik ürünler farklı bütçelerde güzel seçenekler sunar."
    ],
    related: [
      ["sevgiliye-hediye", "Sevgiliye Hediye"],
      ["uygun-fiyatli-hediyeler", "Uygun Fiyatlı Hediyeler"],
      ["100-tl-alti-hediyeler", "100 TL Altı Hediyeler"],
      ["200-tl-alti-hediyeler", "200 TL Altı Hediyeler"]
    ]
  },

  "arkadasa-dogum-gunu-hediyesi": {
    title: "Arkadaşa Doğum Günü Hediyesi | HediyeAlSat",
    description:
      "Arkadaşa doğum günü için eğlenceli, anlamlı ve uygun fiyatlı hediye fikirlerini keşfet.",
    h1: "Arkadaşa Doğum Günü Hediyesi",
    intro:
      "Arkadaşınızın doğum gününü daha keyifli hale getirecek farklı hediye seçeneklerini keşfedin.",
    content: [
      "Arkadaşa doğum günü hediyesi seçerken ortak anılarınız, esprileriniz ve arkadaşınızın hobileri iyi bir başlangıç noktasıdır.",
      "Eğlenceli, kişiye özel ve uygun fiyatlı seçenekler doğum günü için güzel alternatifler sunabilir."
    ],
    related: [
      ["arkadasa-hediye", "Arkadaşa Hediye"],
      ["dogum-gunu-hediyeleri", "Doğum Günü Hediyeleri"],
      ["eglenceli-hediyeler", "Eğlenceli Hediyeler"]
    ]
  }
};

for (const [slug, page] of Object.entries(seoPages)) Object.assign(page, buildShowcaseConfig(slug));
export default seoPages;
