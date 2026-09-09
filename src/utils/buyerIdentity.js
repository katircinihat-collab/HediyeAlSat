export function normalizeTurkishIdentityNumber(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 11);
}

export function isValidTurkishIdentityNumber(value) {
  const digits = normalizeTurkishIdentityNumber(value);
  if (!/^[1-9]\d{10}$/.test(digits)) return false;
  const numbers = [...digits].map(Number);
  const odd = numbers[0] + numbers[2] + numbers[4] + numbers[6] + numbers[8];
  const even = numbers[1] + numbers[3] + numbers[5] + numbers[7];
  return ((odd * 7 - even) % 10 + 10) % 10 === numbers[9]
    && numbers.slice(0, 10).reduce((sum, number) => sum + number, 0) % 10 === numbers[10];
}
