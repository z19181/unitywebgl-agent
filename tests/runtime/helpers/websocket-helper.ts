import { Page } from '@playwright/test';

/**
 * WebSocket helper for PartyGameSDK runtime tests.
 * Wraps a page's WebSocket connection with a message queue.
 */

export interface WSMessage {
  type: string;
  data?: Record<string, unknown>;
}

export class WebSocketHelper {
  private page: Page;
  private messages: WSMessage[] = [];

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Start capturing WebSocket messages from this page.
   * Call before any WS interaction.
   */
  async startCapture(): Promise<void> {
    this.messages = [];
    await this.page.evaluate(() => {
      // Intercept native WebSocket to capture messages
      const OrigWS = (window as any).WebSocket;
      (window as any).__wsMessages = [];
      (window as any).WebSocket = class extends OrigWS {
        constructor(...args: any[]) {
          super(...args);
          this.addEventListener('message', (e: MessageEvent) => {
            try {
              const msg = JSON.parse(e.data);
              (window as any).__wsMessages.push(msg);
            } catch {
              // Non-JSON, ignore
            }
          });
        }
      };
    });
  }

  /**
   * Get all captured WS messages since startCapture().
   */
  async getMessages(): Promise<WSMessage[]> {
    const msgs = await this.page.evaluate(() => {
      return (window as any).__wsMessages || [];
    });
    return msgs;
  }

  /**
   * Wait for a specific message type to appear.
   */
  async waitForType(type: string, timeoutMs = 15000): Promise<WSMessage | null> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const msgs = await this.getMessages();
      const found = msgs.find(m => m.type === type);
      if (found) return found;
      await this.page.waitForTimeout(500);
    }
    return null;
  }

  /**
   * Assert a message type was received.
   */
  async assertReceived(type: string, timeoutMs = 15000): Promise<void> {
    const msg = await this.waitForType(type, timeoutMs);
    if (!msg) {
      throw new Error(`WebSocket message "${type}" not received within ${timeoutMs}ms`);
    }
  }

  /**
   * Assert NO message of type was received.
   */
  async assertNotReceived(type: string, waitMs = 3000): Promise<void> {
    await this.page.waitForTimeout(waitMs);
    const msgs = await this.getMessages();
    const found = msgs.find(m => m.type === type);
    if (found) {
      throw new Error(`Unexpected WebSocket message "${type}" received`);
    }
  }
}
