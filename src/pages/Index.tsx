
import { useState } from "react";
import { Camera, Layers, Wind, Eye } from "lucide-react";

type ViewType = "normal" | "thermal" | "segmented" | "depth" | "augmented";

interface VideoFeed {
  id: string;
  name: string;
  type: "drone" | "glasses";
  status: "online" | "offline";
  currentView: ViewType;
}

const Index = () => {
  const [feeds, setFeeds] = useState<VideoFeed[]>([
    { id: "drone-1", name: "Drone Alpha", type: "drone", status: "online", currentView: "normal" },
    { id: "drone-2", name: "Drone Beta", type: "drone", status: "online", currentView: "normal" },
    { id: "glasses-1", name: "Team Leader", type: "glasses", status: "online", currentView: "normal" },
    { id: "glasses-2", name: "Squad Member 1", type: "glasses", status: "online", currentView: "normal" },
  ]);

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

  return (
    <div className="min-h-screen p-6 animate-fade-in">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">NextGen Firefighters</h1>
        <p className="text-slate-400">Real-time surveillance and monitoring system</p>
      </header>
      
      <div className="space-y-8">
        {renderFeedSection("drone")}
        {renderFeedSection("glasses")}
      </div>
    </div>
  );
};

export default Index;
