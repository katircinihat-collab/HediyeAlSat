import "../styles/components/user-level-label.css";

function UserLevelLabel({ info, verifiedBuyer = false }) {
  if (!info) return <strong>Kullanıcı</strong>;
  return <div className="user-level-label"><strong>{info.icon} {info.title} · Seviye {info.level}</strong><div className="user-trust-badges">{verifiedBuyer && <span>✓ Doğrulanmış Alıcı</span>}{info.verifiedSeller && <span>✓ Doğrulanmış Satıcı</span>}{info.team && <span>🛡 HediyeAlSat Ekibi</span>}</div></div>;
}
export default UserLevelLabel;
