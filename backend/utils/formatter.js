/*
==================================================
FORMATTER
==================================================
*/

/*
==========================================
TL Formatı
==========================================
*/

function formatTL(tutar = 0) {

    return Number(tutar).toLocaleString("tr-TR", {

        minimumFractionDigits: 2,

        maximumFractionDigits: 2

    });

}

/*
==========================================
Tarih Formatı
==========================================
*/

function formatDate(tarih) {

    if (!tarih) return "-";

    try {

        if (tarih.seconds) {

            tarih = new Date(
                tarih.seconds * 1000
            );

        } else {

            tarih = new Date(tarih);

        }

        return tarih.toLocaleDateString("tr-TR", {

            year: "numeric",

            month: "2-digit",

            day: "2-digit",

            hour: "2-digit",

            minute: "2-digit"

        });

    } catch {

        return "-";

    }

}

/*
==========================================
Sipariş No
==========================================
*/

function siparisNoOlustur() {

    const now = Date.now();

    const random =
        Math.floor(
            Math.random() * 10000
        );

    return `HAS-${now}-${random}`;

}

/*
==========================================
Para Yuvarlama
==========================================
*/

function roundPrice(tutar = 0) {

    return Number(
        Number(tutar).toFixed(2)
    );

}

module.exports = {

    formatTL,

    formatDate,

    siparisNoOlustur,

    roundPrice

};
