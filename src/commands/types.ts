export type CommandContext = {
  senderId: string;
  messageText: string;
  args: string[];
  event?: any;
  send: (text: string) => Promise<void>;
  connectDB?: () => Promise<any>;
  Knowledge?: any;
  Message?: any;
  generateAnswer?: (systemPrompt: string, contexts: string[], question: string) => Promise<string>;
  getUserName?: (id: string) => Promise<string | null>;
};
