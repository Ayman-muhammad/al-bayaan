import { useState } from "react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import ChatInterface from "@/components/ChatInterface";
import AudioLibrary from "@/components/AudioLibrary";
import QuranReader from "@/components/QuranReader";

type View = "home" | "chat" | "audio" | "quran";

const Index = () => {
  const [currentView, setCurrentView] = useState<View>("home");

  return (
    <div className="min-h-screen bg-background">
      {currentView === "home" && (
        <>
          <Navbar currentView={currentView} onNavigate={setCurrentView} />
          <div className="pt-14">
            <HeroSection onStartChat={() => setCurrentView("chat")} onNavigate={setCurrentView} />
          </div>
        </>
      )}

      {currentView === "chat" && (
        <ChatInterface onBack={() => setCurrentView("home")} />
      )}

      {currentView === "audio" && (
        <AudioLibrary onBack={() => setCurrentView("home")} />
      )}

      {currentView === "quran" && (
        <QuranReader onBack={() => setCurrentView("home")} />
      )}
    </div>
  );
};

export default Index;
