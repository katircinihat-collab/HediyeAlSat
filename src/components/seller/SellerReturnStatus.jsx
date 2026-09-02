import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { reportReturnReceived } from "../../services/orderClaimApi";

export default function SellerReturnStatus({ claimId }) {
  const [claim, setClaim] = useState(null); const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  useEffect(() => { let active = true; if (!claimId) return undefined; getDoc(doc(db, "orderClaims", claimId)).then((snap) => { if (active && snap.exists()) setClaim({ id: snap.id, ...snap.data() }); }).catch(() => {}); return () => { active = false; }; }, [claimId]);
  if (!claim || claim.tip !== "iade" || claim.durum !== "kabul_edildi" || !["kargoya_verildi", "teslim_dogrulandi"].includes(claim.returnFlowStatus)) return null;
  async function report() { try { setBusy(true); setMessage(""); await reportReturnReceived(claim.id); setClaim((old) => ({ ...old, sellerReturnReceivedReported: true })); } catch (error) { setMessage(error.message); } finally { setBusy(false); } }
  return <div className="seller-return-status"><strong>İade ürünü geri gönderildi</strong><span>Kargo firması: {claim.returnCarrier || "—"}</span><span>Takip no: {claim.returnTrackingNumber || "—"}</span>{claim.returnFlowStatus === "teslim_dogrulandi" ? <span>Geri teslim yönetici tarafından doğrulandı. Finansal inceleme devam ediyor.</span> : claim.sellerReturnReceivedReported ? <span>Teslim aldığınızı bildirdiniz. Yönetici doğrulaması bekleniyor.</span> : <button type="button" disabled={busy} onClick={report}>{busy ? "Bildiriliyor..." : "Ürün Bana Ulaştı"}</button>}{message && <span>{message}</span>}</div>;
}
