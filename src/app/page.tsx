"use client";

import { useState, useEffect, useRef } from "react";
import moment from "moment";
import { Camera, Navigation2, Wind, Layers, Eye, Compass } from "lucide-react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
} from "recharts";

type ViewType = "normal" | "thermal" | "segmented" | "augmented";

interface VideoFeed {
  id: string;
  name: string;
  type: "drone" | "glasses";
  status: "online" | "offline";
  currentView: ViewType;
  videoURLs: {
    normal: string;
    thermal: string;
    segmented: string;
    augmented: string;
  };
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
    { id: 1, location: "Entry Point A", status: "explored", timestamp: "10:30 AM", time: 1 },
    { id: 2, location: "North Corridor", status: "critical", timestamp: "10:32 AM", time: 4 },
    { id: 3, location: "East Wing", status: "pending", timestamp: "10:35 AM", time: 10 },
    { id: 4, location: "Central Hall", status: "critical", timestamp: "10:37 AM", time: 15 },
    { id: 5, location: "West Section", status: "pending", timestamp: "10:40 AM", time: 20 },
  ];
};

const tempDataPoints = [
  { time: 3, temp: 100 },
  { time: 7, temp: 350 },
  { time: 10, temp: 450 },
  { time: 12, temp: 200 },
  { time: 15, temp: 600 },
  { time: 17, temp: 300 },
  { time: 20, temp: 750 },
  { time: 22, temp: 700 },
  { time: 24, temp: 650 },
  { time: 27, temp: 550 },
  { time: 30, temp: 450 },
  { time: 35, temp: 400 },
  { time: 40, temp: 380 },
];

function getTemperatureAtTime(t: number): number {
  if (t <= tempDataPoints[0].time) return tempDataPoints[0].temp;
  for (let i = 0; i < tempDataPoints.length - 1; i++) {
    const current = tempDataPoints[i];
    const next = tempDataPoints[i + 1];
    if (t >= current.time && t <= next.time) {
      const ratio = (t - current.time) / (next.time - current.time);
      const interpolated = current.temp + ratio * (next.temp - current.temp);
      const noise = Math.random() * 5 - 2.5; // ±2.5°F noise
      return Math.round(interpolated + noise);
    }
  }
  const noise = Math.random() * 5 - 2.5;
  return tempDataPoints[tempDataPoints.length - 1].temp + noise;
}

function getHeartRateAtTime(t: number): number {
  // Very smooth, slow-changing base heart rate
  const baseHR = 85 + 
    12 * Math.sin(t * 0.1) +  // Very slow primary oscillation (120 sec period)
    6 * Math.sin(t * 0.15) +   // Even slower secondary variation (300 sec period)
    3 * Math.sin(t * 0.2);     // Slight faster variation for natural feel

  // Tiny amount of noise for organic feel
  const noise = Math.sin(t * 0.8) * 0.5; // Smooth, continuous variation

  // Keep heart rate in a realistic range
  return Math.min(130, Math.max(75, Math.round(baseHR + noise)));
}

export default function Page() {
  const [feeds, setFeeds] = useState<VideoFeed[]>([
    {
      id: "glasses-1",
      name: "Team Leader",
      type: "glasses",
      status: "online",
      currentView: "normal",
      videoURLs: {
        thermal: "https://halokeys.com/media/user_upload/de3ce92f1b4c44329b4483c68868c321/rawfire-VEED.mp4",
        segmented: "https://halokeys.com/media/user_upload/fceafdc9c8044418b90aa950ffafb923/sam2_masked_video_1739673702786.mp4",
        normal: "https://halokeys.com/media/user_upload/283e769660a644798f0eb091a662813e/rawfire.mp4",
        augmented: "https://halokeys.com/media/user_upload/de3ce92f1b4c44329b4483c68868c321/rawfire-VEED.mp4",
      },
    }, 
    {
      id: "drones-1",
      name: "Drone 1",
      type: "drone",
      status: "online",
      currentView: "normal",
      videoURLs: {
        thermal: "https://docs.halokeys.com/media/user_upload/e41fc88fb52a43acbf3d90b46d388ed5/drone_view_2-VEED.mp4",
        segmented: "https://halokeys.com/media/user_upload/fceafdc9c8044418b90aa950ffafb923/sam2_masked_video_1739673702786.mp4",
        normal: "https://docs.halokeys.com/media/user_upload/012a7571c6b44e4f9090290c673ad413/drone_view_2.mp4",
        augmented: "https://halokeys.com/media/user_upload/de3ce92f1b4c44329b4483c68868c321/rawfire-VEED.mp4",
      },
    },
  ]);
  const [pathData] = useState<PathPoint[]>(generateDummyPathData());
  const [sensorData, setSensorData] = useState<SensorData[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // A ref for the research paper anchor
  const researchPaperRef = useRef<HTMLDivElement>(null);

  const scrollToPaper = () => {
    researchPaperRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Update currentTime based on drone video time
  useEffect(() => {
    const videoElement = videoRefs.current["drones-1"];
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
    const videoElement = videoRefs.current["drones-1"];
    const canvasElement = canvasRef.current;
    const context = canvasElement?.getContext("2d");

    const analyzeFrame = () => {
      if (videoElement && context && canvasElement) {
        context.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
        const temperature = getTemperatureAtTime(videoElement.currentTime);
        const heartRate = getHeartRateAtTime(videoElement.currentTime);
        const timestamp = videoElement.currentTime * 1000;
        console.log({ temperature, heartRate, timestamp })
        setSensorData((prevData) => [...prevData, { temperature, heartRate, timestamp }]);
      }
      requestAnimationFrame(analyzeFrame);
    };

    if (videoElement && context) {
      requestAnimationFrame(analyzeFrame);
    }
  }, []);

  const handleViewChange = (feedId: string, view: ViewType) => {
    setFeeds((prevFeeds) =>
      prevFeeds.map((feed) => {
        if (feed.id === feedId) {
          return { ...feed, currentView: view };
        }
        return feed;
      })
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
                src={feed.videoURLs[feed.currentView]}
                key={feed.videoURLs[feed.currentView]} // force reload when source changes
                className="rounded-lg w-full h-full"
                autoPlay
                muted
                style={{ transform: "scale(1.28)", transformOrigin: "center" }}
              />
              <div
                className={`absolute inset-0 flex items-center justify-center ${
                  feed.currentView ? "hidden" : ""
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
                  <Camera className="w-4 h-4 inline-block mr-1" />
                  Thermal
                </button>
                <button
                  onClick={() => handleViewChange(feed.id, "segmented")}
                  className={`feed-button ${feed.currentView === "segmented" ? "active" : ""}`}
                >
                  <Camera className="w-4 h-4 inline-block mr-1" />
                  Segmented
                </button>
                <button
                  onClick={() => handleViewChange(feed.id, "augmented")}
                  className={`feed-button ${feed.currentView === "augmented" ? "active" : ""}`}
                >
                  <Camera className="w-4 h-4 inline-block mr-1" />
                  Augmented
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  <div className="border-t border-gray-800 my-12" />


  const renderPathTimeline = () => {
    const activeCount = pathData.filter((point) => currentTime >= point.time).length;
  
    return (
      <div className="w-full rounded-lg bg-card p-4">
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

  const renderInteractiveSections = () => (
    <div className="space-y-6 mt-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* WhatsApp Live Videos Card */}
        <div className="p-4 border rounded-lg shadow-lg bg-gray-900 hover:shadow-2xl transition-all transform hover:-translate-y-1">
          <h3 className="text-xl font-bold text-white mb-2">WhatsApp Live Videos</h3>
          <video 
            src="https://docs.halokeys.com/media/user_upload/61ea770dff2c4a8cbcc5c238e3c806d3/whatsapp1.mp4" 
            autoPlay muted loop 
            className="w-full rounded mb-4"
          />
          <video 
            src="https://docs.halokeys.com/media/user_upload/ae96f54397b840e88cdf87a63338d3f0/whatsapp2.mp4" 
            autoPlay muted loop 
            className="w-full rounded"
          />
        </div>
        {/* Edge Compute Live Video Card */}
        <div className="p-4 border rounded-lg shadow-lg bg-gray-900 hover:shadow-2xl transition-all transform hover:-translate-y-1">
          <h3 className="text-xl font-bold text-white mb-2">Edge Compute Live Video</h3>
          <video 
            src="https://docs.halokeys.com/media/user_upload/fa4012fce297476385a73c2b25d87de2/edgecompute.mp4" 
            autoPlay muted loop 
            className="w-full rounded"
          />
        </div>
        {/* Backend Technology Stack Card */}
        <div className="p-4 border rounded-lg shadow-lg bg-gray-900 hover:shadow-2xl transition-all transform hover:-translate-y-1">
          <h3 className="text-xl font-bold text-white mb-2">Backend Technology Stack</h3>
          <p className="text-slate-300">
            Currently on our demo viewing platform.
          </p>
          <div className="mt-2 space-y-2">
            <div className="p-2 bg-gray-900 rounded hover:bg-gray-800 transition-colors">
              <h4 className="text-lg font-semibold text-white">Edge Compute</h4>
              <p className="text-xs text-gray-300">Utilizes edge compute for rapid data processing.</p>
            </div>
            <div className="p-2 bg-gray-900 rounded hover:bg-gray-800 transition-colors">
              <h4 className="text-lg font-semibold text-white">AI Analytics</h4>
              <p className="text-xs text-gray-300">Incorporates AI-core analytics for smart alerting.</p>
            </div>
            <div className="p-2 bg-gray-900 rounded hover:bg-gray-800 transition-colors">
              <h4 className="text-lg font-semibold text-white">Live Data Feeds</h4>
              <p className="text-xs text-gray-300">Feeds live sensor and video data to operators.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen p-6 animate-fade-in w-full">
  {/* Header */}
  <header className="mb-8 flex items-center justify-between w-full">
    <img src="/logo.png" alt="Logo" className="h-10 mr-4" />
    <div>
      <h1 className="text-3xl font-bold text-white">PUSHPA FIRE</h1>
      <p className="text-slate-400">Real-time surveillance and monitoring system for the next generation of firefighters</p>
    </div>
    <button
      onClick={scrollToPaper}
      className="px-6 py-3 bg-primary text-white font-semibold rounded hover:bg-primary/80 transition-colors"
    >
      Research Paper
    </button>
  </header>

  {/* Add divider after header */}
  <div className="border-t border-gray-800 my-8" />

  {/* Main content */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    <div className="space-y-8">
      {renderFeedSection("glasses")}
      <div className="space-y-6">
        {/* Add divider after feeds */}
        <div className="border-t border-gray-800 my-8" />
        <h2 className="text-xl font-semibold text-white">Critical Path Timeline</h2>
        {renderPathTimeline()}
        <h2 className="text-xl font-semibold text-white mb-4">Sensor Analytics</h2>
        {renderSensorDashboard()}
      </div>
    </div>
    <div className="space-y-8">
      {renderFeedSection("drone")}
      {/* Add divider after feeds */}
      <div className="border-t border-gray-800 my-8" />
      {renderInteractiveSections()}
    </div>
  </div>
  
  {/* Rest of the content remains the same */}
      <canvas ref={canvasRef} width="640" height="360" style={{ display: "none" }}></canvas>

    
<div className="border-t border-gray-800 my-12" />

      {/* Demo Video Section */}
<div className="mt-12 mb-12">
  <h2 className="text-3xl font-bold text-white mb-4">Demo Video</h2>
  <div className="aspect-w-10 aspect-h-9">
    <iframe
      src="https://www.youtube.com/embed/-p4GfOiM0GY"
      title="PUSHPA Fire Demo Video"
      className="w-full h-[600px] rounded-lg"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
    ></iframe>
  </div>
</div>

<div className="border-t border-gray-800 my-12" />

      

      {/* Research Paper Section */}
      <div ref={researchPaperRef} id="research-paper" className="mt-12">
        <h2 className="text-3xl font-bold text-white mb-4">Research Paper</h2>
        <div className="border rounded-lg overflow-hidden shadow-lg">
          <iframe
            src="/Article_Title.pdf"
            className="w-full h-[1000px]"
            title="Research Paper"
          ></iframe>
        </div>
      </div>
    </div>
  );
}
