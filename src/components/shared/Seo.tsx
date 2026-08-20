import { useEffect } from 'react'

const MARKETING_ORIGIN = 'https://www.empireoflightcollective.com'
const APP_ORIGIN = 'https://app.empireoflightcollective.com'
const SITE_NAME = 'Empire of Light'
// The OG image only lives on the marketing site's origin — app-subdomain
// pages (login/signup/invite) reuse it via the absolute marketing URL.
const DEFAULT_OG_IMAGE = `${MARKETING_ORIGIN}/og-image.png`

type SeoProps = {
  title: string
  description: string
  path: string
  noindex?: boolean
  /** Which deployment this page lives on — marketing site (www) or the app (app.*). Defaults to marketing. */
  origin?: 'marketing' | 'app'
}

function setMetaByAttr(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function setLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

/**
 * Sets document title, meta description/robots, canonical link, and Open
 * Graph/Twitter tags on route change. This is a client-side SPA (no SSR), so
 * these updates land after React mounts — fine for Google/Bing (they render
 * JS), but link-preview bots that don't execute JS will fall back to the
 * defaults baked into index.html instead of a page's specific title/description.
 */
export function Seo({ title, description, path, noindex = false, origin = 'marketing' }: SeoProps) {
  useEffect(() => {
    document.title = title
    setMetaByAttr('name', 'description', description)
    setMetaByAttr('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow')

    const url = `${origin === 'app' ? APP_ORIGIN : MARKETING_ORIGIN}${path}`
    setLink('canonical', url)

    setMetaByAttr('property', 'og:title', title)
    setMetaByAttr('property', 'og:description', description)
    setMetaByAttr('property', 'og:url', url)
    setMetaByAttr('property', 'og:type', 'website')
    setMetaByAttr('property', 'og:site_name', SITE_NAME)
    setMetaByAttr('property', 'og:image', DEFAULT_OG_IMAGE)

    setMetaByAttr('name', 'twitter:card', 'summary_large_image')
    setMetaByAttr('name', 'twitter:title', title)
    setMetaByAttr('name', 'twitter:description', description)
    setMetaByAttr('name', 'twitter:image', DEFAULT_OG_IMAGE)
  }, [title, description, path, noindex, origin])

  return null
}
