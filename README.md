# Loopstarter

A browser-based step sequencer and loop creation tool. Build 4-to-12-bar loops with 6 instrument channels, MIDI input, and dark garage vibes — all client-side, no backend.

Inspired by FL Studio's Loop Starter, but with real musical control: key-aware patterns, swing, instrument variants, and live MIDI recording.

## Features

- **6 Channel Step Sequencer**: Kick, Snare, Hat, Bass, Melody, Arp — expandable to 12
- **Genre Presets**: House, Lo-fi, Trap, Deep House, Drum & Bass — each with unique BPM, swing, key, and instrument voicings
- **Key & Scale Awareness**: All patterns respect the selected root note and scale (minor, major, dorian, phrygian, mixolydian, lydian)
- **Web MIDI Integration**: Record MIDI input directly into patterns with 16th-note quantization, or play notes live on a selected channel
- **Tone.js Audio Engine**: Synthesized sounds using FMSynth, AMSynth, PolySynth — no samples needed
- **Real-time Controls**: Per-channel volume, pan, mute, solo, and instrument variant switching
- **Transport**: Play/stop, BPM, swing, loop length (1-4 bars)
- **MIDI Device Selection**: Dropdown to select input device, record-arm buttons per channel
- **Variants System**: Right-click any channel to switch between 4-5 sound variants (e.g., Bass → FM Sub, Saw Bass, Square Bass, Pluck Bass)
- **Context Menu**: Right-click channels to access instrument variants

## Tech Stack

- **React 19** + **TypeScript 5.8**
- **Vite 8** (dev server + build)
- **Tone.js 15** (Web Audio API wrapper for synthesis and effects)
- **Zustand 5** (state management)
- **Web MIDI API** (native browser MIDI support)
- **CSS Modules** (scoped styles per component)

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
```

The app runs at `https://localhost:5173` (HTTPS required for MIDI — see note below).

## ⚠️ HTTPS Requirement for Web MIDI

**Web MIDI only works in secure contexts (HTTPS).** 

The Vite dev server is configured to use HTTPS with a self-signed certificate:

```typescript
// vite.config.ts
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  plugins: [react(), basicSsl()],
  server: {
    https: true,
  },
});
```

When you first visit the app, your browser will show a security warning about the self-signed cert. **Accept the risk and continue** — this is expected and necessary for MIDI to work.

If you need to access the app from another machine on your network (Tailscale, LAN, etc.), the HTTPS cert will work for that IP as well.

**Common MIDI debugging gotcha**: Most USB MIDI keyboards/controllers are **input-only** — they send MIDI to the computer but don't have output ports. Earlier versions of this app checked for MIDI outputs, which would show "No MIDI devices found" even when a keyboard was connected. The fix: check for **input** ports, not outputs.

If MIDI isn't showing up:
1. Check browser console — should have a log from `src/midi/input.ts` listing available devices
2. Make sure the MIDI device is selected in the dropdown
3. Verify in `chrome://midi-internals` (Chrome/Brave only)

## Project Structure

```
loopstarter/
├── src/
│   ├── audio/
│   │   ├── engine.ts       # Tone.js orchestration: play scheduling, synth management
│   │   └── sounds.ts       # Sound design specs: synth configs, envelopes, effects per channel type
│   ├── midi/
│   │   └── input.ts        # Web MIDI API: device detection, note input capture, quantization logic
│   ├── music/
│   │   ├── presets.ts      # Genre presets: BPM, swing, key, scale, instrument voicings
│   │   ├── patterns.ts     # Pattern generation: algorithmic rhythms for each channel type
│   │   └── scales.ts       # Music theory helpers: scale construction, note filtering
│   ├── ui/
│   │   ├── App.tsx         # Root component: layout, preset selector, channel list
│   │   ├── ChannelStrip.module.css
│   │   ├── ChannelStrip.tsx # Per-channel UI: name, volume/pan knobs, mute/solo, record, meter
│   │   ├── ContextMenu.module.css
│   │   ├── ContextMenu.tsx  # Right-click menu for instrument variants
│   │   ├── Knob.module.css
│   │   ├── Knob.tsx         # Rotary knob component (scroll wheel + drag)
│   │   ├── LevelMeter.module.css
│   │   ├── LevelMeter.tsx   # VU-style level meter per channel
│   │   ├── MidiSelector.module.css
│   │   ├── MidiSelector.tsx # MIDI device dropdown
│   │   ├── PatternGrid.module.css
│   │   ├── PatternGrid.tsx  # Step sequencer grid for a single channel
│   │   ├── Transport.module.css
│   │   └── Transport.tsx    # Play/stop, BPM, swing, loop length controls
│   ├── state/
│   │   └── store.ts        # Zustand store: all app state
│   ├── App.module.css
│   ├── main.tsx
│   └── index.css
├── vite.config.ts          # Vite config with HTTPS plugin
├── package.json
└── tsconfig.json
```

**Separation of concerns:**

- `audio/` owns the Tone.js API. Pure audio logic, no React, no state.
- `midi/` owns the Web MIDI API. Device enumeration, note capture, quantization.
- `music/` owns musical logic. No audio, no UI — pure functions that generate patterns and scales.
- `state/` is the bridge. Zustand store holds all app state, selectors feed it to components.
- `ui/` owns React components and scoped CSS modules.

This makes it easy to swap out the audio engine, add new MIDI features, or redesign the UI without touching the other layers.

## How It Works

### Pattern Generation

Each channel type has its own pattern generation algorithm in `src/music/patterns.ts`:

- **Kick**: House beat (4-on-the-floor), trap (syncopated), or d&b (sparse with bass hits)
- **Snare**: Backbeat on 2 & 4, trap (32nd note rolls), or d&b (ghost notes + accents)
- **Hat**: 8th notes, trap (16th note flurries), or d&b (offbeat accents)
- **Bass**: Random notes from the selected scale, rhythm based on preset style
- **Melody**: Sparse notes from the scale, syncopated or legato depending on genre
- **Arp**: Random pattern from scale, arpeggiated

All patterns respect the preset's key and scale, so the result is always musical.

### Audio Engine

`src/audio/engine.ts` manages:

- Creating synths for each channel (one synth instance per channel)
- Scheduling playback using Tone.js's transport and scheduling API
- Applying per-channel volume/pan/mute via a GainAndPan node
- Hot-swapping instrument variants without restarting the sequencer

`src/audio/sounds.ts` defines the sound design for each channel type:

- Synth types (FMSynth, AMSynth, PolySynth, etc.)
- Oscillator waveshapes, envelope shapes (A/D/S/R)
- Effects chains (reverb, delay, filters)
- Multiple variants per channel (e.g., FM Sub, Saw Bass, Square Bass)

### MIDI Handling

`src/midi/input.ts` handles:

- Detecting MIDI devices on page load and on the fly
- Capturing note-on/off events from the selected input device
- Quantizing incoming notes to 16th notes (aligns to the nearest step)
- Writing notes into the pattern when a channel is record-armed
- Live monitoring: play notes on the currently selected channel without recording

### UI Architecture

All UI state lives in the Zustand store (`src/state/store.ts`). Components subscribe to specific slices:

- `App` holds the channel list and preset selector
- `ChannelStrip` holds controls for one channel (volume, pan, mute, etc.)
- `PatternGrid` renders the step sequencer for one channel
- `Transport` holds play/stop, BPM, swing, loop length

Components dispatch actions to the store (like `play()`, `setBpm()`, `toggleMute()`), and the store updates state, triggering re-renders.

CSS Modules (`.module.css` files) scope styles to each component — no global class name conflicts, reusable and debuggable.

## Next Steps

High priority:

- **More instruments / samples**: Beyond synthesized sounds — sample-based drums, vocals, FX
- **Per-channel effects sends**: Reverb, delay, saturation as send effects, not just inserts
- **Sound variant editor**: Tweak envelope, filter, oscillator settings live (not just pick from presets)
- **Export / import**: Save patterns as JSON, load them back, export as stems (separate audio files per channel)
- **Pattern library**: Save favorite patterns, share them, randomize from a curated collection

Medium priority:

- **Automation lane**: Draw volume/pan/filter changes over time (envelope automation)
- **Circle of fifths UI**: Visual tool for exploring keys and modulations (user suggestion)
- **Piano roll view**: Alternative to step sequencer — time on X axis, pitch on Y axis, click and drag notes

Lower priority:

- **Mobile support**: Touch-friendly controls, responsive layout for tablets
- **Collaboration**: Real-time sync via WebSocket (multiple users editing the same pattern)
- **AI-assisted pattern generation**: Use ML models to suggest melodies, chord progressions, or drums

## Known Limitations

- No sample support yet — all sounds are synthesized in real-time
- No effects sends (reverb/delay are baked into synth configs, not modulatable)
- MIDI quantization is 16th notes only — no triplets or custom quantization
- No audio export — can't render the pattern to WAV/MP3 yet

## License

MIT

## Credits

Built as an experiment in browser-based music production. Inspired by FL Studio's Loop Starter, Ableton, and the broader lineage of step sequencers going back to the TB-303.
