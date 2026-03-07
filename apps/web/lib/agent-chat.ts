import { Message } from "@/components/chat/chat-message";

export const LOCAL_MESSAGE_ID_PREFIX = "local:";

export function createLocalMessageId(role: Message["role"]): string {
  return `${LOCAL_MESSAGE_ID_PREFIX}${role}:${crypto.randomUUID()}`;
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

  return previous.map((message) => {
    if (!isLocalMessageId(message.id)) {
      return message;
    }

    const nextSavedIndex = savedQueue.findIndex(
      (saved) => saved.role === message.role && saved.content === message.content,
    );
    if (nextSavedIndex === -1) {
      return message;
    }

    const [saved] = savedQueue.splice(nextSavedIndex, 1);
    return saved;
  });
}
