import "../../styles/pages/seller-finance.css";

function SellerFinance({

siparisler,

toplamKazanc,

toplamGoruntulenme

}){

const bekleyenOdeme=siparisler

.filter(

s=>s.odemeDurumu===false

)

.reduce(

(t,s)=>

t+Number(s.toplam||0),

0

);

const odenen=siparisler

.filter(

s=>s.odemeDurumu===true

)

.reduce(

(t,s)=>

t+Number(s.toplam||0),

0

);

const komisyon=siparisler.reduce(

(t,s)=>

t+

(

Number(s.toplam||0)

*0.08

),

0

);

const netKazanc=

toplamKazanc-

komisyon;

const donusum=

toplamGoruntulenme

?

(

siparisler.length/

toplamGoruntulenme

*

100

).toFixed(1)

:

0;

return(

<>

<h2 className="section-title">

💸 Finans Merkezi

</h2>

<div className="finance-grid">
<div className="finance-card green">

<h3>💰 Bekleyen Ödeme</h3>

<h1>

₺{

bekleyenOdeme.toLocaleString("tr-TR")

}

</h1>

<p>

Henüz aktarılmadı

</p>

</div>

<div className="finance-card blue">

<h3>🏦 Ödenen</h3>

<h1>

₺{

odenen.toLocaleString("tr-TR")

}

</h1>

<p>

Satıcı hesabına aktarıldı

</p>

</div>

<div className="finance-card red">

<h3>💸 Komisyon</h3>

<h1>

₺{

komisyon.toLocaleString("tr-TR")

}

</h1>

<p>

Platform Komisyonu (%8)

</p>

</div>

<div className="finance-card purple">

<h3>💎 Net Kazanç</h3>

<h1>

₺{

netKazanc.toLocaleString("tr-TR")

}

</h1>

<p>

Komisyon sonrası

</p>

</div>
<div className="finance-card orange">

<h3>📦 Satılan Ürün</h3>

<h1>

{siparisler.length}

</h1>

<p>

Toplam Sipariş

</p>

</div>

<div className="finance-card cyan">

<h3>📈 Dönüşüm</h3>

<h1>

{donusum}%

</h1>

<p>

Satış / Görüntülenme

</p>

</div>

<div className="finance-card yellow">

<h3>👁 Görüntülenme</h3>

<h1>

{toplamGoruntulenme}

</h1>

<p>

Toplam Ürün Görüntülenmesi

</p>

</div>

<div className="finance-card dark">

<h3>📊 Ortalama Sipariş</h3>

<h1>

₺{

siparisler.length

?

(

toplamKazanc/

siparisler.length

).toLocaleString("tr-TR")

:

0

}

</h1>

<p>

Sipariş Başına Ortalama

</p>

</div>

</div>
<hr/>

<div className="finance-summary">

<table className="finance-table">

<thead>

<tr>

<th>Kalem</th>

<th>Tutar</th>

</tr>

</thead>

<tbody>

<tr>

<td>Toplam Satış</td>

<td>

₺{toplamKazanc.toLocaleString("tr-TR")}

</td>

</tr>

<tr>

<td>Platform Komisyonu</td>

<td>

₺{komisyon.toLocaleString("tr-TR")}

</td>

</tr>

<tr>

<td>Net Kazanç</td>

<td className="success">

₺{netKazanc.toLocaleString("tr-TR")}

</td>

</tr>

<tr>

<td>Bekleyen Ödeme</td>

<td>

₺{bekleyenOdeme.toLocaleString("tr-TR")}

</td>

</tr>

<tr>

<td>Ödenen</td>

<td>

₺{odenen.toLocaleString("tr-TR")}

</td>

</tr>

</tbody>

</table>

</div>

</>

);

}

export default SellerFinance;