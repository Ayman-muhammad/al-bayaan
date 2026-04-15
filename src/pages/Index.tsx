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
import AuthPage from "@/pages/Auth";
import WelcomeOverlay from "@/components/WelcomeOverlay";
import { useFeedback } from "@/components/FeedbackToast";
import { useAuth } from "@/contexts/AuthContext";

type View = "home" | "chat" | "audio" | "quran" | "prayer" | "hafiz" | "auth" | "favorites" | "journey";

const FEEDBACK_MAP: Partial<Record<View, string>> = {
  quran: "navigate_quran",
  audio: "navigate_audio",
  prayer: "navigate_prayer",
  hafiz: "navigate_hafiz",
  chat: "navigate_chat",
};

const Index = () => {
  const [currentView, setCurrentView] = useState<View>("home");
  const { user } = useAuth();
  const { showFeedback } = useFeedback();
  const [showWelcome, setShowWelcome] = useState(false);
  const [prevUser, setPrevUser] = useState<string | null>(null);

  // Handle OAuth redirect
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("access_token") || hash.includes("type=recovery")) {
      window.location.hash = "";
    }
  }, []);

  // Show welcome overlay on login
  useEffect(() => {
    if (user && user.id !== prevUser) {
      setShowWelcome(true);
      setPrevUser(user.id);
    } else if (!user) {
      setPrevUser(null);
    }
  }, [user, prevUser]);

  // Save last position
  useEffect(() => {
    if (currentView !== "home" && currentView !== "auth") {
      localStorage.setItem("al-bayan-last-view", currentView);
    }
  }, [currentView]);

  const handleNavigate = useCallback((view: string) => {
    const v = view as View;
    if ((v === "hafiz" || v === "favorites" || v === "journey") && !user) {
      setCurrentView("auth");
      return;
    }
    const feedbackKey = FEEDBACK_MAP[v];
    if (feedbackKey && v !== "home") {
      showFeedback(feedbackKey as any);
    }
    setCurrentView(v);
  }, [user, showFeedback]);

  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0];

  return (
    <div className="min-h-screen bg-background">
      {showWelcome && (
        <WelcomeOverlay userName={userName} onComplete={() => setShowWelcome(false)} />
      )}

      {currentView === "home" && (
        <>
          <Navbar currentView={currentView} onNavigate={handleNavigate} user={user} />
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
      {currentView === "favorites" && <FavoritesHub onBack={() => setCurrentView("home")} onNavigate={handleNavigate} />}
      {currentView === "journey" && <MyJourney onBack={() => setCurrentView("home")} onNavigate={handleNavigate} />}
      {currentView === "auth" && <AuthPage onBack={() => setCurrentView("home")} onSuccess={() => setCurrentView("home")} />}
    </div>
  );
};

export default Index;
