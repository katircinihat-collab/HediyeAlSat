function CartSummary({

toplam,

genelToplam,

kupon,

setKupon,

kuponUygula,

navigate

}){

return(

<div className="summary-box">

<div className="summary-header">

<h2>

📋 Sipariş Özeti

</h2>

<p>

Siparişinizi kontrol edin

</p>

</div>

<div className="summary-line">

<span>

🛒 Ürün Toplamı

</span>

<b>

₺{toplam.toLocaleString("tr-TR")}

</b>

</div>

<div className="summary-line">

<span>

🚚 Kargo

</span>

<b>

{

"Satıcı Karşılıyor"

}

</b>

</div>

<div className="summary-line">

<span>

🧾 KDV

</span>

<b>

Dahil

</b>

</div>

<hr/>

<div className="summary-total">
<span>

💳 Ödenecek

</span>

<b>

₺{genelToplam.toLocaleString("tr-TR")}

</b>

</div>

<div className="coupon-box">

<input

type="text"

placeholder="🎁 İndirim Kodu"

value={kupon}

onChange={(e)=>setKupon(e.target.value)}

/>

<button

onClick={kuponUygula}

>

Uygula

</button>

</div>

<div className="summary-info">

<div>

🚚

 Kargoyu Satıcı Karşılıyor

</div>

<div>

📦 Tahmini Teslim

1-3 İş Günü

</div>

<div>

🔒 SSL Güvenli Ödeme

</div>

<div>

✔ Satıcı Koruması

</div>

</div>
<button

className="checkout-btn"

onClick={()=>navigate("/odeme")}

>

💳 Güvenli Ödemeye Geç

</button>

<div className="secure-payment">

<div className="secure-item">

🛡️ SSL 256 Bit Güvenlik

</div>

<div className="secure-item">

✔ Satıcı Koruması

</div>

</div>

<div className="checkout-payment-brands">

<img

src="/images/payment-logos.png"

alt="iyzico ile Öde, Mastercard, Visa, American Express ve Troy"

/>

</div>

<div className="iyzico-box">

<span aria-hidden="true">●</span>
iyzico Güvencesi ile Güvenli Ödeme

</div>
</div>

);

}

export default CartSummary;
