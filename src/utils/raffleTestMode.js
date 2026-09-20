export const RAFFLE_TEST_PARTICIPANTS = Object.freeze([
  { id: "test-ahmet", displayName: "Ahmet K.", giftHint: "Kitapları ve kahveyi severim." },
  { id: "test-ayse", displayName: "Ayşe T.", giftHint: "Mum, dekorasyon ve küçük sürprizleri severim." },
  { id: "test-mehmet", displayName: "Mehmet D.", giftHint: "Teknoloji ve masaüstü aksesuarlarını severim." }
]);

export function createCircularTestMatches(participants = RAFFLE_TEST_PARTICIPANTS) {
  if (participants.length < 2) return [];
  return participants.map((giver, index) => {
    const recipient = participants[(index + 1) % participants.length];
    return {
      giverId: giver.id,
      giverDisplayName: giver.displayName,
      recipientId: recipient.id,
      recipientDisplayName: recipient.displayName,
      recipientGiftHint: recipient.giftHint
    };
  });
}

export function getTestResult(matches, participantId) {
  const match = matches.find((item) => item.giverId === participantId);
  return match ? { displayName: match.recipientDisplayName, giftHint: match.recipientGiftHint } : null;
}
