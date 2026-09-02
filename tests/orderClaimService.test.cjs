const assert = require("node:assert/strict");
const test = require("node:test");
const { validateClaimRequest, releasedOrderUpdate, CLAIM_STATUSES, ADMIN_TRANSITIONS, createClaim, cancelClaim, updateClaimStatus } = require("../backend/services/orderClaimService");
const { getPayoutEligibility } = require("../backend/services/deliveryConfirmationService");

const delivered = { aliciUid: "buyer", alici: "buyer@example.com", saticiUid: "seller", satici: "seller@example.com", odemeDurumu: true, durum: "Teslim Edildi", teslimatDogrulandi: true, hakEdisBlokeBaslangic: new Date("2026-09-01T00:00:00Z"), hakEdisBlokeBitis: new Date("2026-09-03T00:00:00Z") };
const buyer = { uid: "buyer", email: "buyer@example.com" };
const validReturn = { type: "iade", reasonCode: "hasarli", description: "Ürün hasarlı geldi." };
function fakeFirestore(order = delivered) {
  const data = new Map([["siparisler/order-1", { ...order }]]); let sequence = 0;
  const ref = (path) => ({ path, id: path.split("/").at(-1) });
  const snapshot = (value) => ({ exists: value !== undefined, data: () => value });
  const firestore = {
    data,
    collection(name) { return { doc(id) { return ref(`${name}/${id || `claim-${++sequence}`}`); } }; },
    async runTransaction(work) {
      const tx = {
        async get(target) { return snapshot(data.get(target.path)); },
        create(target, value) { if (data.has(target.path)) throw new Error("already exists"); data.set(target.path, { ...value }); },
        update(target, value) { data.set(target.path, { ...data.get(target.path), ...value }); },
        delete(target) { data.delete(target.path); }
      };
      return work(tx);
    }
  };
  return firestore;
}

test("buyer kendi teslim edilmiş siparişinde iade açabilir", () => assert.equal(validateClaimRequest(delivered, buyer, validReturn).tip, "iade"));
test("başka buyer talep açamaz", () => assert.throws(() => validateClaimRequest(delivered, { uid: "x", email: "x@x.com" }, validReturn), /oluşturamazsınız/));
test("seller buyer claim endpoint kullanamaz", () => assert.throws(() => validateClaimRequest(delivered, { uid: "seller", email: "seller@example.com" }, validReturn), /oluşturamazsınız/));
test("ödenmemiş sipariş claim açamaz", () => assert.throws(() => validateClaimRequest({ ...delivered, odemeDurumu: false }, buyer, validReturn), /Ödemesi/));
test("teslim edilmemiş siparişte iade açılamaz", () => assert.throws(() => validateClaimRequest({ ...delivered, durum: "Kargoda", teslimatDogrulandi: false }, buyer, validReturn), /İade talebi/));
test("kargodaki ödenmiş siparişte itiraz açılabilir", () => assert.equal(validateClaimRequest({ ...delivered, durum: "Kargoda", teslimatDogrulandi: false }, buyer, { type: "itiraz", reasonCode: "ulasamadi" }).tip, "itiraz"));
test("hazırlanan siparişte itiraz açılamaz", () => assert.throws(() => validateClaimRequest({ ...delivered, durum: "Hazırlanıyor" }, buyer, { type: "itiraz", reasonCode: "x" }), /aşamasında/));
test("dijital üründe otomatik iade akışı açılmaz", () => assert.throws(() => validateClaimRequest({ ...delivered, urunTipi: "dijital" }, buyer, validReturn), /fiziksel/));
test("geçersiz talep tipi reddedilir", () => assert.throws(() => validateClaimRequest(delivered, buyer, { ...validReturn, type: "refund" }), /tipi/));
test("neden zorunludur", () => assert.throws(() => validateClaimRequest(delivered, buyer, { ...validReturn, reasonCode: "" }), /zorunludur/));
test("neden uzunluğu sınırlıdır", () => assert.throws(() => validateClaimRequest(delivered, buyer, { ...validReturn, reasonCode: "x".repeat(81) }), /80/));
test("açıklama uzunluğu sınırlıdır", () => assert.throws(() => validateClaimRequest(delivered, buyer, { ...validReturn, description: "x".repeat(2001) }), /2000/));
test("iptal siparişte claim açılamaz", () => assert.throws(() => validateClaimRequest({ ...delivered, durum: "İptal" }, buyer, validReturn), /oluşturulamaz/));
test("aktif claim 49 saatte eligibility false", () => { const result = getPayoutEligibility({ ...delivered, hakEdisBlokeli: true }, new Date("2026-09-04T00:00:00Z")); assert.equal(result.eligible, false); assert.equal(result.reason, "ACTIVE_CLAIM"); });
test("aktif claim durumu İncelemede", () => assert.equal(getPayoutEligibility({ ...delivered, hakEdisBlokeli: true }, new Date("2026-09-04T00:00:00Z")).status, "İncelemede"));
test("claim yok ve 48 saat geçmişse eligible", () => assert.equal(getPayoutEligibility(delivered, new Date("2026-09-03T00:00:00Z")).eligible, true));
test("reddedilen claim sonrası dolmuş süre yeniden başlamaz", () => { const update = releasedOrderUpdate({ ...delivered, hakEdisBlokeli: true }, new Date("2026-09-04T00:00:00Z")); assert.equal(update.hakEdisDurumu, "Ödemeye Hazır"); assert.equal(update.hakEdisBlokeBaslangic, undefined); assert.equal(update.hakEdisBlokeBitis, undefined); });
test("reddedilen claim sonrası dolmamış süre bekler", () => assert.equal(releasedOrderUpdate({ ...delivered, hakEdisBlokeli: true }, new Date("2026-09-02T00:00:00Z")).hakEdisDurumu, "Beklemede"));
test("iptal edilen claim sonrası normal süre hesabı döner", () => assert.equal(getPayoutEligibility({ ...delivered, hakEdisBlokeli: false }, new Date("2026-09-04T00:00:00Z")).eligible, true));
test("acik -> inceleniyor izinlidir", () => assert.equal(ADMIN_TRANSITIONS.acik.has("inceleniyor"), true));
test("acik -> reddedildi izinlidir", () => assert.equal(ADMIN_TRANSITIONS.acik.has("reddedildi"), true));
test("inceleniyor -> kabul edildi izinlidir", () => assert.equal(ADMIN_TRANSITIONS.inceleniyor.has("kabul_edildi"), true));
test("inceleniyor -> reddedildi izinlidir", () => assert.equal(ADMIN_TRANSITIONS.inceleniyor.has("reddedildi"), true));
test("kabul edilmiş claim geriye alınamaz", () => assert.equal(ADMIN_TRANSITIONS.kabul_edildi, undefined));
test("canonical claim durumları sabittir", () => assert.deepEqual(Object.values(CLAIM_STATUSES), ["acik", "inceleniyor", "kabul_edildi", "reddedildi", "iptal_edildi"]));
test("legacy iadeTalebi tek başına yeni güvenilir blok sayılmaz", () => assert.equal(getPayoutEligibility({ ...delivered, iadeTalebi: true }, new Date("2026-09-04T00:00:00Z")).eligible, true));
test("claim açılınca order blokelenir ve timestamp korunur", async () => { const db = fakeFirestore(); const result = await createClaim({ firestore: db, orderId: "order-1", user: buyer, body: validReturn }); const order = db.data.get("siparisler/order-1"); assert.equal(order.hakEdisBlokeli, true); assert.equal(order.aktifTalepId, result.claimId); assert.deepEqual(order.hakEdisBlokeBitis, delivered.hakEdisBlokeBitis); });
test("duplicate claim request ikinci claim oluşturmaz", async () => { const db = fakeFirestore(); const first = await createClaim({ firestore: db, orderId: "order-1", user: buyer, body: validReturn }); const second = await createClaim({ firestore: db, orderId: "order-1", user: buyer, body: validReturn }); assert.equal(second.idempotent, true); assert.equal(second.claimId, first.claimId); assert.equal([...db.data.keys()].filter((key) => key.startsWith("orderClaims/")).length, 1); });
test("buyer açık claim'i iptal edince bloke kalkar ve 48 saat korunur", async () => { const db = fakeFirestore(); const opened = await createClaim({ firestore: db, orderId: "order-1", user: buyer, body: validReturn }); await cancelClaim({ firestore: db, claimId: opened.claimId, user: buyer, now: () => new Date("2026-09-04T00:00:00Z") }); const order = db.data.get("siparisler/order-1"); assert.equal(order.hakEdisBlokeli, false); assert.deepEqual(order.hakEdisBlokeBitis, delivered.hakEdisBlokeBitis); assert.equal(order.hakEdisDurumu, "Ödemeye Hazır"); });
test("başka buyer claim iptal edemez", async () => { const db = fakeFirestore(); const opened = await createClaim({ firestore: db, orderId: "order-1", user: buyer, body: validReturn }); await assert.rejects(cancelClaim({ firestore: db, claimId: opened.claimId, user: { uid: "other" } }), /iptal edemezsiniz/); });
test("buyer yalnız açık claim'i iptal edebilir", async () => { const db = fakeFirestore(); const opened = await createClaim({ firestore: db, orderId: "order-1", user: buyer, body: validReturn }); db.data.get(`orderClaims/${opened.claimId}`).durum = "inceleniyor"; await assert.rejects(cancelClaim({ firestore: db, claimId: opened.claimId, user: buyer }), /Yalnız açık/); });
test("admin açık claim'i incelemeye alabilir", async () => { const db = fakeFirestore(); const opened = await createClaim({ firestore: db, orderId: "order-1", user: buyer, body: validReturn }); await updateClaimStatus({ firestore: db, claimId: opened.claimId, status: "inceleniyor", admin: { uid: "admin" } }); assert.equal(db.data.get(`orderClaims/${opened.claimId}`).durum, "inceleniyor"); });
test("admin kabulünde payout blokesi korunur ve wallet yazılmaz", async () => { const db = fakeFirestore(); const opened = await createClaim({ firestore: db, orderId: "order-1", user: buyer, body: validReturn }); db.data.get(`orderClaims/${opened.claimId}`).durum = "inceleniyor"; await updateClaimStatus({ firestore: db, claimId: opened.claimId, status: "kabul_edildi", admin: { uid: "admin" } }); assert.equal(db.data.get(`orderClaims/${opened.claimId}`).payoutBlock, true); assert.equal([...db.data.keys()].some((key) => key.startsWith("wallets/")), false); });
test("admin red sonrası order blokesini kaldırır", async () => { const db = fakeFirestore(); const opened = await createClaim({ firestore: db, orderId: "order-1", user: buyer, body: validReturn }); db.data.get(`orderClaims/${opened.claimId}`).durum = "inceleniyor"; await updateClaimStatus({ firestore: db, claimId: opened.claimId, status: "reddedildi", admin: { uid: "admin" }, now: () => new Date("2026-09-04T00:00:00Z") }); assert.equal(db.data.get("siparisler/order-1").hakEdisBlokeli, false); assert.equal(db.data.get(`orderClaims/${opened.claimId}`).payoutBlock, false); });
