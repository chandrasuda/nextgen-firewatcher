export = {
  SensorData,
  ProcessedData
};

export interface SensorData {
  batteryLevel: number;
  gps: Position;
  orientation: {
    roll: number;
    pitch: number;
    yaw: number;
  };
}

export interface ProcessedData {
  timestamp: string;
  imageUrl: string;
  analysis: string;
  detections?: VisionDetection[];
}

export interface Position {
  lat: number;
  lon: number;
  alt: number;
}

export interface MissionItem {
  type: 'TAKEOFF' | 'WAYPOINT' | 'LAND' | 'RTL';
  position?: Position;
  params?: Record<string, any>;
}

export interface VisionDetection {
  label: string;
  confidence: number;
  bbox: [number, number, number, number];
} 