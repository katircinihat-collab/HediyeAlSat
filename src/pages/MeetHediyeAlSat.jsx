import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useOnboarding } from '../context/onboardingContext';
import '../styles/pages/meet-hediyealsat.css';

const features = [
  ['🎁', 'Hediyeyi keşfet', 'Farklı satıcıların gerçek ürünlerini karşılaştır; bütçene ve hediye vereceğin kişiye uygun seçenekleri bul.', '/ilanlar', 'Hediyeleri keşfet'],
  ['⚔️', 'Kararsızsan kapıştır', 'İki ürün arasında kaldığında Hediye Kapışması oluştur. Topluluğun oyları karar vermene yardım etsin.', '/kapismalar', 'Kapışmaları gör'],
  ['🎲', 'Bir yabancıya güzel bir sürpriz', 'Hiç tanımadığın birine hediye gönder, hiç tanımadığın birinden hediye al. Kura gönüllü bir topluluk etkinliğidir; katılım koşullarını etkinlik sayfasında inceleyebilirsin.', '/kura', 'Kura’yı keşfet'],
  ['🎨', 'A4 tasarımlarla ilham bul', 'Dijital tasarımları keşfet, topluluk oylamalarını takip et. Kendi tasarımlarını da mevcut ilan akışıyla satışa sunabilirsin.', '/a4-tasarimlar', 'A4 tasarımları gör'],
  ['⭐', 'XP kazan, seviye atla', 'XP etkinliklere katılımını yansıtır. Toplam kazandığın XP seviyeni, kullanılabilir XP ise etkinliklerde kullanabileceğin miktarı belirler. XP para değildir; satın alınamaz veya nakde çevrilemez.', '/profil', 'XP ve seviyeni gör'],
  ['🎉', 'Özel günleri hatırla', 'Doğum gününden yıl dönümüne, sevdiklerin için düşünülmüş hediye seçeneklerini keşfet.', '/#ozel-gunler', 'Özel günleri keşfet'],
  ['💡', 'Bir fikirle başla', 'Hediye Fikirleri sayfasında yeni seçeneklere göz at; kararını gerçek ürünleri inceleyerek ver.', '/hediye-fikirleri', 'Hediye fikirlerini gör'],
  ['💬', 'HediyeCep’te topluluğa katıl', 'Ana sayfadaki HediyeCep mini uygulama merkezinden canlı sohbete ulaş. Mesaj yazmak için giriş yap; iletişim bilgilerini paylaşmadan sohbet et.', '/', 'HediyeCep’e ulaş']
];
export default function MeetHediyeAlSat() {
  const { startWelcomeTour } = useOnboarding();
  const canonical = 'https://hediyealsat.com/hediyealsati-tani';
  return <>
    <SEO title="HediyeAlSat’ı Tanı | Hediye Keşfi ve Topluluk" description="Hediyeleri keşfet, Hediye Kapışması ve Kura ile topluluğa katıl, A4 tasarımları incele veya kendi mağazanı aç. HediyeAlSat’ı tanı."
      canonical={canonical} jsonLd={[
        { '@context': 'https://schema.org', '@type': 'WebPage', name: 'HediyeAlSat’ı Tanı', url: canonical },
        { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Ana Sayfa', item: 'https://hediyealsat.com/' },
          { '@type': 'ListItem', position: 2, name: 'HediyeAlSat’ı Tanı', item: canonical }
        ] }
      ]} />
    <Navbar />
    <main className="meet-page">
      <nav aria-label="Sayfa yolu"><Link to="/">Ana Sayfa</Link> / HediyeAlSat’ı Tanı</nav>
      <section className="meet-hero">
        <span className="meet-eyebrow">KEŞFET · KATIL · PAYLAŞ</span>
        <h1>HediyeAlSat’ı Tanı</h1>
        <p className="meet-motto">Hediyeyi sadece arama, keşfet.</p>
        <p>Birine hediye seçmek, bir fikri paylaşmak ya da kendi ürününü sunmak… HediyeAlSat alışverişi, topluluğu ve küçük sürprizleri bir araya getirir.</p>
        <div className="meet-actions"><Link to="/ilanlar">🎁 Hediyeleri Keşfet</Link><Link to="/ilan-ver">🏪 Ürününü Sat</Link></div>
        <button type="button" className="meet-tour" onClick={() => startWelcomeTour(true)}>▶ HediyeAlSat’ı 1 Dakikada Tanı</button>
      </section>
      <section aria-labelledby="meet-features"><h2 id="meet-features">Burada sana da yer var.</h2><p>İster bir hediye ara, ister topluluğun bir parçası ol.</p>
        <div className="meet-grid">{features.map(([icon, title, body, to, label]) => <article key={to + title}>
          <span aria-hidden="true" className="meet-icon">{icon}</span><h3>{title}</h3><p>{body}</p><Link to={to}>{label} →</Link>
        </article>)}</div>
      </section>
      <section className="meet-seller"><span className="meet-eyebrow">ÜRETENLERE VE SATICILARA</span><h2>Senin de satacak bir ürünün mü var?</h2>
        <p>Mağazanı aç, ürünlerini listele ve HediyeAlSat’ta satışa sun. Ürünlerini tek bir mağazada sergileyebilir, siparişlerini satıcı panelinden takip edebilirsin.</p>
        <p><strong>HediyeAlSat platform komisyonu yalnızca %4.</strong> Ödeme sağlayıcısının ücretleri bu orana dahil değildir.</p>
        <div className="meet-actions"><Link to="/magaza-olustur">🏪 Mağazanı Aç</Link><Link to="/ilan-ver">📦 İlan Ver</Link></div>
      </section>
      <section className="meet-final"><h2>Bir sonraki güzel sürpriz burada başlayabilir.</h2><div className="meet-actions"><Link to="/ilanlar">🎁 Hediye Bulmaya Başla</Link><Link to="/ilan-ver">🏪 Ürününü Sat</Link></div></section>
    </main>
    <Footer />
  </>;
}
