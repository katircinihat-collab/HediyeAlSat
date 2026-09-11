const packageConfig = require("../../shared/sponsorStorePackages.json");
const { PaymentValidationError } = require("./paymentValidationService");

const DAY_MS = 86400000;
const STATUS = Object.freeze({
    REVIEW_PENDING: "REVIEW_PENDING",
    APPROVED_PAYMENT_PENDING: "APPROVED_PAYMENT_PENDING",
    REJECTED: "REJECTED",
    ACTIVE: "ACTIVE"
});

function getSponsorStorePackage(id) {
    return packageConfig.packages.find((item) => item.id === id) || null;
}

function ownsStore(store, user) {
    if (!store || !user?.uid) return false;
    if (store.sahipUid) return store.sahipUid === user.uid;
    return Boolean(user.email) && String(store.sahip || "").toLowerCase() === String(user.email).toLowerCase();
}

function timestampMillis(value) {
    if (!value) return 0;
    if (typeof value.toMillis === "function") return value.toMillis();
    if (value instanceof Date) return value.getTime();
    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
}

function publicApplication(snapshot) {
    const data = snapshot.data ? snapshot.data() : snapshot;
    return { id: snapshot.id || data.id, ...data };
}

async function createApplication({ firestore, FieldValue, user, input }) {
    const storeId = String(input.storeId || input.magazaId || "").trim();
    if (!storeId) throw new PaymentValidationError("Mağaza seçimi gereklidir.", 400, "STORE_REQUIRED");
    const storeRef = firestore.collection("magazalar").doc(storeId);
    const guardRef = firestore.collection("sponsorStoreGuards").doc(storeId);
    const applicationRef = firestore.collection("sponsorBasvurular").doc();
    await firestore.runTransaction(async (tx) => {
        const [storeSnap, guardSnap] = await Promise.all([tx.get(storeRef), tx.get(guardRef)]);
        if (!storeSnap.exists) throw new PaymentValidationError("Mağaza bulunamadı.", 404, "STORE_NOT_FOUND");
        const store = storeSnap.data();
        if (!ownsStore(store, user)) throw new PaymentValidationError("Bu mağaza için başvuru yapamazsınız.", 403, "STORE_FORBIDDEN");
        const guard = guardSnap.exists ? guardSnap.data() : null;
        const blocked = guard && [STATUS.REVIEW_PENDING, STATUS.APPROVED_PAYMENT_PENDING].includes(guard.status);
        if (blocked) throw new PaymentValidationError("Bu mağaza için devam eden bir sponsor başvurusu var.", 409, "SPONSOR_APPLICATION_EXISTS");
        const clean = {
            magazaAdi: String(store.magazaAdi || store.adi || "Mağaza").slice(0, 120),
            yetkiliAdi: String(input.yetkiliAdi || "").trim().slice(0, 100),
            telefon: String(input.telefon || "").trim().slice(0, 30),
            email: user.email || "",
            webSitesi: String(input.webSitesi || "").trim().slice(0, 250),
            hakkinda: String(input.hakkinda || "").trim().slice(0, 1000)
        };
        if (!clean.yetkiliAdi || !clean.telefon || clean.hakkinda.length < 20) {
            throw new PaymentValidationError("Başvuru bilgileri eksik veya geçersiz.", 400, "APPLICATION_INVALID");
        }
        const record = {
            ...clean, storeId, magazaId: storeId, ownerUid: user.uid, sahipUid: user.uid,
            kullaniciId: user.uid, status: STATUS.REVIEW_PENDING, durum: STATUS.REVIEW_PENDING,
            paymentStatus: "NOT_AVAILABLE", odemeDurumu: false, sponsorActive: false,
            sponsorAktif: false, createdAt: FieldValue.serverTimestamp(), basvuruTarihi: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(), okunmadi: true
        };
        tx.set(applicationRef, record);
        tx.set(guardRef, { applicationId: applicationRef.id, ownerUid: user.uid, status: STATUS.REVIEW_PENDING, updatedAt: FieldValue.serverTimestamp() });
    });
    return { id: applicationRef.id, status: STATUS.REVIEW_PENDING };
}

async function listOwnApplications({ firestore, user }) {
    const snap = await firestore.collection("sponsorBasvurular").where("ownerUid", "==", user.uid).get();
    return snap.docs.map(publicApplication).sort((a, b) => timestampMillis(b.createdAt || b.basvuruTarihi) - timestampMillis(a.createdAt || a.basvuruTarihi));
}

async function listApplications({ firestore }) {
    const snap = await firestore.collection("sponsorBasvurular").get();
    return snap.docs.map(publicApplication).sort((a, b) => timestampMillis(b.createdAt || b.basvuruTarihi) - timestampMillis(a.createdAt || a.basvuruTarihi));
}

async function approveApplication({ firestore, FieldValue, applicationId, packageId, adminUser }) {
    const selected = getSponsorStorePackage(packageId);
    if (!selected) throw new PaymentValidationError("Sponsor paketi geçersiz.", 400, "PACKAGE_INVALID");
    const ref = firestore.collection("sponsorBasvurular").doc(applicationId);
    await firestore.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists) throw new PaymentValidationError("Başvuru bulunamadı.", 404, "APPLICATION_NOT_FOUND");
        const app = snap.data();
        if (app.status !== STATUS.REVIEW_PENDING) throw new PaymentValidationError("Başvuru inceleme durumunda değil.", 409, "APPLICATION_STATE_INVALID");
        tx.update(ref, {
            status: STATUS.APPROVED_PAYMENT_PENDING, durum: STATUS.APPROVED_PAYMENT_PENDING,
            paymentStatus: "PENDING", selectedTier: selected.id, selectedPackageId: selected.id,
            selectedPackageName: selected.name, selectedPrice: selected.price,
            selectedDurationDays: selected.durationDays, selectedPriority: selected.priority,
            approvedAt: FieldValue.serverTimestamp(), approvedBy: adminUser.uid,
            updatedAt: FieldValue.serverTimestamp(), okunmadi: false
        });
        tx.set(firestore.collection("sponsorStoreGuards").doc(app.storeId || app.magazaId), {
            applicationId, ownerUid: app.ownerUid || app.kullaniciId,
            status: STATUS.APPROVED_PAYMENT_PENDING, updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });
    });
    return { status: STATUS.APPROVED_PAYMENT_PENDING, package: selected };
}

async function rejectApplication({ firestore, FieldValue, applicationId, adminUser }) {
    const ref = firestore.collection("sponsorBasvurular").doc(applicationId);
    await firestore.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists) throw new PaymentValidationError("Başvuru bulunamadı.", 404, "APPLICATION_NOT_FOUND");
        const app = snap.data();
        if (![STATUS.REVIEW_PENDING, STATUS.APPROVED_PAYMENT_PENDING].includes(app.status)) throw new PaymentValidationError("Başvuru reddedilemez.", 409, "APPLICATION_STATE_INVALID");
        tx.update(ref, { status: STATUS.REJECTED, durum: STATUS.REJECTED, paymentStatus: "NOT_AVAILABLE", rejectedAt: FieldValue.serverTimestamp(), rejectedBy: adminUser.uid, updatedAt: FieldValue.serverTimestamp() });
        tx.set(firestore.collection("sponsorStoreGuards").doc(app.storeId || app.magazaId), { applicationId, status: STATUS.REJECTED, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    });
    return { status: STATUS.REJECTED };
}

async function prepareSponsorPayment({ firestore, applicationId, user }) {
    const snap = await firestore.collection("sponsorBasvurular").doc(applicationId).get();
    if (!snap.exists) throw new PaymentValidationError("Sponsor başvurusu bulunamadı.", 404, "SPONSOR_APPLICATION_NOT_FOUND");
    const app = publicApplication(snap);
    if ((app.ownerUid || app.kullaniciId) !== user.uid) throw new PaymentValidationError("Bu sponsor başvurusu size ait değil.", 403, "SPONSOR_APPLICATION_FORBIDDEN");
    if (app.status !== STATUS.APPROVED_PAYMENT_PENDING || !["PENDING", "FAILED"].includes(app.paymentStatus) || app.odemeDurumu === true) throw new PaymentValidationError("Başvuru ödeme için uygun değil.", 409, "SPONSOR_PAYMENT_NOT_AVAILABLE");
    const selected = getSponsorStorePackage(app.selectedPackageId || app.selectedTier);
    if (!selected || selected.price !== Number(app.selectedPrice) || selected.durationDays !== Number(app.selectedDurationDays)) throw new PaymentValidationError("Onaylanan sponsor paketi doğrulanamadı.", 409, "SPONSOR_PACKAGE_MISMATCH");
    const storeId = app.storeId || app.magazaId;
    const storeSnap = await firestore.collection("magazalar").doc(storeId).get();
    if (!storeSnap.exists || !ownsStore(storeSnap.data(), user)) throw new PaymentValidationError("Mağaza sahipliği doğrulanamadı.", 403, "STORE_FORBIDDEN");
    return { application: app, package: selected, storeId };
}

function sponsorPaymentBasket(selected) {
    return [{ id: `SPONSOR_STORE_${selected.id}`, name: selected.name, category1: "Sponsor Mağaza", category2: "Reklam Hizmeti", itemType: "VIRTUAL", price: selected.price.toFixed(2) }];
}

module.exports = { STATUS, DAY_MS, getSponsorStorePackage, ownsStore, timestampMillis, createApplication, listOwnApplications, listApplications, approveApplication, rejectApplication, prepareSponsorPayment, sponsorPaymentBasket };
