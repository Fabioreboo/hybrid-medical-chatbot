import React, { CSSProperties } from 'react';

// ─── Concentric Circle ───────────────────────────────────────────────────────

interface CircleProps {
  size: number;   // diameter in px
  idx: number;    // used for fade-in delay
}

const Circle: React.FC<CircleProps> = ({ size, idx }) => {
  const style: CSSProperties = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: size,
    height: size,
    transform: 'translate(-50%, -50%)',
    borderRadius: '50%',
    border: `1px solid rgba(71, 85, 105, ${Math.max(0.05, 1 - (idx + 1) * 0.11)})`,
    animation: `radarCircleFadeIn 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards`,
    animationDelay: `${idx * 0.1}s`,
    opacity: 0,
  };
  return <div style={style} />;
};

// ─── Icon Container ─────────────────────────────────────────────────────────

export interface IconItem {
  icon: React.ReactNode;
  label: string;
  delay?: number;
}

interface IconContainerProps {
  icon: React.ReactNode;
  label: string;
  delay: number;
}

const IconContainer: React.FC<IconContainerProps> = ({ icon, label, delay }) => {
  const wrapStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    animation: `radarIconFadeIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards`,
    animationDelay: `${delay}s`,
    opacity: 0,
    zIndex: 50,
    minWidth: 56,
  };
  const boxStyle: CSSProperties = {
    width: 48,
    height: 48,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    border: '1px solid rgba(71, 85, 105, 0.6)',
    background: 'rgba(15, 23, 42, 0.75)',
    backdropFilter: 'blur(8px)',
    boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
    fontSize: 22,
    color: '#94a3b8',
  };
  const labelStyle: CSSProperties = {
    fontSize: 10,
    fontWeight: 600,
    color: '#94a3b8',
    textAlign: 'center',
    maxWidth: 72,
    lineHeight: 1.2,
  };
  return (
    <div style={wrapStyle}>
      <div style={boxStyle}>{icon}</div>
      <div style={labelStyle}>{label}</div>
    </div>
  );
};

// ─── Radar Core ──────────────────────────────────────────────────────────────

const CIRCLES = 8;

const Radar: React.FC = () => {
  const radarSize = 512; // total diameter of radar in px

  const containerStyle: CSSProperties = {
    position: 'absolute',
    bottom: -radarSize * 0.35,
    left: '50%',
    transform: 'translateX(-50%)',
    width: radarSize,
    height: radarSize,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 0,
    pointerEvents: 'none',
  };

  // Sweep arm
  const sweepStyle: CSSProperties = {
    position: 'absolute',
    top: '50%',
    right: '50%',
    height: 3,
    width: radarSize / 2,
    transformOrigin: 'right center',
    animation: 'radarSweep 5s linear infinite',
    display: 'flex',
    alignItems: 'center',
    overflow: 'hidden',
    background: 'transparent',
    zIndex: 40,
  };
  const sweepLineStyle: CSSProperties = {
    height: 1,
    width: '100%',
    background: 'linear-gradient(to right, transparent, rgba(56, 189, 248, 0.9), rgba(56, 189, 248, 0.6))',
    boxShadow: '0 0 10px rgba(56, 189, 248, 0.8)',
  };

  // Gradient fill behind the sweep
  const sweepGlowStyle: CSSProperties = {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: '50%',
    background: 'conic-gradient(from 0deg, rgba(56,189,248,0.1) 0deg, rgba(56,189,248,0.05) 30deg, transparent 60deg)',
    animation: 'radarSweep 5s linear infinite',
    zIndex: 1,
  };

  // Bottom gradient bar
  const bottomBarStyle: CSSProperties = {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: 1,
    background: 'linear-gradient(to right, transparent, rgba(71,85,105,0.3), transparent)',
    zIndex: 41,
  };

  const circles = Array.from({ length: CIRCLES }, (_, i) => i);
  const circleSizeStep = radarSize / CIRCLES;

  return (
    <div style={containerStyle}>
      {/* Conic sweep glow */}
      <div style={sweepGlowStyle} />
      {/* Rotating sweep arm */}
      <div style={sweepStyle}>
        <div style={sweepLineStyle} />
      </div>
      {/* Concentric rings */}
      {circles.map(i => (
        <Circle key={i} idx={i} size={(i + 1) * circleSizeStep} />
      ))}
      <div style={bottomBarStyle} />
    </div>
  );
};

// ─── Full Radar Section ─────────────────────────────────────────────────────

interface RadarEffectProps {
  icons: IconItem[];
}

const RadarEffect: React.FC<RadarEffectProps> = ({ icons }) => {
  // Split icons: top-row 3, middle-row 2, bottom-row 2 (mirrors the demo)
  const row1 = icons.slice(0, 3);
  const row2 = icons.slice(3, 5);
  const row3 = icons.slice(5, 7);

  const outerStyle: CSSProperties = {
    position: 'absolute',
    inset: 0,
    overflow: 'hidden',
    zIndex: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 2rem',
    gap: '2.5rem',
  };

  const rowStyle: CSSProperties = {
    display: 'flex',
    width: '100%',
    maxWidth: 680,
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
    zIndex: 2,
  };

  return (
    <div style={outerStyle}>
      {/* Icon rows */}
      <div style={rowStyle}>
        {row1.map((item, i) => (
          <IconContainer key={i} icon={item.icon} label={item.label} delay={item.delay ?? i * 0.15} />
        ))}
      </div>
      <div style={{ ...rowStyle, maxWidth: 400 }}>
        {row2.map((item, i) => (
          <IconContainer key={i} icon={item.icon} label={item.label} delay={item.delay ?? 0.4 + i * 0.15} />
        ))}
      </div>
      <div style={rowStyle}>
        {row3.map((item, i) => (
          <IconContainer key={i} icon={item.icon} label={item.label} delay={item.delay ?? 0.7 + i * 0.15} />
        ))}
      </div>

      {/* Radar circles + sweep at bottom */}
      <Radar />
    </div>
  );
};

export default RadarEffect;
