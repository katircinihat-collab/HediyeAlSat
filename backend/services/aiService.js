const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});


async function hediyeOnerisi({
  kisi,
  butce,
  mesaj,
  urunler
}) {

  const urunListesi = urunler
    .map((urun) => {

      return `
ID: ${urun.id}
Başlık: ${urun.baslik || ""}
Kategori: ${urun.kategori || ""}
Fiyat: ${urun.fiyat || ""}
Açıklama: ${urun.aciklama || ""}
Şehir: ${urun.sehir || ""}
`;

    })
    .join("\n");


  const prompt = `
Sen HediyeAlSat isimli Türkçe bir hediye pazaryerinin
yapay zekâ hediye asistanısın.

Görevin kullanıcının verdiği bilgilere göre
HediyeAlSat üzerindeki gerçek ürünler arasından
en uygun hediyeleri önermektir.

Kullanıcı:

Kime:
${kisi}

Bütçe:
${butce}

Ek bilgi:
${mesaj || "Ek bilgi verilmedi."}


HediyeAlSat ürünleri:

${urunListesi}


Kurallar:

1. Sadece verilen ürünler arasından öneri yap.
2. Ürün uydurma.
3. Fiyat uydurma.
4. En fazla 5 ürün öner.
5. Kullanıcının bütçesine mümkün olduğunca uy.
6. Önerileri neden seçtiğini kısa şekilde açıkla.
7. Türkçe cevap ver.
8. Ürün ID'sini mutlaka belirt.
9. Kullanıcıya samimi ve yardımcı bir şekilde cevap ver.

Cevabı şu formatta oluştur:

{
  "mesaj": "Kullanıcıya kısa açıklama",
  "oneriler": [
    {
      "urunId": "ürün ID",
      "neden": "Bu ürünü neden önerdiğin"
    }
  ]
}

Sadece geçerli JSON döndür.
`;


  const response = await client.responses.create({

  model: "gpt-5-mini",

  input: prompt

});


  const text =
    response.output_text;


  try {

    return JSON.parse(text);

  } catch (cause) {

    console.error(
      "AI JSON parse hatası:",
      text
    );

    throw new Error(
      "Yapay zekâ geçerli JSON döndürmedi.",
      { cause }
    );

  }

}


module.exports = {
  hediyeOnerisi
};
