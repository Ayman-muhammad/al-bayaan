import { useState } from "react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import ChatInterface from "@/components/ChatInterface";
import AudioLibrary from "@/components/AudioLibrary";

type View = "home" | "chat" | "audio";

const Index = () => {
  const [currentView, setCurrentView] = useState<View>("home");

  return (
    <div className="min-h-screen bg-background">
      {currentView === "home" && (
        <>
          <Navbar currentView={currentView} onNavigate={setCurrentView} />
          <div className="pt-14">
            <HeroSection onStartChat={() => setCurrentView("chat")} />
          </div>
        </>
      )}

      {currentView === "chat" && (
        <ChatInterface onBack={() => setCurrentView("home")} />
      )}

      {currentView === "audio" && (
        <AudioLibrary onBack={() => setCurrentView("home")} />
      )}
    </div>
  );
};

export default Index;
