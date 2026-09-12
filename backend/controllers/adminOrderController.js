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

exports.actionRequired = async (req, res, next) => {
    try {
        const archive = req.query.view === "archive";
        const statuses = archive ? ["RESOLVED", "ARCHIVED"] : ["ACTIVE"];
        const snapshot = await firestore.collection("adminOperationTasks").where("status", "in", statuses).limit(200).get();
        const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })).sort((a, b) => {
            const time = (value) => value?.toMillis?.() ?? value?.toDate?.().getTime?.() ?? new Date(value || 0).getTime();
            return time(b.updatedAt || b.createdAt) - time(a.updatedAt || a.createdAt);
        });
        return res.json({ success: true, count: items.length, items });
    } catch (error) { next(error); }
};

module.exports.safeOrder = safeOrder;
module.exports.matchesFilters = matchesFilters;
module.exports.encodeCursor = encodeCursor;
module.exports.decodeCursor = decodeCursor;
