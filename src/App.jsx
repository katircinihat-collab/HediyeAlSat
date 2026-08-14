import AdminWithdraw from "./pages/AdminWithdraw";
import MyOrders from "./pages/MyOrders";
import Seller from "./pages/Seller";
import Cart from "./pages/Cart";
import SellerOrders from "./pages/SellerOrders";

import PaymentSuccess from "./pages/PaymentSuccess";
import Store from "./pages/Store";
import MyStore from "./pages/MyStore";
import PaymentFail from "./pages/PaymentFail";
import Profile from "./pages/Profile";
import MyListings from "./pages/MyListings";
import Favorites from "./pages/Favorites";
import Settings from "./pages/Settings";
import Kiralik from "./pages/Kiralik";
import Admin from "./pages/Admin";
import AdminDetail from "./pages/AdminDetail";
import Login from "./pages/Login";

import Listings from "./pages/Listings";

import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./styles/pages/messages.css";
import Messages from "./pages/Messages";
import Home from "./pages/Home";
import AddListingPage from "./pages/AddListingPage";
import DetailPage from "./pages/DetailPage";
import EditListing from "./pages/EditListing";
import Stores from "./pages/Stores";
import CreateStore from "./pages/CreateStore";
import StoreDetail from "./pages/StoreDetail";
import Checkout from "./pages/Checkout";


/* ==============================
   BASE
============================== */

import "./styles/base/reset.css";
import "./styles/base/variables.css";
import "./styles/base/typography.css";
import "./styles/base/animations.css";


/* ==============================
   LAYOUT
============================== */

import "./styles/layout/navbar.css";
import "./styles/layout/hero.css";
import "./styles/layout/footer.css";


/* ==============================
   COMPONENTS
============================== */

import "./styles/components/product-card.css";
import "./styles/components/category-bar.css";
import "./styles/components/filter-bar.css";
import "./styles/components/gift-assistant.css";
import "./styles/components/stats.css";
import "./styles/components/featured-stores.css";
import "./styles/components/special-days.css";
import "./styles/components/trending.css";
import "./styles/components/buttons.css";
import "./styles/components/forms.css";
import "./styles/components/product-grid.css";


/* ==============================
   PAGES
============================== */

import "./styles/pages/home.css";
import "./styles/pages/product.css";
import "./styles/pages/cart.css";
import "./styles/pages/checkout.css";
import "./styles/pages/admin.css";
import "./styles/pages/profile.css";
import "./styles/pages/login.css";


function App() {

  return (

    <BrowserRouter>

      <Routes>


        {/* =========================
            ANA SAYFA
        ========================= */}

        <Route
          path="/"
          element={<Home />}
        />


        {/* =========================
            TÜM İLANLAR
        ========================= */}

        <Route
          path="/ilanlar"
          element={<Listings />}
        />


        {/* =========================
            İLAN VER
        ========================= */}

        <Route
          path="/ilan-ver"
          element={<AddListingPage />}
        />


        {/* =========================
            İLAN DETAY
        ========================= */}

        <Route
          path="/ilan/:id"
          element={<DetailPage />}
        />


        {/* =========================
            İLAN DÜZENLE
        ========================= */}

        <Route
          path="/duzenle/:id"
          element={<EditListing />}
        />


        {/* =========================
            KİRALIK İLANLAR
        ========================= */}

        <Route
          path="/ilanlar/kiralik"
          element={<Kiralik />}
        />


        {/* =========================
            MAĞAZALAR
        ========================= */}

        <Route
          path="/magazalar"
          element={<Stores />}
        />

        <Route
          path="/magaza/:id"
          element={<StoreDetail />}
        />

        <Route
          path="/magaza-olustur"
          element={<CreateStore />}
        />

        <Route
          path="/magazam"
          element={<MyStore />}
        />


        {/* =========================
            SEPET
        ========================= */}

        <Route
          path="/sepet"
          element={<Cart />}
        />


        {/* =========================
            ÖDEME
        ========================= */}

        <Route
          path="/odeme"
          element={<Checkout />}
        />

        <Route
          path="/odeme/basarili"
          element={<PaymentSuccess />}
        />

        <Route
          path="/odeme/hata"
          element={<PaymentFail />}
        />

        <Route
          path="/payment-success"
          element={<PaymentSuccess />}
        />

        <Route
          path="/payment-fail"
          element={<PaymentFail />}
        />


        {/* =========================
            KULLANICI
        ========================= */}

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/profil"
          element={<Profile />}
        />

        <Route
          path="/ayarlar"
          element={<Settings />}
        />

        <Route
          path="/favoriler"
          element={<Favorites />}
        />

        <Route
          path="/siparislerim"
          element={<MyOrders />}
        />

        <Route
          path="/ilanlarim"
          element={<MyListings />}
        />

        <Route
          path="/benim-ilanlarim"
          element={<MyListings />}
        />

        <Route
          path="/mesajlar"
          element={<Messages />}
        />


        {/* =========================
            SATICI
        ========================= */}

        <Route
          path="/seller"
          element={<Seller />}
        />

        <Route
          path="/satici-siparisleri"
          element={<SellerOrders />}
        />


        {/* =========================
            ADMİN
        ========================= */}

        <Route
          path="/admin"
          element={<Admin />}
        />

        <Route
          path="/admin/:id"
          element={<AdminDetail />}
        />

        <Route
          path="/admin/withdraw"
          element={<AdminWithdraw />}
        />

      </Routes>

    </BrowserRouter>

  );

}

export default App;