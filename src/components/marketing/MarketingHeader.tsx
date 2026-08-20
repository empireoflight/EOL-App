import { Link } from 'react-router-dom'
import logoMark from '../../assets/logo-mark.png'
import { BOOKING_URL, DISPLAY, HEADER_GRADIENT, navLink, navLinkStyle, primaryButton, trackBooking } from './shared'

export function MarketingHeader() {
  return (
    <header
      className="sticky top-0 z-20 border-b"
      style={{ background: HEADER_GRADIENT, backdropFilter: 'blur(12px)', borderColor: 'rgba(19,17,20,.12)' }}
    >
      <div className="mx-auto flex max-w-[1120px] items-center gap-6 px-6 py-3.5 md:px-8">
        <Link to="/" className="flex items-center gap-3">
          <img src={logoMark} alt="" width={28} height={28} style={{ display: 'block', borderRadius: 7 }} />
          <span className="text-[14px] font-semibold uppercase tracking-[0.14em]" style={{ ...DISPLAY, color: '#131114' }}>
            Empire of Light
          </span>
        </Link>
        <nav className="ml-auto hidden items-center gap-7 md:flex">
          <Link to="/thesis" className={navLink} style={navLinkStyle}>
            Thesis
          </Link>
          <Link to="/about" className={navLink} style={navLinkStyle}>
            About
          </Link>
          <a
            href={BOOKING_URL}
            target="_blank"
            rel="noreferrer"
            onClick={() => trackBooking('header_desktop')}
            className="rounded-lg px-4.5 py-2 text-[14px] font-semibold"
            style={primaryButton()}
          >
            Book a conversation
          </a>
        </nav>
        <a
          href={BOOKING_URL}
          target="_blank"
          rel="noreferrer"
          onClick={() => trackBooking('header_mobile')}
          className="ml-auto rounded-lg px-4 py-2 text-[13px] font-semibold md:hidden"
          style={primaryButton()}
        >
          Book a conversation
        </a>
      </div>
    </header>
  )
}
