import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from "recharts";

function SellerChart({ siparisler }) {

  const aylar = [
    "Ocak","Şubat","Mart","Nisan","Mayıs","Haziran",
    "Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"
  ];

  const veri = aylar.map(ay => ({
    ay,
    satis: 0
  }));

  siparisler.forEach(s => {

    if (!s.tarih) return;

    const tarih = s.tarih.toDate
      ? s.tarih.toDate()
      : new Date(s.tarih);

    veri[tarih.getMonth()].satis += Number(s.toplam || 0);

  });

  return (

    <>

      <hr />

      <h2>📈 Aylık Satış Grafiği</h2>

      <div
        style={{
          width: "100%",
          height: 350,
          background: "#fff",
          borderRadius: 18,
          padding: 20,
          boxShadow: "0 8px 20px rgba(0,0,0,.08)"
        }}
      >

        <ResponsiveContainer>

          <BarChart data={veri}>

            <CartesianGrid strokeDasharray="3 3"/>

            <XAxis dataKey="ay"/>

            <YAxis/>

            <Tooltip/>

            <Bar
              dataKey="satis"
              radius={[8,8,0,0]}
            />

          </BarChart>

        </ResponsiveContainer>

      </div>

    </>

  );

}

export default SellerChart;