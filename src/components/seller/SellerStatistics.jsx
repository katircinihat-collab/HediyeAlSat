import "../../styles/pages/seller-statistics.css";

function SellerStatistics({

siparisler,

toplamKazanc

}){

const simdi=new Date();

const yediGun=new Date();

yediGun.setDate(

simdi.getDate()-7

);

const otuzGun=new Date();

otuzGun.setDate(

simdi.getDate()-30

);

const son7Gun=siparisler.filter(s=>{

if(!s.tarih?.toDate) return false;

return s.tarih.toDate()>=yediGun;

}).length;

const son30Gun=siparisler.filter(s=>{

if(!s.tarih?.toDate) return false;

return s.tarih.toDate()>=otuzGun;

}).length;

const tamamlanan=siparisler.filter(

s=>s.durum==="Teslim"

).length;

const iptal=siparisler.filter(

s=>s.durum==="İptal"

).length;

const iade=siparisler.filter(

s=>s.durum==="İade"

).length;

const ortalamaSiparis=

siparisler.length

?

toplamKazanc/

siparisler.length

:

0;

return(

<>

<h2 className="section-title">

📊 Satış İstatistikleri

</h2>

<div className="statistics-grid">
<div className="statistics-card blue">

<h3>

📅 Son 7 Gün

</h3>

<h1>

{son7Gun}

</h1>

<p>

Sipariş

</p>

</div>

<div className="statistics-card green">

<h3>

📅 Son 30 Gün

</h3>

<h1>

{son30Gun}

</h1>

<p>

Sipariş

</p>

</div>

<div className="statistics-card purple">

<h3>

💰 Ortalama Sipariş

</h3>

<h1>

₺{

ortalamaSiparis.toLocaleString("tr-TR",{

maximumFractionDigits:2

})

}

</h1>

<p>

Sipariş Başına

</p>

</div>
<div className="statistics-card success">

<h3>

✅ Tamamlanan

</h3>

<h1>

{tamamlanan}

</h1>

<p>

Teslim Edilen Sipariş

</p>

</div>

<div className="statistics-card danger">

<h3>

❌ İptal

</h3>

<h1>

{iptal}

</h1>

<p>

İptal Edilen Sipariş

</p>

</div>

<div className="statistics-card warning">

<h3>

↩️ İade

</h3>

<h1>

{iade}

</h1>

<p>

İade Edilen Sipariş

</p>

</div>

<div className="statistics-card dark">

<h3>

💵 Toplam Ciro

</h3>

<h1>

₺{

toplamKazanc.toLocaleString("tr-TR")

}

</h1>

<p>

Genel Satış Hacmi

</p>

</div>
</div>

</>

);

}

export default SellerStatistics;