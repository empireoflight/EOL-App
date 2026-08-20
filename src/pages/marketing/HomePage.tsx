import { Link } from 'react-router-dom'
import logoMark from '../../assets/logo-mark.png'
import heartModel from '../../assets/landing/heart-model.webp'
import shotVision from '../../assets/landing/shot-vision.png'
import shotFriction from '../../assets/landing/shot-friction.png'
import shotCheckin from '../../assets/landing/shot-checkin.png'
import founderPhoto from '../../assets/landing/founder-photo.jpg'
import { MarketingHeader } from '../../components/marketing/MarketingHeader'
import { MarketingFooter } from '../../components/marketing/MarketingFooter'
import { Seo } from '../../components/shared/Seo'
import { BOOKING_URL, DISPLAY, Eyebrow, OctopusIcon, primaryButton, secondaryButtonOnDark, trackBooking } from '../../components/marketing/shared'

const HOW_STEPS = [
  {
    n: '01',
    title: 'Book a conversation',
    body: 'A short call to talk through your team, where you’re stuck, and whether this is the right fit.',
  },
  {
    n: '02',
    title: 'We confirm fit — you invest',
    body: 'If it’s a match, you commit as a founding co-creator and your team’s spot is secured.',
  },
  {
    n: '03',
    title: 'Your team is invited in',
    body: 'Everyone gets access to the app and completes the vision questionnaire — async, individual reflection first. This is where the intelligence that never makes it into meetings gets written down.',
  },
  {
    n: '04',
    title: 'We run the vision workshop together',
    body: 'Facilitated by us, using what the questionnaire surfaced. Convergence and disagreement both go on the table.',
  },
  {
    n: '05',
    title: 'The team commits to the vision',
    body: 'One statement, tangible and emotionally resonant, that everyone agrees to. It lives at the top of the app from then on.',
  },
  {
    n: '06',
    title: 'You work the cycle, then evolve',
    body: 'Experiments toward the vision, friction logged and processed, biweekly sessions with us. One full evolve cycle, then the team keeps using the app on its own.',
  },
]

const PILOT_INCLUDES = [
  'A vision assessment and workshop to create genuine shared direction',
  'Biweekly working sessions focused on progress and surfacing and releasing friction',
  'Weekly async reflection prompts',
  'An app to track it all',
]

const WHO_FOR = ['AI transformation initiatives', 'Leadership teams', 'Product organizations', 'Mission-driven organizations navigating meaningful change']

const APP_SHOTS = [
  { src: shotVision, alt: 'The team vision screen', caption: 'The committed vision, always at the top', position: 'center' },
  { src: shotFriction, alt: 'Friction processing with grounding breathwork', caption: 'Friction Processing', position: 'top' },
  { src: shotCheckin, alt: 'Weekly vibe check', caption: 'Weekly energy check-in', position: 'top' },
]

const TIERS = [
  { n: 0, label: 'Ephemeral, never stored', bg: '#131114', fg: '#FBF7F2', dot: '#2E7D5B' },
  { n: 1, label: 'Private, sealed', bg: '#26222A', fg: '#FBF7F2', dot: '#D99A22' },
  { n: 2, label: 'AI-assisted', bg: '#EDE4FA', fg: '#131114', dot: '#8B5CF6' },
  { n: 3, label: 'Team aggregate', bg: '#FDE3CB', fg: '#131114', dot: '#D99A22' },
  { n: 4, label: 'Team shared', bg: '#FCD9F0', fg: '#131114', dot: '#E86FD0' },
]

const FAQS = [
  {
    q: 'How do we get started?',
    a: 'Book a short conversation with us. We’ll talk through your team and what you’re navigating, and if it’s a fit, walk you through the founding co-creator investment and get your team invited into the app.',
  },
  {
    q: 'Is this software or consulting?',
    a: 'Both, plainly. The pilot is facilitated by us — the vision workshop, the biweekly sessions, one full evolve cycle. The app is what carries the work between sessions and what your team keeps afterward.',
  },
  {
    q: 'Can we just use the app?',
    a: 'No, teams get considerably more out of the first cycle when we facilitate it, and we want to set you up well!',
  },
  {
    q: 'How much time does it take?',
    a: 'One workshop, a biweekly session, and a weekly async prompt that takes minutes. The rest happens inside work you’re already doing.',
  },
  {
    q: 'Who sees what our team writes?',
    a: 'We have different tiers of data privacy depending on the type of information that we are collecting. Some isn’t saved anywhere, some is only for you, some is synthesized to the team level with AI, and some is shown verbatim to your team. This is all made explicit in the app.',
  },
  {
    q: 'What size team works best?',
    a: 'Groups of roughly 5 to 15 who share real work and real decisions. Larger organizations usually start with one leadership group.',
  },
]

export default function HomePage() {
  return (
    <div style={{ width: '100%', overflowX: 'hidden', background: '#FDFAF4', color: '#131114', fontFamily: "'Work Sans', system-ui, sans-serif" }}>
      <Seo
        title="Empire of Light | Collective Intelligence Platform for Teams"
        description="Empire of Light helps teams unlock the collective intelligence already inside them — a facilitated pilot plus app for shared vision, aligned action, and processing friction together. Book a conversation to get started."
        path="/"
      />
      <MarketingHeader />

      {/* Hero */}
      <section className="relative overflow-hidden px-6 py-24 md:px-8 md:py-[120px]" style={{ background: '#000000' }}>
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: 'radial-gradient(120% 100% at 50% 100%, #FFF6AD 0%, rgba(254,225,106,.55) 28%, rgba(0,0,0,0) 72%)',
            opacity: 0.55,
          }}
        />
        <div className="relative mx-auto max-w-[960px] text-center">
          <img src={logoMark} alt="" width={96} height={96} className="mx-auto mb-9 block" style={{ borderRadius: 20 }} />
          <div className="mb-7 text-[13px] font-semibold uppercase tracking-[0.16em]" style={{ ...DISPLAY, color: '#FEE16A' }}>
            Collective intelligence platform
          </div>
          <h1
            className="m-0 mb-7 text-[38px] leading-[1.1] font-light md:text-[52px] lg:text-[64px] lg:leading-[1.06]"
            style={{ ...DISPLAY, letterSpacing: '.02em', color: '#FBF7F2' }}
          >
            Unlock the collective intelligence <em style={{ fontStyle: 'normal', fontWeight: 600 }}>already inside your team</em>
          </h1>
          <p className="mx-auto mb-10 max-w-[640px] text-[18px] leading-[1.5] md:text-[21px]" style={{ color: 'rgba(251,247,242,.78)' }}>
            Bring more ambitious visions to life faster, with more unity.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3.5">
            <a
              href={BOOKING_URL}
              target="_blank"
              rel="noreferrer"
              onClick={() => trackBooking('hero')}
              className="rounded-lg px-8 py-4 text-[15px] font-semibold"
              style={primaryButton({ boxShadow: '0 0 40px rgba(254,225,106,.28)' })}
            >
              Book a conversation
            </a>
            <a href="#framework" className="rounded-lg px-8 py-4 text-[15px] font-semibold" style={secondaryButtonOnDark}>
              See how it works
            </a>
          </div>
        </div>
      </section>

      {/* Octopus quote */}
      <section className="px-6 pt-16 pb-6 md:px-8 md:pt-[88px]" style={{ background: '#FDFAF4' }}>
        <div className="mx-auto max-w-[840px] text-center">
          <div className="mb-8 flex justify-center" style={{ color: '#D99A22' }}>
            <OctopusIcon size={46} />
          </div>
          <p className="m-0 mb-6 text-[22px] leading-[1.35] font-light md:text-[30px]" style={{ ...DISPLAY, letterSpacing: '.02em', color: '#131114' }}>
            An octopus has nine brains. One in the head, one in each arm. It doesn&rsquo;t move by command &mdash; it moves by agreement.
          </p>
          <p className="m-0 text-[17px] leading-[1.62] md:text-[18px]" style={{ color: '#544D5A' }}>
            Your team already works this way. The intelligence is distributed, and most of it never reaches the room where decisions get made.
            Empire of Light is the rhythm &mdash; and the app &mdash; that gets it there.
          </p>
        </div>
      </section>

      {/* The cycle */}
      <section id="framework" className="px-6 pt-16 pb-20 md:px-8 md:py-[88px]" style={{ background: '#FDFAF4' }}>
        <div className="mx-auto grid max-w-[1120px] items-center gap-12 md:grid-cols-2 md:gap-[72px]">
          <div>
            <Eyebrow>The cycle</Eyebrow>
            <h2 className="m-0 mb-6 text-[34px] leading-[1.1] font-light md:text-[44px] md:leading-[1.06]" style={{ ...DISPLAY, letterSpacing: '.02em', color: '#131114' }}>
              Reimagine, Do, Unlearn, Evolve
            </h2>
            <p className="m-0 mb-5 text-[17px] leading-[1.62] md:text-[18px]" style={{ color: '#544D5A' }}>
              The Empire of Light Framework helps teams build a shared vision, take meaningful action, work through friction, and continuously
              evolve together. This is a new rhythm for how teams navigate rapid change together.
            </p>
            <Link to="/thesis" className="text-[14px] font-semibold uppercase tracking-[0.1em]" style={DISPLAY}>
              Read the full thesis
            </Link>
          </div>
          <img
            src={heartModel}
            alt="Empire of Light framework diagram"
            width={750}
            height={549}
            className="block w-full rounded-2xl object-cover"
            style={{ aspectRatio: '750 / 549' }}
          />
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="px-6 py-16 md:px-8 md:py-24" style={{ background: '#000000' }}>
        <div className="mx-auto max-w-[1120px]">
          <div className="mb-14 max-w-[720px] md:mb-16">
            <Eyebrow color="#FEE16A">How it works</Eyebrow>
            <h2 className="m-0 mb-5 text-[32px] leading-[1.1] font-light md:text-[44px] md:leading-[1.06]" style={{ ...DISPLAY, letterSpacing: '.02em', color: '#FBF7F2' }}>
              From a conversation to a vision your team is actually moving on
            </h2>
            <p className="m-0 text-[17px] leading-[1.62] md:text-[18px]" style={{ color: 'rgba(251,247,242,.72)' }}>
              It starts with a conversation, not a self-serve signup flow. We assess fit together, and once your team is in, we run the first
              cycle with you. After it, the app is yours to keep running.
            </p>
          </div>
          <div
            className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border sm:grid-cols-2 lg:grid-cols-3"
            style={{ background: 'rgba(251,247,242,.14)', borderColor: 'rgba(251,247,242,.14)' }}
          >
            {HOW_STEPS.map((step) => (
              <div key={step.n} className="p-8" style={{ background: '#0C0A0D' }}>
                <div className="mb-5 text-[13px] font-semibold tracking-[0.16em]" style={{ ...DISPLAY, color: '#FEE16A' }}>
                  {step.n}
                </div>
                <h3 className="m-0 mb-3 text-[20px] font-semibold tracking-[0.03em] md:text-[22px]" style={{ ...DISPLAY, color: '#FBF7F2' }}>
                  {step.title}
                </h3>
                <p className="m-0 text-[15px] leading-[1.6]" style={{ color: 'rgba(251,247,242,.7)' }}>
                  {step.body}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-7 text-center text-[15px]" style={{ color: 'rgba(251,247,242,.5)' }}>
            Step 1 is a conversation. From step 4 on, it&rsquo;s the facilitated engagement &mdash; the app carries all of it, before, during, and
            after.
          </p>
          <div className="mt-9 flex justify-center">
            <a
              href={BOOKING_URL}
              target="_blank"
              rel="noreferrer"
              onClick={() => trackBooking('how_it_works')}
              className="rounded-lg px-8 py-4 text-[15px] font-semibold"
              style={primaryButton({ boxShadow: '0 0 40px rgba(254,225,106,.28)' })}
            >
              Book a conversation
            </a>
          </div>
        </div>
      </section>

      {/* The pilot */}
      <section id="pilot" className="px-6 py-16 md:px-8 md:py-24" style={{ background: '#FDFAF4' }}>
        <div className="mx-auto grid max-w-[1120px] gap-12 md:grid-cols-2 md:gap-16">
          <div>
            <Eyebrow>What the pilot looks like</Eyebrow>
            <h2 className="m-0 mb-7 text-[30px] leading-[1.1] font-light md:text-[44px] md:leading-[1.06]" style={{ ...DISPLAY, letterSpacing: '.02em', color: '#131114' }}>
              A 4&ndash;6 week facilitated engagement that includes:
            </h2>
            <div className="flex flex-col gap-4.5">
              {PILOT_INCLUDES.map((item) => (
                <div key={item} className="flex items-start gap-3.5">
                  <div className="mt-2.5 h-[7px] w-[7px] shrink-0 rounded-full" style={{ background: '#D99A22' }} />
                  <div className="text-[17px] leading-[1.55] md:text-[18px]" style={{ color: '#131114' }}>
                    {item}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <Eyebrow>Who this is for</Eyebrow>
            <div className="grid gap-px overflow-hidden rounded-xl border" style={{ background: '#D8D2DC', borderColor: '#D8D2DC' }}>
              {WHO_FOR.map((item) => (
                <div key={item} className="px-6 py-5.5 text-[16px] md:text-[17px]" style={{ background: '#FFFFFF', color: '#131114' }}>
                  {item}
                </div>
              ))}
            </div>
            <p className="mt-6 text-[15px] leading-[1.62] md:text-[16px]" style={{ color: '#544D5A' }}>
              This fall we&rsquo;re partnering with a small number of teams to refine and validate the framework together. Spots are limited.
            </p>
          </div>
        </div>
      </section>

      {/* The app */}
      <section className="px-6 pb-16 md:px-8 md:pb-24">
        <div className="mx-auto max-w-[1120px] overflow-hidden rounded-[20px] px-6 py-12 md:px-12 md:py-16" style={{ background: '#000000' }}>
          <div className="mb-10 max-w-[640px] md:mb-12">
            <Eyebrow color="#FEE16A">The app</Eyebrow>
            <h2 className="m-0 mb-5 text-[28px] leading-[1.1] font-light md:text-[38px]" style={{ ...DISPLAY, letterSpacing: '.02em', color: '#FBF7F2' }}>
              Where the vision, the experiments and the friction all live
            </h2>
            <p className="m-0 text-[16px] leading-[1.62] md:text-[17px]" style={{ color: 'rgba(251,247,242,.72)' }}>
              Vision co-creation, task rhythm, and friction processing, with privacy tiers built into the product itself.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {APP_SHOTS.map((shot) => (
              <div key={shot.alt}>
                <div
                  className="h-[220px] overflow-hidden rounded-2xl border md:h-[300px]"
                  style={{ background: '#FBF7F2', borderColor: 'rgba(251,247,242,.16)' }}
                >
                  <img
                    src={shot.src}
                    alt={shot.alt}
                    className="h-full w-full object-cover"
                    style={{ objectPosition: shot.position, transform: 'scale(1.35)', transformOrigin: shot.position }}
                  />
                </div>
                <div className="mt-3.5 text-[14px]" style={{ color: 'rgba(251,247,242,.6)' }}>
                  {shot.caption}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Privacy tiers */}
      <section className="px-6 pb-16 md:px-8 md:pb-24">
        <div className="mx-auto max-w-[1120px]">
          <div className="mb-9 max-w-[720px]">
            <Eyebrow>Privacy tiers</Eyebrow>
            <h2 className="m-0 mb-5 text-[26px] leading-[1.1] font-light md:text-[38px]" style={{ ...DISPLAY, letterSpacing: '.02em', color: '#131114' }}>
              People tell the truth when they have the psychological safety to do so
            </h2>
            <p className="m-0 text-[16px] leading-[1.62] md:text-[17px]" style={{ color: '#544D5A' }}>
              Every data point has an assigned privacy tier, made visible to you on the app so you know exactly what other people will see.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {TIERS.map((tier) => (
              <div
                key={tier.n}
                className="flex items-center gap-2.5 rounded-full px-5.5 py-3 text-[14px] font-medium md:text-[15px]"
                style={{ background: tier.bg, color: tier.fg }}
              >
                <span className="h-[7px] w-[7px] rounded-full" style={{ background: tier.dot }} />
                Tier {tier.n} &middot; {tier.label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="px-6 pb-16 md:px-8 md:pb-24">
        <div
          className="mx-auto grid max-w-[1120px] items-center gap-10 rounded-[20px] px-6 py-12 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] md:px-12 md:py-14"
          style={{ background: 'linear-gradient(90deg,#FFF6AD 0%,#FFD0D3 50%,#FFA9F8 100%)' }}
        >
          <div className="rounded-[20px] px-8 py-10 text-center" style={{ background: '#FFFFFF' }}>
            <Eyebrow>Founding co-creator investment</Eyebrow>
            <div className="text-[48px] leading-none font-semibold md:text-[64px]" style={{ ...DISPLAY, letterSpacing: '.02em', color: '#131114' }}>
              $2,000
            </div>
            <div className="mt-3 text-[15px]" style={{ color: '#544D5A' }}>
              per team &middot; 4&ndash;6 weeks
            </div>
          </div>
          <div>
            <p className="m-0 mb-4.5 text-[17px] leading-[1.55] md:text-[19px]" style={{ color: '#131114' }}>
              Refunded if your team completes the program and doesn&rsquo;t find it valuable. (We believe a little skin in the game helps everyone
              show up differently.)
            </p>
            <p className="m-0 mb-2 text-[16px] leading-[1.6] md:text-[17px]" style={{ color: '#26222A' }}>
              <strong style={{ fontWeight: 600 }}>Why be a founding co-creator?</strong>
            </p>
            <p className="m-0 text-[16px] leading-[1.6] md:text-[17px]" style={{ color: '#26222A' }}>
              Build an aligned, adaptable, and energized team that creates momentum toward your most important goals &mdash; and influence a
              framework designed for the future of how humans work together.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="px-6 pb-16 md:px-8 md:pb-24">
        <div className="mx-auto max-w-[840px]">
          <Eyebrow>Questions</Eyebrow>
          <div className="grid gap-px border-t border-b" style={{ background: '#D8D2DC', borderColor: '#D8D2DC' }}>
            {FAQS.map((faq) => (
              <div key={faq.q} className="px-0 py-7" style={{ background: '#FDFAF4' }}>
                <h3 className="m-0 mb-2.5 text-[19px] font-semibold md:text-[22px]" style={{ ...DISPLAY, letterSpacing: '.02em', color: '#131114' }}>
                  {faq.q}
                </h3>
                <p className="m-0 text-[15px] leading-[1.62] md:text-[16px]" style={{ color: '#544D5A' }}>
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Founder note */}
      <section className="px-6 pb-16 md:px-8 md:pb-24">
        <div
          className="mx-auto grid max-w-[840px] items-start gap-6 rounded-[20px] border p-6 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-8 md:p-12"
          style={{ background: '#FFFFFF', borderColor: '#D8D2DC' }}
        >
          <img
            src={founderPhoto}
            alt="Kelly, founder of Empire of Light"
            width={143}
            height={223}
            className="block rounded-xl object-cover"
            style={{ height: 180, width: 116 }}
          />
          <div>
            <Eyebrow>A note from the founder</Eyebrow>
            <p className="m-0 mb-4 text-[17px] leading-[1.62] md:text-[18px]" style={{ color: '#131114' }}>
              I&rsquo;ve seen magic emerge on teams when the right conditions are there: a good vision, a nimble way to work through experiments
              and tasks, a way to process the friction that naturally arises on teams (I see this as a gift, nothing to fear) and a way to evolve
              and celebrate!
            </p>
            <p className="m-0 text-[17px] leading-[1.62] md:text-[18px]" style={{ color: '#544D5A' }}>
              Now I want to share the magic with you. For leaders, this makes managing teams so much easier, more innovative, and so much more
              fun.
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section id="start" className="relative overflow-hidden px-6 py-20 md:px-8 md:py-[112px]" style={{ background: '#000000' }}>
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: 'radial-gradient(120% 100% at 50% 100%, #FFF6AD 0%, rgba(254,225,106,.55) 28%, rgba(0,0,0,0) 72%)',
            opacity: 0.45,
          }}
        />
        <div className="relative mx-auto max-w-[760px] text-center">
          <div className="mb-8 flex justify-center">
            <OctopusIcon size={40} color="rgba(254,225,106,.7)" />
          </div>
          <h2 className="m-0 mb-6 text-[34px] leading-[1.1] font-light md:text-[52px] md:leading-[1.06]" style={{ ...DISPLAY, letterSpacing: '.02em', color: '#FBF7F2' }}>
            Start with the vision your team hasn&rsquo;t said out loud yet
          </h2>
          <p className="mx-auto mb-9 max-w-[560px] text-[17px] leading-[1.55] md:text-[19px]" style={{ color: 'rgba(251,247,242,.72)' }}>
            Book a conversation, and we&rsquo;ll take it from there.
          </p>
          <div className="flex flex-wrap justify-center gap-3.5">
            <a
              href={BOOKING_URL}
              target="_blank"
              rel="noreferrer"
              onClick={() => trackBooking('final_cta')}
              className="rounded-lg px-8 py-4 text-[15px] font-semibold"
              style={primaryButton({ boxShadow: '0 0 40px rgba(254,225,106,.28)' })}
            >
              Book a conversation
            </a>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  )
}
