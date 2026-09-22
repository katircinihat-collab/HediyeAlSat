import { taxonomy, normalizeGiftTaxonomy } from '../seo/giftTaxonomy';
import '../styles/components/gift-attributes.css';

const labels = { hedefKisiler: 'Kime uygun?', ozelGunler: 'Hangi özel gün?', giftStyles: 'Hediye tarzı' };
export default function GiftAttributes({ value, onChange }) {
  const selected = normalizeGiftTaxonomy(value);
  return <details className="gift-attributes">
    <summary>🎯 Hediyeyi Doğru Kişilere Ulaştır</summary>
    <p>Yalnız ürününe uygun seçenekleri işaretle. Bu seçimler hediyenin ilgili rehberlerde keşfedilmesine yardımcı olur. Alanlar isteğe bağlıdır.</p>
    {Object.entries(taxonomy).map(([field, options]) => <fieldset key={field}>
      <legend>{labels[field]}</legend>
      <div className="gift-attribute-options">{Object.entries(options).map(([id, label]) => <label key={id}>
        <input type="checkbox" checked={selected[field].includes(id)} onChange={() => onChange({
          ...selected, [field]: selected[field].includes(id) ? selected[field].filter(item => item !== id) : [...selected[field], id]
        })} />{label}
      </label>)}</div>
    </fieldset>)}
  </details>;
}
