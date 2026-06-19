import React, { useRef, useEffect, useState } from 'react';
import * as engine from '../audio/engine';
import styles from './LevelMeter.module.css';

interface LevelMeterProps {
  channelId: string;
}

// dB range we display. Below FLOOR = 0%, above CEILING = 100%.
const FLOOR_DB = -40;
const CEILING_DB = 0;
const RANGE = CEILING_DB - FLOOR_DB;

function dbToPercent(db: number): number {
  if (!isFinite(db) || db <= FLOOR_DB) return 0;
  if (db >= CEILING_DB) return 1;
  return (db - FLOOR_DB) / RANGE;
}

export const LevelMeter: React.FC<LevelMeterProps> = ({ channelId }) => {
  const [level, setLevel] = useState(0);
  const rafRef = useRef<number>(0);
  const lastUpdate = useRef(0);
  const smoothed = useRef(0);

  useEffect(() => {
    const tick = () => {
      const now = performance.now();
      const raw = dbToPercent(engine.getChannelLevel(channelId));

      // Attack fast, release slow — feels like a VU meter
      const smoothing = raw > smoothed.current ? 0.6 : 0.15;
      // Also decay floor: if raw is basically zero, always release toward zero
      const base = smoothed.current + (raw - smoothed.current) * smoothing;
      // Minimum decay rate so meter always falls, even when frozen at signal
      const decayRate = 0.02; // per ~16ms frame
      const elapsed = (now - lastUpdate.current) / 16;
      smoothed.current = Math.max(base - decayRate * elapsed, raw, 0);
      lastUpdate.current = now;

      setLevel(smoothed.current);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [channelId]);

  const percent = Math.min(100, Math.max(0, level * 100));
  const barClass = percent > 90 ? styles.peak : percent > 70 ? styles.hot : '';

  return (
    <div className={styles.meter} title={`${Math.round(percent)}%`}>
      <div className={`${styles.bar} ${barClass}`} style={{ height: `${percent}%` }} />
    </div>
  );
};
