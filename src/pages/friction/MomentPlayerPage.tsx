import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { findMoment } from '../../lib/groundingMoments'
import { DarkTimedShell } from '../../components/moments/DarkTimedShell'
import { darkPillButton } from '../../lib/momentStyles'
import { PaperTimedShell } from '../../components/moments/PaperTimedShell'
import { PaperUntimedShell } from '../../components/moments/PaperUntimedShell'
import { Button } from '../../components/shared/Button'

function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

// Counts elapsed whole seconds while `active`. Each moment is its own
// component, so switching between two moments unmounts/remounts rather than
// reusing state — no separate reset is needed.
function useElapsedSeconds(active: boolean): number {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (!active) return
    const id = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [active])
  return elapsed
}

function BreathingMoment({ durationSec, onClose }: { durationSec: number; onClose: () => void }) {
  const [running, setRunning] = useState(true)
  const elapsed = useElapsedSeconds(running)
  const PHASE_LEN = 4
  const phaseNames = ['Breathe in', 'Hold', 'Breathe out', 'Hold'] as const
  const phaseIndex = Math.floor(elapsed / PHASE_LEN) % 4
  const totalRounds = Math.max(1, Math.round(durationSec / (PHASE_LEN * 4)))
  const round = Math.min(totalRounds, Math.floor(elapsed / (PHASE_LEN * 4)) + 1)
  const remaining = Math.max(0, durationSec - elapsed)
  // Target scale tracks what the breath is actually doing: grow while
  // breathing in, hold at full size, shrink while breathing out, hold at
  // rest. A CSS transition (not a fixed keyframe loop) does the animating —
  // set a new target only at each phase boundary (in/out), and hold phases
  // simply repeat the previous target so nothing moves.
  const expanded = phaseIndex === 0 || phaseIndex === 1
  const scale = expanded ? 1.3 : 0.82
  const transitionMs = running ? 4000 : 0

  return (
    <DarkTimedShell
      title="Breathing"
      onClose={onClose}
      footer={
        <>
          <button type="button" style={darkPillButton()} onClick={() => setRunning((r) => !r)}>
            {running ? 'Pause' : 'Resume'}
          </button>
          <button type="button" style={darkPillButton('solid')} onClick={onClose}>
            I'm done
          </button>
        </>
      }
    >
      <div className="relative flex h-[196px] w-[196px] items-center justify-center">
        <div
          className="absolute inset-0 rounded-full"
          style={{
            border: '1px solid rgba(254,225,106,.24)',
            transform: `scale(${scale})`,
            transition: `transform ${transitionMs}ms ease-in-out`,
          }}
        />
        <div
          className="absolute inset-6 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(255,246,173,.5) 0%, rgba(254,225,106,.12) 60%, transparent 100%)',
            transform: `scale(${scale})`,
            transition: `transform ${transitionMs}ms ease-in-out`,
          }}
        />
        <div className="relative text-[14px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-eol-accent)' }}>
          {phaseNames[phaseIndex]}
        </div>
      </div>
      <div className="flex items-center gap-6 text-[13px] font-semibold uppercase tracking-[0.14em]">
        {phaseNames.map((name, i) => (
          <div key={i} style={{ color: i === phaseIndex ? 'var(--color-eol-accent)' : 'rgba(253,250,244,.36)' }}>
            {name === 'Breathe in' ? 'In 4' : name === 'Breathe out' ? 'Out 4' : 'Hold 4'}
          </div>
        ))}
      </div>
      <div className="text-[15px]" style={{ color: 'rgba(253,250,244,.72)' }}>
        Round {round} of {totalRounds} · {formatClock(remaining)} left
      </div>
    </DarkTimedShell>
  )
}

function SilentMinuteMoment({ durationSec, onClose }: { durationSec: number; onClose: () => void }) {
  const elapsed = useElapsedSeconds(true)
  const remaining = Math.max(0, durationSec - elapsed)
  const done = remaining <= 0

  return (
    <DarkTimedShell
      title="A silent minute"
      onClose={onClose}
      footer={
        !done && (
          <button type="button" style={darkPillButton()} onClick={onClose}>
            End early
          </button>
        )
      }
    >
      {done ? (
        <div className="text-[20px]" style={{ color: 'rgba(253,250,244,.8)', fontFamily: 'var(--font-display)' }}>
          That's the minute.
        </div>
      ) : (
        <>
          <div className="text-[104px] font-light" style={{ color: '#FBF7F2', fontFamily: 'var(--font-display)' }}>
            {formatClock(remaining)}
          </div>
          <div className="max-w-[380px] text-[16px] leading-relaxed" style={{ color: 'rgba(253,250,244,.72)' }}>
            No agenda. Nobody has to say anything, including you.
          </div>
        </>
      )}
    </DarkTimedShell>
  )
}

function GuidedMeditationMoment({ onClose }: { onClose: () => void }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)

  const toggle = () => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) audio.pause()
    else void audio.play()
  }

  return (
    <DarkTimedShell
      title="Guided meditation"
      onClose={onClose}
      footer={
        <>
          <button type="button" style={darkPillButton()} onClick={toggle}>
            {playing ? 'Pause' : 'Play'}
          </button>
          <button type="button" style={darkPillButton('solid')} onClick={onClose}>
            I'm done
          </button>
        </>
      }
    >
      <audio
        ref={audioRef}
        src="/audio/guided-meditation.mp3"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(e) => setProgress(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
      />
      <div className="text-[26px] font-semibold" style={{ color: '#FBF7F2', fontFamily: 'var(--font-display)' }}>
        Letting the day settle
      </div>
      <div className="max-w-[440px] text-[15px] leading-relaxed" style={{ color: 'rgba(253,250,244,.72)' }}>
        Eyes closed or soft. There is nothing to get right here.
      </div>
      <div className="flex w-full max-w-[420px] items-center gap-3.5">
        <div className="text-[12.5px] font-semibold" style={{ color: 'rgba(253,250,244,.72)' }}>
          {formatClock(progress)}
        </div>
        <div className="relative h-[3px] flex-1 rounded-full" style={{ background: 'rgba(253,250,244,.14)' }}>
          <div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{ width: `${duration ? (progress / duration) * 100 : 0}%`, background: 'var(--color-eol-accent)' }}
          />
        </div>
        <div className="text-[12.5px] font-semibold" style={{ color: 'rgba(253,250,244,.48)' }}>
          {formatClock(duration)}
        </div>
      </div>
    </DarkTimedShell>
  )
}

const BEATS = {
  theta: { label: 'Theta 6 Hz', base: 200, offset: 6 },
  alpha: { label: 'Alpha 10 Hz', base: 200, offset: 10 },
  delta: { label: 'Delta 2 Hz', base: 200, offset: 2 },
} as const

function BinauralBeatsMoment({ durationSec, onClose }: { durationSec: number; onClose: () => void }) {
  const [band, setBand] = useState<keyof typeof BEATS>('theta')
  const [playing, setPlaying] = useState(false)
  const elapsed = useElapsedSeconds(playing)
  const remaining = Math.max(0, durationSec - elapsed)
  const ctxRef = useRef<AudioContext | null>(null)
  const oscillatorsRef = useRef<OscillatorNode[]>([])

  // Two oscillators, hard-panned left/right at slightly different
  // frequencies — the perceived "beat" is the difference between them, so
  // this needs true stereo, not a pre-rendered file.
  const start = () => {
    const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new AudioCtx()
    const { base, offset } = BEATS[band]
    const gain = ctx.createGain()
    gain.gain.value = 0.05
    gain.connect(ctx.destination)
    const make = (freq: number, pan: number) => {
      const osc = ctx.createOscillator()
      osc.frequency.value = freq
      osc.type = 'sine'
      const panner = ctx.createStereoPanner()
      panner.pan.value = pan
      osc.connect(panner).connect(gain)
      osc.start()
      return osc
    }
    oscillatorsRef.current = [make(base, -1), make(base + offset, 1)]
    ctxRef.current = ctx
    setPlaying(true)
  }

  const stop = () => {
    oscillatorsRef.current.forEach((o) => o.stop())
    oscillatorsRef.current = []
    void ctxRef.current?.close()
    ctxRef.current = null
    setPlaying(false)
  }

  useEffect(() => () => stop(), [])

  const handleClose = () => {
    stop()
    onClose()
  }

  return (
    <DarkTimedShell
      title="Binaural beats"
      onClose={handleClose}
      footer={
        <>
          <button type="button" style={darkPillButton()} onClick={handleClose}>
            {playing ? 'Stop' : 'Close'}
          </button>
          {!playing && (
            <button type="button" style={darkPillButton('solid')} onClick={start}>
              Play
            </button>
          )}
        </>
      }
    >
      <div className="relative flex h-[140px] w-[260px] items-center justify-center">
        <div
          className="absolute left-[34px] h-[132px] w-[132px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(255,246,173,.42) 0%, rgba(254,225,106,.08) 62%, transparent 100%)' }}
        />
        <div
          className="absolute right-[34px] h-[132px] w-[132px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(255,169,248,.34) 0%, rgba(255,169,248,.07) 62%, transparent 100%)' }}
        />
        <div className="relative text-[15px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-eol-accent)' }}>
          {BEATS[band].label}
        </div>
      </div>
      <div className="text-[24px] font-semibold" style={{ color: '#FBF7F2', fontFamily: 'var(--font-display)' }}>
        Deep focus
      </div>
      <div className="text-[14.5px]" style={{ color: 'rgba(253,250,244,.6)' }}>
        Headphones needed — the effect depends on two ears
      </div>
      <div className="flex items-center gap-2.5">
        {(Object.keys(BEATS) as (keyof typeof BEATS)[]).map((key) => (
          <button
            key={key}
            type="button"
            disabled={playing}
            onClick={() => setBand(key)}
            className="rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold uppercase tracking-[0.1em]"
            style={
              band === key
                ? { background: 'rgba(254,225,106,.14)', color: 'var(--color-eol-accent)' }
                : { border: '1px solid rgba(253,250,244,.2)', color: 'rgba(253,250,244,.6)' }
            }
          >
            {BEATS[key].label}
          </button>
        ))}
      </div>
      {playing && (
        <div className="text-[13.5px]" style={{ color: 'rgba(253,250,244,.48)' }}>
          Keeps playing while you work · {formatClock(remaining)} left
        </div>
      )}
    </DarkTimedShell>
  )
}

function DanceMomentMoment({ durationSec, onClose }: { durationSec: number; onClose: () => void }) {
  const [playing, setPlaying] = useState(false)
  const elapsed = useElapsedSeconds(playing)
  const remaining = Math.max(0, durationSec - elapsed)
  const bars = [22, 44, 14, 56, 30, 48, 18, 38]

  return (
    <DarkTimedShell
      title="Dance moment"
      onClose={onClose}
      footer={
        remaining > 0 ? (
          <button type="button" style={darkPillButton('solid')} onClick={() => setPlaying((p) => !p)}>
            {playing ? 'Pause' : 'Play it'}
          </button>
        ) : (
          <button type="button" style={darkPillButton('solid')} onClick={onClose}>
            Nice — I'm done
          </button>
        )
      }
    >
      <div className="flex h-[56px] items-end gap-[5px]">
        {bars.map((h, i) => (
          <div
            key={i}
            className="w-[5px] rounded-[3px]"
            style={{ height: h, background: i % 2 === 0 ? 'var(--color-eol-accent)' : 'var(--color-eol-pink)', opacity: playing ? 1 : 0.4 }}
          />
        ))}
      </div>
      <div className="text-[26px] font-semibold" style={{ color: '#FBF7F2', fontFamily: 'var(--font-display)' }}>
        Put on a song you love
      </div>
      <div className="max-w-[420px] text-[14.5px] leading-relaxed" style={{ color: 'rgba(253,250,244,.6)' }}>
        Nobody is watching and nobody is scoring this. Put it on the big screen if you're together.
      </div>
      {playing && (
        <div className="text-[15px]" style={{ color: 'rgba(253,250,244,.72)' }}>
          {formatClock(remaining)} left
        </div>
      )}
    </DarkTimedShell>
  )
}

function ShakeItOffMoment({ durationSec, onClose }: { durationSec: number; onClose: () => void }) {
  const elapsed = useElapsedSeconds(true)
  const remaining = Math.max(0, durationSec - elapsed)
  return (
    <PaperTimedShell
      eyebrow="1 min"
      title="Shake it off"
      timeLabel={formatClock(remaining)}
      steps={['Stand up. Let your arms hang.', 'Shake out your hands, then your legs. Keep going past the point it feels silly.', 'Stop. Notice what changed.']}
      onDone={onClose}
      onSkip={onClose}
    />
  )
}

function ForestBathingMoment({ onClose }: { onClose: () => void }) {
  const prompts = ['One thing moving.', "One sound you'd normally miss.", 'One thing older than you.']
  return (
    <PaperUntimedShell eyebrow="About 6 min · Outside" title="Forest bathing lite" ctaLabel="I'm back" onDone={onClose}>
      <div className="flex flex-col gap-3">
        <p className="m-0 text-[15px] leading-relaxed" style={{ color: 'var(--color-eol-text-secondary)' }}>
          Go outside, or find one tree. Nothing to log, nothing to finish.
        </p>
        <div className="h-px" style={{ background: 'var(--color-eol-border)' }} />
        <div className="text-[11.5px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--color-eol-text-muted)' }}>
          Three things to notice
        </div>
        {prompts.map((p, i) => (
          <div
            key={p}
            className="rounded-xl border px-4 py-3.5 text-[15.5px] font-medium"
            style={
              i === 0
                ? { background: 'var(--color-eol-surface)', borderColor: 'var(--color-eol-border-strong)', fontFamily: 'var(--font-display)' }
                : { background: 'var(--color-eol-bg)', borderColor: 'var(--color-eol-border)', color: 'var(--color-eol-text-secondary)', fontFamily: 'var(--font-display)' }
            }
          >
            {p}
          </div>
        ))}
      </div>
    </PaperUntimedShell>
  )
}

function WalkNoGoalMoment({ onClose }: { onClose: () => void }) {
  return (
    <PaperUntimedShell eyebrow="Any time · Outside" title="A walk with no goal" ctaLabel="I'm back" onDone={onClose}>
      <div className="flex flex-col gap-4">
        <div className="rounded-2xl border px-5 py-5" style={{ background: 'var(--color-eol-surface)', borderColor: 'var(--color-eol-border-strong)' }}>
          <div className="text-[20px] font-semibold leading-snug" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-eol-text)' }}>
            No podcast. No step count. Nothing to get from it.
          </div>
          <p className="m-0 mt-2 text-[14.5px] leading-relaxed" style={{ color: 'var(--color-eol-text-secondary)' }}>
            Go somewhere you know. The point isn't to get lost, it's that nothing about the walk is optimized.
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="text-[11.5px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--color-eol-text-muted)' }}>
            Before you go
          </div>
          <p className="m-0 text-[15px] leading-relaxed" style={{ color: 'var(--color-eol-text)' }}>
            Put your phone in your pocket. This screen doesn't time you and nothing expires.
          </p>
        </div>
      </div>
    </PaperUntimedShell>
  )
}

function FreeFormArtMoment({ onClose }: { onClose: () => void }) {
  return (
    <PaperUntimedShell eyebrow="Any time · Off screen" title="Free-form art" ctaLabel="Done" onDone={onClose}>
      <div className="flex flex-col gap-4">
        <div className="rounded-2xl border px-5 py-5" style={{ background: 'var(--color-eol-surface)', borderColor: 'var(--color-eol-border-strong)' }}>
          <div className="text-[20px] font-semibold leading-snug" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-eol-text)' }}>
            Grab a piece of paper and something to draw with.
          </div>
          <p className="m-0 mt-2 text-[14.5px] leading-relaxed" style={{ color: 'var(--color-eol-text-secondary)' }}>
            A pen, a marker, a pencil — whatever is closest. Then make some art.
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="text-[11.5px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--color-eol-text-muted)' }}>
            The whole brief
          </div>
          <p className="m-0 text-[15px] leading-relaxed" style={{ color: 'var(--color-eol-text)' }}>
            No subject. No skill required. Nobody sees it, so it doesn't have to be of anything.
          </p>
        </div>
      </div>
    </PaperUntimedShell>
  )
}

export default function MomentPlayerPage() {
  const { teamId, momentId } = useParams<{ teamId: string; momentId: string }>()
  const navigate = useNavigate()
  const moment = findMoment(momentId)
  const onClose = () => navigate(`/teams/${teamId}/friction`)

  if (!moment) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 px-6 py-16 text-center">
        <p className="m-0 text-[13.5px]" style={{ color: 'var(--color-eol-text-secondary)' }}>
          That moment doesn't exist.
        </p>
        <Button variant="secondary" onClick={onClose}>
          Back to Unlearn
        </Button>
      </div>
    )
  }

  switch (moment.id) {
    case 'breathing':
      return <BreathingMoment durationSec={moment.durationSec as number} onClose={onClose} />
    case 'silent-minute':
      return <SilentMinuteMoment durationSec={moment.durationSec as number} onClose={onClose} />
    case 'guided-meditation':
      return <GuidedMeditationMoment onClose={onClose} />
    case 'binaural-beats':
      return <BinauralBeatsMoment durationSec={moment.durationSec as number} onClose={onClose} />
    case 'dance-moment':
      return <DanceMomentMoment durationSec={moment.durationSec as number} onClose={onClose} />
    case 'shake-it-off':
      return <ShakeItOffMoment durationSec={moment.durationSec as number} onClose={onClose} />
    case 'forest-bathing':
      return <ForestBathingMoment onClose={onClose} />
    case 'walk-no-goal':
      return <WalkNoGoalMoment onClose={onClose} />
    case 'free-form-art':
      return <FreeFormArtMoment onClose={onClose} />
    default:
      return null
  }
}
