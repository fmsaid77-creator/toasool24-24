import { ChatMessage, UserProfile } from '../types/tawasol';

type EventCallback = (data: any) => void;

class ClientSyncManager {
  private ws: WebSocket | null = null;
  private bc: BroadcastChannel | null = null;
  private listeners = new Map<string, Set<EventCallback>>();
  private currentNumber: string | null = null;
  private isConnecting = false;
  private reconnectTimer: NodeJS.Timeout | null = null;

  // WebRTC Peer Connection for real voice calls
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteAudio: HTMLAudioElement | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.bc = new BroadcastChannel('tawasol24_bus');
        this.bc.onmessage = (event) => {
          this.handleIncomingEvent(event.data);
        };
      } catch (err) {
        console.warn('BroadcastChannel error:', err);
      }
    }
  }

  public register(user: UserProfile) {
    this.currentNumber = user.number;
    this.connectWebSocket();
    this.emitLocalBus({
      type: 'USER_STATUS_CHANGE',
      number: user.number,
      isOnline: true,
      lastSeen: Date.now(),
      user,
    });
  }

  public updateProfile(user: UserProfile) {
    this.currentNumber = user.number;
    this.send({
      type: 'REGISTER_CLIENT',
      number: user.number,
      name: user.name,
      avatar: user.avatar,
      statusMessage: user.statusMessage,
    });
  }

  private connectWebSocket() {
    if (!this.currentNumber || typeof window === 'undefined') return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      this.isConnecting = true;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnecting = false;
        if (this.currentNumber) {
          const storedUser = localStorage.getItem('tawasol24_user');
          const parsed = storedUser ? JSON.parse(storedUser) : null;
          this.ws?.send(JSON.stringify({
            type: 'REGISTER_CLIENT',
            number: this.currentNumber,
            name: parsed?.name,
            avatar: parsed?.avatar,
            statusMessage: parsed?.statusMessage,
          }));
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          this.handleIncomingEvent(parsed);
        } catch (err) {
          console.error('WS Parse error:', err);
        }
      };

      this.ws.onclose = () => {
        this.isConnecting = false;
        // Auto-reconnect quickly after disconnect
        if (!this.reconnectTimer) {
          this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connectWebSocket();
          }, 1500);
        }
      };

      this.ws.onerror = () => {
        this.isConnecting = false;
      };
    } catch (err) {
      this.isConnecting = false;
      console.warn('WS Init failed:', err);
    }
  }

  public send(payload: any) {
    // Send through WebSocket if open
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
    // Also emit through BroadcastChannel for immediate multi-tab sync
    this.emitLocalBus(payload);
  }

  private emitLocalBus(payload: any) {
    if (this.bc) {
      try {
        this.bc.postMessage(payload);
      } catch (err) {
        console.warn('Local bus post failed:', err);
      }
    }
  }

  private handleIncomingEvent(data: any) {
    if (!data || !data.type) return;

    // Handle internal routing for BroadcastChannel events
    if (data.type === 'SEND_MESSAGE') {
      // Delivered to matching recipient
      if (data.to === this.currentNumber || data.to === 'global') {
        const msg: ChatMessage = {
          id: data.id || `msg_${Date.now()}`,
          from: data.from,
          to: data.to,
          content: data.content,
          contentType: data.contentType,
          mediaUrl: data.mediaUrl,
          duration: data.duration,
          fileName: data.fileName,
          fileSize: data.fileSize,
          timestamp: Date.now(),
          status: 'delivered',
        };
        this.trigger('NEW_MESSAGE', { message: msg });
      }
      return;
    }

    if (data.type === 'CALL_INITIATE') {
      if (data.to === this.currentNumber) {
        this.trigger('INCOMING_CALL', data);
      }
      return;
    }

    if (data.type === 'CALL_ACCEPT') {
      if (data.to === this.currentNumber) {
        this.trigger('CALL_ACCEPTED', data);
      }
      return;
    }

    if (data.type === 'CALL_REJECT') {
      if (data.to === this.currentNumber) {
        this.trigger('CALL_REJECTED', data);
      }
      return;
    }

    if (data.type === 'CALL_END') {
      if (data.to === this.currentNumber) {
        this.trigger('CALL_ENDED', data);
      }
      return;
    }

    if (data.type === 'TYPING_INDICATOR') {
      if (data.to === this.currentNumber) {
        this.trigger('USER_TYPING', data);
      }
      return;
    }

    if (data.type === 'MARK_MESSAGES_READ') {
      if (data.to === this.currentNumber) {
        this.trigger('MESSAGE_STATUS_UPDATE', {
          status: 'read',
          from: data.from,
          messageIds: data.messageIds,
        });
      }
      return;
    }

    // Default: pass to subscribers
    this.trigger(data.type, data);
  }

  public on(event: string, callback: EventCallback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => this.off(event, callback);
  }

  public off(event: string, callback: EventCallback) {
    this.listeners.get(event)?.delete(callback);
  }

  private trigger(event: string, data: any) {
    this.listeners.get(event)?.forEach((cb) => {
      try {
        cb(data);
      } catch (err) {
        console.error(`Listener error for ${event}:`, err);
      }
    });
  }

  // Audio & Video Call Streaming
  public async setupLocalAudio(withVideo: boolean = false): Promise<MediaStream | null> {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        this.localStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: withVideo ? { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } : false,
        });
        return this.localStream;
      }
    } catch (err) {
      console.warn('Media permission not granted or available:', err);
      // Fallback: try audio only if video failed
      if (withVideo) {
        try {
          this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          return this.localStream;
        } catch {
          // Both failed
        }
      }
    }
    return null;
  }

  public getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  public stopLocalAudio() {
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
  }

  public toggleMute(muted: boolean) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    }
  }

  public toggleVideoMute(videoMuted: boolean) {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach((track) => {
        track.enabled = !videoMuted;
      });
    }
  }
}

export const syncClient = new ClientSyncManager();
