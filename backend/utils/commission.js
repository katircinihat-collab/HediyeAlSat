/*
========================================
KOMİSYON HESAPLAMA
========================================

Komisyon sadece ÜRÜN FİYATI üzerinden hesaplanır.

Kargo ücreti komisyona dahil DEĞİLDİR.

Örnek:

Ürün fiyatı: 50 TL
Kargo:       79.90 TL

Komisyon:
50 x %8 = 4 TL

Satıcının kazancı:
50 - 4 = 46 TL
*/

const KOMISYON_ORANI = 0.08;


/*
========================================
KOMİSYON HESAPLA
========================================
*/

function hesaplaKomisyon(urunFiyati = 0) {

    const fiyat = Number(urunFiyati) || 0;

    return Number(
        (fiyat * KOMISYON_ORANI).toFixed(2)
    );

}


/*
========================================
SATICININ NET KAZANCI
========================================
*/

function hesaplaNetTutar(urunFiyati = 0) {

    const fiyat = Number(urunFiyati) || 0;

    const komisyon =
        hesaplaKomisyon(fiyat);

    return Number(
        (fiyat - komisyon).toFixed(2)
    );

}


/*
========================================
TÜM HESAP
========================================
*/

function hesapla(urunFiyati = 0) {

    const fiyat =
        Number(urunFiyati) || 0;

    const komisyon =
        hesaplaKomisyon(fiyat);

    const netTutar =
        hesaplaNetTutar(fiyat);

    return {

        toplamTutar: fiyat,

        komisyon: komisyon,

        netTutar: netTutar,

        komisyonOrani: KOMISYON_ORANI

    };

}


/*
========================================
EXPORT
========================================
*/

module.exports = {

    KOMISYON_ORANI,

    hesaplaKomisyon,

    hesaplaNetTutar,

    hesapla

};