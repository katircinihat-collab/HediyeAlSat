function OrderSummary({

siparis,

odemeyiTamamla

}){

return(

<div className="summary-box">

<h2>

📋 Sipariş Özeti

</h2>

<div className="summary-row">

<span>

Ürünler

</span>

<b>

₺{

Number(

siparis.urunToplam

).toLocaleString("tr-TR")

}

</b>

</div>

<div className="summary-row">

<span>

Kargo

</span>

<b>

{

siparis.kargo===0

?

"Ücretsiz"

:

"₺"+

Number(

siparis.kargo

).toLocaleString("tr-TR")

}

</b>

</div>

<div className="summary-row">

<span>

İndirim

</span>

<b style={{color:"#16a34a"}}>

₺{

Number(

siparis.indirim

).toLocaleString("tr-TR")

}

</b>

</div>

<hr/>

<div className="summary-row total">

<span>

Toplam

</span>

<b>

₺{

Number(

siparis.genelToplam

).toLocaleString("tr-TR")

}

</b>

</div>

<div className="payment-security">

<p>

🔒 SSL Güvenlik Sertifikası

</p>

<p>

💳 iyzico Güvenli Ödeme

</p>

<p>

🛡️ 3D Secure Destekli

</p>

<p>

↩️ 14 Gün Kolay İade

</p>

</div>

<div className="agreement-box">

<label>

<input type="checkbox"/>

Ön Bilgilendirme Formunu okudum.

</label>

<label>

<input type="checkbox"/>

Mesafeli Satış Sözleşmesini kabul ediyorum.

</label>

</div>

<button

className="checkout-btn"

onClick={odemeyiTamamla}

>

💳 Ödemeyi Tamamla

</button>

</div>

);

}

export default OrderSummary;