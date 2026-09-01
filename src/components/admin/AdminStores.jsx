import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { adminApi } from "../../config/adminApi";

function tarihGoster(tarih) {
  if (!tarih) return "-";
  const date = typeof tarih.toDate === "function" ? tarih.toDate() : new Date(tarih);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("tr-TR");
}

function AdminStores({ magazalar, onStatusChanged }) {
  const [arama, setArama] = useState("");
  const [filtre, setFiltre] = useState("tumu");
  const [seciliMagaza, setSeciliMagaza] = useState(null);
  const [islemdekiId, setIslemdekiId] = useState("");
  const [hata, setHata] = useState("");

  const gorunenMagazalar = useMemo(() => {
    const aranan = arama.toLocaleLowerCase("tr-TR").trim();
    return magazalar.filter((magaza) => {
      const aktif = magaza.aktif !== false;
      const durumUygun = filtre === "tumu"
        || (filtre === "aktif" && aktif)
        || (filtre === "kapali" && !aktif);
      const metin = [magaza.magazaAdi, magaza.adi, magaza.sahip, magaza.sehir]
        .join(" ")
        .toLocaleLowerCase("tr-TR");
      return durumUygun && (!aranan || metin.includes(aranan));
    });
  }, [arama, filtre, magazalar]);

  async function durumGuncelle() {
    if (!seciliMagaza || islemdekiId) return;
    const yeniDurum = seciliMagaza.aktif === false;

    setHata("");
    setIslemdekiId(seciliMagaza.id);
    try {
      await adminApi(`/stores/${encodeURIComponent(seciliMagaza.id)}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aktif: yeniDurum })
      });
      onStatusChanged(seciliMagaza.id, yeniDurum);
      setSeciliMagaza(null);
    } catch (error) {
      setHata(error.message || "Mağaza durumu güncellenemedi.");
    } finally {
      setIslemdekiId("");
    }
  }

  return (
    <section className="admin-section admin-stores-section">
      <div className="admin-stores-heading">
        <div><h2>🏪 Mağaza Yönetimi</h2><p>Mağazaları silmeden erişim durumlarını yönetin.</p></div>
        <strong>{gorunenMagazalar.length} mağaza</strong>
      </div>

      <div className="admin-store-tools">
        <input value={arama} onChange={(event) => setArama(event.target.value)} placeholder="Mağaza veya sahip ara..." />
        <div className="admin-store-filters" aria-label="Mağaza durum filtresi">
          {[{ id: "tumu", label: "Tümü" }, { id: "aktif", label: "Aktif" }, { id: "kapali", label: "Kapalı" }].map((item) => (
            <button key={item.id} type="button" className={filtre === item.id ? "active" : ""} onClick={() => setFiltre(item.id)}>{item.label}</button>
          ))}
        </div>
      </div>

      {gorunenMagazalar.length === 0 ? (
        <div className="admin-store-empty">Bu filtreye uygun mağaza bulunamadı.</div>
      ) : (
        <div className="admin-store-grid">
          {gorunenMagazalar.map((magaza) => {
            const aktif = magaza.aktif !== false;
            const ad = magaza.magazaAdi || magaza.adi || "Mağaza";
            return (
              <article className="admin-store-card" key={magaza.id}>
                <div className="admin-store-logo">
                  {magaza.logo ? <img src={magaza.logo} alt={`${ad} logosu`} /> : <span>🏪</span>}
                </div>
                <div className="admin-store-body">
                  <div className="admin-store-title-row"><h3>{ad}</h3><span className={aktif ? "admin-store-status active" : "admin-store-status closed"}>{aktif ? "Aktif" : "Kapalı"}</span></div>
                  <p><b>Sahip:</b> {magaza.sahip || magaza.sahipUid || "-"}</p>
                  <p><b>Şehir:</b> {magaza.sehir || "-"}</p>
                  <p><b>Oluşturulma:</b> {tarihGoster(magaza.tarih)}</p>
                  <div className="admin-store-actions">
                    <Link to={`/magaza/${magaza.id}`}>Detaya Git</Link>
                    <button type="button" className={aktif ? "close-store" : "open-store"} disabled={islemdekiId === magaza.id} onClick={() => { setHata(""); setSeciliMagaza(magaza); }}>
                      {islemdekiId === magaza.id ? (aktif ? "Kapatılıyor..." : "Açılıyor...") : (aktif ? "Mağazayı Kapat" : "Mağazayı Yeniden Aç")}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {seciliMagaza && (
        <div className="admin-store-modal-backdrop" role="presentation">
          <div className="admin-store-modal" role="dialog" aria-modal="true" aria-labelledby="store-status-title">
            <h3 id="store-status-title">{seciliMagaza.aktif === false ? "Mağazayı yeniden açmak istiyor musunuz?" : "Bu mağazayı kapatmak istediğinize emin misiniz?"}</h3>
            <p>{seciliMagaza.aktif === false ? "Mağaza yeniden public vitrinlerde görüntülenebilecektir." : "Mağaza ve geçmiş kayıtlar silinmeyecek. Mağaza kullanıcılar tarafından görüntülenemeyecek ve yeni ilan veremeyecektir."}</p>
            {hata && <div className="admin-store-error" role="alert">{hata}</div>}
            <div className="admin-store-modal-actions">
              <button type="button" onClick={() => setSeciliMagaza(null)} disabled={Boolean(islemdekiId)}>Vazgeç</button>
              <button type="button" className={seciliMagaza.aktif === false ? "open-store" : "close-store"} onClick={durumGuncelle} disabled={Boolean(islemdekiId)}>
                {islemdekiId ? (seciliMagaza.aktif === false ? "Açılıyor..." : "Kapatılıyor...") : (seciliMagaza.aktif === false ? "Mağazayı Yeniden Aç" : "Mağazayı Kapat")}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default AdminStores;
