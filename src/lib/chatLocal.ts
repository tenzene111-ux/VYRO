// "Delete for me" is a per-device preference, not a shared record — it only
// hides the message in this browser's view, matching how Telegram treats it.

function hiddenKey(userId: string) {
  return `vyro-hidden-messages-${userId}`;
}

export function loadHiddenMessages(userId: string): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(hiddenKey(userId)) ?? "[]"));
  } catch {
    return new Set();
  }
}

export function hideMessageLocally(userId: string, messageId: string, current: Set<string>): Set<string> {
  const next = new Set(current).add(messageId);
  localStorage.setItem(hiddenKey(userId), JSON.stringify([...next]));
  return next;
}
