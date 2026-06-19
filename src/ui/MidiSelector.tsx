
import React, { useEffect, useState, useCallback } from 'react';
import { useStore } from '../state/store';
import * as midi from '../midi/input';
import styles from './MidiSelector.module.css';

export const MidiSelector: React.FC = () => {
  const midiInputs = useStore((s) => s.midiInputs);
  const midiDeviceId = useStore((s) => s.midiDeviceId);
  const setMidiInputs = useStore((s) => s.setMidiInputs);
  const setMidiDevice = useStore((s) => s.setMidiDevice);
  const [midiReady, setMidiReady] = useState(false);
  const [midiError, setMidiError] = useState<string | null>(null);

  const refreshInputs = useCallback(() => {
    const inputs = midi.getMidiInputs();
    setMidiInputs(inputs);
  }, [setMidiInputs]);

  const enableMidi = useCallback(async () => {
    setMidiError(null);

    if (!navigator.requestMIDIAccess) {
      setMidiError('Web MIDI not supported in this browser');
      return;
    }

    try {
      const ok = await midi.requestMidiAccess();
      if (ok) {
        setMidiReady(true);
        refreshInputs();
      } else {
        setMidiError('MIDI access denied');
      }
    } catch (err) {
      setMidiError('Failed to enable MIDI');
    }
  }, [refreshInputs]);

  useEffect(() => {
    // Auto-request on mount
    enableMidi();

    const cleanup = midi.onMidiStateChange(() => {
      refreshInputs();
    });
    return () => cleanup();
  }, [enableMidi, refreshInputs]);

  const handleDeviceChange = (deviceId: string) => {
    if (deviceId === '') {
      midi.disconnectMidi();
      setMidiDevice(null);
    } else {
      const ok = midi.connectToDevice(deviceId);
      if (ok) setMidiDevice(deviceId);
    }
  };

  if (midiError) {
    return (
      <div className={styles.wrap}>
        <span className={styles.error}>⚠ {midiError}</span>
        <button className={styles.enable} onClick={enableMidi}>
          Retry
        </button>
      </div>
    );
  }

  if (!midiReady) {
    return (
      <div className={styles.wrap}>
        <button className={styles.enable} onClick={enableMidi}>
          Enable MIDI
        </button>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <select
        value={midiDeviceId || ''}
        onChange={(e) => handleDeviceChange(e.target.value)}
      >
        <option value="">— No device —</option>
        {midiInputs.map((input) => (
          <option key={input.id} value={input.id}>
            {input.name}
          </option>
        ))}
      </select>
    </div>
  );
};
