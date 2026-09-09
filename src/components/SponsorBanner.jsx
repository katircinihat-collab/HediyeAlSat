import { Link } from "react-router-dom";
import "../styles/components/sponsored-content.css";

function isExternal(url = "") {
  return /^https?:\/\//i.test(url);
}

export default function SponsorBanner({ sponsor }) {
  if (!sponsor) return null;

  const content = (
    <>
      <span className="sponsored-label">Sponsorlu</span>
      <img src={sponsor.imageUrl} alt={sponsor.title || "Sponsorlu içerik"} loading="lazy" />
      {sponsor.title && <strong>{sponsor.title}</strong>}
    </>
  );

  const className = `sponsor-banner sponsor-banner--${sponsor.placement}`;
  return isExternal(sponsor.targetUrl) ? (
    <a className={className} href={sponsor.targetUrl} target="_blank" rel="noopener noreferrer">
      {content}
    </a>
  ) : (
    <Link className={className} to={sponsor.targetUrl}>{content}</Link>
  );
}
