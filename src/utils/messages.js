export function messageTimeValue(value) {
  if (!value) return 0;
  if (typeof value.seconds === "number") return value.seconds * 1000;
  const date = value.toDate ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

export function isOwnMessage(message, currentUid, currentEmail) {
  return message.gonderenUid ? message.gonderenUid === currentUid : message.gonderen === currentEmail;
}

export function isIncomingMessage(message, currentUid, currentEmail) {
  return message.alanUid ? message.alanUid === currentUid : message.alan === currentEmail;
}

export function buildConversations(messages, currentUid, currentEmail) {
  const groups = new Map();
  messages.forEach((message) => {
    const uidBased = Boolean(message.gonderenUid && message.alanUid);
    const counterpart = uidBased
      ? (message.gonderenUid === currentUid ? message.alanUid : message.gonderenUid)
      : (message.gonderen === currentEmail ? message.alan : message.gonderen);
    if (!counterpart) return;
    const key = `${message.ilanId || "genel"}_${counterpart}`;
    if (!groups.has(key)) groups.set(key, {
      key,
      ilanId: message.ilanId || "",
      ilanBaslik: message.ilanBaslik || "Genel Sohbet",
      counterpart,
      uidBased,
      messages: []
    });
    groups.get(key).messages.push(message);
  });

  return [...groups.values()].map((conversation) => {
    const sortedMessages = [...conversation.messages].sort((a, b) => messageTimeValue(a.tarih) - messageTimeValue(b.tarih));
    return {
      ...conversation,
      messages: sortedMessages,
      lastMessage: sortedMessages.at(-1),
      unreadCount: sortedMessages.filter((message) => isIncomingMessage(message, currentUid, currentEmail) && message.okundu !== true).length
    };
  }).sort((a, b) => messageTimeValue(b.lastMessage?.tarih) - messageTimeValue(a.lastMessage?.tarih));
}

export function filterConversations(conversations, searchTerm, unreadOnly) {
  const normalized = String(searchTerm || "").trim().toLocaleLowerCase("tr-TR");
  return conversations.filter((conversation) => {
    if (unreadOnly && conversation.unreadCount === 0) return false;
    if (!normalized) return true;
    return [conversation.ilanBaslik, conversation.lastMessage?.mesaj]
      .some((value) => String(value || "").toLocaleLowerCase("tr-TR").includes(normalized));
  });
}

export function messagePreview(message, currentUid, currentEmail, maxLength = 76) {
  const text = String(message?.mesaj || "Mesaj").replace(/\s+/g, " ").trim();
  const shortened = text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
  return `${isOwnMessage(message || {}, currentUid, currentEmail) ? "Siz: " : ""}${shortened}`;
}
