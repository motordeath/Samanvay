const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws';

export class CoordinationSocket {
  private socket: WebSocket | null = null;
  private messageHandlers: Set<(data: any) => void> = new Set();

  connect(orgId: string, token: string) {
    if (this.socket) return;
    
    // Using query params for auth since WebSockets in browser don't support custom headers directly
    this.socket = new WebSocket(`${WS_BASE_URL}?orgId=${orgId}&token=${token}`);

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.messageHandlers.forEach(handler => handler(data));
      } catch (e) {
        console.error('Failed to parse websocket message', e);
      }
    };

    this.socket.onclose = () => {
      console.log('Websocket connection closed');
      this.socket = null;
    };
  }

  subscribe(handler: (data: any) => void) {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  send(action: string, payload: any) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ action, payload }));
    } else {
      console.error('Socket is not connected');
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}
