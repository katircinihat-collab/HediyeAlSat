import "../../styles/pages/seller-performance.css";

function SellerPerformance({

urunler,

siparisler,

toplamKazanc

}){

const tamamlanan=siparisler.filter(

s=>s.durum==="Teslim"

).length;

const silver=toplamKazanc>=50000;

const gold=toplamKazanc>=250000;

const enCokSatan=

siparisler.length

?

siparisler

.sort(

(a,b)=>

Number(b.toplam||0)-

Number(a.toplam||0)

)[0]

:

null;

const hedef=

Math.min(

100,

(

toplamKazanc/

50000

)

*100

);

return(

<>

<h2 className="section-title">

🏆 Satıcı Performansı

</h2>

<div className="performance-grid">
<div className="performance-card">

<h3>🥉 Satıcı Rozeti</h3>

<h1>

{

gold

?

"🥇 Gold"

:

silver

?

"🥈 Silver"

:

"🥉 Bronze"

}

</h1>

<p>

Aktif Satıcı Seviyesi

</p>

</div>

<div className="performance-card">

<h3>🔥 En Çok Satan Ürün</h3>

<h2>

{

enCokSatan

?

enCokSatan.ilanBaslik

:

"Henüz Yok"

}

</h2>

<p>

{

enCokSatan

?

"₺"+

Number(

enCokSatan.toplam||0

).toLocaleString("tr-TR")

:

""

}

</p>

</div>

<div className="performance-card">

<h3>📦 Toplam Ürün</h3>

<h1>

{urunler.length}

</h1>

<p>

Yayındaki Ürün

</p>

</div>

<div className="performance-card">

<h3>🛒 Toplam Sipariş</h3>

<h1>

{siparisler.length}

</h1>

<p>

Alınan Sipariş

</p>

</div>
<div className="performance-progress">

<h3>

🎯 Satış Hedefi

</h3>

<div className="progress-bar">

<div

className="progress-fill"

style={{

width:`${hedef}%`

}}

>

{hedef.toFixed(0)}%

</div>

</div>

<p>

50.000 TL hedefi

</p>

</div>

<div className="performance-grid second-row">

<div className="performance-card">

<h3>

🚀 Sonraki Rozet

</h3>

<h2>

{

gold

?

"💎 Platinum"

:

silver

?

"🥇 Gold"

:

"🥈 Silver"

}

</h2>

<p>

Bir üst seviyeye ilerliyorsunuz.

</p>

</div>

<div className="performance-card">

<h3>

⭐ Performans Puanı

</h3>

<h1>

{

Math.min(

100,

tamamlanan*10

)

}

</h1>

<p>

100 üzerinden

</p>

</div>

<div className="performance-card">

<h3>

✅ Tamamlanan Sipariş

</h3>

<h1>

{tamamlanan}

</h1>

<p>

Başarıyla teslim edildi

</p>

</div>

<div className="performance-card">

<h3>

💰 Toplam Ciro

</h3>

<h1>

₺{

toplamKazanc.toLocaleString("tr-TR")

}

</h1>

<p>

Genel satış hacmi

</p>

</div>

</div>
</div>

</>

);

}

export default SellerPerformance;
