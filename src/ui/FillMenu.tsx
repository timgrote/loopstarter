import React, { useEffect, useRef } from 'react';
import { useStore } from '../state/store';
import styles from './FillMenu.module.css';

const FILL_OPTIONS = [
  { every: 1, label: 'Fill every step' },
  { every: 2, label: 'Fill every 2' },
  { every: 4, label: 'Fill every 4' },
  { every: 8, label: 'Fill every 8' },
  { every: 16, label: 'Fill every 16' },
];

export const FillMenu: React.FC = () => {
  const fillMenu = useStore((s) => s.fillMenu);
  const closeFillMenu = useStore((s) => s.closeFillMenu);
  const clearPattern = useStore((s) => s.clearPattern);
  const fillEvery = useStore((s) => s.fillEvery);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!fillMenu) return;

    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeFillMenu();
      }
    };

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeFillMenu();
    };

    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClick);
      document.addEventListener('keydown', handleEsc);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [fillMenu, closeFillMenu]);

  if (!fillMenu) return null;

  const handleFill = (every: number) => {
    fillEvery(fillMenu.channelId, every);
    closeFillMenu();
  };

  const handleClear = () => {
    clearPattern(fillMenu.channelId);
    closeFillMenu();
  };

  const menuStyle: React.CSSProperties = {
    left: fillMenu.x,
    top: fillMenu.y,
  };

  return (
    <div ref={menuRef} className={styles.fillMenu} style={menuStyle}>
      <div className={styles.header}>Pattern</div>
      {FILL_OPTIONS.map((opt) => (
        <button
          key={opt.every}
          className={styles.item}
          onClick={() => handleFill(opt.every)}
        >
          {opt.label}
        </button>
      ))}
      <div className={styles.separator} />
      <button className={`${styles.item} ${styles.danger}`} onClick={handleClear}>
        Clear pattern
      </button>
    </div>
  );
};
