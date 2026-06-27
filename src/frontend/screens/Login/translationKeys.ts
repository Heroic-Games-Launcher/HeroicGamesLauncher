/**
 * This file explicitly references all translation keys used in the Login screens.
 * It exists to help i18next-parser detect dynamically constructed translation keys
 * (e.g., `manual.${store}.step1`) that would otherwise be removed during parsing.
 *
 * These references are never executed at runtime - they're only for the parser.
 */

/* eslint-disable @typescript-eslint/no-unused-vars */
/* istanbul ignore file */

import { useTranslation } from 'react-i18next'

export function _translationKeyReferences() {
  const { t } = useTranslation('login')

  // Alternative login manual keys - Epic
  t('manual.epic.step1')
  t('manual.epic.step2')

  // Alternative login manual keys - GOG
  t('manual.gog.step1')
  t('manual.gog.step2')

  // Alternative login manual keys - Amazon
  t('manual.amazon.step1')
  t('manual.amazon.step2')
  t('manual.amazon.loading_url')

  // Alternative login error keys
  t('manual.error.invalid_code')
  t('manual.error.code_too_short')
  t('manual.error.login_failed')
  t('manual.error.network_error')
  t('manual.error.fetch_url')
  t('manual.error.no_pkce')
}
