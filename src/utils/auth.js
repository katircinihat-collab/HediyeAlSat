export function firebaseAuthErrorMessage(error) {
  const messages = {
    "auth/email-already-in-use": "Bu e-posta adresi zaten kayıtlı.",
    "auth/invalid-email": "Geçerli bir e-posta adresi girin.",
    "auth/weak-password": "Şifreniz çok kısa veya zayıf.",
    "auth/invalid-credential": "E-posta veya şifre hatalı.",
    "auth/wrong-password": "E-posta veya şifre hatalı.",
    "auth/user-not-found": "E-posta veya şifre hatalı.",
    "auth/requires-recent-login": "Güvenliğiniz için yeniden giriş yapıp işlemi tekrar deneyin.",
    "auth/user-token-expired": "Oturumunuz sona erdi. Lütfen yeniden giriş yapın.",
    "auth/too-many-requests": "Çok fazla deneme yapıldı. Lütfen biraz sonra tekrar deneyin.",
    "auth/network-request-failed": "Bağlantı kurulamadı. İnternet bağlantınızı kontrol edin."
  };
  return messages[String(error?.code || "")] || "İşlem tamamlanamadı. Lütfen tekrar deneyin.";
}

export function validateRegistration({ name, email, password, passwordAgain }) {
  if (!name.trim() || !email.trim() || !password || !passwordAgain) return "Lütfen tüm alanları doldurun.";
  if (password.length < 6) return "Şifreniz en az 6 karakter olmalıdır.";
  if (password !== passwordAgain) return "Şifreler birbiriyle eşleşmiyor.";
  return "";
}

export function buildUserDocument({ name, email, createdAt }) {
  const displayName = name.trim();
  return { ad: displayName, displayName, email, createdAt };
}
