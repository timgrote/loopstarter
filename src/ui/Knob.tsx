import React, { useRef, useCallback, useEffect } from 'react';
import styles from './Knob.module.css';

interface KnobProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  /** Color for the indicator and active arc */
  color?: string;
  /** Format value for display */
  formatValue?: (v: number) => string;
  onChange: (value: number) => void;
  /** Scroll sensitivity multiplier (pixels per wheel delta unit) */
  sensitivity?: number;
}

const SIZE = 40;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R = 15;

// Arc sweeps from -135° (7 o'clock) to +135° (5 o'clock) through 0° (top)
const ARC_START = -135;
const ARC_END = 135;
const ARC_SWEEP = ARC_END - ARC_START; // 270°

function polarToSvg(angleDeg: number): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: CX + R * Math.sin(rad),
    y: CY - R * Math.cos(rad),
  };
}

function describeArc(startAngle: number, endAngle: number): string {
  if (Math.abs(endAngle - startAngle) < 0.1) return '';
  const start = polarToSvg(startAngle);
  const end = polarToSvg(endAngle);
  const largeArc = Math.abs(endAngle - startAngle) > 180 ? 1 : 0;
  const sweep = endAngle >= startAngle ? 1 : 0;
  return `M ${start.x} ${start.y} A ${R} ${R} 0 ${largeArc} ${sweep} ${end.x} ${end.y}`;
}

export const Knob: React.FC<KnobProps> = ({
  label,
  value,
  min,
  max,
  step = 1,
  color = 'var(--accent)',
  formatValue,
  onChange,
  sensitivity = 1,
}) => {
  const dragRef = useRef<{ startY: number; startValue: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const normalized = (value - min) / (max - min);
  const angle = ARC_START + ARC_SWEEP * normalized;
  const pointer = polarToSvg(angle);
  const activeArc = describeArc(ARC_START, angle);
  const totalArc = describeArc(ARC_START, ARC_END);

  const clamp = useCallback(
    (v: number) => {
      const clamped = Math.max(min, Math.min(max, v));
      // Snap to step
      return Math.round(clamped / step) * step;
    },
    [min, max, step],
  );

  // Native wheel listener — React's synthetic onWheel is passive and can't preventDefault
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const range = max - min;
      const increment = (range / 100) * sensitivity;
      const delta = e.deltaY < 0 ? increment : -increment;
      onChange(clamp(value + delta));
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [value, min, max, sensitivity, onChange, clamp]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      dragRef.current = { startY: e.clientY, startValue: value };

      const onMove = (ev: PointerEvent) => {
        if (!dragRef.current) return;
        const dy = dragRef.current.startY - ev.clientY; // up = positive
        const range = max - min;
        const scaledRange = range / sensitivity;
        const delta = dy * (scaledRange / 150); // 150px drag = full range
        onChange(clamp(dragRef.current.startValue + delta));
      };

      const onUp = () => {
        dragRef.current = null;
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [value, min, max, sensitivity, onChange, clamp],
  );

  const display = formatValue ? formatValue(value) : String(Math.round(value));

  return (
    <div
      ref={containerRef}
      className={styles.knob}
      onPointerDown={handlePointerDown}
      title={`${label}: ${display}`}
    >
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        {/* Track (dim arc) */}
        <path d={totalArc} fill="none" stroke="var(--border)" strokeWidth={3} strokeLinecap="round" />
        {/* Active arc */}
        {activeArc && (
          <path d={activeArc} fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" />
        )}
        {/* Center dot */}
        <circle cx={CX} cy={CY} r={7} fill="var(--surface-2)" stroke="var(--border)" strokeWidth={1} />
        {/* Pointer line */}
        <line
          x1={CX}
          y1={CY}
          x2={pointer.x}
          y2={pointer.y}
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
        />
      </svg>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>{display}</span>
    </div>
  );
};
