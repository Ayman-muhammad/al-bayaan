import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { GitCompareArrows } from "lucide-react";

interface MadhabToggleProps {
  enabled: boolean;
  onToggle: () => void;
}

const MadhabToggle = ({ enabled, onToggle }: MadhabToggleProps) => {
  const { language } = useLanguage();

  return (
    <Button
      variant={enabled ? "gold" : "outline"}
      size="sm"
      onClick={onToggle}
      className="gap-1.5 text-xs"
      title={language === "ar" ? "مقارنة المذاهب" : "Compare Madhab Views"}
    >
      <GitCompareArrows className="w-3.5 h-3.5" />
      <span className={language === "ar" ? "font-arabic" : ""}>
        {enabled
          ? language === "ar" ? "مقارنة مفعّلة" : "Madhab Compare ON"
          : language === "ar" ? "مقارنة المذاهب" : "Compare Madhabs"}
      </span>
    </Button>
  );
};

export default MadhabToggle;
