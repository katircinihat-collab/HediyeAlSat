export function getAccountDisplayName({ profile = {}, userDocument = {}, authUser = null } = {}) {
  return String(profile.ad || userDocument.displayName || userDocument.ad || authUser?.displayName || "").trim();
}

export function validatePasswordChange({ currentPassword, newPassword, confirmation }) {
  if (!currentPassword || !newPassword || !confirmation) return "Lütfen tüm şifre alanlarını doldurun.";
  if (newPassword.length < 6) return "Yeni şifreniz en az 6 karakter olmalıdır.";
  if (newPassword !== confirmation) return "Yeni şifreler birbiriyle eşleşmiyor.";
  if (currentPassword === newPassword) return "Yeni şifreniz mevcut şifrenizden farklı olmalıdır.";
  return "";
}

export function isPasswordAccount(user) {
  return Boolean(user?.providerData?.some((provider) => provider.providerId === "password"));
}
