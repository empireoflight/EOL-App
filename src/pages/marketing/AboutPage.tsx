import { Link } from 'react-router-dom'
import founderPhoto from '../../assets/landing/founder-photo.jpg'
import { MarketingHeader } from '../../components/marketing/MarketingHeader'
import { MarketingFooter } from '../../components/marketing/MarketingFooter'
import { Seo } from '../../components/shared/Seo'
import { BOOKING_URL, CONTACT_EMAIL, DISPLAY, Eyebrow, primaryButton, secondaryButtonOnDark, trackBooking } from '../../components/marketing/shared'

const BRINGS = [
  '15+ years leading product and UX in complex organizations',
  'Deep expertise in systems design and organizational clarity — I can cut through noise like a laser beam',
  'Lived experience navigating and rebuilding from burnout',
  'An unusual ability to simplify complex concepts into visuals that people can understand',
  'An unusual ability to sense and articulate group-level dynamics',
  'A background in user-centered design and endurance sports coaching (MS Human Centered Design, BS Movement Science, former triathlon and cycling coach)',
  'A good sense of humor that adds levity to the team',
  'A love for difficult conversations',
  'A pragmatic, get-stuff-done attitude',
]

export default function AboutPage() {
  return (
    <div style={{ width: '100%', overflowX: 'hidden', background: '#FDFAF4', color: '#131114', fontFamily: "'Work Sans', system-ui, sans-serif" }}>
      <Seo
        title="About Kelly Woznicki | Empire of Light"
        description="Meet Kelly Woznicki — 15+ years leading product and UX, now building Empire of Light to help teams align vision, strategy, structure, and energy."
        path="/about"
      />
      <MarketingHeader />

      {/* Hero */}
      <section className="px-6 py-16 md:px-8 md:py-24">
        <div className="mx-auto grid max-w-[1120px] items-center gap-12 md:grid-cols-[minmax(0,260px)_minmax(0,1fr)] md:gap-16">
          <img
            src={founderPhoto}
            alt="Kelly Woznicki, founder of Empire of Light"
            width={260}
            height={340}
            className="mx-auto block rounded-2xl object-cover md:mx-0"
            style={{ width: 220, height: 288 }}
          />
          <div>
            <Eyebrow>About</Eyebrow>
            <h1 className="m-0 mb-5 text-[34px] leading-[1.1] font-light md:text-[48px] md:leading-[1.06]" style={{ ...DISPLAY, letterSpacing: '.02em', color: '#131114' }}>
              Hi, I&rsquo;m Kelly Woznicki
            </h1>
            <p className="m-0 mb-4 text-[19px] leading-[1.5] md:text-[22px]" style={{ ...DISPLAY, fontWeight: 500, color: '#131114' }}>
              I&rsquo;m a transformation person.
            </p>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <a
                href="https://www.linkedin.com/in/kellywoznicki/"
                target="_blank"
                rel="noreferrer"
                className="text-[14px] font-semibold uppercase tracking-[0.1em]"
                style={{ ...DISPLAY, color: '#A96D0F' }}
              >
                Connect on LinkedIn &rarr;
              </a>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-[14px] font-semibold uppercase tracking-[0.1em]"
                style={{ ...DISPLAY, color: '#A96D0F' }}
              >
                Email me &rarr;
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Bio */}
      <section className="px-6 pb-16 md:px-8 md:pb-24">
        <div className="mx-auto flex max-w-[760px] flex-col gap-5">
          <p className="m-0 text-[17px] leading-[1.65] md:text-[18px]" style={{ color: '#131114' }}>
            I got sick of being squeezed by a system that doesn&rsquo;t work for me, so I partner with like-minded people to make work awesome and
            drive results.
          </p>
          <p className="m-0 text-[17px] leading-[1.65] md:text-[18px]" style={{ color: '#544D5A' }}>
            For over 15 years, I worked in product management and UX inside tech — designing complex products, aligning cross-functional teams,
            navigating ambiguity, and shipping at scale. I learned how organizations actually work: where they stall, where they fracture, and
            where leverage lives.
          </p>
          <p className="m-0 text-[17px] leading-[1.65] md:text-[18px]" style={{ color: '#544D5A' }}>
            I also learned how easy it is to burn out inside high-performance environments that ignore the human and energetic layers driving
            them.
          </p>
          <p className="m-0 text-[17px] leading-[1.65] md:text-[18px]" style={{ color: '#544D5A' }}>
            Despite my best efforts to regulate myself, in 2022, I hit my own breaking point. What followed wasn&rsquo;t a rebrand. I completely
            rebuilt myself from the ground up. I cracked the code on how to navigate the matrix and quickly get to my higher self.
          </p>
          <p className="m-0 text-[17px] leading-[1.65] md:text-[18px]" style={{ color: '#544D5A' }}>
            Today, I work at the intersection of operational rigor and deep transformation. I help teams and communities align vision, strategy,
            structure, and energy so performance and wellbeing rise together.
          </p>
        </div>
      </section>

      {/* What I bring */}
      <section className="px-6 pb-16 md:px-8 md:pb-24" style={{ background: '#000000' }}>
        <div className="mx-auto max-w-[840px] py-16 md:py-20">
          <Eyebrow color="#FEE16A">What I bring</Eyebrow>
          <div className="flex flex-col gap-4">
            {BRINGS.map((item) => (
              <div key={item} className="flex items-start gap-3.5">
                <div className="mt-2.5 h-[7px] w-[7px] shrink-0 rounded-full" style={{ background: '#FEE16A' }} />
                <div className="text-[16px] leading-[1.6] md:text-[17px]" style={{ color: 'rgba(251,247,242,.85)' }}>
                  {item}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Closing bio statement */}
      <section className="px-6 py-16 md:px-8 md:py-24">
        <div className="mx-auto flex max-w-[760px] flex-col gap-5">
          <p className="m-0 text-[17px] leading-[1.65] md:text-[18px]" style={{ color: '#131114' }}>
            I am as comfortable with roadmaps and org charts as I am with shadow work and coherence. Because the future won&rsquo;t be built by
            choosing one or the other. It will be built by people who can bridge both. Empire of Light is my commitment to that bridge.
          </p>
          <p className="m-0 text-[17px] leading-[1.65] md:text-[18px]" style={{ color: '#544D5A' }}>
            If you&rsquo;re ready to evolve your system — and yourself — we&rsquo;ll get along well.
          </p>
        </div>
      </section>

      {/* The big why + CTA */}
      <section className="relative overflow-hidden px-6 py-20 md:px-8 md:py-[112px]" style={{ background: '#000000' }}>
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: 'radial-gradient(120% 100% at 50% 100%, #FFF6AD 0%, rgba(254,225,106,.55) 28%, rgba(0,0,0,0) 72%)',
            opacity: 0.45,
          }}
        />
        <div className="relative mx-auto max-w-[760px] text-center">
          <Eyebrow color="#FEE16A">The big why</Eyebrow>
          <h2 className="m-0 mb-6 text-[30px] leading-[1.1] font-light md:text-[46px] md:leading-[1.06]" style={{ ...DISPLAY, letterSpacing: '.02em', color: '#FBF7F2' }}>
            The old ways of working are breaking down. That&rsquo;s not a crisis. It&rsquo;s an opportunity.
          </h2>
          <p className="mx-auto mb-9 max-w-[560px] text-[17px] leading-[1.55] md:text-[19px]" style={{ color: 'rgba(251,247,242,.72)' }}>
            To build organizations — and communities — that actually work for humans.
          </p>
          <div className="flex flex-wrap justify-center gap-3.5">
            <a
              href={BOOKING_URL}
              target="_blank"
              rel="noreferrer"
              onClick={() => trackBooking('about_cta')}
              className="rounded-lg px-8 py-4 text-[15px] font-semibold"
              style={primaryButton({ boxShadow: '0 0 40px rgba(254,225,106,.28)' })}
            >
              Book a conversation
            </a>
            <Link to="/thesis" className="rounded-lg px-8 py-4 text-[15px] font-semibold" style={secondaryButtonOnDark}>
              Check out the thesis
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  )
}
