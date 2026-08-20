import { Link } from 'react-router-dom'
import { MarketingHeader } from '../../components/marketing/MarketingHeader'
import { MarketingFooter } from '../../components/marketing/MarketingFooter'
import { Seo } from '../../components/shared/Seo'
import { CONTACT_EMAIL, DISPLAY, Eyebrow } from '../../components/marketing/shared'

const LAST_UPDATED = 'August 20, 2026'

const TIERS = [
  {
    n: 0,
    label: 'Ephemeral, never stored',
    body: 'Some reflection prompts — like the grounding questions at the start of a friction session — never leave your device. They are not sent to our servers, not saved anywhere, and not visible to anyone, including your team, facilitators, or Empire of Light staff. If you close the tab, they’re gone.',
  },
  {
    n: 1,
    label: 'Private, sealed',
    body: 'Individual reflections — your vision questionnaire answers, your description of a friction situation — are stored in our database, but locked to you specifically: access-control rules enforced at the database level mean only your account can read these rows. No team admin, facilitator, or Empire of Light staff member has a path to read them directly, and the only thing ever built from them is a de-identified aggregate (see Tier 3).',
  },
  {
    n: 2,
    label: 'AI-assisted',
    body: 'Some content — like what gave or drained your energy that week — is stored and processed by an AI model to surface patterns. The raw text you write is never shown to your team or facilitators verbatim; only synthesized, non-attributable observations (e.g. “a few people mentioned meeting overload this week”) are ever surfaced.',
  },
  {
    n: 3,
    label: 'Team aggregate',
    body: 'Anonymized signals combining at least three people’s data — like a team energy trend over time — are shared with your team. This aggregation happens in a server-side process that reads Tier 1/2 data; no individual contribution can be reverse-engineered from the result, and the minimum-contributor threshold is enforced at the database level, not just in application code.',
  },
  {
    n: 4,
    label: 'Team shared',
    body: 'Content you or your team explicitly choose to share verbatim — your committed vision statement, task updates, a friction session once it’s ready for discussion — is visible to your whole team. This is the only tier where what you write is shown to teammates exactly as written.',
  },
]

const PROVIDERS = [
  { name: 'Supabase', purpose: 'Database, authentication, and file storage. This is where your account and Tier 1–4 content live.' },
  { name: 'Anthropic', purpose: 'Powers the AI synthesis used for Tier 2 content — pattern-finding only, never used to make Tier 0/1 content readable to anyone else.' },
  { name: 'Resend', purpose: 'Sends transactional email — invites, reminders, and notifications about your team’s sessions.' },
  { name: 'Vercel', purpose: 'Hosts this site and the app, and provides Vercel Analytics/Speed Insights — cookieless, aggregated traffic and performance data. No cross-site tracking, no ad targeting.' },
  { name: 'Google Calendar', purpose: 'Powers the “Book a conversation” scheduling link. Any name/email/details you provide there are handled under Google’s privacy policy, not ours.' },
  { name: 'Substack', purpose: 'If you subscribe to our newsletter, Substack handles that subscription under its own privacy policy.' },
]

export default function PrivacyPage() {
  return (
    <div style={{ width: '100%', overflowX: 'hidden', background: '#FDFAF4', color: '#131114', fontFamily: "'Work Sans', system-ui, sans-serif" }}>
      <Seo
        title="Privacy Policy | Empire of Light"
        description="How Empire of Light collects, stores, and protects your data — including a full breakdown of the app's five-tier privacy system."
        path="/privacy"
      />
      <MarketingHeader />

      {/* Hero */}
      <section className="px-6 py-16 md:px-8 md:py-24" style={{ background: '#000000' }}>
        <div className="mx-auto max-w-[840px]">
          <div className="mb-5 text-[13px] font-semibold uppercase tracking-[0.16em]" style={{ ...DISPLAY, color: '#FEE16A' }}>
            Privacy Policy
          </div>
          <h1 className="m-0 mb-4 text-[32px] leading-[1.1] font-light md:text-[46px] md:leading-[1.06]" style={{ ...DISPLAY, letterSpacing: '.02em', color: '#FBF7F2' }}>
            How we handle your data
          </h1>
          <p className="m-0 text-[15px]" style={{ color: 'rgba(251,247,242,.6)' }}>Last updated: {LAST_UPDATED}</p>
        </div>
      </section>

      {/* Intro */}
      <section className="px-6 py-16 md:px-8 md:py-20">
        <div className="mx-auto flex max-w-[760px] flex-col gap-5">
          <p className="m-0 text-[16px] leading-[1.7] md:text-[17px]" style={{ color: '#131114' }}>
            This policy covers empireoflightcollective.com and app.empireoflightcollective.com — the marketing site and the Empire of Light app.
            It explains what we collect, how it’s used, and — in more detail than a typical privacy policy — exactly how our privacy-tier
            system controls who can see what inside the app.
          </p>
          <p className="m-0 text-[16px] leading-[1.7] md:text-[17px]" style={{ color: '#544D5A' }}>
            The short version: what you write is yours. We built the app so that most of what you share is either never stored, locked to you
            specifically, or only ever surfaced to your team in anonymized or explicitly-shared form. The section below on privacy tiers is the
            most important part of this page — read that first if you only read one thing.
          </p>
        </div>
      </section>

      {/* Privacy tiers — the detailed part */}
      <section className="px-6 py-16 md:px-8 md:py-24" style={{ background: '#000000' }}>
        <div className="mx-auto max-w-[1120px]">
          <div className="mb-12 max-w-[720px]">
            <Eyebrow color="#FEE16A">How your data maps to our privacy tiers</Eyebrow>
            <p className="m-0 text-[16px] leading-[1.7] md:text-[17px]" style={{ color: 'rgba(251,247,242,.75)' }}>
              Every piece of content in the app is assigned one of five privacy tiers, and that tier is visible to you right where you enter the
              data — so you always know who can see what before you write it.
            </p>
          </div>
          <div className="flex flex-col gap-px overflow-hidden rounded-xl border" style={{ background: 'rgba(251,247,242,.14)', borderColor: 'rgba(251,247,242,.14)' }}>
            {TIERS.map((tier) => (
              <div key={tier.n} className="p-8" style={{ background: '#0C0A0D' }}>
                <div className="mb-3 text-[13px] font-semibold tracking-[0.16em]" style={{ ...DISPLAY, color: '#FEE16A' }}>
                  TIER {tier.n} &middot; {tier.label.toUpperCase()}
                </div>
                <p className="m-0 text-[15px] leading-[1.65] md:text-[16px]" style={{ color: 'rgba(251,247,242,.78)' }}>
                  {tier.body}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-7 text-[15px] leading-[1.6]" style={{ color: 'rgba(251,247,242,.55)' }}>
            These boundaries are enforced at the database level, not just in the app’s interface — so a bug in a screen somewhere can’t
            accidentally expose Tier 0/1 content to people who shouldn’t see it. Only automated, server-side processes can turn Tier 1/2 content
            into a Tier 3 aggregate; no person — including Empire of Light staff — can browse Tier 0/1/2 content directly.
          </p>
        </div>
      </section>

      {/* What we collect */}
      <section className="px-6 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-[760px]">
          <Eyebrow>Information we collect</Eyebrow>
          <div className="flex flex-col gap-4">
            <p className="m-0 text-[16px] leading-[1.7] md:text-[17px]" style={{ color: '#131114' }}>
              <strong style={{ fontWeight: 600 }}>Account information.</strong> Your name, email, and password (handled by our authentication
              provider — we never see or store your raw password) when you create an account.
            </p>
            <p className="m-0 text-[16px] leading-[1.7] md:text-[17px]" style={{ color: '#544D5A' }}>
              <strong style={{ fontWeight: 600, color: '#131114' }}>Content you provide in the app.</strong> Vision reflections, check-ins,
              friction descriptions, and task updates — handled according to the privacy tier assigned to that content, described above.
            </p>
            <p className="m-0 text-[16px] leading-[1.7] md:text-[17px]" style={{ color: '#544D5A' }}>
              <strong style={{ fontWeight: 600, color: '#131114' }}>Usage and performance data.</strong> Aggregated, cookieless analytics
              (page views, referrers, general device/browser type, load performance) via Vercel Analytics and Speed Insights. This data isn’t
              tied to your identity and isn’t used for advertising.
            </p>
            <p className="m-0 text-[16px] leading-[1.7] md:text-[17px]" style={{ color: '#544D5A' }}>
              <strong style={{ fontWeight: 600, color: '#131114' }}>Information from booking a conversation.</strong> If you use our “Book a
              conversation” link, any name, email, or details you provide are collected by Google Calendar’s scheduling tool, not by us
              directly.
            </p>
          </div>
        </div>
      </section>

      {/* How we use it */}
      <section className="px-6 py-16 md:px-8 md:py-20" style={{ background: '#000000' }}>
        <div className="mx-auto max-w-[760px]">
          <Eyebrow color="#FEE16A">How we use your information</Eyebrow>
          <p className="m-0 text-[16px] leading-[1.7] md:text-[17px]" style={{ color: 'rgba(251,247,242,.75)' }}>
            We use your information to run the app and the facilitated engagement — creating and syncing your account, running the vision and
            friction workflows, producing the aggregate and AI-assisted insights described above, sending transactional emails about your
            team’s sessions, responding to questions you send us, and understanding traffic to this site so we can improve it. We do not sell
            your data, and we do not use your reflections or check-ins for advertising.
          </p>
        </div>
      </section>

      {/* Third parties */}
      <section className="px-6 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-[1120px]">
          <Eyebrow>Third-party service providers</Eyebrow>
          <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border sm:grid-cols-2" style={{ background: '#D8D2DC', borderColor: '#D8D2DC' }}>
            {PROVIDERS.map((p) => (
              <div key={p.name} className="p-7" style={{ background: '#FFFFFF' }}>
                <h3 className="m-0 mb-2 text-[17px] font-semibold" style={{ ...DISPLAY, color: '#131114' }}>
                  {p.name}
                </h3>
                <p className="m-0 text-[14.5px] leading-[1.6]" style={{ color: '#544D5A' }}>
                  {p.purpose}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Retention, rights, security, children, changes */}
      <section className="px-6 py-16 md:px-8 md:py-20" style={{ background: '#000000' }}>
        <div className="mx-auto flex max-w-[760px] flex-col gap-10">
          <div>
            <Eyebrow color="#FEE16A">Data retention</Eyebrow>
            <p className="m-0 text-[16px] leading-[1.7] md:text-[17px]" style={{ color: 'rgba(251,247,242,.75)' }}>
              We keep your account and content for as long as your account is active, or as needed to provide the service. Tier 0 content is
              never stored in the first place. If you delete your account, we delete your Tier 1/2 content; Tier 3 aggregates that no longer
              reference identifiable individuals may persist, since they were never attributable to you in the first place.
            </p>
          </div>
          <div>
            <Eyebrow color="#FEE16A">Your rights</Eyebrow>
            <p className="m-0 text-[16px] leading-[1.7] md:text-[17px]" style={{ color: 'rgba(251,247,242,.75)' }}>
              You can ask us to access, export, correct, or delete your personal data at any time by emailing us at the address below. We’ll
              respond within a reasonable timeframe.
            </p>
          </div>
          <div>
            <Eyebrow color="#FEE16A">Data security</Eyebrow>
            <p className="m-0 text-[16px] leading-[1.7] md:text-[17px]" style={{ color: 'rgba(251,247,242,.75)' }}>
              Data is encrypted in transit and at rest, and access to Tier 1/2 content is restricted at the database level — not just by app
              logic — so only you can read your own private content.
            </p>
          </div>
          <div>
            <Eyebrow color="#FEE16A">Children’s privacy</Eyebrow>
            <p className="m-0 text-[16px] leading-[1.7] md:text-[17px]" style={{ color: 'rgba(251,247,242,.75)' }}>
              Empire of Light is intended for working professionals and is not directed at, or knowingly used to collect information from,
              children under 18.
            </p>
          </div>
          <div>
            <Eyebrow color="#FEE16A">Changes to this policy</Eyebrow>
            <p className="m-0 text-[16px] leading-[1.7] md:text-[17px]" style={{ color: 'rgba(251,247,242,.75)' }}>
              If we make material changes to this policy, we’ll update the date at the top of this page and, where appropriate, let you know
              directly.
            </p>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="px-6 py-16 md:px-8 md:py-24">
        <div className="mx-auto max-w-[760px] text-center">
          <Eyebrow>Questions</Eyebrow>
          <p className="m-0 mb-2 text-[16px] leading-[1.7] md:text-[17px]" style={{ color: '#131114' }}>
            If you have questions about this policy or your data, reach out any time.
          </p>
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-[16px] font-semibold" style={{ ...DISPLAY, color: '#A96D0F' }}>
            {CONTACT_EMAIL}
          </a>
          <p className="mt-8 text-[14px]" style={{ color: '#544D5A' }}>
            See also our <Link to="/thesis" style={{ color: '#A96D0F' }}>thesis</Link> and{' '}
            <Link to="/about" style={{ color: '#A96D0F' }}>about</Link> pages.
          </p>
        </div>
      </section>

      <MarketingFooter />
    </div>
  )
}
