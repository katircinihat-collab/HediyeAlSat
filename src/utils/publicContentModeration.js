import policy from "../../shared/publicContentPolicy.json";

const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const phonePattern = /(?:\+?90|0)?\s*5\d{2}(?:[\s().-]*\d){7}\b/;

export function hasPublicContactInfo(value) {
  const text = String(value || "");
  const normalized = text.toLocaleLowerCase("tr-TR");
  return emailPattern.test(text) || phonePattern.test(text) ||
    policy.keywords.some((keyword) => normalized.includes(keyword));
}

export function validatePublicContent(value) {
  if (hasPublicContactInfo(value)) throw new Error(policy.message);
  return String(value || "").trim();
}

export const PUBLIC_CONTENT_WARNING = policy.message;
