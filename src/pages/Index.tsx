import { useState } from "react";
import { Camera, Layers, Wind, Eye, Navigation2, Compass } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

type ViewType = "normal" | "thermal" | "segmented" | "depth" | "augmented";

interface VideoFeed {
  id: string;
  name: string;
  type: "drone" | "glasses";
  status: "online" | "offline";
  currentView: ViewType;
}

interface PathPoint {
  id: number;
  location: string;
  status: "explored" | "critical" | "pending";
  timestamp: string;
}

interface SensorData {
  timestamp: number;
  accelerometer: { x: number; y: number; z: number };
  gyroscope: { x: number; y: number; z: number };
}

const generateDummyPathData = (): PathPoint[] => {
  return [
    { id: 1, location: "Entry Point A", status: "explored", timestamp: "10:30 AM" },
    { id: 2, location: "North Corridor", status: "critical", timestamp: "10:32 AM" },
    { id: 3, location: "East Wing", status: "pending", timestamp: "10:35 AM" },
    { id: 4, location: "Central Hall", status: "critical", timestamp: "10:37 AM" },
    { id: 5, location: "West Section", status: "pending", timestamp: "10:40 AM" },
    // Add more path points as needed
  ];
};

const generateSensorData = (count: number): SensorData[] => {
  const data: SensorData[] = [];
  const now = Date.now();
  for (let i = 0; i < count; i++) {
    data.push({
      timestamp: now - (count - i) * 1000,
      accelerometer: {
        x: Math.sin(i * 0.5) * 2,
        y: Math.cos(i * 0.5) * 2,
        z: Math.sin(i * 0.3) * 1.5,
      },
      gyroscope: {
        x: Math.sin(i * 0.2) * 45,
        y: Math.cos(i * 0.2) * 45,
        z: Math.sin(i * 0.1) * 30,
      },
    });
  }
  return data;
};

const Index = () => {
  const [feeds, setFeeds] = useState<VideoFeed[]>([
    { id: "drone-1", name: "Drone Alpha", type: "drone", status: "online", currentView: "normal" },
    { id: "drone-2", name: "Drone Beta", type: "drone", status: "online", currentView: "normal" },
    { id: "glasses-1", name: "Team Leader", type: "glasses", status: "online", currentView: "normal" },
    { id: "glasses-2", name: "Squad Member 1", type: "glasses", status: "online", currentView: "normal" },
  ]);
  const [pathData] = useState<PathPoint[]>(generateDummyPathData());
  const [sensorData] = useState<SensorData[]>(generateSensorData(50));

  const handleViewChange = (feedId: string, view: ViewType) => {
    setFeeds(feeds.map(feed => 
      feed.id === feedId ? { ...feed, currentView: view } : feed
    ));
  };

  const renderFeedSection = (type: "drone" | "glasses") => {
    const sectionFeeds = feeds.filter(feed => feed.type === type);
    const title = type === "drone" ? "Drone Feeds" : "Meta Glasses Feeds";
    
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">
            {title}
          </h2>
          <div className="status-indicator online">
            <span>All Systems Operational</span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sectionFeeds.map((feed) => (
            <div key={feed.id} className="video-feed animate-fade-in">
              <div className="absolute inset-0 flex items-center justify-center">
                <Camera className="w-12 h-12 text-white/20" />
              </div>
              <div className="video-feed-controls">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-white">{feed.name}</span>
                  <div className="status-indicator online">
                    <span>Live</span>
                  </div>
                </div>
                <div className="mt-2 flex gap-2 flex-wrap">
                  <button
                    onClick={() => handleViewChange(feed.id, "normal")}
                    className={`feed-button ${feed.currentView === "normal" ? "active" : ""}`}
                  >
                    <Camera className="w-4 h-4 inline-block mr-1" />
                    Normal
                  </button>
                  <button
                    onClick={() => handleViewChange(feed.id, "thermal")}
                    className={`feed-button ${feed.currentView === "thermal" ? "active" : ""}`}
                  >
                    <Wind className="w-4 h-4 inline-block mr-1" />
                    Thermal
                  </button>
                  <button
                    onClick={() => handleViewChange(feed.id, "segmented")}
                    className={`feed-button ${feed.currentView === "segmented" ? "active" : ""}`}
                  >
                    <Layers className="w-4 h-4 inline-block mr-1" />
                    Segmented
                  </button>
                  <button
                    onClick={() => handleViewChange(feed.id, "augmented")}
                    className={`feed-button ${feed.currentView === "augmented" ? "active" : ""}`}
                  >
                    <Eye className="w-4 h-4 inline-block mr-1" />
                    Augmented
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderPathTimeline = () => (
    <ScrollArea className="h-[200px] w-full rounded-lg bg-card p-4">
      <div className="space-y-4">
        {pathData.map((point) => (
          <div
            key={point.id}
            className={`flex items-center p-3 rounded-lg transition-all animate-fade-in
              ${point.status === 'critical' ? 'bg-red-500/10' : 
                point.status === 'explored' ? 'bg-green-500/10' : 'bg-blue-500/10'}`}
          >
            <div className="flex-shrink-0">
              <Navigation2 className={`w-5 h-5 
                ${point.status === 'critical' ? 'text-red-500' : 
                  point.status === 'explored' ? 'text-green-500' : 'text-blue-500'}`} 
              />
            </div>
            <div className="ml-4 flex-grow">
              <div className="flex justify-between items-center">
                <span className="font-medium text-white">{point.location}</span>
                <span className="text-sm text-slate-400">{point.timestamp}</span>
              </div>
              <span className="text-sm text-slate-400 capitalize">{point.status}</span>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );

  const renderSensorDashboard = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
      <div className="bg-card rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Accelerometer Data</h3>
          <Compass className="w-5 h-5 text-primary" />
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={sensorData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="timestamp" stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" />
            <Line type="monotone" dataKey="accelerometer.x" stroke="#FF6B2C" dot={false} />
            <Line type="monotone" dataKey="accelerometer.y" stroke="#2DD4BF" dot={false} />
            <Line type="monotone" dataKey="accelerometer.z" stroke="#818CF8" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      <div className="bg-card rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Gyroscope Data</h3>
          <Navigation2 className="w-5 h-5 text-secondary" />
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={sensorData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="timestamp" stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" />
            <Line type="monotone" dataKey="gyroscope.x" stroke="#FF6B2C" dot={false} />
            <Line type="monotone" dataKey="gyroscope.y" stroke="#2DD4BF" dot={false} />
            <Line type="monotone" dataKey="gyroscope.z" stroke="#818CF8" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen p-6 animate-fade-in">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">NextGen Firefighters</h1>
        <p className="text-slate-400">Real-time surveillance and monitoring system</p>
      </header>
      
      <div className="space-y-8">
        {renderFeedSection("drone")}
        {renderFeedSection("glasses")}
        
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-white">Critical Path Timeline</h2>
          {renderPathTimeline()}
        </div>
        
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">Sensor Analytics</h2>
          {renderSensorDashboard()}
        </div>
      </div>
    </div>
  );
};

export default Index;
