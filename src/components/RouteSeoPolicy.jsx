import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";

const PRIVATE_ROUTES = [
  "/login", "/uye-ol", "/ilan-ver", "/duzenle/", "/sponsor-basvuru",
  "/magaza-olustur", "/magazam", "/sepet", "/odeme", "/payment-",
  "/profil", "/ayarlar", "/favoriler", "/favorilerim", "/siparislerim",
  "/siparis/", "/ilanlarim", "/benim-ilanlarim", "/mesajlar", "/seller",
  "/satici-siparisleri", "/admin"
];

function RouteSeoPolicy() {
  const { pathname } = useLocation();
  const noindex = pathname.startsWith("/payment-") || PRIVATE_ROUTES.some((route) => (
    route.endsWith("/")
      ? pathname.startsWith(route)
      : pathname === route || pathname.startsWith(`${route}/`)
  ));

  if (!noindex) return null;

  return <Helmet><meta name="robots" content="noindex,follow" /></Helmet>;
}

export default RouteSeoPolicy;
