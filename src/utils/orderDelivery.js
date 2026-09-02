export function payoutDisplay(order, now = new Date()) {
  if (order.teslimatDogrulandi !== true) return null;
  const value = order.hakEdisBlokeBitis;
  const release = value?.toDate ? value.toDate() : new Date(value);
  if (Number.isNaN(release.getTime())) return { label: "Bekleyen Hakediş", detail: "Bloke bitiş tarihi bekleniyor" };
  const remaining = Math.max(0, release.getTime() - now.getTime());
  if (remaining === 0) return { label: "Ödemeye Hazır", detail: "48 saatlik güvenlik süresi tamamlandı" };
  const hours = Math.ceil(remaining / 3600000);
  const days = Math.floor(hours / 24);
  const restHours = hours % 24;
  return { label: "Bekleyen Hakediş", detail: `Ödemeye hazır olmasına kalan: ${days ? `${days} gün ` : ""}${restHours} saat` };
}
