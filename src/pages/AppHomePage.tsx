import { Link } from 'react-router-dom'
import { Logo } from '../components/shared/Logo'
import { Seo } from '../components/shared/Seo'

// The app.empireoflightcollective.com home route — deliberately minimal.
// The full marketing site (thesis, about, pricing, etc.) lives on the root
// domain instead; this just orients someone who lands here directly and
// gets them into the product or back out to the marketing site.
export default function AppHomePage() {
  return (
    <main className="relative flex min-h-screen items-center overflow-hidden px-6 py-24" style={{ background: '#000000' }}>
      <Seo title="Empire of Light" description="Sign in to your Empire of Light team, or create a new one." path="/" origin="app" noindex />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(120% 100% at 50% 100%, #FFF6AD 0%, rgba(254,225,106,.55) 28%, rgba(0,0,0,0) 72%)',
          opacity: 0.55,
        }}
      />
      <div className="relative mx-auto flex max-w-xl flex-col items-center gap-6 text-center">
        <Logo size={72} />
        <div
          className="text-[13px] font-semibold uppercase tracking-[0.16em]"
          style={{ fontFamily: 'var(--font-display)', color: '#FEE16A' }}
        >
          Collective intelligence platform
        </div>
        <h1
          className="m-0 text-[36px] leading-[1.12] font-light md:text-[46px]"
          style={{ fontFamily: 'var(--font-display)', letterSpacing: '.02em', color: '#FBF7F2' }}
        >
          Unlock the collective intelligence already inside your team
        </h1>
        <p className="m-0 max-w-md text-[16px] leading-[1.5] md:text-[18px]" style={{ color: 'rgba(251,247,242,.78)' }}>
          Bring more ambitious visions to life faster, with more unity.
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3.5">
          <Link
            to="/signup"
            className="rounded-lg px-7 py-3.5 text-[15px] font-semibold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-eol-ink)', background: 'var(--color-eol-accent)' }}
          >
            Sign up
          </Link>
          <Link
            to="/login"
            className="rounded-lg px-7 py-3.5 text-[15px] font-semibold"
            style={{ fontFamily: 'var(--font-display)', color: '#FBF7F2', border: '1px solid rgba(251,247,242,.32)' }}
          >
            Log in
          </Link>
        </div>
        <a
          href="https://www.empireoflightcollective.com"
          className="mt-3 text-[13px] font-semibold"
          style={{ color: '#FEE16A', borderBottomColor: 'rgba(254,225,106,.35)' }}
        >
          empireoflightcollective.com &rarr;
        </a>
      </div>

      <footer className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-4 px-6 text-[12px]" style={{ color: 'rgba(251,247,242,.5)' }}>
        <span>&copy; {new Date().getFullYear()} Empire of Light LLC</span>
        <Link to="/terms" style={{ color: 'rgba(251,247,242,.5)', borderBottomColor: 'rgba(251,247,242,.25)' }}>
          Terms of Service
        </Link>
      </footer>
    </main>
  )
}
