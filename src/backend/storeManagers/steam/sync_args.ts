/** Heroic sync command to Aurelia direction. */
export function syncDirectionFromArg(arg: string): 'up' | 'down' | undefined {
  if (/skip-upload|force-download/i.test(arg)) return 'down'
  if (/skip-download|force-upload/i.test(arg)) return 'up'
  if (/download/i.test(arg)) return 'down'
  if (/upload/i.test(arg)) return 'up'
  return undefined
}
