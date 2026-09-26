import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

test("gerçek finans componenti null, arşivli ve refund kayıtlarını güvenle render eder", async () => {
  const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
  try {
    const { default: Finance } = await server.ssrLoadModule("/src/components/seller/SellerFinance.jsx");
    const html = renderToStaticMarkup(React.createElement(Finance, {
      siparisler: [null, { id: "refund", refundCompleted: true }],
      marketplaceHareketleri: [null,
        { id: "one", settlementMode: "IYZICO_MARKETPLACE", settlementStatus: "PAID", netTutar: 92, toplamTutar: 100, komisyon: 8, paymentTransactionId: "SECRET-PAYMENT", subMerchantKey: "SECRET-SELLER" },
        { id: "two", siparisId: "refund", settlementMode: "IYZICO_MARKETPLACE", settlementStatus: "PAID", netTutar: 900 },
        { id: "bad", settlementMode: "IYZICO_MARKETPLACE", netTutar: "bad", tarih: { seconds: 5 } },
        { id: "legacy", netTutar: 99999 },
      ],
    }));
    assert.match(html, /92,00/); assert.match(html, /İade \/ iptal kaydı/);
    assert.doesNotMatch(html, /NaN|SECRET-PAYMENT|SECRET-SELLER|99.999/);
    assert.doesNotMatch(html, /<h1/);
  } finally { await server.close(); }
});
