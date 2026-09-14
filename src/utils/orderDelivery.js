export function payoutDisplay(order, now = new Date()) {
  if (order.hakEdisBlokeli === true) return { label: "İnceleme gerekiyor", detail: "İade veya itiraz incelemesi nedeniyle aktarım bekletiliyor." };
  if (order.teslimatDogrulandi !== true) return null;
  if (["Ödendi", "PAID", "paid"].includes(order.hakEdisDurumu)) return { label: "Ödeme aktarımı tamamlandı", detail: order.hakEdisOdemeTarihi ? "Aktarım tarihi sipariş kaydında mevcut." : "Satıcı ödemesi tamamlandı." };
  if (["Banka transferi bekleniyor", "PROCESSING", "processing"].includes(order.hakEdisDurumu)) return { label: "Banka transferi bekleniyor", detail: "Kazancınız güvenli aktarım sürecinde." };
  const value = order.hakEdisBlokeBitis;
  const release = value?.toDate ? value.toDate() : new Date(value);
  if (Number.isNaN(release.getTime())) return { label: "Bekleyen Hakediş", detail: "Bloke bitiş tarihi bekleniyor" };
  const remaining = Math.max(0, release.getTime() - now.getTime());
  if (remaining === 0) return { label: "Aktarıma hazır", detail: "48 saatlik kontrol süresi tamamlandı; para çekme işlemi gerekmiyor." };
  const hours = Math.ceil(remaining / 3600000);
  const days = Math.floor(hours / 24);
  const restHours = hours % 24;
  return { label: "48 saat kontrol süresinde", detail: `Kontrol süresinin bitmesine kalan: ${days ? `${days} gün ` : ""}${restHours} saat` };
}
