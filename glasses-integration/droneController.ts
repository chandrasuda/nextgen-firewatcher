import { MAVLink20Processor } from 'node-mavlink';
import { MissionItem, Position } from './types';

export class DroneController {
  private mavlink: MAVLink20Processor;
  private connected: boolean = false;

  constructor(port: string) {
    this.mavlink = new MAVLink20Processor();
    this.initializeConnection(port);
  }

  async takeoff(altitude: number): Promise<boolean> {
    if (!this.connected) return false;
    
    try {
      await this.mavlink.sendCommand('CMD_NAV_TAKEOFF', {
        altitude: altitude,
        pitch: 15, // 15 degree pitch for takeoff
      });
      return true;
    } catch (error) {
      console.error('Takeoff failed:', error);
      return false;
    }
  }

  async gotoLocation(position: Position): Promise<boolean> {
    if (!this.connected) return false;

    try {
      await this.mavlink.sendCommand('CMD_NAV_WAYPOINT', {
        latitude: position.lat,
        longitude: position.lon,
        altitude: position.alt,
      });
      return true;
    } catch (error) {
      console.error('Navigation failed:', error);
      return false;
    }
  }

  async land(): Promise<boolean> {
    if (!this.connected) return false;

    try {
      await this.mavlink.sendCommand('CMD_NAV_LAND', {});
      return true;
    } catch (error) {
      console.error('Landing failed:', error);
      return false;
    }
  }

  private async initializeConnection(port: string): Promise<void> {
    try {
      // Initialize MAVLink connection
      this.connected = true;
    } catch (error) {
      console.error('Failed to initialize drone connection:', error);
    }
  }
} 