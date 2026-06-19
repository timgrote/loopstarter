
import { useEffect } from 'react';
import { useStore, TICKS_PER_BEAT } from './state/store';
import { Transport } from './ui/Transport';
import { ChannelStrip } from './ui/ChannelStrip';
import { ContextMenu } from './ui/ContextMenu';
import * as engine from './audio/engine';
import styles from './App.module.css';

function App() {
  const channels = useStore((s) => s.channels);
  const currentTick = useStore((s) => s.currentTick);
  const loopBars = useStore((s) => s.loopBars);
  const totalTicks = loopBars * 16 * TICKS_PER_BEAT;

  useEffect(() => {
    return () => {
      engine.disposeAll();
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      e.preventDefault();
      const state = useStore.getState();
      if (state.isPlaying) {
        engine.stopSequencer();
        state.setIsPlaying(false);
        state.setRecordingActive(false);
      } else {
        await engine.initAudio();
        engine.setBpm(state.bpm);
        engine.setSwing(state.swing);
        const chs = state.channels;
        for (const ch of chs) {
          engine.registerChannel(ch);
        }
        const tt = state.loopBars * 16 * TICKS_PER_BEAT;
        engine.startSequencer(tt, (tick) => {
          state.setCurrentTick(tick);
        });
        state.setIsPlaying(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className={styles.app}>
      <Transport />

      <main className={styles.channels}>
        {channels.map((channel) => (
          <ChannelStrip
            key={channel.id}
            channel={channel}
            totalTicks={totalTicks}
            currentTick={currentTick}
          />
        ))}
      </main>

      <footer className={styles.footer}>
        <p>Click and drag on the grid to create notes · Drag edges to resize · Double-click or right-click to delete</p>
        <p>Click ● on a channel to select it for live MIDI playback · REC to record MIDI input</p>
        <p>Spacebar to play / pause · 🎲 to randomize key</p>
      </footer>

      <ContextMenu />
    </div>
  );
}

export default App;
