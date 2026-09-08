import { doc, getDoc } from "firebase/firestore";

export function publicUserName(value) {
  const candidates = [
    value?.kullaniciAdi,
    value?.displayName,
    value?.adSoyad,
    value?.ad
  ];

  const name = candidates.find((candidate) => (
    typeof candidate === "string" && candidate.trim() && !candidate.includes("@")
  ));

  return name?.trim() || "Kullanıcı";
}

export function formatPublicCommentDate(value) {
  const date = value?.toDate
    ? value.toDate()
    : value?.seconds
      ? new Date(value.seconds * 1000)
      : value instanceof Date
        ? value
        : value
          ? new Date(value)
          : null;

  return date && !Number.isNaN(date.getTime())
    ? date.toLocaleDateString("tr-TR")
    : "";
}

export async function currentUserPublicName(database, user) {
  const authName = publicUserName({ displayName: user?.displayName });
  if (authName !== "Kullanıcı") return authName;
  if (!user?.uid) return "Kullanıcı";

  for (const collectionName of ["profiller", "users"]) {
    try {
      const snapshot = await getDoc(doc(database, collectionName, user.uid));
      if (snapshot.exists()) {
        const profileName = publicUserName(snapshot.data());
        if (profileName !== "Kullanıcı") return profileName;
      }
    } catch {
      // Profil okunamazsa yorum gönderimini engellemeden güvenli ad kullanılır.
    }
  }

  return "Kullanıcı";
}
