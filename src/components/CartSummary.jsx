function CartSummary({

toplam,

kargo,

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

kargo===0

?

"Ücretsiz"

:

"₺"+kargo.toLocaleString("tr-TR")

}

</b>

</div>

<div className="summary-line">

<span>

💸 Tasarruf

</span>

<b className="green">

{

kargo===0

?

"149 TL"

:

"0 TL"

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

{

kargo===0

?

" Ücretsiz Kargo"

:

" Kargo Ücreti 149 TL"

}

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

<div className="secure-item">

↩️ 14 Gün Kolay İade

</div>

<div className="secure-item">

📦 Hızlı Teslimat

</div>

</div>

<div className="payment-logos">

<img

src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg"

alt="Visa"

height="26"

/>

<img

src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg"

alt="Mastercard"

height="34"

/>

<img

src="https://upload.wikimedia.org/wikipedia/commons/3/39/PayPal_logo.svg"

alt="Paypal"

height="22"

/>

</div>

<div className="iyzico-box">

🟢 iyzico Güvencesi ile Güvenli Ödeme

</div>
</div>

);

}

export default CartSummary;