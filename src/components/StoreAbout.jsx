import "../styles/components/store-about.css";

function StoreAbout({ magaza }) {
  const magazaAdi = magaza.magazaAdi || magaza.adi || "Mağaza";
  const email = magaza.email || magaza.sahip || "";

  return (
    <section className="store-about">
      <h2>Mağaza Hakkında</h2>
      <div className="about-card">
        <div className="about-details">
          <div className="about-item"><span className="about-label">Mağaza adı</span><span className="about-value">{magazaAdi}</span></div>
          {magaza.sehir && <div className="about-item"><span className="about-label">Konum</span><span className="about-value">📍 {magaza.sehir}</span></div>}
          {magaza.telefon && <div className="about-item"><span className="about-label">Telefon</span><span className="about-value">{magaza.telefon}</span></div>}
          {email && <div className="about-item"><span className="about-label">E-posta</span><span className="about-value">{email}</span></div>}
        </div>
        <div className="about-description">
          <h3>Açıklama</h3>
          <p>{magaza.aciklama || "Bu mağaza henüz açıklama eklememiş."}</p>
        </div>
      </div>
    </section>
  );
}

export default StoreAbout;
