import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { Coffee, Copy, ExternalLink, Heart, Mail, Store } from 'lucide-react'
import {
  faGithub,
  faPatreon,
  faPaypal
} from '@fortawesome/free-brands-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  Button,
  Icon,
  PageHeader,
  SettingsCard,
  SettingRow
} from 'frontend/components/UI'
import GOGLogo from 'frontend/assets/gog-logo.svg?react'
import GMGLogo from 'frontend/assets/gmg-logo.svg?react'
import HumbleLogo from 'frontend/assets/humble-logo.svg?react'
import './index.css'

const PAYPAL_URL = 'https://www.paypal.me/heroiclauncher'
const GOG_URL = 'https://af.gog.com?as=1838482841'
const GMG_URL = 'https://greenmangaming.sjv.io/c/7460208/1219987/15105'
const HUMBLE_URL = 'https://humblebundleinc.sjv.io/heroic'
const SUPPORT_EMAIL = 'contact@heroicgameslauncher.com'

export default memo(function Support() {
  const { t } = useTranslation()

  const openExternal = (url: string) => window.api.openExternalUrl(url)

  const copyEmail = () => {
    void navigator.clipboard.writeText(SUPPORT_EMAIL)
  }

  return (
    <div className="Support">
      <div className="Support__wrapper">
        <PageHeader
          title={t('support.title', 'Support Us')}
          description={t(
            'support.description',
            'Heroic is free and open source. Donations and affiliate purchases keep it that way.'
          )}
        />

        <div className="Support__sections">
          <SettingsCard
            glyph={Heart}
            title={t('support.donations.title', 'Donations')}
            description={t(
              'support.donations.description',
              "Choose how you'd like to support Heroic's development."
            )}
          >
            <SettingRow
              label={
                <>
                  <span className="Support__brand Support__brand--patreon">
                    <FontAwesomeIcon icon={faPatreon} />
                  </span>
                  Patreon
                </>
              }
              description={t(
                'support.donations.patreon.description',
                'Recurring membership with behind-the-scenes updates.'
              )}
            >
              <Button
                variant="secondary"
                size="sm"
                icon={<Icon glyph={ExternalLink} size="sm" />}
                onClick={() => window.api.openPatreonPage()}
              >
                {t('support.actions.open', 'Open')}
              </Button>
            </SettingRow>

            <SettingRow
              label={
                <>
                  <span className="Support__brand Support__brand--kofi">
                    <Icon glyph={Coffee} size="md" />
                  </span>
                  Ko-fi
                </>
              }
              description={t(
                'support.donations.kofi.description',
                'A one-time tip that goes straight into development.'
              )}
            >
              <Button
                variant="secondary"
                size="sm"
                icon={<Icon glyph={ExternalLink} size="sm" />}
                onClick={() => window.api.openKofiPage()}
              >
                {t('support.actions.open', 'Open')}
              </Button>
            </SettingRow>

            <SettingRow
              label={
                <>
                  <span className="Support__brand Support__brand--paypal">
                    <FontAwesomeIcon icon={faPaypal} />
                  </span>
                  PayPal
                </>
              }
              description={t(
                'support.donations.paypal.description',
                'One-time or recurring donation in the currency you prefer.'
              )}
            >
              <Button
                variant="secondary"
                size="sm"
                icon={<Icon glyph={ExternalLink} size="sm" />}
                onClick={() => openExternal(PAYPAL_URL)}
              >
                {t('support.actions.open', 'Open')}
              </Button>
            </SettingRow>

            <SettingRow
              label={
                <>
                  <span className="Support__brand Support__brand--github">
                    <FontAwesomeIcon icon={faGithub} />
                  </span>
                  GitHub Sponsors
                </>
              }
              description={t(
                'support.donations.github.description',
                'Sponsor Heroic through GitHub and show your support publicly.'
              )}
            >
              <Button
                variant="secondary"
                size="sm"
                icon={<Icon glyph={ExternalLink} size="sm" />}
                onClick={() => window.api.openGithubSponsorsPage()}
              >
                {t('support.actions.open', 'Open')}
              </Button>
            </SettingRow>
          </SettingsCard>

          <SettingsCard
            glyph={Store}
            title={t('support.affiliates.title', 'Affiliates')}
            description={t(
              'support.affiliates.description',
              'Buy through our links and Heroic earns a small commission at no extra cost to you.'
            )}
          >
            <SettingRow
              label={
                <>
                  <span className="Support__storeLogo">
                    <GOGLogo />
                  </span>
                  GOG
                </>
              }
              description={t(
                'support.affiliates.gog.description',
                'DRM-free games and classics.'
              )}
            >
              <Button
                variant="secondary"
                size="sm"
                icon={<Icon glyph={ExternalLink} size="sm" />}
                onClick={() => openExternal(GOG_URL)}
              >
                {t('support.actions.shop', 'Shop')}
              </Button>
            </SettingRow>

            <SettingRow
              label={
                <>
                  <span className="Support__storeLogo">
                    <GMGLogo />
                  </span>
                  Green Man Gaming
                </>
              }
              description={t(
                'support.affiliates.gmg.description',
                'Official game keys at great prices.'
              )}
            >
              <Button
                variant="secondary"
                size="sm"
                icon={<Icon glyph={ExternalLink} size="sm" />}
                onClick={() => openExternal(GMG_URL)}
              >
                {t('support.actions.shop', 'Shop')}
              </Button>
            </SettingRow>

            <SettingRow
              label={
                <>
                  <span className="Support__storeLogo">
                    <HumbleLogo />
                  </span>
                  Humble Bundle
                </>
              }
              description={t(
                'support.affiliates.humble.description',
                'Games, books and bundles for charity.'
              )}
            >
              <Button
                variant="secondary"
                size="sm"
                icon={<Icon glyph={ExternalLink} size="sm" />}
                onClick={() => openExternal(HUMBLE_URL)}
              >
                {t('support.actions.shop', 'Shop')}
              </Button>
            </SettingRow>
          </SettingsCard>

          <SettingsCard
            glyph={Mail}
            title={t('support.partnerships.title', 'Partnerships & press')}
            description={t(
              'support.partnerships.description',
              'For sponsorships, brand partnerships or press enquiries, get in touch.'
            )}
          >
            <SettingRow
              label={t('support.email.label', 'Email')}
              description={SUPPORT_EMAIL}
            >
              <Button
                variant="ghost"
                size="sm"
                title={t('support.actions.copyEmail', 'Copy email')}
                aria-label={t('support.actions.copyEmail', 'Copy email')}
                icon={<Icon glyph={Copy} size="sm" />}
                onClick={copyEmail}
              />
              <Button
                variant="primary"
                size="sm"
                icon={<Icon glyph={Mail} size="sm" />}
                onClick={() => openExternal(`mailto:${SUPPORT_EMAIL}`)}
              >
                {t('support.actions.sendEmail', 'Send email')}
              </Button>
            </SettingRow>
          </SettingsCard>
        </div>
      </div>
    </div>
  )
})
