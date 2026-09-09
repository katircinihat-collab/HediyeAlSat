import { useEffect, useState } from "react";
import { collection, doc, getDoc, getDocs, limit, query, where } from "firebase/firestore";
import { db } from "../firebase";
import {
  isEligibleSponsoredProduct,
  isEligibleSponsoredStore,
  mapSponsorsByPlacement,
  selectSponsoredContent
} from "../utils/sponsoredContent";

async function resolveSponsor(item) {
  if (item.placement === "sponsored_product") {
    if (!item.productId) return null;
    const snapshot = await getDoc(doc(db, "ilanlar", item.productId));
    if (!snapshot.exists()) return null;
    const product = { id: snapshot.id, ...snapshot.data() };
    if (!isEligibleSponsoredProduct(product)) return null;
    return { ...item, product };
  }

  if (item.placement === "sponsored_store") {
    if (!item.storeId) return null;
    const snapshot = await getDoc(doc(db, "magazalar", item.storeId));
    if (!snapshot.exists()) return null;
    const store = { id: snapshot.id, ...snapshot.data() };
    if (!isEligibleSponsoredStore(store)) return null;
    return { ...item, store };
  }

  if (!item.imageUrl || !item.targetUrl) return null;
  return item;
}

export default function useSponsoredContent() {
  const [sponsors, setSponsors] = useState({});

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const snapshot = await getDocs(query(
          collection(db, "sponsoredContent"),
          where("active", "==", true),
          limit(24)
        ));
        const candidates = selectSponsoredContent(
          snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }))
        );
        const resolved = (await Promise.all(candidates.map(resolveSponsor))).filter(Boolean).slice(0, 4);
        if (active) setSponsors(mapSponsorsByPlacement(resolved));
      } catch {
        if (active) setSponsors({});
      }
    }

    load();
    return () => { active = false; };
  }, []);

  return sponsors;
}
