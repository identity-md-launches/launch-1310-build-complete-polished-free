export const PROTOCOL = 'pepe-game/1';
export type BridgeAction = 'pause' | 'resume';

/** Origin may be "null" in a sandbox; source identity and channel are mandatory. */
export class ParentBridge {
  channel: string | null = null;
  origin = '*';
  private onAction: (action: BridgeAction) => void;
  private host: Window;
  private parent: Window;
  constructor(host: Window, onAction: (action: BridgeAction) => void) {
    this.host = host;
    this.parent = host.parent;
    this.onAction = onAction;
    host.addEventListener('message', this.receive);
  }
  receive = (event: MessageEvent) => {
    if (this.parent === this.host || event.source !== this.parent) return;
    const data: unknown = event.data;
    if (!data || typeof data !== 'object' || Array.isArray(data)) return;
    const message = data as Record<string, unknown>;
    if (message.protocol !== PROTOCOL || typeof message.channel !== 'string' || !message.channel.length || message.channel.length > 256) return;
    if (message.type === 'init') {
      this.channel = message.channel;
      this.origin = event.origin && event.origin !== 'null' ? event.origin : '*';
      this.send('ready');
    } else if (this.channel !== null && message.channel === this.channel && (message.type === 'pause' || message.type === 'resume')) {
      this.onAction(message.type);
    }
  };
  send(type: 'ready' | 'gameover', score?: number) {
    if (this.channel === null || this.parent === this.host) return;
    const message = type === 'gameover'
      ? { protocol: PROTOCOL, type, channel: this.channel, score: Math.max(0, Math.trunc(score ?? 0)) }
      : { protocol: PROTOCOL, type, channel: this.channel };
    this.parent.postMessage(message, this.origin);
  }
  destroy() { this.host.removeEventListener('message', this.receive); }
}
