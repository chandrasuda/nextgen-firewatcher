import WebSocket from 'ws';
import { SensorData, ProcessedData } from './types';

export class WebSocketServer {
  private wss: WebSocket.Server;
  private clients: Set<WebSocket> = new Set();

  constructor(port: number) {
    this.wss = new WebSocket.Server({ port });
    this.setupWebSocket();
  }

  private setupWebSocket(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      this.clients.add(ws);

      ws.on('close', () => {
        this.clients.delete(ws);
      });
    });
  }

  broadcastSensorData(data: SensorData): void {
    const message = JSON.stringify({
      type: 'SENSOR_DATA',
      data
    });

    this.broadcast(message);
  }

  broadcastProcessedData(data: ProcessedData): void {
    const message = JSON.stringify({
      type: 'PROCESSED_DATA',
      data
    });

    this.broadcast(message);
  }

  private broadcast(message: string): void {
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }
} 