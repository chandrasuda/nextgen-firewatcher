"use client";

import { useState, useRef, useEffect } from "react";
import moment from "moment";
import { Camera, Layers, Wind, Eye, Navigation2, Compass } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

type ViewType = "normal" | "thermal" | "segmented" | "depth" | "augmented";

interface VideoFeed {
  id: string;
  name: string;
  type: "drone" | "glasses";
  status: "online" | "offline";
  currentView: ViewType;
  videoURL?: string;
}

interface PathPoint {
  id: number;
  location: string;
  status: "explored" | "critical" | "pending";
  timestamp: string;
  time: number; // Time in seconds when the point should appear
}

interface SensorData {
  timestamp: number;
  temperature: number;
  heartRate: number;
}

const generateDummyPathData = (): PathPoint[] => {
  return [
    { id: 1, location: "Entry Point A", status: "explored", timestamp: "10:30 AM", time: 10 },
    { id: 2, location: "North Corridor", status: "critical", timestamp: "10:32 AM", time: 20 },
    { id: 3, location: "East Wing", status: "pending", timestamp: "10:35 AM", time: 30 },
    { id: 4, location: "Central Hall", status: "critical", timestamp: "10:37 AM", time: 40 },
    { id: 5, location: "West Section", status: "pending", timestamp: "10:40 AM", time: 50 },
    // Add more path points as needed
  ];
};

const Index = () => {
  const [feeds, setFeeds] = useState<VideoFeed[]>([
    {
      id: "drone-1",
      name: "Drone Alpha",
      type: "drone",
      status: "online",
      currentView: "normal",
      videoURL:
        "https://halokeys.com/media/user_upload/283e769660a644798f0eb091a662813e/rawfire.mp4",
    },
    {
      id: "drone-2",
      name: "Drone Beta",
      type: "drone",
      status: "online",
      currentView: "normal",
      videoURL:
        "https://halokeys.com/media/user_upload/fceafdc9c8044418b90aa950ffafb923/sam2_masked_video_1739673702786.mp4",
    },
    {
      id: "glasses-1",
      name: "Team Leader",
      type: "glasses",
      status: "online",
      currentView: "normal",
      videoURL:
        "https://halokeys.com/media/user_upload/de3ce92f1b4c44329b4483c68868c321/rawfire-VEED.mp4",
    },
  ]);
  const [pathData] = useState<PathPoint[]>(generateDummyPathData());
  const [sensorData, setSensorData] = useState<SensorData[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Update currentTime based on drone video time
  useEffect(() => {
    const videoElement = videoRefs.current["drone-1"];
    if (videoElement) {
      const handleTimeUpdate = () => {
        setCurrentTime(videoElement.currentTime);
      };
      videoElement.addEventListener("timeupdate", handleTimeUpdate);
      return () => {
        videoElement.removeEventListener("timeupdate", handleTimeUpdate);
      };
    }
  }, []);

  useEffect(() => {
    // const videoElement = videoRefs.current["drone-1"];
    // const canvasElement = canvasRef.current;
    // const context = canvasElement?.getContext("2d");

    // const analyzeFrame = () => {
    //   if (videoElement && context && canvasElement) {
    //     context.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
    //     const frame = context.getImageData(0, 0, canvasElement.width, canvasElement.height);
    //     const brightness = calculateBrightness(frame.data);
    //     generateSensorData(brightness, videoElement.currentTime);
    //   }
    //   requestAnimationFrame(analyzeFrame);
    // };

    // if (videoElement && context) {
    //   requestAnimationFrame(analyzeFrame);
    // }
  }, []);

  const calculateBrightness = (data: Uint8ClampedArray) => {
    let totalBrightness = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const brightness = (r + g + b) / 3;
      totalBrightness += brightness;
    }
    return totalBrightness / (data.length / 4);
  };

  const generateSensorData = (brightness: number, videoTime: number) => {
    const temperature = brightness / 2; // Example calculation
    const heartRate = brightness / 4; // Example calculation
    const timestamp = videoTime * 1000; // Convert seconds to milliseconds
    setSensorData((prevData) => [
      ...prevData,
      { timestamp, temperature, heartRate },
    ]);
  };

  const handleViewChange = (feedId: string, view: ViewType) => {
    setFeeds((prevFeeds) =>
      prevFeeds.map((feed) =>
        feed.id === feedId ? { ...feed, currentView: view } : feed
      )
    );
  };

  const renderFeedSection = (type: "drone" | "glasses") => {
    const sectionFeeds = feeds.filter((feed) => feed.type === type);
    const title = type === "drone" ? "Drone Feeds" : "Meta Glasses Feeds";

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">{title}</h2>
          <div className="status-indicator online">
            <span>All Systems Operational</span>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6">
          {sectionFeeds.map((feed) => (
            <div key={feed.id} className="relative video-feed animate-fade-in">
              <video
                ref={(el) => {
                  videoRefs.current[feed.id] = el;
                }}
                src={feed.videoURL}
                className={`rounded-lg w-full h-full ${
                  feed.currentView !== "normal" ? "hidden" : ""
                }`}
                autoPlay
                muted
                style={{ transform: "scale(1.25)", transformOrigin: "center" }}
              />
              <div
                className={`absolute inset-0 flex items-center justify-center ${
                  feed.currentView === "normal" ? "hidden" : ""
                }`}
              >
                <Camera className="w-12 h-12 text-white/20" />
              </div>
              <div className="absolute bottom-2 left-2 bg-black/60 rounded px-2 py-1 text-xs text-white">
                {feed.name}
              </div>
              <div className="video-feed-controls p-2">
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
                  className={`feed-button ${
                    feed.currentView === "segmented" ? "active" : ""
                  }`}
                >
                  <Layers className="w-4 h-4 inline-block mr-1" />
                  Segmented
                </button>
                <button
                  onClick={() => handleViewChange(feed.id, "augmented")}
                  className={`feed-button ${
                    feed.currentView === "augmented" ? "active" : ""
                  }`}
                >
                  <Eye className="w-4 h-4 inline-block mr-1" />
                  Augmented
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderPathTimeline = () => {
    // Count only events that are active (visible)
    const activeCount = pathData.filter((point) => currentTime >= point.time).length;
  
    return (
      <div className="w-full rounded-lg bg-card p-4">
        <div>
          {/* Counter header inside the scroll area */}
          <div className="sticky top-0 z-10 text-left bg-card p-2 font-bold text-large text-white">
            Total Events: {activeCount}
          </div>
          <div className="mt-2 flex flex-col-reverse overflow-auto max-h-[200px]">
            {pathData
              .slice()
              .reverse()
              .map((point) => (
              <div
                key={point.id}
                className={`flex items-center my-2 p-3 rounded-lg transition-all animate-fade-in
                ${point.status === "critical" ? "bg-red-500/10" : 
                   point.status === "explored" ? "bg-green-500/10" : "bg-blue-500/10"}
                ${currentTime >= point.time ? "highlight" : "hidden"}`}
              >
                <div className="flex-shrink-0">
                <Navigation2
                  className={`w-5 h-5 ${
                  point.status === "critical"
                    ? "text-red-500"
                    : point.status === "explored"
                    ? "text-green-500"
                    : "text-blue-500"
                  }`}
                />
                </div>
                <div className="ml-4 flex-grow text-left">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-white">{point.location}</span>
                  <span className="text-sm text-slate-400">{point.timestamp}</span>
                </div>
                <span className="text-sm text-slate-400 capitalize">{point.status}</span>
                </div>
              </div>
              ))}
          </div>
        </div>
      </div>
    );
  };
  

  const renderSensorDashboard = () => (
    <div className="grid grid-cols-1 gap-6 mt-6">
      <div className="bg-card rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Temperature Data</h3>
          <Compass className="w-5 h-5 text-primary" />
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={sensorData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis
              dataKey="timestamp"
              stroke="#94a3b8"
              tickFormatter={(tick) => moment(tick).format("mm:ss")}
            />
            <YAxis stroke="#94a3b8" />
            <Tooltip labelFormatter={(label) => moment(label).format("mm:ss")} />
            <Line type="monotone" dataKey="temperature" stroke="#FF6B2C" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-card rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Heart Rate Data</h3>
          <Navigation2 className="w-5 h-5 text-secondary" />
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={sensorData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis
              dataKey="timestamp"
              stroke="#94a3b8"
              tickFormatter={(tick) => moment(tick).format("mm:ss")}
            />
            <YAxis stroke="#94a3b8" />
            <Tooltip labelFormatter={(label) => moment(label).format("mm:ss")} />
            <Line type="monotone" dataKey="heartRate" stroke="#2DD4BF" dot={false} />
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-8">
          {renderFeedSection("glasses")}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white">Critical Path Timeline</h2>
            {renderPathTimeline()}
            <h2 className="text-xl font-semibold text-white mb-4">Sensor Analytics</h2>
            {renderSensorDashboard()}
          </div>
        </div>

        <div className="space-y-8">{renderFeedSection("drone")}</div>
      </div>
      <canvas ref={canvasRef} width="640" height="360" style={{ display: "none" }}></canvas>
    </div>
  );
};

export default Index;
