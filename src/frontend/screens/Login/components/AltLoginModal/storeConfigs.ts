export interface StoreConfig {
  name: 'epic' | 'gog' | 'amazon' | 'zoom'
  loginUrl: string
  codeParam: string
  minCodeLength: number
  extractCode: (input: string) => string | null
}

export const epicConfig: StoreConfig = {
  name: 'epic',
  loginUrl: 'https://legendary.gl/epiclogin',
  codeParam: 'sid',
  minCodeLength: 30,
  extractCode: (input: string): string | null => {
    // Epic accepts raw SID (Session ID)
    const trimmed = input.trim()
    return trimmed.length >= 30 ? trimmed : null
  }
}

export const gogConfig: StoreConfig = {
  name: 'gog',
  loginUrl:
    'https://auth.gog.com/auth?client_id=46899977096215655&redirect_uri=https%3A%2F%2Fembed.gog.com%2Fon_login_success%3Forigin%3Dclient&response_type=code&layout=galaxy',
  codeParam: 'code',
  minCodeLength: 30,
  extractCode: (input: string): string | null => {
    try {
      // Try parsing as URL first
      const url = new URL(input)
      const code = url.searchParams.get('code')
      return code
    } catch {
      // If not a valid URL, treat as raw code
      const trimmed = input.trim()
      return trimmed.length >= 30 ? trimmed : null
    }
  }
}

export const amazonConfig: StoreConfig = {
  name: 'amazon',
  loginUrl: '', // Will be set dynamically from PKCE data
  codeParam: 'openid.oa2.authorization_code',
  minCodeLength: 20,
  extractCode: (input: string): string | null => {
    try {
      const url = new URL(input)
      const code = url.searchParams.get('openid.oa2.authorization_code')
      return code
    } catch {
      // Amazon code might be pasted directly
      const trimmed = input.trim()
      return trimmed.length >= 20 ? trimmed : null
    }
  }
}
