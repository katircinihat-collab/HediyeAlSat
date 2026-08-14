import "../../styles/pages/seller-dashboard.css";
function SellerDashboard({

bugunKazanc,

aylikKazanc,

toplamKazanc,

urunler,

bekleyen,

hazirlanan,

kargoda,

teslim

}){

return(

<>

<h2 className="section-title">

📊 Genel Durum

</h2>

<div className="dashboard-grid">

<div className="dashboard-card green">
<span>💰 Bugünkü Kazanç</span>
<h2>₺{bugunKazanc.toLocaleString("tr-TR")}</h2>
</div>

<div className="dashboard-card blue">
<span>📅 Bu Ay</span>
<h2>₺{aylikKazanc.toLocaleString("tr-TR")}</h2>
</div>

<div className="dashboard-card purple">
<span>🏦 Toplam Kazanç</span>
<h2>₺{toplamKazanc.toLocaleString("tr-TR")}</h2>
</div>

<div className="dashboard-card orange">
<span>📦 Ürün Sayısı</span>
<h2>{urunler.length}</h2>
</div>

</div>

<h2 className="section-title">

📦 Sipariş Durumu

</h2>

<div className="dashboard-grid">

<div className="dashboard-card">

<span>⌛ Bekleyen</span>

<h2>{bekleyen}</h2>

</div>

<div className="dashboard-card">

<span>📦 Hazırlanıyor</span>

<h2>{hazirlanan}</h2>

</div>

<div className="dashboard-card">

<span>🚚 Kargoda</span>

<h2>{kargoda}</h2>

</div>

<div className="dashboard-card">

<span>✅ Teslim</span>

<h2>{teslim}</h2>

</div>

</div>

</>

);

}

export default SellerDashboard;