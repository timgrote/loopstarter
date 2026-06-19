import React, { useEffect, useRef } from 'react';
import { useStore } from '../state/store';
import { getVariants } from '../audio/sounds';
import * as engine from '../audio/engine';
import styles from './ContextMenu.module.css';

export const ContextMenu: React.FC = () => {
  const contextMenu = useStore((s) => s.contextMenu);
  const closeContextMenu = useStore((s) => s.closeContextMenu);
  const setVariant = useStore((s) => s.setVariant);
  const channels = useStore((s) => s.channels);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!contextMenu) return;

    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeContextMenu();
      }
    };

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeContextMenu();
    };

    // Defer listener so the current click doesn't immediately close
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClick);
      document.addEventListener('keydown', handleEsc);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [contextMenu, closeContextMenu]);

  if (!contextMenu) return null;

  const channel = channels.find((c) => c.id === contextMenu.channelId);
  if (!channel) return null;

  const variants = getVariants(channel.type);

  const handleVariantClick = async (variantKey: string) => {
    setVariant(channel.id, variantKey);

    // Hot-swap the audio engine's synth chain
    const updatedChannel = { ...channel, variant: variantKey };
    engine.updateChannelVariant(channel.id, updatedChannel);

    closeContextMenu();
  };

  // Position the menu, clamped to viewport
  const menuStyle: React.CSSProperties = {
    left: contextMenu.x,
    top: contextMenu.y,
  };

  return (
    <div ref={menuRef} className={styles.contextMenu} style={menuStyle}>
      <div className={styles.header}>Sound: {channel.name}</div>
      {variants.map((v) => (
        <button
          key={v.key}
          className={`${styles.item} ${channel.variant === v.key ? styles.active : ''}`}
          onClick={() => handleVariantClick(v.key)}
        >
          {v.label}
        </button>
      ))}
    </div>
  );
};
