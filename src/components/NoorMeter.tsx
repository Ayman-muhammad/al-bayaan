interface NoorMeterProps {
  score: number;
}

const NoorMeter = ({ score }: NoorMeterProps) => {
  const fillPercent = Math.min(Math.max(score, 0), 100);
  const glow =
    fillPercent > 70 ? "shadow-[0_0_60px_rgba(201,162,39,0.45)]" :
    fillPercent > 30 ? "shadow-[0_0_40px_rgba(201,162,39,0.3)]" :
                       "shadow-[0_0_25px_rgba(201,162,39,0.18)]";

  return (
    <div className="flex flex-col items-center gap-3">
      <div className={`relative w-36 h-36 rounded-full flex items-center justify-center transition-shadow duration-700 ${glow}`}>
        <svg viewBox="0 0 200 200" className="w-full h-full" aria-label={`Noor: ${fillPercent}`}>
          <defs>
            <linearGradient id="noorGrad" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="hsl(var(--gold))" stopOpacity="0.25" />
              <stop offset="100%" stopColor="hsl(var(--gold))" stopOpacity="0.95" />
            </linearGradient>
            <clipPath id="moonClip">
              <path d="M100,20 A80,80 0 1,0 100,180 A60,60 0 1,1 100,20" />
            </clipPath>
          </defs>
          <path
            d="M100,20 A80,80 0 1,0 100,180 A60,60 0 1,1 100,20"
            fill="none"
            stroke="hsl(var(--gold) / 0.25)"
            strokeWidth="2"
          />
          <g clipPath="url(#moonClip)">
            <rect
              x="0"
              y={200 - fillPercent * 2}
              width="200"
              height={fillPercent * 2}
              fill="url(#noorGrad)"
              style={{ transition: "y 1s ease-out, height 1s ease-out" }}
            />
          </g>
          <path
            d="M100,20 A80,80 0 1,0 100,180 A60,60 0 1,1 100,20"
            fill="none"
            stroke="hsl(var(--gold))"
            strokeWidth="1.5"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-3xl font-bold text-gold leading-none">{fillPercent}</span>
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mt-1">Noor</span>
        </div>
      </div>
    </div>
  );
};

export default NoorMeter;