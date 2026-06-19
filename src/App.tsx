import { useEffect } from 'react';
import { useStore } from './state/store';
import { Transport } from './ui/Transport';
import { ChannelStrip } from './ui/ChannelStrip';
import { ContextMenu } from './ui/ContextMenu';
import { FillMenu } from './ui/FillMenu';
import * as engine from './audio/engine';
import styles from './App.module.css';

function App() {
  const channels = useStore((s) => s.channels);
  const currentStep = useStore((s) => s.currentStep);
  const loopBars = useStore((s) => s.loopBars);
  const totalSteps = loopBars * 16;

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
        engine.startSequencer(state.loopBars * 16, (step) => {
          state.setCurrentStep(step);
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
            totalSteps={totalSteps}
            currentStep={currentStep}
          />
        ))}
      </main>

      <footer className={styles.footer}>
        <p>Click ● on a channel to select it for live MIDI playback</p>
        <p>When selected, press REC to record your MIDI input into the pattern</p>
        <p>Right-click a channel name to change its sound variant · Right-click the + zone to fill or clear the pattern</p>
        <p>Spacebar to play / pause · Click the key or 🎲 to change it</p>
      </footer>

      <ContextMenu />
      <FillMenu />
    </div>
  );
}

export default App;
