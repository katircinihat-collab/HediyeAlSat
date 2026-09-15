import "../../styles/pages/seller-finance.css";


const money = (value) =>
  Number(value || 0).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

const STATUS_GROUPS = {
  protected: new Set(["PROTECTED"]),
  processing: new Set(["PROCESSING"]),
  approved: new Set(["APPROVED"]),
  paid: new Set(["PAID"]),
  review: new Set(["REVIEW_REQUIRED", "FAILED"])
};

function normalizeStatus(value) {
  const normalized = String(value || "")
    .trim()
    .toUpperCase();

  return normalized || "UNKNOWN";
}

function sumNet(items) {
  return items.reduce(
    (total, item) => total + Number(item.netTutar || 0),
    0
  );
}

function isDigitalOrder(order) {
  if (!order) return false;

  return (
    order.urunTipi === "dijital" ||
    order.fizikselKargo === false ||
    order.dijitalTeslimat === true ||
    order.teslimatTipi === "dijital"
  );
}

function isInProtectionPeriod(order) {
  if (!order) return false;

  if (isDigitalOrder(order)) {
    return Boolean(order.hakEdisBlokeBitis);
  }

  return (
    order.teslimatDogrulandi === true &&
    Boolean(order.hakEdisBlokeBitis)
  );
}

function buildOrderMap(siparisler) {
  return new Map(
    siparisler
      .filter((siparis) => siparis?.id)
      .map((siparis) => [String(siparis.id), siparis])
  );
}

function getMovementOrder(item, orderMap) {
  if (!item?.siparisId) return null;
  return orderMap.get(String(item.siparisId)) || null;
}

function getOrderNumber(item, orderMap) {
  const order = getMovementOrder(item, orderMap);

  if (!order) return "Sipariş";

  return order.siparisNo
    ? String(order.siparisNo)
    : "Sipariş";
}

function movementStatusLabel(item, orderMap) {
  const status = normalizeStatus(item?.settlementStatus);

  switch (status) {
    case "PROTECTED": {
      const order = getMovementOrder(item, orderMap);

      return isInProtectionPeriod(order)
        ? "48 Saat Kontrol Süresi"
        : "Sipariş Süreci Devam Ediyor";
    }

    case "PROCESSING":
      return "iyzico İşlemi Sürüyor";

    case "APPROVED":
      return "Banka Aktarımı Bekleniyor";

    case "PAID":
      return "Ödendi";

    case "REVIEW_REQUIRED":
    case "FAILED":
      return "İnceleniyor";

    default:
      return "Durum Bekleniyor";
  }
}

function movementBadgeStatus(item) {
  const status = normalizeStatus(item?.settlementStatus);

  if (status === "UNKNOWN") {
    return "unknown";
  }

  return status.toLowerCase();
}

function SellerFinance({
  siparisler = [],
  marketplaceHareketleri = []
}) {
  const metrics = marketplaceHareketleri.reduce(
  (totals, item) => ({
    grossSales: totals.grossSales + Number(item.toplamTutar || 0),
    platformCommission:
      totals.platformCommission + Number(item.komisyon || 0),
    sellerNetShare:
      totals.sellerNetShare + Number(item.netTutar || 0)
  }),
  {
    grossSales: 0,
    platformCommission: 0,
    sellerNetShare: 0
  }
);
  const orderMap = buildOrderMap(siparisler);

  const protectedItems = marketplaceHareketleri.filter((item) =>
    STATUS_GROUPS.protected.has(normalizeStatus(item.settlementStatus))
  );

  const protectionPeriodItems = protectedItems.filter((item) =>
    isInProtectionPeriod(getMovementOrder(item, orderMap))
  );

  const orderProcessItems = protectedItems.filter(
    (item) => !isInProtectionPeriod(getMovementOrder(item, orderMap))
  );

  const processingItems = marketplaceHareketleri.filter((item) =>
    STATUS_GROUPS.processing.has(normalizeStatus(item.settlementStatus))
  );

  const approvedItems = marketplaceHareketleri.filter((item) =>
    STATUS_GROUPS.approved.has(normalizeStatus(item.settlementStatus))
  );

  const paidItems = marketplaceHareketleri.filter((item) =>
    STATUS_GROUPS.paid.has(normalizeStatus(item.settlementStatus))
  );

  const reviewItems = marketplaceHareketleri.filter((item) =>
    STATUS_GROUPS.review.has(normalizeStatus(item.settlementStatus))
  );

  const unknownItems = marketplaceHareketleri.filter(
    (item) => normalizeStatus(item.settlementStatus) === "UNKNOWN"
  );

  const protectionPeriodTotal = sumNet(protectionPeriodItems);
  const orderProcessTotal = sumNet(orderProcessItems);
  const processingTotal = sumNet(processingItems);
  const approvedTotal = sumNet(approvedItems);
  const paidTotal = sumNet(paidItems);
  const reviewTotal = sumNet(reviewItems);
  const unknownTotal = sumNet(unknownItems);

  const aktarimBekleyen =
    processingTotal + approvedTotal;

  const sortedMovements = [...marketplaceHareketleri].sort((a, b) => {
    const getTime = (value) => {
      if (!value) return 0;

      if (typeof value.toDate === "function") {
        return value.toDate().getTime();
      }

      if (value.seconds) {
        return Number(value.seconds) * 1000;
      }

      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? 0 : date.getTime();
    };

    return getTime(b.tarih) - getTime(a.tarih);
  });

  return (
    <section className="seller-sales-summary">
      <h2 className="section-title">
        💳 Kazanç ve Aktarım Durumu
      </h2>

      <p className="finance-disclaimer marketplace-info">
        Marketplace satış kazançlarınız iyzico ödeme ve aktarım
        sürecine göre aşağıda gösterilir. Bu tutarlar eski HediyeAlSat
        cüzdan bakiyesinden ayrıdır. Banka aktarımı iyzico tarafından
        tamamlanmadan bir kazanç "Ödendi" olarak gösterilmez.
      </p>

      <div className="finance-grid">
        <div className="finance-card yellow">
          <h3>⏳ 48 Saat Kontrol Süresi</h3>

          <h1>₺{money(protectionPeriodTotal)}</h1>

          <p>
            {protectionPeriodItems.length} hakediş teslimat sonrası
            kontrol süresinde.
          </p>
        </div>

        <div className="finance-card blue">
          <h3>🔄 Aktarım Sürecinde</h3>

          <h1>₺{money(aktarimBekleyen)}</h1>

          <p>
            {processingItems.length + approvedItems.length} hakediş
            iyzico onay veya banka aktarımı aşamasında.
          </p>
        </div>

        <div className="finance-card green">
          <h3>✅ Ödendi</h3>

          <h1>₺{money(paidTotal)}</h1>

          <p>
            {paidItems.length} hakediş için banka aktarımı
            doğrulandı.
          </p>
        </div>

        <div className="finance-card orange">
          <h3>🔎 İnceleniyor</h3>

          <h1>₺{money(reviewTotal + unknownTotal)}</h1>

          <p>
            {reviewItems.length + unknownItems.length} kayıt ödeme
            sağlayıcısı veya yönetim kontrolü bekliyor.
          </p>
        </div>
      </div>

      {orderProcessItems.length > 0 && (
        <div className="finance-summary">
          <h3>Sipariş Süreci Devam Eden Kazançlar</h3>

          <p>
            ₺{money(orderProcessTotal)} tutarındaki{" "}
            {orderProcessItems.length} hakediş henüz teslimat sonrası
            48 saatlik kontrol aşamasına geçmedi.
          </p>
        </div>
      )}

      <div className="finance-summary marketplace-summary">
        <h3>Marketplace Satış Özeti</h3>

        <div className="finance-grid finance-overview-grid">
          <div className="finance-card green">
            <h3>Gerçekleşen Brüt Satış</h3>

            <h1>₺{money(metrics.grossSales)}</h1>

            <p>
              Ödemesi doğrulanmış, iptal veya iade edilmemiş satışlar.
            </p>
          </div>

          <div className="finance-card red">
            <h3>Platform Komisyonu</h3>

            <h1>₺{money(metrics.platformCommission)}</h1>

            <p>
              Gerçekleşen satışlar üzerinden hesaplanan platform
              komisyonu.
            </p>
          </div>

          <div className="finance-card purple">
            <h3>Satıcı Net Satış Payı</h3>

            <h1>₺{money(metrics.sellerNetShare)}</h1>

            <p>
              Brüt satış eksi platform komisyonu. Çekilebilir
              cüzdan bakiyesi değildir.
            </p>
          </div>

          <div className="finance-card dark">
            <h3>Marketplace Hakediş Kaydı</h3>

            <h1>{marketplaceHareketleri.length}</h1>

            <p>
              iyzico Marketplace settlement sistemine bağlı
              finansal kayıt sayısı.
            </p>
          </div>
        </div>
      </div>

      <div className="finance-summary">
        <h3>Aktarım Geçmişi</h3>

        {sortedMovements.length === 0 ? (
          <div className="finance-empty">
            Henüz iyzico Marketplace hakediş kaydı bulunmuyor.
          </div>
        ) : (
          <div className="finance-table-wrap">
            <table className="finance-table">
              <thead>
                <tr>
                  <th>Sipariş</th>
                  <th>Brüt</th>
                  <th>Komisyon</th>
                  <th>Net Kazanç</th>
                  <th>Aktarım Durumu</th>
                </tr>
              </thead>

              <tbody>
                {sortedMovements.map((item) => (
                  <tr key={item.id}>
                    <td>
                      {getOrderNumber(item, orderMap)}
                    </td>

                    <td>
                      ₺{money(item.toplamTutar)}
                    </td>

                    <td>
                      ₺{money(item.komisyon)}
                    </td>

                    <td className="success">
                      ₺{money(item.netTutar)}
                    </td>

                    <td>
                      <span
                        className={`settlement-badge settlement-${movementBadgeStatus(
                          item
                        )}`}
                      >
                        {movementStatusLabel(item, orderMap)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="legacy-finance-notice">
        <strong>Eski bakiye ve para çekme kayıtları</strong>

        <p>
          Önceki cüzdan sistemine ait finansal geçmişiniz silinmez.
          Bu kayıtlar Marketplace kazançlarından ayrı tutulur.
        </p>
      </div>
    </section>
  );
}

export default SellerFinance;