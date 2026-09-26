import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { auth, db } from "../firebase";

export function useSellerOrders() {
  const [state, setState] = useState({ loading: true, orders: [], error: "", uid: "" });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let stopOrders = () => {};
    const stopAuth = onAuthStateChanged(auth, (user) => {
      stopOrders();
      setState({ loading: Boolean(user), orders: [], error: "", uid: user?.uid || "" });
      if (!user) return;
      let active = true;
      const sources = [["saticiUid", user.uid], ...(user.email ? [["satici", user.email]] : [])];
      const snapshots = new Map();
      const errors = new Set();
      const fail = () => active && setState({ loading: false, orders: [], error: "Siparişleriniz şu anda alınamıyor. Lütfen tekrar deneyin.", uid: user.uid });
      const timer = setTimeout(fail, 15000);
      const subscriptions = sources.map(([field, value]) => onSnapshot(
        query(collection(db, "siparisler"), where(field, "==", value)),
        (snapshot) => {
          if (!active) return;
          snapshots.set(field, snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
          errors.delete(field);
          if (snapshots.size !== sources.length || errors.size) return;
          clearTimeout(timer);
          const unique = new Map([...snapshots.values()].flat().map((order) => [order.id, order]));
          setState({ loading: false, orders: [...unique.values()], error: "", uid: user.uid });
        },
        () => { errors.add(field); clearTimeout(timer); fail(); },
      ));
      stopOrders = () => { active = false; clearTimeout(timer); subscriptions.forEach((stop) => stop()); };
    });
    return () => { stopOrders(); stopAuth(); };
  }, [retry]);
  return { ...state, retry: () => setRetry((value) => value + 1) };
}
