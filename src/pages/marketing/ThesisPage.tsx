import { Link } from 'react-router-dom'
import heartModel from '../../assets/landing/heart-model.webp'
import { MarketingHeader } from '../../components/marketing/MarketingHeader'
import { MarketingFooter } from '../../components/marketing/MarketingFooter'
import { Seo } from '../../components/shared/Seo'
import { BOOKING_URL, DISPLAY, Eyebrow, OctopusIcon, primaryButton, secondaryButtonOnDark, trackBooking } from '../../components/marketing/shared'

const REVOLUTIONS = [
  { label: 'Technological revolution', body: 'Artificial intelligence is rapidly changing how work gets done.' },
  {
    label: 'Cultural revolution',
    body: 'Collective consciousness is expanding — people are craving community, connection, work that matters, and a life that feels good now, not someday.',
  },
  {
    label: 'Geopolitical revolution',
    body: 'People are realizing that our existing systems weren’t built for the benefit of most humans. The wealth gap is growing, and a lot of people are tired of working this hard for little reward.',
  },
]

const WHY_NOW_BODY = [
  'The pace of change is accelerating, but most organizations still run on operating models designed for an old paradigm. The result is familiar: teams become overwhelmed, strategy stalls, change initiatives fail, AI tools get deployed without meaningful adoption, and people burn out trying to keep up with complexity that outpaces their capacity to process it.',
  'Most organizations don’t have a technology problem. They have a coordination problem. More specifically, they have an energy problem.',
  'When people are aligned around a meaningful vision, trust one another, and have healthy ways to navigate uncertainty together, momentum builds naturally. When they’re disconnected, protecting themselves, or working toward competing goals, even the best strategies struggle to succeed.',
  'All this change and uncertainty makes life feel daunting on an individual level — people want a better life, a better work environment, their dreams realized, but it’s hard to take that on alone, especially when we don’t yet know who we’re becoming collectively. So most people focus on individual expansion: getting at peace with themselves so they can either show up better inside the system, or leave it sooner. But what if that same expansion work could be applied to a group moving toward a common goal? How much dormant human potential is sitting untapped in our teams and organizations? How much more alive could work become? What amazing things could we create together?',
  'Empire of Light proposes that the next generation of organizations will require a different operating system — one that develops collective intelligence alongside strategy and execution.',
]

const CYCLE_STAGES = [
  {
    n: '01',
    title: 'Reimagine',
    subtitle: 'Clarify Vision',
    body: 'Transformation begins with a shared picture of what’s worth creating. Rather than optimizing existing systems, participants connect — through presence, not analysis — with a future that feels meaningful, alive, and desirable. This stage explores: What future are we creating? Why does it matter? What values guide us? How will we know we’re moving in the right direction? A compelling vision becomes an organizing force that aligns decisions across the whole system.',
  },
  {
    n: '02',
    title: 'Do',
    subtitle: 'Take Aligned Action',
    body: 'Vision becomes real through experimentation. Rather than waiting for certainty, individuals begin acting from the identity they’re becoming — trying new things, making commitments, building something. Small experiments generate learning while creating forward momentum. Progress emerges through cycles of action, not perfect planning.',
  },
  {
    n: '03',
    title: 'Unlearn',
    subtitle: 'Integrate Friction',
    body: 'Every meaningful change surfaces resistance. In individuals, this shows up as fear, uncertainty, limiting beliefs, or emotional and somatic activation — the shadow material that action inevitably stirs up. In organizations, it shows up as conflict, misalignment, communication breakdowns, competing incentives, unclear priorities, or protective behaviors. Rather than treating these as failures, the framework treats them as information. Practices like reflection, somatic regulation, facilitated dialogue, and structured sensemaking help teams metabolize friction instead of getting trapped by it.',
  },
  {
    n: '04',
    title: 'Evolve',
    subtitle: 'Express & Evolve',
    body: 'Transformation is continuous. As learning accumulates, new possibilities emerge. Teams celebrate progress, integrate lessons, refine their vision, and begin the next cycle from a higher level of collective capability. Creativity becomes evidence that the system has developed new capacity.',
  },
]

const WHY_BETTER = [
  {
    title: 'Rooted in unconditional love',
    body: 'A purpose greater than any individual, and a direction to move toward together. This makes difficult conversations easier — they’re all in service of people becoming their best selves and the team reaching the goal, not in service of blame.',
  },
  {
    title: 'Vision- and action-oriented',
    body: 'Traditional linear goal-setting is too slow for this era. This approach gives teams a nimbler way to manage change, tap into collective intelligence, and iterate — it unlocks flow.',
  },
  {
    title: 'Heart as a compass, data as a lagging indicator',
    body: 'Data is backward-looking; it can’t tell you how to move forward. This approach helps teams figure out where to move, and treats data as confirmation that it’s working. Teams that only look at data tend to make incremental changes — not step-changes.',
  },
]

const APPLICATIONS = [
  'AI transformation initiatives',
  'Leadership teams',
  'Product organizations',
  'Cross-functional innovation groups',
  'Research collaborations',
  'Community initiatives',
  'Regenerative business ecosystems',
  'Incubators and interdisciplinary design teams',
]

const AI_ERA_CAPABILITIES = [
  'Develop shared vision',
  'Coordinate meaningful action',
  'Surface friction early',
  'Facilitate structured reflection',
  'Strengthen psychological safety',
  'Integrate AI into existing workflows',
  'Continuously adapt as conditions change',
]

const RESEARCH_QUESTIONS = [
  'Under what conditions does collective transformation emerge?',
  'How can collective intelligence be measured?',
  'What role does vision play in sustaining adaptation?',
  'Which facilitation practices most effectively help teams metabolize friction?',
  'How can AI support — not replace — the uniquely human capacities that enable collective transformation?',
]

function SectionHeading({ eyebrow, title, color }: { eyebrow: string; title: string; color?: string }) {
  return (
    <>
      <Eyebrow color={color}>{eyebrow}</Eyebrow>
      <h2
        className="m-0 mb-6 text-[28px] leading-[1.1] font-light md:text-[38px] md:leading-[1.06]"
        style={{ ...DISPLAY, letterSpacing: '.02em', color: color === '#FEE16A' ? '#FBF7F2' : '#131114' }}
      >
        {title}
      </h2>
    </>
  )
}

export default function ThesisPage() {
  return (
    <div style={{ width: '100%', overflowX: 'hidden', background: '#FDFAF4', color: '#131114', fontFamily: "'Work Sans', system-ui, sans-serif" }}>
      <Seo
        title="The Empire of Light Thesis | A Theory of Collective Transformation"
        description="How shifts in individual consciousness translate into collective transformation within organizational systems — the research and framework behind Empire of Light."
        path="/thesis"
      />
      <MarketingHeader />

      {/* Hero */}
      <section className="relative overflow-hidden px-6 py-20 md:px-8 md:py-[104px]" style={{ background: '#000000' }}>
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: 'radial-gradient(120% 100% at 50% 100%, #FFF6AD 0%, rgba(254,225,106,.55) 28%, rgba(0,0,0,0) 72%)',
            opacity: 0.5,
          }}
        />
        <div className="relative mx-auto max-w-[840px] text-center">
          <div className="mb-6 text-[13px] font-semibold uppercase tracking-[0.16em]" style={{ ...DISPLAY, color: '#FEE16A' }}>
            Empire of Light Thesis
          </div>
          <h1
            className="m-0 mb-6 text-[36px] leading-[1.1] font-light md:text-[54px] md:leading-[1.06]"
            style={{ ...DISPLAY, letterSpacing: '.02em', color: '#FBF7F2' }}
          >
            A Theory of Collective Transformation
          </h1>
          <p className="mx-auto m-0 max-w-[600px] text-[17px] leading-[1.55]" style={{ color: 'rgba(251,247,242,.72)' }}>
            How shifts in individual consciousness translate into collective transformation within organizational systems.
          </p>
        </div>
      </section>

      {/* Why this matters now */}
      <section className="px-6 py-16 md:px-8 md:py-24">
        <div className="mx-auto max-w-[840px]">
          <SectionHeading eyebrow="Why this matters now" title="Organizations are facing a convergence of forces unlike anything in recent history" />
          <div className="mb-8 flex flex-col gap-4.5">
            {REVOLUTIONS.map((r) => (
              <div key={r.label} className="flex items-start gap-3.5">
                <div className="mt-2.5 h-[7px] w-[7px] shrink-0 rounded-full" style={{ background: '#D99A22' }} />
                <div className="text-[16px] leading-[1.6] md:text-[17px]" style={{ color: '#131114' }}>
                  <strong style={{ fontWeight: 600 }}>{r.label}.</strong> {r.body}
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-4.5">
            {WHY_NOW_BODY.map((p, i) => (
              <p key={i} className="m-0 text-[16px] leading-[1.7] md:text-[17px]" style={{ color: '#544D5A' }}>
                {p}
              </p>
            ))}
          </div>
        </div>
      </section>

      {/* The thesis */}
      <section className="px-6 py-16 md:px-8 md:py-24" style={{ background: '#000000' }}>
        <div className="mx-auto max-w-[840px]">
          <SectionHeading eyebrow="The thesis" title="Individual and collective transformation follow the same underlying adaptive pattern" color="#FEE16A" />
          <div className="flex flex-col gap-5">
            <p className="m-0 text-[16px] leading-[1.7] md:text-[17px]" style={{ color: 'rgba(251,247,242,.75)' }}>
              <strong style={{ color: '#FBF7F2', fontWeight: 600 }}>Research question:</strong> How can shifts in individual consciousness be
              translated into collective transformation within organizational systems?
            </p>
            <p className="m-0 text-[16px] leading-[1.7] md:text-[17px]" style={{ color: 'rgba(251,247,242,.75)' }}>
              This work emerged from a six-year autoethnographic study of personal transformation, combined with product strategy practice and
              organizational facilitation. It currently represents a working theory, refined through direct practice rather than a finished,
              proven model.
            </p>
            <p className="m-0 text-[16px] leading-[1.7] md:text-[17px]" style={{ color: 'rgba(251,247,242,.75)' }}>
              <strong style={{ color: '#FBF7F2', fontWeight: 600 }}>Thesis:</strong> Individual and collective transformation follow the same
              underlying adaptive pattern — moving from contraction and self-protection toward connection, creativity, and adaptive action. From
              a fear-based operating system to one rooted in trust and, at its deepest level, unconditional love.
            </p>
            <p className="m-0 text-[16px] leading-[1.7] md:text-[17px]" style={{ color: 'rgba(251,247,242,.75)' }}>
              <strong style={{ color: '#FBF7F2', fontWeight: 600 }}>Proposed mechanism:</strong> A compelling vision provides enough motivational
              pull to sustain engagement through uncertainty, identity destabilization, and emotional processing — enabling adaptive
              reorganization at both the individual and collective level.
            </p>
            <p className="m-0 text-[16px] leading-[1.7] md:text-[17px]" style={{ color: 'rgba(251,247,242,.75)' }}>
              Transformation happens because people develop the capacity to stay connected to a meaningful future while navigating uncertainty,
              identity shifts, emotional discomfort, and changing circumstances. This suggests that many practices traditionally viewed as
              &ldquo;personal development&rdquo; are also valuable design principles for organizational systems.
            </p>
          </div>
        </div>
      </section>

      {/* The framework */}
      <section id="framework" className="px-6 py-16 md:px-8 md:py-24">
        <div className="mx-auto max-w-[1120px]">
          <div className="mb-12 max-w-[720px]">
            <SectionHeading eyebrow="The Empire of Light Framework" title="Reimagine, Do, Unlearn, Evolve" />
            <p className="m-0 text-[16px] leading-[1.7] md:text-[17px]" style={{ color: '#544D5A' }}>
              The Empire of Light Framework is an adaptive cycle — a heart model — for helping individuals and groups translate vision into
              reality while continuously learning and evolving. The cycle runs in four beats. Vision has to come first — you can&rsquo;t ask
              anyone to let go of old patterns in service of nothing. The pull of a real vision is what makes unlearning possible, not the other
              way around.
            </p>
          </div>
          <img
            src={heartModel}
            alt="The Empire of Light heart model — Reimagine, Do, Unlearn, Evolve"
            width={750}
            height={549}
            className="mb-12 block w-full max-w-[640px] rounded-2xl object-cover"
            style={{ aspectRatio: '750 / 549' }}
          />
          <div
            className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border sm:grid-cols-2"
            style={{ background: '#D8D2DC', borderColor: '#D8D2DC' }}
          >
            {CYCLE_STAGES.map((stage) => (
              <div key={stage.n} className="p-8" style={{ background: '#FFFFFF' }}>
                <div className="mb-5 text-[13px] font-semibold tracking-[0.16em]" style={{ ...DISPLAY, color: '#A96D0F' }}>
                  {stage.n} &middot; {stage.subtitle}
                </div>
                <h3 className="m-0 mb-3 text-[22px] font-semibold tracking-[0.03em] md:text-[24px]" style={{ ...DISPLAY, color: '#131114' }}>
                  {stage.title}
                </h3>
                <p className="m-0 text-[15px] leading-[1.65]" style={{ color: '#544D5A' }}>
                  {stage.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Scaling */}
      <section className="px-6 py-16 md:px-8 md:py-24">
        <div className="mx-auto max-w-[840px]">
          <SectionHeading eyebrow="Scaling from individuals to organizations" title="The same adaptive cycle operates at multiple scales" />
          <div className="flex flex-col gap-5">
            <p className="m-0 text-[16px] leading-[1.7] md:text-[17px]" style={{ color: '#544D5A' }}>
              An individual can clarify a personal vision. A leadership team can clarify a strategic vision. A startup can clarify a product
              vision. A community can clarify a shared future. The underlying process stays remarkably similar.
            </p>
            <p className="m-0 text-[16px] leading-[1.7] md:text-[17px]" style={{ color: '#544D5A' }}>
              We hypothesize the framework is especially well-suited to group transformation: the visions can be bigger, the actions more
              impactful, and — counterintuitively — the friction work is often easier to do collectively. Group dynamics surface hidden
              assumptions, competing mental models, and relationship patterns that don&rsquo;t as easily come to the surface in individual work
              alone.
            </p>
            <p className="m-0 text-[16px] leading-[1.7] md:text-[17px]" style={{ color: '#544D5A' }}>
              Empire of Light does not replace individual therapeutic work or 1:1 therapy. It provides a practical framework for helping groups
              transform together while building something meaningful.
            </p>
          </div>
        </div>
      </section>

      {/* Why this works better */}
      <section className="px-6 py-16 md:px-8 md:py-24" style={{ background: '#000000' }}>
        <div className="mx-auto max-w-[1120px]">
          <SectionHeading eyebrow="Why this works better than other approaches" title="Three principles that set this framework apart" color="#FEE16A" />
          <div className="mt-4 grid grid-cols-1 gap-px overflow-hidden rounded-xl border sm:grid-cols-3" style={{ background: 'rgba(251,247,242,.14)', borderColor: 'rgba(251,247,242,.14)' }}>
            {WHY_BETTER.map((item) => (
              <div key={item.title} className="p-8" style={{ background: '#0C0A0D' }}>
                <h3 className="m-0 mb-3 text-[19px] font-semibold" style={{ ...DISPLAY, color: '#FBF7F2' }}>
                  {item.title}
                </h3>
                <p className="m-0 text-[15px] leading-[1.6]" style={{ color: 'rgba(251,247,242,.7)' }}>
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Collective intelligence as an OS */}
      <section className="px-6 py-16 md:px-8 md:py-24">
        <div className="mx-auto max-w-[840px]">
          <SectionHeading eyebrow="Collective intelligence as an operating system" title="Strategy, execution, and adaptation aren’t separate functions" />
          <div className="flex flex-col gap-5">
            <p className="m-0 text-[16px] leading-[1.7] md:text-[17px]" style={{ color: '#544D5A' }}>
              Traditional management systems are good at organizing work. They&rsquo;re much less effective at organizing attention, energy,
              meaning, and adaptation.
            </p>
            <p className="m-0 text-[16px] leading-[1.7] md:text-[17px]" style={{ color: '#544D5A' }}>
              Empire of Light proposes that organizations should intentionally cultivate collective intelligence: the ability of a group to
              perceive reality accurately, coordinate action effectively, generate novel solutions, and continuously adapt together. In this
              model, strategy, execution, emotional regulation, learning, and creativity aren&rsquo;t separate functions — they&rsquo;re parts of
              one adaptive system.
            </p>
          </div>
        </div>
      </section>

      {/* The octopus */}
      <section className="px-6 py-16 md:px-8 md:py-24">
        <div className="mx-auto max-w-[840px] text-center">
          <div className="mb-8 flex justify-center" style={{ color: '#D99A22' }}>
            <OctopusIcon size={46} />
          </div>
          <Eyebrow>The octopus: a symbol for Empire of Light</Eyebrow>
          <div className="flex flex-col gap-5 text-left">
            <p className="m-0 text-[16px] leading-[1.7] md:text-[17px]" style={{ color: '#544D5A' }}>
              Picture the Empire of Light mascot: an octopus — a living symbol of collective intelligence when it&rsquo;s working. Now imagine an
              octopus whose hearts and brains aren&rsquo;t on the same page. It tries to camouflage itself and instead flashes through seven
              different colors at once, giving away exactly the confusion it&rsquo;s trying to hide.
            </p>
            <p className="m-0 text-[16px] leading-[1.7] md:text-[17px]" style={{ color: '#544D5A' }}>
              That&rsquo;s how most organizations run. Internal friction — the misalignment between the hearts and the brains of a team — gets in
              the way of any external progress. Empire of Light exists to help teams become one unified octopus: many arms, one nervous system,
              moving as a whole.
            </p>
          </div>
        </div>
      </section>

      {/* Applications */}
      <section className="px-6 py-16 md:px-8 md:py-24" style={{ background: '#FDFAF4' }}>
        <div className="mx-auto max-w-[1120px]">
          <div className="mb-9 max-w-[720px]">
            <SectionHeading eyebrow="Applications" title="The framework applies wherever groups are trying to create meaningful change" />
            <p className="m-0 text-[16px] leading-[1.7] md:text-[17px]" style={{ color: '#544D5A' }}>
              The same operating system adapts to each context.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {APPLICATIONS.map((item) => (
              <div key={item} className="rounded-full px-5.5 py-3 text-[14px] font-medium md:text-[15px]" style={{ background: '#FFFFFF', border: '1px solid #D8D2DC', color: '#131114' }}>
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI era */}
      <section className="px-6 py-16 md:px-8 md:py-24" style={{ background: '#000000' }}>
        <div className="mx-auto max-w-[1120px] grid gap-12 md:grid-cols-2 md:gap-16">
          <div>
            <SectionHeading eyebrow="A human operating system for the AI era" title="Strengthen the human system first. Then technology amplifies it." color="#FEE16A" />
            <div className="flex flex-col gap-5">
              <p className="m-0 text-[16px] leading-[1.7] md:text-[17px]" style={{ color: 'rgba(251,247,242,.75)' }}>
                Artificial intelligence amplifies both capability and complexity. Most organizations respond by investing primarily in
                technology. Empire of Light proposes the opposite sequence: strengthen the human operating system first. Then technology becomes
                an amplifier — not a source of fragmentation.
              </p>
              <p className="m-0 text-[16px] leading-[1.7] md:text-[17px]" style={{ color: 'rgba(251,247,242,.75)' }}>
                Instead of replacing human judgment, AI becomes a partner in cultivating collective intelligence.
              </p>
            </div>
          </div>
          <div>
            <div className="mb-4 text-[13px] font-semibold uppercase tracking-[0.16em]" style={{ ...DISPLAY, color: '#FEE16A' }}>
              Future software built on this framework could help teams
            </div>
            <div className="flex flex-col gap-3">
              {AI_ERA_CAPABILITIES.map((item) => (
                <div key={item} className="flex items-start gap-3.5">
                  <div className="mt-2.5 h-[7px] w-[7px] shrink-0 rounded-full" style={{ background: '#FEE16A' }} />
                  <div className="text-[15px] leading-[1.6]" style={{ color: 'rgba(251,247,242,.85)' }}>
                    {item}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Research agenda */}
      <section className="px-6 py-16 md:px-8 md:py-24">
        <div className="mx-auto max-w-[840px]">
          <SectionHeading eyebrow="A research agenda" title="This framework is a working theory" />
          <p className="m-0 mb-6 text-[16px] leading-[1.7] md:text-[17px]" style={{ color: '#544D5A' }}>
            Open questions for continued exploration:
          </p>
          <div className="flex flex-col gap-4">
            {RESEARCH_QUESTIONS.map((q) => (
              <div key={q} className="flex items-start gap-3.5">
                <div className="mt-2.5 h-[7px] w-[7px] shrink-0 rounded-full" style={{ background: '#D99A22' }} />
                <div className="text-[16px] leading-[1.6] md:text-[17px]" style={{ color: '#131114' }}>
                  {q}
                </div>
              </div>
            ))}
          </div>
          <p className="m-0 mt-6 text-[16px] leading-[1.7] md:text-[17px]" style={{ color: '#544D5A' }}>
            Empire of Light is an invitation to investigate these questions through practice.
          </p>
        </div>
      </section>

      {/* Closing vision + CTA */}
      <section className="relative overflow-hidden px-6 py-20 md:px-8 md:py-[112px]" style={{ background: '#000000' }}>
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: 'radial-gradient(120% 100% at 50% 100%, #FFF6AD 0%, rgba(254,225,106,.55) 28%, rgba(0,0,0,0) 72%)',
            opacity: 0.45,
          }}
        />
        <div className="relative mx-auto max-w-[760px] text-center">
          <p className="m-0 mb-5 text-[18px] leading-[1.55] md:text-[21px] font-light" style={{ ...DISPLAY, color: 'rgba(251,247,242,.85)' }}>
            Imagine organizations where strategy, emotional intelligence, creativity, and execution are no longer separate disciplines. Where
            meetings generate energy instead of draining it. Where conflict becomes a source of learning rather than division.
          </p>
          <h2 className="m-0 mb-6 text-[30px] leading-[1.1] font-light md:text-[46px] md:leading-[1.06]" style={{ ...DISPLAY, letterSpacing: '.02em', color: '#FBF7F2' }}>
            This is the future Empire of Light exists to build. Now.
          </h2>
          <div className="flex flex-wrap justify-center gap-3.5">
            <a
              href={BOOKING_URL}
              target="_blank"
              rel="noreferrer"
              onClick={() => trackBooking('thesis_cta')}
              className="rounded-lg px-8 py-4 text-[15px] font-semibold"
              style={primaryButton({ boxShadow: '0 0 40px rgba(254,225,106,.28)' })}
            >
              Book a conversation
            </a>
            <Link to="/about" className="rounded-lg px-8 py-4 text-[15px] font-semibold" style={secondaryButtonOnDark}>
              Meet Kelly
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  )
}
