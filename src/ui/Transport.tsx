import React from 'react';
import { useStore } from '../state/store';
import { PRESETS } from '../music/presets';
import { SCALE_NAMES, SCALE_DISPLAY, getScaleNotes } from '../music/scales';
import * as engine from '../audio/engine';
import { MidiSelector } from './MidiSelector';
import styles from './Transport.module.css';

const ROOTS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const Transport: React.FC = () => {
  const bpm = useStore((s) => s.bpm);
  const swing = useStore((s) => s.swing);
  const loopBars = useStore((s) => s.loopBars);
  const isPlaying = useStore((s) => s.isPlaying);
  const root = useStore((s) => s.root);
  const scale = useStore((s) => s.scale);
  const recordingActive = useStore((s) => s.recordingActive);
  const liveChannelId = useStore((s) => s.liveChannelId);

  const setBpm = useStore((s) => s.setBpm);
  const setSwing = useStore((s) => s.setSwing);
  const setLoopBars = useStore((s) => s.setLoopBars);
  const setIsPlaying = useStore((s) => s.setIsPlaying);
  const changeRoot = useStore((s) => s.changeRoot);
  const changeScale = useStore((s) => s.changeScale);
  const applyPreset = useStore((s) => s.applyPreset);
  const randomizeKey = useStore((s) => s.randomizeKey);
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

  const handleRootChange = (newRoot: string) => {
    changeRoot(newRoot);
  };

  const handleScaleChange = (newScale: string) => {
    changeScale(newScale);
  };

  const handlePreset = (key: string) => {
    applyPreset(key);
    if (isPlaying) {
      const preset = PRESETS[key];
      if (preset) {
        engine.setBpm(preset.bpm);
        engine.setSwing(preset.swing);
      }
    }
  };

  return (
    <div className={styles.transport}>
      <div className={styles.row}>
        <div className={styles.titleBlock}>
          <h1 className={styles.title}>Loopstarter</h1>
        </div>

        <div className={styles.playControls}>
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
        </div>

        <div className={styles.keyControls}>
          <div className={styles.controlGroup}>
            <label className={styles.controlLabel}>Key</label>
            <select
              className={styles.controlSelect}
              value={root}
              onChange={(e) => handleRootChange(e.target.value)}
            >
              {ROOTS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div className={styles.controlGroup}>
            <label className={styles.controlLabel}>Scale</label>
            <select
              className={styles.controlSelect}
              value={scale}
              onChange={(e) => handleScaleChange(e.target.value)}
            >
              {SCALE_NAMES.map((s) => (
                <option key={s} value={s}>{SCALE_DISPLAY[s] || s}</option>
              ))}
            </select>
          </div>

          <button
            className={styles.diceBtn}
            onClick={randomizeKey}
            title="Randomize key and scale"
          >
            🎲
          </button>
        </div>

        <div className={styles.controls}>
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
      </div>

      <div className={styles.row}>
        <div className={styles.controls}>
          <div className={styles.controlGroup}>
            <label className={styles.controlLabel}>Genre</label>
            <select
              className={styles.controlSelect}
              onChange={(e) => handlePreset(e.target.value)}
              defaultValue=""
            >
              <option value="" disabled>Apply preset…</option>
              {Object.entries(PRESETS).map(([key, preset]) => (
                <option key={key} value={key}>
                  {preset.name}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.controlGroup}>
            <label className={styles.controlLabel}>MIDI</label>
            <MidiSelector />
          </div>
        </div>

        <div className={styles.scaleNotes}>
          <span className={styles.controlLabel}>Notes: </span>
          <span className={styles.notes}>
            {getScaleNotes(root, scale, 3, 1).join(' · ')}
          </span>
        </div>
      </div>
    </div>
  );
};
