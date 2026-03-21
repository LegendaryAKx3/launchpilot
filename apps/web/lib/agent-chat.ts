import { Message } from "@/components/chat/chat-message";

export const LOCAL_MESSAGE_ID_PREFIX = "local:";

let _localSeq = 0;

export function createLocalMessageId(role: Message["role"]): string {
  _localSeq += 1;
  return `${LOCAL_MESSAGE_ID_PREFIX}${role}:${_localSeq}:${crypto.randomUUID()}`;
}

export function isLocalMessageId(id: string): boolean {
  return id.startsWith(LOCAL_MESSAGE_ID_PREFIX);
}

export function mergeSavedMessages(previous: Message[], persisted: Array<{ id: string; role: string; content: string; timestamp: string }>): Message[] {
  const savedQueue = persisted.map((message) => ({
    id: message.id,
    role: message.role as Message["role"],
    content: message.content,
    timestamp: new Date(message.timestamp),
  }));

  // Track which saved messages have been matched so we don't double-match
  const matched = new Set<number>();

  return previous.map((message) => {
    if (!isLocalMessageId(message.id)) {
      return message;
    }

    // Match by role, content, AND sequence order to avoid merging duplicates
    const nextSavedIndex = savedQueue.findIndex(
      (saved, idx) => !matched.has(idx) && saved.role === message.role && saved.content === message.content,
    );
    if (nextSavedIndex === -1) {
      return message;
    }

    matched.add(nextSavedIndex);
    return savedQueue[nextSavedIndex];
  });
}
