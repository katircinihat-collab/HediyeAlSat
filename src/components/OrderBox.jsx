import "../styles/components/order-box.css";

function OrderBox({

  ilan,

  satinAl,

  sepeteEkle

}){

return(

<div className="order-card">

<h2>

🛍️ Sipariş İşlemleri

</h2>

<div className="order-price">

₺{Number(ilan.fiyat).toLocaleString("tr-TR")}

</div>

<div className="order-features">

<div className="feature">

✅ Güvenli Ödeme

</div>

<div className="feature">

🚚 Ücretsiz Kargo

</div>

<div className="feature">

📦 Aynı Gün Kargo

</div>

<div className="feature">

🔄 Kolay İade

</div>

<div className="feature">

🛡️ Alıcı Koruması

</div>

</div>

<button

className="cart-button"

onClick={sepeteEkle}

>

🛒 Sepete Ekle

</button>

<button

className="buy-button"

onClick={satinAl}

>

⚡ Hemen Satın Al

</button>

<p className="secure-info">

🔒 Ödemeniz HediyeAlSat Güvenli Ödeme Sistemi ile korunmaktadır.

</p>

</div>

);

}

export default OrderBox;