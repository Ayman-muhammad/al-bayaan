import { useState, useEffect, useCallback } from "react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import ChatInterface from "@/components/ChatInterface";
import AudioLibrary from "@/components/AudioLibrary";
import QuranReader from "@/components/QuranReader";
import PrayerTimes from "@/components/PrayerTimes";
import HafizMode from "@/components/HafizMode";
import FavoritesHub from "@/components/FavoritesHub";
import MyJourney from "@/components/MyJourney";
import DhikrPage from "@/components/DhikrPage";
import ScholarsQA from "@/components/ScholarsQA";
import WelcomeOverlay from "@/components/WelcomeOverlay";
import { useFeedback } from "@/components/FeedbackToast";

type View = "home" | "chat" | "audio" | "quran" | "prayer" | "hafiz" | "favorites" | "journey" | "dhikr" | "scholars";

const FEEDBACK_MAP: Partial<Record<View, string>> = {
  quran: "navigate_quran",
  audio: "navigate_audio",
  prayer: "navigate_prayer",
  hafiz: "navigate_hafiz",
  chat: "navigate_chat",
};

const Index = () => {
  const [currentView, setCurrentView] = useState<View>("home");
  const { showFeedback } = useFeedback();
  const [showWelcome, setShowWelcome] = useState(false);

  // Clean stray hash params from any prior auth flow
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("access_token") || hash.includes("type=recovery")) {
      window.location.hash = "";
    }
  }, []);

  // Show welcome overlay once per device on first visit
  useEffect(() => {
    const seen = localStorage.getItem("al-bayani-welcomed");
    if (!seen) {
      setShowWelcome(true);
      localStorage.setItem("al-bayani-welcomed", "1");
    }
  }, []);

  // Save last position
  useEffect(() => {
    if (currentView !== "home") {
      localStorage.setItem("al-bayan-last-view", currentView);
    }
  }, [currentView]);

  const handleNavigate = useCallback((view: string) => {
    const v = view as View;
    const feedbackKey = FEEDBACK_MAP[v];
    if (feedbackKey && v !== "home") {
      showFeedback(feedbackKey as any);
    }
    setCurrentView(v);
  }, [showFeedback]);

  return (
    <div className="min-h-screen bg-background">
      {showWelcome && (
        <WelcomeOverlay onComplete={() => setShowWelcome(false)} />
      )}

      {currentView === "home" && (
        <>
          <Navbar currentView={currentView} onNavigate={handleNavigate} />
          <div className="pt-14">
            <HeroSection onStartChat={() => handleNavigate("chat")} onNavigate={handleNavigate} />
          </div>
        </>
      )}

      {currentView === "chat" && <ChatInterface onBack={() => setCurrentView("home")} />}
      {currentView === "audio" && <AudioLibrary onBack={() => setCurrentView("home")} />}
      {currentView === "quran" && <QuranReader onBack={() => setCurrentView("home")} />}
      {currentView === "prayer" && <PrayerTimes onBack={() => setCurrentView("home")} />}
      {currentView === "hafiz" && <HafizMode onBack={() => setCurrentView("home")} />}
      {currentView === "dhikr" && <DhikrPage onBack={() => setCurrentView("home")} />}
      {currentView === "scholars" && <ScholarsQA onBack={() => setCurrentView("home")} />}
      {currentView === "favorites" && <FavoritesHub onBack={() => setCurrentView("home")} onNavigate={handleNavigate} />}
      {currentView === "journey" && <MyJourney onBack={() => setCurrentView("home")} onNavigate={handleNavigate} />}
    </div>
  );
};

export default Index;
