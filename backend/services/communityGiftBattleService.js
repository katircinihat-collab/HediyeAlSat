const crypto = require("crypto");
const { applyXpEventInTransaction, istanbulDateKey } = require("./xpService");

const STATUS = Object.freeze({ ACTIVE: "ACTIVE", ENDED: "ENDED", REMOVED: "REMOVED" });
const QUESTION_LIMIT = 150;
const ACTIVE_LIMIT = 3;
const LIFE_MS = 24 * 60 * 60 * 1000;
const PRIVATE_DATA_PATTERN = /(?:https?:\/\/|www\.|\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b|(?:\+?90\s*)?0?5\d{2}[\s.-]*\d{3}[\s.-]*\d{2}[\s.-]*\d{2}|(?:^|\s)@[a-z0-9_.]{2,})/i;

class GiftBattleError extends Error {
  constructor(message, status = 400, code = "GIFT_BATTLE_ERROR") {
    super(message); this.status = status; this.code = code;
  }
}

function toDate(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate();
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function validateQuestion(value) {
  const question = String(value || "").trim().replace(/\s+/g, " ");
  if (question.length > QUESTION_LIMIT) throw new GiftBattleError(`Soru en fazla ${QUESTION_LIMIT} karakter olabilir.`, 400, "QUESTION_TOO_LONG");
  if (PRIVATE_DATA_PATTERN.test(question)) throw new GiftBattleError("Telefon, e-posta veya bağlantı paylaşmayın.", 400, "PRIVATE_DATA");
  return question;
}

function eligibleListing(listing = {}) {
  const stock = Number(listing.stok ?? listing.adet);
  return listing.onay === true && listing.aktif !== false && listing.yayinda !== false
    && listing.arsivlendi !== true && (listing.urunTipi === "dijital" || !Number.isFinite(stock) || stock > 0);
}

function listingSnapshot(id, listing = {}) {
  return { id, title: String(listing.baslik || "Ürün").slice(0, 180), image: listing.resim || listing.resimler?.[0] || "", price: Math.max(0, Number(listing.fiyat) || 0), storeName: String(listing.magazaAdi || "HediyeAlSat Satıcısı").slice(0, 100) };
}

function pairKey(ids) { return [...ids].sort().join("__"); }
function voteId(battleId, uid) { return crypto.createHash("sha256").update(`${battleId}:${uid}`).digest("hex"); }

function publicBattle(id, data = {}, options = {}) {
  const a = Math.max(0, Number(data.votesA) || 0), b = Math.max(0, Number(data.votesB) || 0), total = a + b;
  const status = data.status === STATUS.ACTIVE && toDate(data.expiresAt)?.getTime() <= Date.now() ? STATUS.ENDED : data.status;
  const reveal = options.reveal === true || status !== STATUS.ACTIVE;
  return {
    id, question: data.question || "Hangisi daha iyi hediye?", ownerName: data.ownerName || "HediyeAlSat Üyesi", status,
    createdAt: toDate(data.createdAt)?.toISOString() || null, expiresAt: toDate(data.expiresAt)?.toISOString() || null,
    productA: { ...data.productA, available: data.productAAvailable !== false }, productB: { ...data.productB, available: data.productBAvailable !== false },
    isOwner: options.isOwner === true, selectedChoice: options.selectedChoice || null,
    results: reveal ? { votesA: a, votesB: b, totalVotes: total, percentageA: total ? Math.round(a * 100 / total) : 0, percentageB: total ? 100 - Math.round(a * 100 / total) : 0 } : null
  };
}

async function createBattle({ firestore, FieldValue, user, productIds, question, now = new Date() }) {
  const ids = [...new Set((Array.isArray(productIds) ? productIds : []).map(String).map((v) => v.trim()).filter(Boolean))];
  if (ids.length !== 2) throw new GiftBattleError("Kapışma oluşturmak için iki farklı ürün seçmelisin.", 400, "TWO_PRODUCTS_REQUIRED");
  const [aSnap, bSnap, cartSnap, activeSnap] = await Promise.all([
    firestore.collection("ilanlar").doc(ids[0]).get(), firestore.collection("ilanlar").doc(ids[1]).get(),
    firestore.collection("sepet").where("kullanici", "==", user.email).get(),
    firestore.collection("communityGiftBattles").where("ownerUid", "==", user.uid).where("status", "==", STATUS.ACTIVE).limit(ACTIVE_LIMIT + 10).get()
  ]);
  if (!aSnap.exists || !bSnap.exists || !eligibleListing(aSnap.data()) || !eligibleListing(bSnap.data())) throw new GiftBattleError("Seçilen ürünlerden biri kapışmaya uygun değil.", 409, "PRODUCT_UNAVAILABLE");
  const cartIds = new Set(cartSnap.docs.map((doc) => String(doc.data().ilanId || "")));
  if (!ids.every((id) => cartIds.has(id))) throw new GiftBattleError("Yalnızca kendi sepetindeki ürünlerle kapışma oluşturabilirsin.", 403, "PRODUCT_NOT_IN_CART");
  const key = pairKey(ids);
  const active = activeSnap.docs.filter((doc) => toDate(doc.data().expiresAt)?.getTime() > now.getTime());
  if (active.length >= ACTIVE_LIMIT) throw new GiftBattleError("Aynı anda en fazla 3 aktif kapışma oluşturabilirsin.", 409, "ACTIVE_LIMIT");
  if (active.some((doc) => doc.data().pairKey === key)) throw new GiftBattleError("Bu iki ürün için zaten aktif bir kapışman var.", 409, "DUPLICATE_PAIR");
  const ref = firestore.collection("communityGiftBattles").doc();
  const guardRef = firestore.collection("communityGiftBattleOwnerGuards").doc(user.uid);
  const expiresAt = new Date(now.getTime() + LIFE_MS);
  const data = { ownerUid: user.uid, ownerName: String(user.name || user.displayName || "HediyeAlSat Üyesi").slice(0, 80), pairKey: key, question: validateQuestion(question), productA: listingSnapshot(aSnap.id, aSnap.data()), productB: listingSnapshot(bSnap.id, bSnap.data()), productAAvailable: true, productBAvailable: true, status: STATUS.ACTIVE, votesA: 0, votesB: 0, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(), expiresAt: new Date(now.getTime() + LIFE_MS) };
  await firestore.runTransaction(async (tx) => {
    const guardSnap = await tx.get(guardRef);
    const stored = guardSnap.exists ? guardSnap.data().active || {} : {};
    const guardedActive = Object.entries(stored).filter(([, item]) => Number(item.expiresAtMs) > now.getTime());
    const knownIds = new Set(guardedActive.map(([id]) => id));
    const combined = [...guardedActive.map(([, item]) => item), ...active.filter((doc) => !knownIds.has(doc.id)).map((doc) => ({ pairKey: doc.data().pairKey, expiresAtMs: toDate(doc.data().expiresAt)?.getTime() }))];
    if (combined.length >= ACTIVE_LIMIT) throw new GiftBattleError("Aynı anda en fazla 3 aktif kapışma oluşturabilirsin.", 409, "ACTIVE_LIMIT");
    if (combined.some((item) => item.pairKey === key)) throw new GiftBattleError("Bu iki ürün için zaten aktif bir kapışman var.", 409, "DUPLICATE_PAIR");
    const nextActive = Object.fromEntries(guardedActive);
    nextActive[ref.id] = { pairKey: key, expiresAtMs: expiresAt.getTime() };
    tx.create(ref, data);
    tx.set(guardRef, { ownerUid: user.uid, active: nextActive, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  });
  return publicBattle(ref.id, { ...data, createdAt: now }, { isOwner: true, reveal: true });
}

async function loadBattleContext({ firestore, battleId, user }) {
  const battleRef = firestore.collection("communityGiftBattles").doc(battleId);
  const battleSnap = await battleRef.get();
  if (!battleSnap.exists) throw new GiftBattleError("Kapışma bulunamadı.", 404, "NOT_FOUND");
  const data = battleSnap.data();
  if (data.status === STATUS.REMOVED) throw new GiftBattleError("Bu kapışma artık yayında değil.", 404, "REMOVED");
  let selectedChoice = null;
  if (user?.uid) {
    const voteSnap = await firestore.collection("communityGiftBattleVotes").doc(voteId(battleId, user.uid)).get();
    selectedChoice = voteSnap.exists ? voteSnap.data().choice : null;
  }
  const isOwner = Boolean(user?.uid && data.ownerUid === user.uid);
  const [productASnap, productBSnap] = await Promise.all([
    firestore.collection("ilanlar").doc(data.productA?.id || "missing-a").get(),
    firestore.collection("ilanlar").doc(data.productB?.id || "missing-b").get()
  ]);
  const currentData = {
    ...data,
    productA: productASnap.exists ? listingSnapshot(productASnap.id, productASnap.data()) : data.productA,
    productB: productBSnap.exists ? listingSnapshot(productBSnap.id, productBSnap.data()) : data.productB,
    productAAvailable: productASnap.exists && eligibleListing(productASnap.data()),
    productBAvailable: productBSnap.exists && eligibleListing(productBSnap.data())
  };
  return { battleRef, data, battle: publicBattle(battleId, currentData, { isOwner, selectedChoice, reveal: isOwner || Boolean(selectedChoice) }) };
}

async function voteBattle({ firestore, FieldValue, user, battleId, choice, now = new Date() }) {
  if (!["A", "B"].includes(choice)) throw new GiftBattleError("Geçersiz oy seçimi.", 400, "INVALID_CHOICE");
  const battleRef = firestore.collection("communityGiftBattles").doc(battleId);
  const voteRef = firestore.collection("communityGiftBattleVotes").doc(voteId(battleId, user.uid));
  const dayKey = istanbulDateKey(now), dailyRef = firestore.collection("communityGiftBattleDaily").doc(`${user.uid}_${dayKey}`);
  let xp = null;
  await firestore.runTransaction(async (tx) => {
    const [battleSnap, voteSnap, dailySnap] = await Promise.all([tx.get(battleRef), tx.get(voteRef), tx.get(dailyRef)]);
    if (!battleSnap.exists) throw new GiftBattleError("Kapışma bulunamadı.", 404, "NOT_FOUND");
    const battle = battleSnap.data();
    if (battle.ownerUid === user.uid) throw new GiftBattleError("Kendi kapışmana oy veremezsin.", 403, "OWN_BATTLE");
    if (battle.status !== STATUS.ACTIVE || toDate(battle.expiresAt)?.getTime() <= now.getTime()) throw new GiftBattleError("Bu kapışmada oylama sona erdi.", 409, "NOT_ACTIVE");
    if (voteSnap.exists) throw new GiftBattleError("Bu kapışmada oyunuzu zaten kullandınız.", 409, "ALREADY_VOTED");
    const selectedProduct = choice === "A" ? battle.productA : battle.productB;
    const listingSnap = await tx.get(firestore.collection("ilanlar").doc(selectedProduct?.id || "missing"));
    if (!listingSnap.exists || !eligibleListing(listingSnap.data())) throw new GiftBattleError("Seçtiğiniz ürün artık oylamaya uygun değil.", 409, "PRODUCT_UNAVAILABLE");
    const daily = dailySnap.exists ? dailySnap.data() : {};
    const count = Math.max(0, Number(daily.validVoteCount) || 0) + 1;
    if (count === 3 && daily.rewarded !== true) xp = await applyXpEventInTransaction({ firestore, transaction: tx, FieldValue, uid: user.uid, reason: "GIFT_BATTLE_DAILY_3_VOTES", sourceId: dayKey, now });
    tx.create(voteRef, { battleId, voterUid: user.uid, choice, dayKey, createdAt: FieldValue.serverTimestamp() });
    tx.set(dailyRef, { userUid: user.uid, dayKey, validVoteCount: count, rewarded: daily.rewarded === true || count >= 3, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    tx.update(battleRef, { [choice === "A" ? "votesA" : "votesB"]: FieldValue.increment(1), updatedAt: FieldValue.serverTimestamp() });
  });
  const context = await loadBattleContext({ firestore, battleId, user });
  const daily = await dailyRef.get();
  return { battle: context.battle, xp: { progress: Math.min(3, Number(daily.data()?.validVoteCount) || 0), awarded: xp?.amount || 0, completed: daily.data()?.rewarded === true } };
}

module.exports = { STATUS, ACTIVE_LIMIT, QUESTION_LIMIT, GiftBattleError, validateQuestion, eligibleListing, pairKey, publicBattle, createBattle, loadBattleContext, voteBattle, voteId };
