export = {
  SensorData,
  ProcessedData
};

export interface SensorData {
  timestamp: number;
  temperature: number;
  heartRate: number;
  oxygenLevel: number;
  location: {
    lat: number;
    lng: number;
    altitude: number;
  };
}

export interface ProcessedData {
  timestamp: string;
  imageUrl: string;
  analysis: string;
} 