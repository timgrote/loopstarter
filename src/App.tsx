import { useEffect } from 'react';
import { useStore } from './state/store';
import { PRESETS } from './music/presets';
import { Transport } from './ui/Transport';
import { ChannelStrip } from './ui/ChannelStrip';
import { ContextMenu } from './ui/ContextMenu';
import * as engine from './audio/engine';
import styles from './App.module.css';

function App() {
  const channels = useStore((s) => s.channels);
  const currentStep = useStore((s) => s.currentStep);
  const loopBars = useStore((s) => s.loopBars);
  const totalSteps = loopBars * 16;
  const presetKey = useStore((s) => s.presetKey);

  const preset = PRESETS[presetKey];
  const keyDisplay = preset ? `${preset.root} ${preset.scale.charAt(0).toUpperCase() + preset.scale.slice(1)}` : '';

  // Sync channel registration with audio engine when channels change
  useEffect(() => {
    return () => {
      engine.disposeAll();
    };
  }, []);

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1 className={styles.title}>Loopstarter</h1>
        <div className={styles.keyDisplay} title={`${keyDisplay} · Click to change key (coming soon)`}>
          <span className={styles.keyRoot}>{preset?.root || 'C'}</span>
          <span className={styles.keyScale}>{preset?.scale || 'minor'}</span>
        </div>
      </header>

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
        <p>Right-click a channel name to change its sound variant</p>
      </footer>

      <ContextMenu />
    </div>
  );
}

export default App;
