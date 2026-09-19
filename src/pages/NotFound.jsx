import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import SEO from "../components/SEO";

function NotFound() {
  return (
    <>
      <SEO title="Sayfa Bulunamadı | HediyeAlSat" description="Aradığınız sayfa bulunamadı." robots="noindex,follow" />
      <Navbar />
      <main className="page">
        <h1>404 — Sayfa bulunamadı</h1>
        <p>Aradığınız sayfa mevcut değil veya taşınmış olabilir.</p>
        <Link to="/">Ana sayfaya dön</Link>
      </main>
      <Footer />
    </>
  );
}

export default NotFound;
