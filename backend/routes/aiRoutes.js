const express = require("express");

const {
  hediyeOnerisi
} = require("../services/aiService");

const router = express.Router();


router.post("/hediye-oner", async (req, res) => {

  try {

    const {
      kisi,
      butce,
      mesaj,
      urunler
    } = req.body;


    if (!kisi || !butce) {

      return res.status(400).json({

        success: false,

        message:
          "Kişi ve bütçe bilgisi gereklidir."

      });

    }


    if (!Array.isArray(urunler)) {

      return res.status(400).json({

        success: false,

        message:
          "Ürün listesi geçerli değil."

      });

    }


    const sonuc =
      await hediyeOnerisi({

        kisi,
        butce,
        mesaj,
        urunler

      });


    return res.json({

      success: true,

      ...sonuc

    });


  } catch (error) {

    console.error(
      "AI hediye önerisi hatası:",
      error
    );


    return res.status(500).json({

      success: false,

      message:
        "Yapay zekâ önerisi oluşturulamadı."

    });

  }

});


module.exports = router;