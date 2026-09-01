import { useMemo, useState } from "react";
import ProductCard from "./ProductCard";
import { categoryDefinitions, getListingMainCategory, getListingSubcategory } from "../data/categories";
import "../styles/components/store-products.css";

function metinNormallestir(value) {
  return String(value || "").toLocaleLowerCase("tr-TR").trim();
}

function fiyatSayisi(value) {
  const temiz = String(value ?? "").replace(/[^\d,.-]/g, "");
  const normalize = temiz.includes(",") ? temiz.replace(/\./g, "").replace(",", ".") : temiz;
  const sonuc = Number(normalize);
  return Number.isFinite(sonuc) ? sonuc : 0;
}

function tarihSayisi(ilan) {
  const tarih = ilan.tarih || ilan.createdAt || ilan.olusturulmaTarihi;
  if (typeof tarih?.toMillis === "function") return tarih.toMillis();
  if (tarih?.seconds) return tarih.seconds * 1000;
  const sonuc = new Date(tarih || 0).getTime();
  return Number.isFinite(sonuc) ? sonuc : 0;
}

function StoreProducts({ ilanlar }) {
  const [arama, setArama] = useState("");
  const [anaKategori, setAnaKategori] = useState("");
  const [altKategori, setAltKategori] = useState("");
  const [siralama, setSiralama] = useState("onerilen");

  const kullanilanAnaKategoriler = useMemo(() => {
    const mevcut = new Set(ilanlar.map(getListingMainCategory).filter(Boolean));
    return categoryDefinitions.filter((kategori) => mevcut.has(kategori.name));
  }, [ilanlar]);

  const kullanilanAltKategoriler = useMemo(() => {
    if (!anaKategori) return [];
    const mevcut = new Set(
      ilanlar
        .filter((ilan) => getListingMainCategory(ilan) === anaKategori)
        .map(getListingSubcategory)
        .filter(Boolean)
    );
    const tanim = categoryDefinitions.find((kategori) => kategori.name === anaKategori);
    return (tanim?.subcategories || []).filter((kategori) => mevcut.has(kategori));
  }, [anaKategori, ilanlar]);

  const gorunenIlanlar = useMemo(() => {
    const aranan = metinNormallestir(arama);
    const sonuc = ilanlar.filter((ilan) => {
      const ana = getListingMainCategory(ilan);
      const alt = getListingSubcategory(ilan);
      const aranabilirMetin = metinNormallestir([
        ilan.baslik,
        ilan.aciklama,
        ilan.kategori,
        ilan.altKategori,
        ana,
        alt
      ].join(" "));

      return (!aranan || aranabilirMetin.includes(aranan))
        && (!anaKategori || ana === anaKategori)
        && (!altKategori || alt === altKategori);
    });

    if (siralama === "fiyat-artan") return [...sonuc].sort((a, b) => fiyatSayisi(a.fiyat) - fiyatSayisi(b.fiyat));
    if (siralama === "fiyat-azalan") return [...sonuc].sort((a, b) => fiyatSayisi(b.fiyat) - fiyatSayisi(a.fiyat));
    if (siralama === "en-yeni") return [...sonuc].sort((a, b) => tarihSayisi(b) - tarihSayisi(a));
    return sonuc;
  }, [altKategori, anaKategori, arama, ilanlar, siralama]);

  function anaKategoriDegistir(value) {
    setAnaKategori(value);
    setAltKategori("");
  }

  return (
    <section className="store-products">
      <div className="store-products-header">
        <div><span className="store-products-kicker">MAĞAZA VİTRİNİ</span><h2>Ürünleri Keşfet</h2></div>
        <strong>{gorunenIlanlar.length} ürün bulundu</strong>
      </div>

      {ilanlar.length > 0 && (
        <div className="store-product-controls">
          <label className="store-product-search">
            <span>🔍</span>
            <input value={arama} onChange={(event) => setArama(event.target.value)} placeholder="Mağazada ürün ara..." />
          </label>

          <select value={anaKategori} onChange={(event) => anaKategoriDegistir(event.target.value)} aria-label="Ana kategori filtresi">
            <option value="">Tüm Kategoriler</option>
            {kullanilanAnaKategoriler.map((kategori) => <option key={kategori.id} value={kategori.name}>{kategori.name}</option>)}
          </select>

          <select value={altKategori} onChange={(event) => setAltKategori(event.target.value)} disabled={!anaKategori || kullanilanAltKategoriler.length === 0} aria-label="Alt kategori filtresi">
            <option value="">Tüm Alt Kategoriler</option>
            {kullanilanAltKategoriler.map((kategori) => <option key={kategori} value={kategori}>{kategori}</option>)}
          </select>

          <select value={siralama} onChange={(event) => setSiralama(event.target.value)} aria-label="Ürün sıralaması">
            <option value="onerilen">Önerilen</option>
            <option value="en-yeni">En Yeni</option>
            <option value="fiyat-artan">Fiyat Artan</option>
            <option value="fiyat-azalan">Fiyat Azalan</option>
          </select>
        </div>
      )}

      {ilanlar.length === 0 ? (
        <div className="empty-products"><span>🏪</span><h3>Bu mağazada henüz aktif ürün yok.</h3><p>Yeni ürünler eklendiğinde burada gösterilecek.</p></div>
      ) : gorunenIlanlar.length === 0 ? (
        <div className="empty-products"><span>🔎</span><h3>Aramanıza uygun ürün bulunamadı.</h3><p>Arama veya kategori seçiminizi değiştirmeyi deneyin.</p></div>
      ) : (
        <div className="store-products-grid">
          {gorunenIlanlar.map((ilan) => <ProductCard key={ilan.id} ilan={ilan} />)}
        </div>
      )}
    </section>
  );
}

export default StoreProducts;
