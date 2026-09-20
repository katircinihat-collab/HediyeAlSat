import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import CartItem from "../components/CartItem";
import CartSummary from "../components/CartSummary";

import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  addDoc
} from "firebase/firestore";

import { useNavigate } from "react-router-dom";
import { createCommunityBattle } from "../services/giftBattleApi";

function Cart() {

  const navigate = useNavigate();

  const [kupon, setKupon] = useState("");
  const [urunler, setUrunler] = useState([]);
  const [sepetYukleniyor, setSepetYukleniyor] = useState(true);
  const [battleMode, setBattleMode] = useState(false);
  const [battleSelected, setBattleSelected] = useState([]);
  const [battleQuestion, setBattleQuestion] = useState("");
  const [battleBusy, setBattleBusy] = useState(false);
  const [battleError, setBattleError] = useState("");
  const [raffleGiftActive, setRaffleGiftActive] = useState(() => {
    try { return Boolean(window.sessionStorage.getItem("hediyealsat.raffleGiftEvent")); } catch { return false; }
  });

  useEffect(() => {

    const unsubscribe = auth.onAuthStateChanged(async (user) => {

      if (!user) {
        setUrunler([]);
        setSepetYukleniyor(false);
        return;
      }

      const q = query(
        collection(db, "sepet"),
        where("kullanici", "==", user.email)
      );

      const unsub = onSnapshot(q, async (snap) => {

        const liste = await Promise.all(snap.docs.map(async (sepetDoc) => {
          const sepetVerisi = sepetDoc.data();
          let ilan = null;
          let ilanMevcut = false;

          if (sepetVerisi.ilanId) {
            try {
              const ilanSnap = await getDoc(doc(db, "ilanlar", sepetVerisi.ilanId));
              ilanMevcut = ilanSnap.exists();
              ilan = ilanMevcut ? ilanSnap.data() : null;
            } catch (error) {
              console.error("Sepet ürünü ilan bilgisi alınamadı:", sepetVerisi.ilanId, error);
            }
          }

          const dijital =
            ilan?.urunTipi === "dijital" ||
            ilan?.fizikselKargo === false ||
            ilan?.dijitalTeslimat === true;
          const stok = dijital ? null : Number(ilan?.stok ?? ilan?.adet);
          const mevcutAdet = Math.max(1, Number.parseInt(sepetVerisi.adet, 10) || 1);
          const guvenliAdet = Number.isInteger(stok) && stok > 0
            ? Math.min(mevcutAdet, stok)
            : mevcutAdet;

          if (guvenliAdet !== mevcutAdet) {
            await updateDoc(doc(db, "sepet", sepetDoc.id), { adet: guvenliAdet });
          }

          return {
            id: sepetDoc.id,
            ...sepetVerisi,
            ilanId: sepetVerisi.ilanId,
            adet: guvenliAdet,
            baslik: ilan?.baslik || sepetVerisi.baslik || "Ürün",
            fiyat: ilan?.fiyat ?? sepetVerisi.fiyat,
            resim: ilan?.resim || sepetVerisi.resim,
            saticiUid: ilan?.sahipUid || sepetVerisi.saticiUid || "",
            satici: ilan?.sahip || sepetVerisi.satici || "",
            magazaAdi: ilan?.magazaAdi || sepetVerisi.magazaAdi || "",
            urunTipi: ilan?.urunTipi || sepetVerisi.urunTipi || "",
            fizikselKargo: typeof ilan?.fizikselKargo === "boolean"
              ? ilan.fizikselKargo
              : sepetVerisi.fizikselKargo,
            dijitalTeslimat: typeof ilan?.dijitalTeslimat === "boolean"
              ? ilan.dijitalTeslimat
              : sepetVerisi.dijitalTeslimat,
            kategori: ilan?.kategori || sepetVerisi.kategori || "",
            stok,
            ilanMevcut
          };
        }));

        console.log("Sepette bulunan:", liste);

        setUrunler(liste);
        setSepetYukleniyor(false);

      }, (error) => {
        console.error("Sepet dinlenemedi:", error);
        setSepetYukleniyor(false);
      });

      return () => unsub();

    });

    return () => unsubscribe();

  }, []);
  async function adetArttir(urun) {

    const adet = Number(urun.adet) || 1;
    const dijital =
      urun.urunTipi === "dijital" ||
      urun.fizikselKargo === false ||
      urun.dijitalTeslimat === true ||
      urun.kategori === "A4 Tasarım";

    if (!dijital && Number.isInteger(urun.stok) && adet >= urun.stok) {
      alert("Bu ürün için mevcut stok sınırına ulaştınız.");
      return;
    }

    await updateDoc(
      doc(db, "sepet", urun.id),
      {
        adet: adet + 1
      }
    );

  }

  async function adetAzalt(urun) {

    const adet = Number(urun.adet) || 1;

    if (adet <= 1) {

      if (!window.confirm("Bu ürünü sepetten kaldırmak istiyor musunuz?")) {
        return;
      }

      await deleteDoc(
        doc(db, "sepet", urun.id)
      );

      return;

    }

    await updateDoc(
      doc(db, "sepet", urun.id),
      {
        adet: adet - 1
      }
    );

  }

  async function sil(id) {

    if (!window.confirm("Ürün sepetten silinsin mi?"))
      return;

    await deleteDoc(
      doc(db, "sepet", id)
    );

  }

  async function favorilereTasi(urun) {

    await addDoc(
      collection(db, "favoriler"),
      {
        kullanici: auth.currentUser.email,
        ilanId: urun.ilanId,
        baslik: urun.baslik,
        fiyat: urun.fiyat,
        resim: urun.resim,
        tarih: new Date()
      }
    );

    await deleteDoc(
      doc(db, "sepet", urun.id)
    );

    alert("❤️ Favorilere taşındı");

  }

  function kuponUygula() {

    if (kupon === "HEDIYE10") {

      alert("%10 indirim uygulanacak.");

    } else {

      alert("Geçersiz kupon.");

    }

  }

  const toplam = urunler.reduce(
    (t, u) => t + (Number(u.fiyat || 0) * Number(u.adet || 1)),
    0
  );

  // Kargo maliyeti alıcıya yansıtılmaz; fiziksel gönderimi satıcı karşılar.
  const kargo = 0;

  const genelToplam = toplam + kargo;
  function toggleBattleProduct(urun) {
    setBattleError("");
    setBattleSelected((current) => current.includes(urun.ilanId) ? current.filter((id) => id !== urun.ilanId) : current.length >= 2 ? current : [...current, urun.ilanId]);
  }
  async function startBattle() {
    if (battleSelected.length !== 2 || battleBusy) return setBattleError("Kapışma oluşturmak için iki farklı ürün seçmelisin.");
    setBattleBusy(true); setBattleError("");
    try { const data = await createCommunityBattle(battleSelected, battleQuestion); navigate(`/kapisma/${data.battle.id}`); }
    catch (error) { setBattleError(error.message); }
    finally { setBattleBusy(false); }
  }
  return (

    <div className="page">

      <h1>🛒 Sepetim ({urunler.length})</h1>

      <section className="cart-battle-builder" aria-labelledby="cart-battle-title">
        <div><h2 id="cart-battle-title">⚔️ Hediyende Kararsız mısın?</h2><p>Sepetindeki iki ürünü seç. HediyeAlSat topluluğu hangisinin daha iyi hediye olduğunu oylasın.</p></div>
        {urunler.length < 2 ? <><p>Kapışma oluşturmak için sepetine en az 2 farklı ürün eklemelisin.</p><button type="button" onClick={() => navigate("/ilanlar")}>🎁 Hediye Keşfet</button></> : <>
          <button type="button" onClick={() => { setBattleMode((value) => !value); setBattleSelected([]); }}>{battleMode ? "Kapışma Modunu Kapat" : "İki Ürün Seç"}</button>
          {battleMode && <div className="cart-battle-form"><b>{battleSelected.length} / 2 ürün seçildi</b><label>Topluluğa sor (opsiyonel)<textarea maxLength="150" value={battleQuestion} onChange={(event) => setBattleQuestion(event.target.value)} placeholder="Eşime doğum günü için hangisini almalıyım?" /></label><small>{battleQuestion.length} / 150</small><button type="button" disabled={battleSelected.length !== 2 || battleBusy} onClick={startBattle}>{battleBusy ? "Başlatılıyor..." : "⚔️ KAPIŞMAYI BAŞLAT"}</button><span>Ücretsiz · XP harcanmaz</span>{battleError && <p role="alert">{battleError}</p>}</div>}
        </>}
      </section>

      {raffleGiftActive && <div className="order-claim-message" role="status"><strong>🎁 Kura hediyesi alışverişi</strong><p>Sepetindeki fiziksel ürünler sana çıkan kişi için gönderilecek. Açık teslimat adresi sana gösterilmez.</p><button type="button" onClick={() => { try { window.sessionStorage.removeItem("hediyealsat.raffleGiftEvent"); } catch { /* no-op */ } setRaffleGiftActive(false); }}>Normal alışverişe dön</button></div>}

      {
        sepetYukleniyor ? (

          <h2>Sepetiniz yükleniyor...</h2>

        ) : urunler.length === 0 ? (

          <h2>Sepetiniz boş.</h2>

        ) : (

          <div className="cart-layout">

            <div className="cart-left">

              {
                urunler.map((urun) => (

                  <CartItem
                    key={urun.id}
                    urun={urun}
                    adetArttir={adetArttir}
                    adetAzalt={adetAzalt}
                    sil={sil}
                    favorilereTasi={favorilereTasi}
                    battleMode={battleMode}
                    battleSelected={battleSelected.includes(urun.ilanId)}
                    onBattleSelect={toggleBattleProduct}
                  />

                ))
              }

            </div>

            <div className="cart-right">

              <CartSummary
                toplam={toplam}
                genelToplam={genelToplam}
                kupon={kupon}
                setKupon={setKupon}
                kuponUygula={kuponUygula}
                navigate={navigate}
              />

            </div>

          </div>

        )
      }

    </div>

  );

}

export default Cart;
