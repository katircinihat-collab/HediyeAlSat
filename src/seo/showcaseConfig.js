const recipients = { sevgiliye: 'sevgili', kadina: 'kadin', erkege: 'erkek', anneye: 'anne', babaya: 'baba', ese: 'es', arkadasa: 'arkadas', cocuga: 'cocuk', ogretmene: 'ogretmen', 'is-arkadasina': 'is-arkadasi', 'kiz-arkadasa': 'sevgili', 'erkek-arkadasa': 'sevgili' };
const occasions = { 'dogum-gunu': 'dogum-gunu', 'yil-donumu': 'yildonumu', 'sevgililer-gunu': 'sevgililer-gunu', 'anneler-gunu': 'anneler-gunu', 'babalar-gunu': 'babalar-gunu', 'ogretmenler-gunu': 'ogretmenler-gunu', 'yeni-yil': 'yilbasi', mezuniyet: 'mezuniyet', dugun: 'dugun', nisan: 'nisan', 'yeni-ev': 'yeni-ev', 'gecmis-olsun': 'gecmis-olsun', tesekkur: 'tesekkur' };
const styles = ['kisiye-ozel', 'romantik', 'eglenceli', 'el-yapimi', 'dijital'];
// Qualitative/instant-delivery claims cannot be established from listing metadata.
const editorialOnly = new Set(['anlamli-hediyeler', 'ilginc-hediyeler', 'son-dakika-hediyeleri']);
export function buildShowcaseConfig(slug) {
  const recipient = Object.entries(recipients).find(([prefix]) => slug.startsWith(prefix + '-'))?.[1];
  const occasion = Object.entries(occasions).find(([part]) => slug.includes(part))?.[1];
  const style = styles.find(part => slug.includes(part));
  const price = slug.match(/^(\d+)-tl-alti-/);
  const maxPrice = price ? Number(price[1]) : slug.includes('uygun-fiyatli') ? 500 : null;
  return { slug, enabled: true, indexable: true, showcaseEnabled: !editorialOnly.has(slug) && Boolean(recipient || occasion || style || maxPrice), priority: recipient ? 2 : 1,
    // AND between dimensions; OR within a dimension. Never inferred from traffic.
    matchMode: 'all', recipients: recipient ? [recipient] : [], occasions: occasion ? [occasion] : [], styles: style ? [style] : [], maxPrice };
}
