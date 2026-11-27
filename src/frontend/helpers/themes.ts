export const DEFAULT_THEME = 'midnightMirage'

export const defaultThemes: Record<string, string> = {
  midnightMirage: 'Heroic Theme',
  cyberSpaceOasis: 'Cyberspace Oasis',
  'high-contrast': 'High Contrast',
  'old-school': 'Old School Heroic',
  dracula: 'Dracula',
  marine: 'Marine',
  zombie: 'Zombie',
  'nord-light': 'Nord Light',
  'nord-dark': 'Nord Dark',
  gruvbox_dark: 'Gruvbox Dark',
  sweet: 'Sweet',
  candy: 'Candy Dark',
  'candy-light': 'Candy Light',
  vampyria: 'Vampyria',
  forest: 'Mint',
  onePiece: 'One Piece',
  cyberpunk: 'Cyberpunk'
}

const legacyThemes: Record<string, string> = {
  heroicTheme: 'midnightMirage',
  classic: 'cyberSpaceOasis',
  cyberSpaceOasisAlt: 'cyberSpaceOasis',
  'marine-classic': 'marine',
  'zombie-classic': 'zombie'
}

export const migrateTheme = (theme: string) => legacyThemes[theme] ?? theme

export const isBuiltinTheme = (theme: string) =>
  theme === DEFAULT_THEME || Object.keys(defaultThemes).includes(theme)

export const toThemeClassName = (theme: string) =>
  theme.replace('.css', '').replace(/[\s.]/, '_')
