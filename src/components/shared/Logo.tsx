import logoMark from '../../assets/logo-mark.png'

type LogoProps = {
  size?: number
}

/** The Empire of Light starburst mark: rays rising from a horizon glow. */
export function Logo({ size = 40 }: LogoProps) {
  return (
    <img
      src={logoMark}
      alt="Empire of Light"
      width={size}
      height={size}
      style={{ display: 'block', width: size, height: size, borderRadius: size * 0.25, objectFit: 'cover' }}
    />
  )
}
