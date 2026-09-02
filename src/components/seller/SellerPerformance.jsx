import "../../styles/pages/seller-performance.css";

function SellerPerformance({ urunler, siparisler, toplamKazanc }) {
  const tamamlanan = siparisler.filter((siparis) => siparis.durum === "Teslim").length;
  const silver = toplamKazanc >= 50000;
  const gold = toplamKazanc >= 250000;
  const enCokSatan = siparisler.length
    ? siparisler.sort(
      (birinci, ikinci) => Number(ikinci.toplam || 0) - Number(birinci.toplam || 0)
    )[0]
    : null;
  const hedef = Math.min(100, (toplamKazanc / 50000) * 100);

  const rozet = gold ? "🥇 Gold" : silver ? "🥈 Silver" : "🥉 Bronze";
  const sonrakiRozet = gold ? "💎 Platinum" : silver ? "🥇 Gold" : "🥈 Silver";

  return (
    <section className="seller-performance-section">
      <h2 className="section-title">🏆 Satıcı Performansı</h2>

      <div className="seller-performance-kpi-grid">
        <article className="seller-performance-card">
          <span className="seller-performance-label">Satıcı Rozeti</span>
          <strong>{rozet}</strong>
          <small>Aktif satıcı seviyesi</small>
        </article>

        <article className="seller-performance-card seller-performance-product-card">
          <span className="seller-performance-label">En Çok Satan Ürün</span>
          <strong>{enCokSatan ? enCokSatan.ilanBaslik : "Henüz Yok"}</strong>
          <small>
            {enCokSatan
              ? `₺${Number(enCokSatan.toplam || 0).toLocaleString("tr-TR")}`
              : "Satış verisi oluşmadı"}
          </small>
        </article>

        <article className="seller-performance-card">
          <span className="seller-performance-label">Toplam Ürün</span>
          <strong>{urunler.length}</strong>
          <small>Yayındaki ürün</small>
        </article>

        <article className="seller-performance-card">
          <span className="seller-performance-label">Toplam Sipariş</span>
          <strong>{siparisler.length}</strong>
          <small>Alınan sipariş</small>
        </article>
      </div>

      <div className="seller-performance-details-grid">
        <article className="seller-performance-progress-card">
          <div className="seller-performance-progress-heading">
            <div>
              <span className="seller-performance-label">Satış Hedefi</span>
              <strong>₺50.000</strong>
            </div>
            <b>{hedef.toFixed(0)}%</b>
          </div>
          <div className="seller-performance-progress-track" aria-label={`Satış hedefinin yüzde ${hedef.toFixed(0)} kadarı tamamlandı`}>
            <div className="seller-performance-progress-fill" style={{ width: `${hedef}%` }} />
          </div>
          <small>50.000 TL hedefine ilerleme</small>
        </article>

        <article className="seller-performance-card">
          <span className="seller-performance-label">Sonraki Rozet</span>
          <strong>{sonrakiRozet}</strong>
          <small>Bir üst seviyeye ilerliyorsunuz</small>
        </article>

        <article className="seller-performance-card">
          <span className="seller-performance-label">Performans Puanı</span>
          <strong>{Math.min(100, tamamlanan * 10)}</strong>
          <small>100 üzerinden</small>
        </article>

        <article className="seller-performance-card">
          <span className="seller-performance-label">Tamamlanan Sipariş</span>
          <strong>{tamamlanan}</strong>
          <small>Başarıyla teslim edildi</small>
        </article>

        <article className="seller-performance-card">
          <span className="seller-performance-label">Toplam Ciro</span>
          <strong>₺{toplamKazanc.toLocaleString("tr-TR")}</strong>
          <small>Genel satış hacmi</small>
        </article>
      </div>
    </section>
  );
}

export default SellerPerformance;
