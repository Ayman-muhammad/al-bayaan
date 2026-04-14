import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import ChatInterface from "@/components/ChatInterface";
import AudioLibrary from "@/components/AudioLibrary";
import QuranReader from "@/components/QuranReader";
import PrayerTimes from "@/components/PrayerTimes";
import HafizMode from "@/components/HafizMode";
import AuthPage from "@/pages/Auth";
import { useAuth } from "@/contexts/AuthContext";

type View = "home" | "chat" | "audio" | "quran" | "prayer" | "hafiz" | "auth";

const Index = () => {
  const [currentView, setCurrentView] = useState<View>("home");
  const { user } = useAuth();

  // Handle OAuth redirect
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("access_token") || hash.includes("type=recovery")) {
      // Clear hash after processing
      window.location.hash = "";
    }
  }, []);

  const handleNavigate = (view: View) => {
    // Features that need auth
    if ((view === "hafiz") && !user) {
      setCurrentView("auth");
      return;
    }
    setCurrentView(view);
  };

  return (
    <div className="min-h-screen bg-background">
      {currentView === "home" && (
        <>
          <Navbar currentView={currentView} onNavigate={handleNavigate} user={user} />
          <div className="pt-14">
            <HeroSection onStartChat={() => handleNavigate("chat")} onNavigate={handleNavigate} />
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

      {currentView === "prayer" && (
        <PrayerTimes onBack={() => setCurrentView("home")} />
      )}

      {currentView === "hafiz" && (
        <HafizMode onBack={() => setCurrentView("home")} />
      )}

      {currentView === "auth" && (
        <AuthPage onBack={() => setCurrentView("home")} onSuccess={() => setCurrentView("home")} />
      )}
    </div>
  );
};

export default Index;
