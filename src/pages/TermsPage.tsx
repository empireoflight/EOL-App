import { Link } from 'react-router-dom'
import { Logo } from '../components/shared/Logo'
import { Seo } from '../components/shared/Seo'

const SECTIONS: { heading: string; body: string[] }[] = [
  {
    heading: '1. Agreement to Terms',
    body: [
      'These Terms of Service ("Terms") govern your access to and use of empireoflightcollective.com and app.empireoflightcollective.com (together, the "Service"), operated by Empire of Light LLC ("we," "us," "our"). By creating an account or otherwise using the Service, you agree to these Terms. If you’re using the Service on behalf of an organization, you’re agreeing on that organization’s behalf, and "you" refers to both you and that organization.',
      "If you don't agree to these Terms, don't use the Service.",
    ],
  },
  {
    heading: '2. What the Service Is',
    body: [
      'Empire of Light is a collaboration platform that helps teams build a shared vision, take action toward it, process friction and disagreement, and reflect on progress together — a four-part cycle we call Reimagine, Do, Unlearn, and Evolve. The Service includes features for vision co-creation, task tracking, friction processing, weekly check-ins, and AI-assisted synthesis of team input.',
      'How we handle the content you and your team create — including which content is private, which is shared, and which is anonymized — is governed by our Privacy Policy, not these Terms. Read that policy; it’s the more important document for understanding what happens to what you write.',
    ],
  },
  {
    heading: '3. Accounts',
    body: [
      'You need an account to use most of the Service. You agree to provide accurate information when creating your account, keep your login credentials confidential and secure, notify us promptly if you suspect unauthorized access to your account, and be responsible for all activity that happens under your account.',
      'You must be at least 18 years old to create an account. The Service is intended for working professionals and organizations, not personal or household use by minors.',
    ],
  },
  {
    heading: '4. Teams and Organizations',
    body: [
      'The Service is organized around teams, which belong to organizations. When you create a team, you become its facilitator, with the ability to invite others, manage team membership, and initiate vision and friction sessions. Other members you invite get access to team-level content according to the privacy tiers described in our Privacy Policy.',
      'You’re responsible for who you invite to your team and organization. We’re not responsible for disputes between members of the same team or organization, though we’ll cooperate with reasonable requests related to account security or data access consistent with our Privacy Policy.',
    ],
  },
  {
    heading: '5. Acceptable Use',
    body: [
      'You agree not to use the Service for any unlawful purpose or in violation of any applicable law or regulation; impersonate any person or entity, or misrepresent your affiliation with a person or entity; attempt to gain unauthorized access to any account, team, or system you’re not authorized to access; interfere with or disrupt the integrity or performance of the Service, including attempting to bypass the access controls described in our Privacy Policy; use automated means to access the Service outside of any API we may explicitly offer; upload or transmit any content that is unlawful, harassing, defamatory, or infringes on the rights of others; or use the Service to harass, intimidate, or retaliate against a teammate, including using friction or reflection features in bad faith to target a specific person.',
      'We may suspend or terminate accounts that violate this section.',
    ],
  },
  {
    heading: '6. Your Content',
    body: [
      'You retain ownership of the content you create in the Service — your vision reflections, friction descriptions, task updates, and everything else you write. By submitting content, you grant us a limited license to store, process, and display that content as necessary to operate the Service, exactly as described in our Privacy Policy, including, where applicable, using it to generate anonymized aggregates or AI-assisted synthesis.',
      "You're responsible for the content you submit. Don't submit anything you don't have the right to share, or that violates someone else's privacy or intellectual property rights.",
    ],
  },
  {
    heading: '7. AI-Generated Content',
    body: [
      'Some features of the Service use AI (currently, models provided by Anthropic) to synthesize input from you and your team — for example, generating a draft vision layout, an alignment summary, or a friction discussion guide. AI-generated content is a starting point for your team to review, edit, and discuss, not a final or authoritative output. We don’t guarantee the accuracy, completeness, or appropriateness of AI-generated content, and you’re responsible for reviewing it before relying on it.',
    ],
  },
  {
    heading: '8. Intellectual Property',
    body: [
      'The Service itself — including its design, features, and underlying software — is owned by us or our licensors and is protected by intellectual property law. These Terms don’t grant you any rights to our trademarks, logos, or branding beyond what’s necessary to use the Service as intended.',
    ],
  },
  {
    heading: '9. Third-Party Services',
    body: [
      'The Service relies on third-party providers (currently Supabase, Anthropic, Resend, Vercel, Google Calendar, and Substack, as described in our Privacy Policy) to operate. Your use of features that route through those providers is also subject to their own terms where applicable.',
    ],
  },
  {
    heading: '10. Termination',
    body: [
      'You may stop using the Service and request deletion of your account at any time by contacting us. We may suspend or terminate your access to the Service if you violate these Terms, or for any other reason with reasonable notice, except where immediate termination is warranted, such as a security or abuse concern.',
      'Upon termination, your right to use the Service ends, and we’ll handle your data as described in our Privacy Policy’s data retention section.',
    ],
  },
  {
    heading: '11. Disclaimers',
    body: [
      'THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE," WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT. WE DON’T WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE, OR THAT AI-GENERATED CONTENT WILL BE ACCURATE.',
    ],
  },
  {
    heading: '12. Limitation of Liability',
    body: [
      'TO THE MAXIMUM EXTENT PERMITTED BY LAW, EMPIRE OF LIGHT LLC WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, DATA, OR GOODWILL, ARISING FROM YOUR USE OF THE SERVICE, EVEN IF WE’VE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. OUR TOTAL LIABILITY FOR ANY CLAIM ARISING FROM THESE TERMS OR THE SERVICE WILL NOT EXCEED THE AMOUNT YOU PAID US, IF ANY, IN THE 12 MONTHS BEFORE THE CLAIM AROSE.',
    ],
  },
  {
    heading: '13. Indemnification',
    body: [
      'You agree to indemnify and hold us harmless from any claims, damages, or expenses, including reasonable attorneys’ fees, arising from your violation of these Terms or your misuse of the Service.',
    ],
  },
  {
    heading: '14. Governing Law',
    body: [
      'These Terms are governed by the laws of the State of Washington, without regard to conflict-of-law principles. Any dispute arising from these Terms or the Service will be subject to the exclusive jurisdiction of the state and federal courts located in Washington State.',
    ],
  },
  {
    heading: '15. Changes to These Terms',
    body: [
      'We may update these Terms from time to time. If we make material changes, we’ll update the date at the top and, where appropriate, notify you directly. Continued use of the Service after changes take effect means you accept the updated Terms.',
    ],
  },
  {
    heading: '16. Contact',
    body: ['Questions about these Terms? Reach us at kelly@empireoflightcollective.com.'],
  },
]

export default function TermsPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-16">
      <Seo title="Terms of Service | Empire of Light" description="The terms that govern your use of Empire of Light." path="/terms" origin="app" />
      <div className="flex flex-col items-center gap-3 text-center">
        <Link to="/">
          <Logo size={40} />
        </Link>
        <h1 className="m-0 text-[26px] font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-eol-text)' }}>
          Terms of Service
        </h1>
        <p className="m-0 text-[13px]" style={{ color: 'var(--color-eol-text-muted)' }}>
          Last updated: August 21, 2026
        </p>
      </div>

      <div className="flex flex-col gap-7">
        {SECTIONS.map((section) => (
          <div key={section.heading}>
            <h2 className="m-0 mb-2 text-[15px] font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-eol-text)' }}>
              {section.heading}
            </h2>
            {section.body.map((p, i) => (
              <p key={i} className="m-0 mt-2 text-[13.5px] leading-relaxed" style={{ color: 'var(--color-eol-text-secondary)' }}>
                {p}
              </p>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
