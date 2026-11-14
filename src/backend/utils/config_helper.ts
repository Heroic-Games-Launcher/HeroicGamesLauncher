import type { AppSettings } from 'common/types'

export function shouldUpdateDxvkTools(settings: AppSettings): boolean {
  return Boolean(
    settings.autoInstallDxvk ||
    settings.autoInstallVkd3d ||
    settings.autoInstallDxvkNvapi
  )
}
