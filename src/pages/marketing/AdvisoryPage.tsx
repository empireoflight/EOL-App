import heartModel from '../../assets/landing/heart-model.webp'
import { MarketingHeader } from '../../components/marketing/MarketingHeader'
import { MarketingFooter } from '../../components/marketing/MarketingFooter'
import { Seo } from '../../components/shared/Seo'
import { BOOKING_URL, BrainIcon, DISPLAY, Eyebrow, LandscapeIcon, primaryButton, trackBooking } from '../../components/marketing/shared'

const MODES = [
  {
    title: 'Reimagine',
    subtitle: 'Get clear about where you’re going.',
    body: 'What are we actually trying to create? For whom? Why does it matter? I help turn complexity into a clear product and organizational vision that people can understand, believe in, and use to make decisions.',
  },
  {
    title: 'Do',
    subtitle: 'Turn vision into movement.',
    body: 'Strategy only matters when it changes what people do. Together, we translate the vision into priorities, experiments, decisions, and a rhythm of action that creates momentum without losing sight of the bigger picture.',
  },
  {
    title: 'Unlearn',
    subtitle: 'Understand what’s getting in the way.',
    body: 'Sometimes the strategy isn’t the problem. Old assumptions, fear, misalignment, unresolved tensions, broken systems, and habits that once made sense can quietly keep an organization stuck. We surface what’s actually happening — and have the conversations necessary to change it.',
  },
  {
    title: 'Evolve',
    subtitle: 'Build the organization that can carry the vision.',
    body: 'Transformation isn’t about getting back to normal. It’s about developing the capabilities, behaviors, relationships, and systems required for what’s next. The organization evolves as the vision becomes real.',
  },
]

export default function AdvisoryPage() {
  return (
    <div style={{ width: '100%', overflowX: 'hidden', background: '#FDFAF4', color: '#131114', fontFamily: "'Work Sans', system-ui, sans-serif" }}>
      <Seo
        title="Product + Transformation Leadership | Empire of Light"
        description="Fractional vision, strategy, and execution advisory for leaders and teams navigating AI transformation and complex organizational change."
        path="/advisory"
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
            Product + Transformation Leadership
          </div>
          <h1
            className="m-0 mb-6 text-[34px] leading-[1.1] font-light md:text-[50px] md:leading-[1.06]"
            style={{ ...DISPLAY, letterSpacing: '.02em', color: '#FBF7F2' }}
          >
            Turn a vision into something people can actually build
          </h1>
          <p className="mx-auto m-0 max-w-[600px] text-[17px] leading-[1.55]" style={{ color: 'rgba(251,247,242,.72)' }}>
            Fractional leadership for the messy middle — product strategy, systems thinking, and human transformation, together.
          </p>
        </div>
      </section>

      {/* Intro */}
      <section className="px-6 py-16 md:px-8 md:py-24">
        <div className="mx-auto flex max-w-[760px] flex-col gap-5">
          <p className="m-0 text-[17px] leading-[1.65] md:text-[18px]" style={{ color: '#131114' }}>
            Complex transformation happens when an organization gets clear about where it&rsquo;s going, finds a way to move together, and
            becomes capable of operating differently along the way. I help organizations navigate that transformation from the inside.
          </p>
          <p className="m-0 text-[17px] leading-[1.65] md:text-[18px]" style={{ color: '#544D5A' }}>
            With 15+ years of product and UX leadership, I bring together product strategy, systems thinking, and human transformation to help
            you clarify what you&rsquo;re building, align the people around it, and make the change actually stick.
          </p>
        </div>
      </section>

      {/* Outer / inner system */}
      <section className="px-6 pb-16 md:px-8 md:pb-24">
        <div className="mx-auto max-w-[1120px]">
          <Eyebrow>Your product and your organization are one system</Eyebrow>
          <p className="m-0 mb-8 max-w-[720px] text-[17px] leading-[1.6] md:text-[18px]" style={{ color: '#131114' }}>
            You can have a brilliant strategy and still struggle to execute it. You can redesign the product without changing the organization
            that creates it. If you want the outer transformation to succeed, the inner system has to evolve with it.
          </p>
          <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border sm:grid-cols-2" style={{ background: '#D8D2DC', borderColor: '#D8D2DC' }}>
            <div className="p-8" style={{ background: '#FFFFFF' }}>
              <div className="mb-4" style={{ color: '#D99A22' }}>
                <LandscapeIcon size={36} />
              </div>
              <h3 className="m-0 mb-3 text-[19px] font-semibold" style={{ ...DISPLAY, color: '#131114' }}>
                The outer system
              </h3>
              <p className="m-0 text-[15px] leading-[1.6]" style={{ color: '#544D5A' }}>
                Your product. Your strategy. Your customers. Your operating model. The things you&rsquo;re trying to create.
              </p>
            </div>
            <div className="p-8" style={{ background: '#FFFFFF' }}>
              <div className="mb-4" style={{ color: '#D99A22' }}>
                <BrainIcon size={36} />
              </div>
              <h3 className="m-0 mb-3 text-[19px] font-semibold" style={{ ...DISPLAY, color: '#131114' }}>
                The inner system
              </h3>
              <p className="m-0 text-[15px] leading-[1.6]" style={{ color: '#544D5A' }}>
                Your people. Your assumptions. Your relationships. Your patterns. The ways of working that determine what your organization is
                actually capable of.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Four modes */}
      <section className="px-6 py-16 md:px-8 md:py-24" style={{ background: '#000000' }}>
        <div className="mx-auto max-w-[1120px]">
          <Eyebrow color="#FEE16A">I work across four interconnected modes</Eyebrow>
          <img
            src={heartModel}
            alt="The Empire of Light heart model — Reimagine, Do, Unlearn, Evolve"
            width={750}
            height={549}
            className="mb-10 block w-full max-w-[520px] rounded-2xl object-cover"
            style={{ aspectRatio: '750 / 549' }}
          />
          <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border sm:grid-cols-2" style={{ background: 'rgba(251,247,242,.14)', borderColor: 'rgba(251,247,242,.14)' }}>
            {MODES.map((mode) => (
              <div key={mode.title} className="p-8" style={{ background: '#0C0A0D' }}>
                <h3 className="m-0 mb-2 text-[20px] font-semibold tracking-[0.03em]" style={{ ...DISPLAY, color: '#FEE16A' }}>
                  {mode.title}
                </h3>
                <p className="m-0 mb-3 text-[15px] font-medium" style={{ color: '#FBF7F2' }}>
                  {mode.subtitle}
                </p>
                <p className="m-0 text-[15px] leading-[1.6]" style={{ color: 'rgba(251,247,242,.7)' }}>
                  {mode.body}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-8 max-w-[720px] text-[15px] leading-[1.65]" style={{ color: 'rgba(251,247,242,.6)' }}>
            It&rsquo;s not a linear process. We move between Reimagine, Do, Unlearn, and Evolve as the work requires — that&rsquo;s how
            transformation actually happens.
          </p>
        </div>
      </section>

      {/* What working together looks like */}
      <section className="px-6 py-16 md:px-8 md:py-24">
        <div className="mx-auto flex max-w-[760px] flex-col gap-8">
          <div>
            <Eyebrow>What working together looks like</Eyebrow>
            <p className="m-0 mb-4 text-[17px] leading-[1.65] md:text-[18px]" style={{ color: '#131114' }}>
              <strong style={{ fontWeight: 600 }}>Start with clarity.</strong> We begin with a focused engagement to understand the system
              you&rsquo;re working within, clarify the vision, identify the highest-leverage opportunities, and create a shared picture of what
              needs to change. You&rsquo;ll leave with clarity and real, tangible artifacts — not a strategy deck that gets forgotten.
            </p>
            <p className="m-0 text-[17px] leading-[1.65] md:text-[18px]" style={{ color: '#544D5A' }}>
              <strong style={{ fontWeight: 600, color: '#131114' }}>Then we move.</strong> If the work calls for an ongoing partnership, I stay
              embedded as a fractional transformation leader — holding the vision, shaping product and organizational strategy, facilitating the
              work, and navigating friction as it comes up. The exact rhythm depends on what you need.
            </p>
          </div>
          <div>
            <Eyebrow>The human layer</Eyebrow>
            <p className="m-0 text-[17px] leading-[1.65] md:text-[18px]" style={{ color: '#544D5A' }}>
              The hardest part of transformation is rarely knowing what should change. It&rsquo;s becoming the organization capable of changing
              it. When trust is low or teams are exhausted, strategy alone won&rsquo;t solve it — the human work isn&rsquo;t separate from the
              strategy. It&rsquo;s what allows the strategy to become real.
            </p>
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="relative overflow-hidden px-6 py-20 md:px-8 md:py-[112px]" style={{ background: '#000000' }}>
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: 'radial-gradient(120% 100% at 50% 100%, #FFF6AD 0%, rgba(254,225,106,.55) 28%, rgba(0,0,0,0) 72%)',
            opacity: 0.45,
          }}
        />
        <div className="relative mx-auto max-w-[760px] text-center">
          <h2 className="m-0 mb-6 text-[28px] leading-[1.1] font-light md:text-[42px] md:leading-[1.06]" style={{ ...DISPLAY, letterSpacing: '.02em', color: '#FBF7F2' }}>
            You don&rsquo;t need to have it all figured out before we start
          </h2>
          <p className="mx-auto mb-9 max-w-[560px] text-[17px] leading-[1.55] md:text-[19px]" style={{ color: 'rgba(251,247,242,.72)' }}>
            That&rsquo;s what we&rsquo;ll figure out together. Ready to move?
          </p>
          <a
            href={BOOKING_URL}
            target="_blank"
            rel="noreferrer"
            onClick={() => trackBooking('advisory_cta')}
            className="rounded-lg px-8 py-4 text-[15px] font-semibold"
            style={primaryButton({ boxShadow: '0 0 40px rgba(254,225,106,.28)' })}
          >
            Let&rsquo;s talk
          </a>
        </div>
      </section>

      <MarketingFooter />
    </div>
  )
}
