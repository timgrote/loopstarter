import React from 'react';
import { useStore } from '../state/store';
import styles from './PatternGrid.module.css';

interface PatternGridProps {
  channelId: string;
  channelType: string;
  totalSteps: number;
  currentStep: number;
}

export const PatternGrid: React.FC<PatternGridProps> = ({
  channelId,
  channelType,
  totalSteps,
  currentStep,
}) => {
  const pattern = useStore((s) => s.channels.find((c) => c.id === channelId)?.pattern || []);
  const setStep = useStore((s) => s.setStep);
  const setNoteAtStep = useStore((s) => s.setNoteAtStep);
  const isDrum = channelType === 'kick' || channelType === 'snare' || channelType === 'hat';
  const isPitched = !isDrum;
  const stepsPerBar = 16;
  const stepsPerBeat = 4;

  return (
    <div className={styles.grid}>
      {/* Ruler row — bar.beat labels above every beat */}
      <div className={styles.ruler}>
        {Array.from({ length: totalSteps }).map((_, i) => {
          const isBeat = i % stepsPerBeat === 0;
          const isBar = i % stepsPerBar === 0;
          if (!isBeat) return <div key={i} className={styles.rulerCell} />;
          const bar = Math.floor(i / stepsPerBar) + 1;
          const beat = Math.floor((i % stepsPerBar) / stepsPerBeat) + 1;
          return (
            <div
              key={i}
              className={`${styles.rulerCell} ${isBar ? styles.rulerBar : ''}`}
            >
              {bar}.{beat}
            </div>
          );
        })}
      </div>

      {/* Step cells */}
      <div className={styles.steps}>
        {Array.from({ length: totalSteps }).map((_, i) => {
          const isActive = pattern[i] !== null && pattern[i] !== undefined;
          const isCurrent = i === currentStep;
          const isBeat = i % stepsPerBeat === 0;
          const isBar = i % stepsPerBar === 0;
          const noteDisplay = isPitched && isActive ? String(pattern[i]).replace('#', '') : null;

          return (
            <div
              key={i}
              className={[
                styles.cell,
                isActive && styles.active,
                isCurrent && styles.current,
                isBar && styles.barStart,
                isBeat && !isBar && styles.beat,
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => setStep(channelId, i, !isActive)}
              onContextMenu={(e) => {
                e.preventDefault();
                if (isActive) setNoteAtStep(channelId, i, null);
              }}
              title={noteDisplay || (isActive ? 'hit' : 'empty')}
            >
              {noteDisplay && <span className={styles.noteLabel}>{noteDisplay}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
};
