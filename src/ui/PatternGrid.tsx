
import React, { useRef, useState, useEffect } from 'react';
import { useStore, TICKS_PER_BEAT, type Note } from '../state/store';
import { getScaleNotes } from '../music/scales';
import styles from './PatternGrid.module.css';

interface PatternGridProps {
  channelId: string;
  channelType: string;
  totalTicks: number;
  currentTick: number;
}

const TICK_PX = 8; // pixels per tick
const MIN_NOTE_TICKS = 1;      // minimum note length = 1 tick = 1/8 beat
const DEFAULT_NOTE_TICKS = TICKS_PER_BEAT; // default = 1 beat (quarter note)
const TICKS_PER_BAR = 16 * TICKS_PER_BEAT;
const TICKS_PER_BEAT_MID = TICKS_PER_BEAT; // alias

export const PatternGrid: React.FC<PatternGridProps> = ({
  channelId,
  channelType,
  totalTicks,
  currentTick,
}) => {
  const notes = useStore((s) => s.channels.find((c) => c.id === channelId)?.notes || []);
  const addNote = useStore((s) => s.addNote);
  const removeNote = useStore((s) => s.removeNote);
  const updateNote = useStore((s) => s.updateNote);
  const root = useStore((s) => s.root);
  const scale = useStore((s) => s.scale);
  const bassOctave = useStore((s) => s.bassOctave);
  const melodyOctave = useStore((s) => s.melodyOctave);

  const isDrum = channelType === 'kick' || channelType === 'snare' || channelType === 'hat';
  const gridRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{
    type: 'resize' | 'move' | 'create';
    noteId?: string;
    startX: number;
    startTick: number;
    originalStart: number;
    originalDuration: number;
    currentTick: number;
  } | null>(null);

  const [, forceUpdate] = useState(0);

  // ── Helpers ──────────────────────────────────────────────────


  const getNoteLabel = (note: Note) => {
    if (isDrum) return null;
    return note.note.replace('#', '');
  };

  const getRandomScaleNote = () => {
    const octave = channelType === 'bass' ? bassOctave : melodyOctave;
    const octaves = channelType === 'bass' ? 1 : 2;
    const sc = getScaleNotes(root, scale, octave, octaves);
    return sc[Math.floor(Math.random() * sc.length)];
  };

  // ── Mouse handling ───────────────────────────────────────────
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      const drag = dragState.current;
      if (!drag) return;

      const dx = e.clientX - drag.startX;
      const dtick = Math.round(dx / TICK_PX);

      if (drag.type === 'resize') {
        const newDur = Math.max(MIN_NOTE_TICKS, drag.originalDuration + dtick);
        // Clamp: don't exceed total length or overlap next note (skip overlap check for simplicity)
        const maxDur = totalTicks - drag.startTick;
        updateNote(channelId, drag.noteId!, { duration: Math.min(newDur, maxDur) });
      } else if (drag.type === 'move') {
        const newStart = Math.max(0, Math.min(totalTicks - drag.originalDuration, drag.originalStart + dtick));
        // Snap to grid
        updateNote(channelId, drag.noteId!, { start: newStart });
      } else if (drag.type === 'create') {
        // Live resize during create
        drag.currentTick = Math.max(MIN_NOTE_TICKS, dtick);
        forceUpdate((n) => n + 1);
      }
    };

    const onMouseUp = (e: MouseEvent) => {
      const drag = dragState.current;
      if (!drag) return;

      if (drag.type === 'create') {
        const duration = Math.max(MIN_NOTE_TICKS, Math.round((e.clientX - drag.startX) / TICK_PX));
        const note = isDrum ? 'x' : getRandomScaleNote();
        addNote(channelId, note, drag.startTick, duration);
      }

      dragState.current = null;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = 'auto';
      document.body.style.userSelect = 'auto';
    };

    // These get added dynamically during mousedown, but the effect
    // ensures cleanup on unmount. The actual listeners are added per-drag.
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [channelId, addNote, updateNote, totalTicks, isDrum, root, scale, channelType, bassOctave, melodyOctave]);

  // ── Start a drag ─────────────────────────────────────────────
  const startDrag = (type: 'resize' | 'move' | 'create', note: Note | undefined, tick: number, clientX: number) => {
    const startX = clientX;
    dragState.current = {
      type,
      noteId: note?.id,
      startX,
      startTick: tick,
      originalStart: note?.start ?? tick,
      originalDuration: note?.duration ?? DEFAULT_NOTE_TICKS,
      currentTick: DEFAULT_NOTE_TICKS,
    };
    document.addEventListener('mousemove', onMouseMoveHandler);
    document.addEventListener('mouseup', onMouseUpHandler);
    document.body.style.userSelect = 'none';
  };

  const onMouseMoveHandler = (e: MouseEvent) => {
    const drag = dragState.current;
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    const dtick = Math.round(dx / TICK_PX);

    if (drag.type === 'resize' && drag.noteId) {
      const newDur = Math.max(MIN_NOTE_TICKS, drag.originalDuration + dtick);
      const maxDur = totalTicks - drag.originalStart;
      updateNote(channelId, drag.noteId, { duration: Math.min(newDur, maxDur) });
    } else if (drag.type === 'move' && drag.noteId) {
      const newStart = Math.max(0, Math.min(totalTicks - drag.originalDuration, drag.originalStart + dtick));
      updateNote(channelId, drag.noteId, { start: newStart });
    } else if (drag.type === 'create') {
      const dur = Math.max(MIN_NOTE_TICKS, dtick);
      drag.currentTick = dur;
      forceUpdate((n) => n + 1);
    }
  };

  const onMouseUpHandler = (e: MouseEvent) => {
    const drag = dragState.current;
    if (!drag) return;

    if (drag.type === 'create') {
      const duration = Math.max(MIN_NOTE_TICKS, Math.round((e.clientX - drag.startX) / TICK_PX));
      const note = isDrum ? 'x' : getRandomScaleNote();
      addNote(channelId, note, drag.startTick, duration);
    }

    document.removeEventListener('mousemove', onMouseMoveHandler);
    document.removeEventListener('mouseup', onMouseUpHandler);
    document.body.style.cursor = 'auto';
    document.body.style.userSelect = 'auto';
    dragState.current = null;
  };

  // ─ Render helpers ────────────────────────────────────────────
  const gridWidth = totalTicks * TICK_PX;
  const playheadX = currentTick * TICK_PX;

  // Precompute which tick has a note for quick lookup
  const tickToNote = new Map<number, Note>();
  for (const n of notes) {
    for (let t = n.start; t < n.start + n.duration && t < totalTicks; t++) {
      tickToNote.set(t, n);
    }
  }

  // Build ruler ticks
  const gridRows: React.ReactNode[] = [];

  // ─ Ruler row ────────────────────────────────────────────────
  const rulerCells: React.ReactNode[] = [];
  for (let t = 0; t < totalTicks; t += TICKS_PER_BEAT_MID) {
    const beatInBar = (t / TICKS_PER_BEAT_MID) % 16; // 0-15, which 16th note of the bar
    const isBar = beatInBar === 0;
    const barNum = Math.floor(t / TICKS_PER_BAR) + 1;
    const beatNum = Math.floor(beatInBar / TICKS_PER_BEAT_MID) + 1;

    rulerCells.push(
      <div
        key={t}
        className={`${styles.rulerCell} ${isBar ? styles.rulerBar : ''}`}
        style={{ minWidth: TICKS_PER_BEAT_MID * TICK_PX, width: TICKS_PER_BEAT_MID * TICK_PX, flexShrink: 0 }}
      >
        {isBar ? `${barNum}` : `${barNum}.${beatNum}`}
      </div>
    );
  }

  gridRows.push(
    <div key="ruler" className={styles.rulerRow}>{rulerCells}</div>
  );

  // ── Notes row ────────────────────────────────────────────────
  const tickCells: React.ReactNode[] = [];
  for (let t = 0; t < totalTicks; t++) {
    const isBarTick = t % TICKS_PER_BAR === 0;
    const isBeatTick = t % TICKS_PER_BEAT_MID === 0;
    const isCurrent = t === currentTick;
    const note = tickToNote.get(t);

    let cls = styles.tick;
    if (isBarTick) cls += ` ${styles.tickBar}`;
    if (isBeatTick && !isBarTick) cls += ` ${styles.tickBeat}`;
    if (isCurrent) cls += ` ${styles.tickPlayhead}`;

    // Only render if no note spans this tick (notes render as blocks)
    if (!note) {
      tickCells.push(
        <div
          key={t}
          className={cls}
          style={{ minWidth: TICK_PX, width: TICK_PX, flexShrink: 0 }}
          onMouseDown={(e) => {
            if (e.button === 2) return; // let right-click handle delete elsewhere
            startDrag('create', undefined, t, e.clientX);
          }}
        />
      );
    } else {
      // Render note block on the first tick of the note
      if (t === note.start) {
        const noteWidth = note.duration * TICK_PX;
        const label = getNoteLabel(note);
        tickCells.push(
          <div
            key={t}
            className={`${styles.noteBlock} ${styles.noteActive}`}
            style={{
              minWidth: noteWidth,
              width: noteWidth,
              flexShrink: 0,
              position: 'relative',
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              // Determine if clicking right edge (last ~6px)
              const rect = e.currentTarget.getBoundingClientRect();
              const localX = e.clientX - rect.left;
              if (localX > rect.width - 8 && note.duration > MIN_NOTE_TICKS) {
                startDrag('resize', note, t, e.clientX);
              } else {
                startDrag('move', note, t, e.clientX);
              }
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              removeNote(channelId, note.id);
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              removeNote(channelId, note.id);
            }}
            title={`${label || 'hit'} · ${note.duration / TICKS_PER_BEAT_MID} beats`}
          >
            {label && <span className={styles.noteLabel}>{label}</span>}
            <div className={styles.resizeHandle} />
          </div>
        );
      }
      // Skip subsequent ticks of the same note (they're spanned by the block)
    }
  }

  gridRows.push(
    <div key="notes" className={styles.tickRow}>{tickCells}</div>
  );

  // ─ Render drag preview (for create) ─────────────────────────
  let dragPreview: React.ReactNode = null;
  if (dragState.current?.type === 'create') {
    const previewWidth = dragState.current.currentTick * TICK_PX;
    dragPreview = (
      <div
        className={styles.dragPreview}
        style={{
          left: dragState.current.startTick * TICK_PX,
          width: Math.max(TICK_PX, previewWidth),
          top: 0,
          height: '100%',
          position: 'absolute',
        }}
      />
    );
  }

  return (
    <div
      ref={gridRef}
      className={styles.gridWrap}
      onContextMenu={(e) => {
        // Empty space right-click = delete nothing, just prevent default
        e.preventDefault();
      }}
    >
      <div className={styles.grid}>
        {gridRows}
      </div>
      <div
        className={styles.playhead}
        style={{ left: playheadX }}
      />
      {dragPreview && (
        <div className={styles.dragPreviewLayer} style={{ left: 0, width: gridWidth, position: 'absolute', top: 0, height: '100%', pointerEvents: 'none' }}>
          {dragPreview}
        </div>
      )}
    </div>
  );
};
