import { collection, getDocs, query, where, limit } from 'firebase/firestore';
import { db } from '../firebase';

let cached;
let pending;
const CACHE_MS = 30000;
export function getSeoListings() {
  if (cached && Date.now() - cached.at < CACHE_MS) return Promise.resolve(cached.items);
  if (pending) return pending;
  let timer;
  const request = getDocs(query(collection(db, 'ilanlar'), where('onay', '==', true), limit(200)));
  pending = Promise.race([request, new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('Ürünler şu anda alınamıyor. Lütfen tekrar deneyin.')), 12000);
  })]).then(snapshot => {
    const items = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    cached = { at: Date.now(), items };
    return items;
  }).finally(() => { clearTimeout(timer); pending = null; });
  return pending;
}
