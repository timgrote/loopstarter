
import React from 'react';
import { useStore } from '../state/store';
import { PRESETS } from '../music/presets';
import * as engine from '../audio/engine';
import { MidiSelector } from './MidiSelector';
import styles from './Transport.module.css';

export const Transport: React.FC = () => {
  const bpm = useStore((s) => s.bpm);
  const swing = useStore((s) => s.swing);
  const loopBars = useStore((s) => s.loopBars);
  const isPlaying = useStore((s) => s.isPlaying);
  const presetKey = useStore((s) => s.presetKey);
  const recordingActive = useStore((s) => s.recordingActive);
  const liveChannelId = useStore((s) => s.liveChannelId);

  const setBpm = useStore((s) => s.setBpm);
  const setSwing = useStore((s) => s.setSwing);
  const setLoopBars = useStore((s) => s.setLoopBars);
  const setIsPlaying = useStore((s) => s.setIsPlaying);
  const loadPreset = useStore((s) => s.loadPreset);
  const regenerateAll = useStore((s) => s.regenerateAll);
  const setRecordingActive = useStore((s) => s.setRecordingActive);

  const totalSteps = loopBars * 16;

  const handlePlayStop = async () => {
    if (isPlaying) {
      engine.stopSequencer();
      setIsPlaying(false);
      setRecordingActive(false);
    } else {
      await engine.initAudio();
      engine.setBpm(bpm);
      engine.setSwing(swing);

      // Register all channels
      const channels = useStore.getState().channels;
      for (const ch of channels) {
        engine.registerChannel(ch);
      }

      engine.startSequencer(totalSteps, (step) => {
        useStore.getState().setCurrentStep(step);
      });
      setIsPlaying(true);
    }
  };

  const handleRecordToggle = () => {
    setRecordingActive(!recordingActive);
  };

  const handlePresetChange = (key: string) => {
    loadPreset(key);
    // Audio params will update on next play
  };

  const handleRegenerate = () => {
    regenerateAll();
  };

  return (
    <div className={styles.transport}>
      <div className={styles.transportMain}>
        <button
          className={`${styles.playBtn} ${isPlaying ? styles.playing : ''}`}
          onClick={handlePlayStop}
        >
          {isPlaying ? '⏹' : '▶'}
        </button>

        <button
          className={`${styles.recBtn} ${recordingActive ? styles.recording : ''}`}
          onClick={handleRecordToggle}
          disabled={!liveChannelId}
          title={liveChannelId ? (recordingActive ? 'Stop recording' : 'Start recording MIDI input') : 'Select a channel to record'}
        >
          REC
        </button>

        <div className={styles.controlGroup}>
          <label className={styles.controlLabel}>BPM</label>
          <input
            type="number"
            min="40"
            max="220"
            className={styles.controlInput}
            value={bpm}
            onChange={(e) => {
              const v = Number(e.target.value);
              setBpm(v);
              engine.setBpm(v);
            }}
          />
        </div>

        <div className={styles.controlGroup}>
          <label className={styles.controlLabel}>Swing</label>
          <input
            type="range"
            min="0"
            max="100"
            value={swing * 100}
            onChange={(e) => {
              const v = Number(e.target.value) / 100;
              setSwing(v);
              engine.setSwing(v);
            }}
          />
        </div>

        <div className={styles.controlGroup}>
          <label className={styles.controlLabel}>Bars</label>
          <select
            className={styles.controlSelect}
            value={loopBars}
            onChange={(e) => setLoopBars(Number(e.target.value))}
          >
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={4}>4</option>
          </select>
        </div>
      </div>

      <div className={styles.transportActions}>
        <div className={styles.controlGroup}>
          <label className={styles.controlLabel}>Preset</label>
          <select
            className={styles.controlSelect}
            value={presetKey}
            onChange={(e) => handlePresetChange(e.target.value)}
          >
            {Object.entries(PRESETS).map(([key, preset]) => (
              <option key={key} value={key}>
                {preset.name}
              </option>
            ))}
          </select>
        </div>

        <button className={styles.regenBtn} onClick={handleRegenerate}>
          🎲 Regenerate All
        </button>

        <div className={styles.controlGroup}>
          <label className={styles.controlLabel}>MIDI</label>
          <MidiSelector />
        </div>
      </div>

      <div className={styles.presetDescription}>
        {PRESETS[presetKey]?.description}
      </div>
    </div>
  );
};
