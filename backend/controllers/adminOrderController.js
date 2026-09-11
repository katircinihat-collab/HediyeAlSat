const { admin, firestore } = require("../config/firebase");
const { lifecycleView, actionReasons, buildTimeline } = require("../services/orderLifecycleService");

const PAGE_SIZE = 25;
const SCAN_LIMIT = 50;

function encodeCursor(doc) {
    const date = doc.get("tarih");
    const millis = date?.toMillis ? date.toMillis() : new Date(date || 0).getTime();
    return Buffer.from(JSON.stringify({ millis, id: doc.id })).toString("base64url");
}

function decodeCursor(value) {
    if (!value) return null;
    try {
        const parsed = JSON.parse(Buffer.from(String(value), "base64url").toString("utf8"));
        if (!Number.isFinite(parsed.millis) || !parsed.id) return null;
        return { date: admin.firestore.Timestamp.fromMillis(parsed.millis), id: String(parsed.id) };
    } catch { return null; }
}

function safeOrder(doc, now = new Date()) {
    const data = doc.data ? doc.data() : doc;
    const id = doc.id || data.id;
    const lifecycle = lifecycleView(data, now);
    return {
        id, siparisNo: data.siparisNo || id, tarih: data.tarih || null,
        alici: data.alici || data.kullanici || null, aliciUid: data.aliciUid || null,
        satici: data.satici || null, saticiUid: data.saticiUid || null,
        ilanId: data.ilanId || data.urunId || null, ilanBaslik: data.ilanBaslik || data.urunAdi || "Ürün",
        adet: Number(data.adet || 1), toplam: Number(data.toplam ?? data.genelToplam ?? 0),
        odemeDurumu: data.odemeDurumu === true, paymentStatus: data.paymentStatus || (data.odemeDurumu === true ? "SUCCESS" : "WAITING"),
        durum: lifecycle.status, urunTipi: lifecycle.digital ? "dijital" : "fiziksel",
        kargoFirma: lifecycle.digital ? null : data.kargoFirma || null,
        kargoNo: lifecycle.digital ? null : data.kargoNo || null,
        refundStatus: data.refundProviderStatus || data.refundAccountingStatus || null,
        claimStatus: data.claimStatus || (data.hakEdisBlokeli ? "inceleniyor" : null),
        hakEdisDurumu: lifecycle.payoutStatus, hakEdisBlokeBitis: lifecycle.holdEndsAt,
        lifecycle, actionReasons: actionReasons(data, now)
    };
}

function matchesFilters(order, query) {
    const search = String(query.search || "").trim().toLocaleLowerCase("tr-TR");
    const status = String(query.status || "").trim();
    const type = String(query.type || "").trim();
    if (status && order.durum !== status && order.paymentStatus !== status && order.hakEdisDurumu !== status) return false;
    if (type && order.urunTipi !== type) return false;
    if (search && ![order.id, order.siparisNo, order.alici, order.satici, order.ilanBaslik].join(" ").toLocaleLowerCase("tr-TR").includes(search)) return false;
    return true;
}

exports.list = async (req, res, next) => {
    try {
        let query = firestore.collection("siparisler").orderBy("tarih", "desc").orderBy(admin.firestore.FieldPath.documentId(), "desc");
        const cursor = decodeCursor(req.query.cursor);
        if (cursor) query = query.startAfter(cursor.date, cursor.id);
        const snapshot = await query.limit(SCAN_LIMIT).get();
        const orders = snapshot.docs.map((doc) => safeOrder(doc)).filter((order) => matchesFilters(order, req.query)).slice(0, PAGE_SIZE);
        return res.json({ success: true, orders, nextCursor: snapshot.size === SCAN_LIMIT ? encodeCursor(snapshot.docs[snapshot.docs.length - 1]) : null });
    } catch (error) { next(error); }
};

exports.detail = async (req, res, next) => {
    try {
        const id = String(req.params.orderId || "").trim();
        const orderRef = firestore.collection("siparisler").doc(id);
        const [orderDoc, claims, movement] = await Promise.all([
            orderRef.get(),
            firestore.collection("orderClaims").where("orderId", "==", id).limit(20).get(),
            firestore.collection("bakiyeHareketleri").where("siparisId", "==", id).limit(5).get()
        ]);
        if (!orderDoc.exists) return res.status(404).json({ success: false, message: "Sipariş bulunamadı." });
        const order = safeOrder(orderDoc);
        return res.json({ success: true, order, timeline: buildTimeline(orderDoc.data()), claims: claims.docs.map((doc) => ({ id: doc.id, ...doc.data() })), earnings: movement.docs.map((doc) => ({ id: doc.id, durum: doc.get("durum"), netTutar: doc.get("netTutar"), komisyon: doc.get("komisyon"), blockageResolvedDate: doc.get("blockageResolvedDate") })) });
    } catch (error) { next(error); }
};

exports.actionRequired = async (_req, res, next) => {
    try {
        const [waitingPayments, openClaims, reconciliations, recentOrders] = await Promise.all([
            firestore.collection("odemeler").where("paymentStatus", "==", "WAITING").limit(100).get(),
            firestore.collection("orderClaims").where("durum", "in", ["acik", "inceleniyor", "kabul_edildi"]).limit(100).get(),
            firestore.collection("financialReconciliations").where("status", "==", "incelemede").limit(100).get(),
            firestore.collection("siparisler").orderBy("tarih", "desc").limit(200).get()
        ]);
        const items = [];
        waitingPayments.forEach((doc) => items.push({ id: `payment:${doc.id}`, type: "payment", referenceId: doc.id, reason: "WAITING_PAYMENT", title: "Ödeme sonucu bekleniyor", createdAt: doc.get("createdAt") || doc.get("tarih") || null }));
        openClaims.forEach((doc) => items.push({ id: `claim:${doc.id}`, type: "claim", referenceId: doc.id, orderId: doc.get("orderId") || null, reason: "OPEN_CLAIM_OR_DISPUTE", title: "Açık iade veya itiraz", createdAt: doc.get("createdAt") || null }));
        reconciliations.forEach((doc) => items.push({ id: `reconciliation:${doc.id}`, type: "reconciliation", referenceId: doc.id, orderId: doc.get("orderId") || null, reason: doc.get("reasonCode") || "RECONCILIATION", title: "Finansal mutabakat gerekli", createdAt: doc.get("createdAt") || null }));
        recentOrders.forEach((doc) => actionReasons(doc.data()).forEach((reason) => items.push({ id: `order:${doc.id}:${reason}`, type: "order", referenceId: doc.id, orderId: doc.id, reason, title: "Sipariş yaşam döngüsü anomalisi", createdAt: doc.get("tarih") || null })));
        return res.json({ success: true, count: items.length, items: items.slice(0, 200) });
    } catch (error) { next(error); }
};

module.exports.safeOrder = safeOrder;
module.exports.matchesFilters = matchesFilters;
module.exports.encodeCursor = encodeCursor;
module.exports.decodeCursor = decodeCursor;
