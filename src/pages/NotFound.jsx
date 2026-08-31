import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

function NotFound() {
  return (
    <>
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
