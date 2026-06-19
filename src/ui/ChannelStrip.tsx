
import React from 'react';
import { useStore, type Channel } from '../state/store';
import { PatternGrid } from './PatternGrid';
import { getVariants } from '../audio/sounds';
import { Knob } from './Knob';
import { LevelMeter } from './LevelMeter';
import * as engine from '../audio/engine';
import styles from './ChannelStrip.module.css';

interface ChannelStripProps {
  channel: Channel;
  totalSteps: number;
  currentStep: number;
}

const TYPE_COLORS: Record<string, string> = {
  kick: '#ef4444',
  snare: '#f97316',
  hat: '#eab308',
  bass: '#3b82f6',
  melody: '#a855f7',
  arp: '#06b6d4',
};

export const ChannelStrip: React.FC<ChannelStripProps> = ({
  channel,
  totalSteps,
  currentStep,
}) => {
  const setVolume = useStore((s) => s.setVolume);
  const setPan = useStore((s) => s.setPan);
  const toggleMute = useStore((s) => s.toggleMute);
  const regenerateChannel = useStore((s) => s.regenerateChannel);
  const liveChannelId = useStore((s) => s.liveChannelId);
  const setLiveChannel = useStore((s) => s.setLiveChannel);
  const recordingActive = useStore((s) => s.recordingActive);
  const openContextMenu = useStore((s) => s.openContextMenu);
  const color = TYPE_COLORS[channel.type] || '#888';
  const isLive = liveChannelId === channel.id;
  const isRecording = isLive && recordingActive;
  const variantLabel = getVariants(channel.type).find((v) => v.key === channel.variant)?.label || channel.variant;

  const formatPan = (v: number) => {
    const n = Math.round(v);
    return n > 0 ? `R${n}` : n < 0 ? `L${Math.abs(n)}` : 'C';
  };

  return (
    <div className={`${styles.strip} ${channel.muted ? styles.muted : ''} ${isLive ? styles.live : ''}`}>
      <div
        className={styles.info}
        onContextMenu={(e) => {
          e.preventDefault();
          openContextMenu(e.clientX, e.clientY, channel.id);
        }}
      >
        <div className={styles.nameCol} style={{ borderLeftColor: color }}>
          <span className={styles.name}>{channel.name}</span>
          <span className={styles.variantTag}>{variantLabel}</span>
        </div>
        <button
          className={`${styles.btn} ${channel.muted ? styles.btnActive : ''} ${styles.muteBtn}`}
          onClick={() => {
            toggleMute(channel.id);
            engine.updateChannelMute(channel.id, !channel.muted);
          }}
          title="Mute"
        >
          M
        </button>
        <button
          className={styles.btn}
          onClick={() => regenerateChannel(channel.id)}
          title="Regenerate"
        >
          🎲
        </button>
        <button
          className={`${styles.recInd} ${isLive ? styles.live : ''} ${isRecording ? styles.recording : ''}`}
          onClick={() => setLiveChannel(isLive ? null : channel.id)}
          title={isLive ? 'Unselect this channel' : 'Select this channel for MIDI playback'}
        >
          ●
        </button>
      </div>

      <div className={styles.knobs}>
        <Knob
          label="Vol"
          value={channel.volume}
          min={0}
          max={100}
          sensitivity={1.5}
          color={color}
          onChange={(v) => {
            const n = Math.round(v);
            setVolume(channel.id, n);
            engine.updateChannelVolume(channel.id, n);
          }}
        />
        <Knob
          label="Pan"
          value={channel.pan}
          min={-100}
          max={100}
          sensitivity={2}
          color={channel.pan > 0 ? '#60a5fa' : channel.pan < 0 ? '#f59e0b' : 'var(--text-dim)'}
          formatValue={formatPan}
          onChange={(p) => {
            const n = Math.round(p);
            setPan(channel.id, n);
            engine.updateChannelPan(channel.id, n);
          }}
        />
      </div>

      <LevelMeter channelId={channel.id} />

      <PatternGrid
        channelId={channel.id}
        channelType={channel.type}
        totalSteps={totalSteps}
        currentStep={currentStep}
      />
    </div>
  );
};
