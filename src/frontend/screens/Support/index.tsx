import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowUpRight, Coffee, Copy, Mail } from 'lucide-react'
import {
  faGithub,
  faPatreon,
  faPaypal
} from '@fortawesome/free-brands-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  Badge,
  Button,
  FeatureCard,
  Icon,
  IconBadge,
  SectionHeader
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

  const openCta = (onClick: () => void, label: string) => (
    <Button
      variant="ghost"
      size="md"
      fullWidth
      icon={<Icon glyph={ArrowUpRight} size="sm" />}
      onClick={onClick}
    >
      {label}
    </Button>
  )

  return (
    <div className="Support">
      <div className="Support__wrapper">
        <header className="Support__hero">
          <Badge variant="gradient" className="Support__eyebrow">
            {t('support.title', 'Support Us')}
          </Badge>
          <h1 className="Support__title">
            {t('support.headline', 'Help us make Heroic even better')}
          </h1>
          <p className="Support__subtitle">
            {t(
              'support.description',
              'Heroic is free and open source, and always will be. Your support gives the developers more time to improve it: buying games to test new features against, fixing bugs, and building the things the community asks for.'
            )}
          </p>
        </header>

        <section className="Support__section">
          <SectionHeader
            title={t('support.donations.title', 'Donations')}
            subtitle={t(
              'support.donations.description',
              "Choose how you'd like to support Heroic's development."
            )}
          />
          <div className="Support__grid">
            <FeatureCard
              icon={
                <IconBadge>
                  <FontAwesomeIcon icon={faPatreon} />
                </IconBadge>
              }
              title="Patreon"
              description={t(
                'support.donations.patreon.description',
                'Recurring membership with behind-the-scenes updates.'
              )}
              meta={
                <Badge variant="neutral">
                  {t('support.tags.membership', 'Membership')}
                </Badge>
              }
              action={openCta(
                () => window.api.openPatreonPage(),
                t('support.actions.open', 'Open')
              )}
            />
            <FeatureCard
              icon={<IconBadge glyph={Coffee} />}
              title="Ko-fi"
              description={t(
                'support.donations.kofi.description',
                'A one-time tip that goes straight into development.'
              )}
              meta={
                <Badge variant="neutral">
                  {t('support.tags.tip', 'One-time tip')}
                </Badge>
              }
              action={openCta(
                () => window.api.openKofiPage(),
                t('support.actions.open', 'Open')
              )}
            />
            <FeatureCard
              icon={
                <IconBadge>
                  <FontAwesomeIcon icon={faPaypal} />
                </IconBadge>
              }
              title="PayPal"
              description={t(
                'support.donations.paypal.description',
                'One-time or recurring donation in the currency you prefer.'
              )}
              meta={
                <Badge variant="neutral">
                  {t('support.tags.donation', 'Donation')}
                </Badge>
              }
              action={openCta(
                () => openExternal(PAYPAL_URL),
                t('support.actions.open', 'Open')
              )}
            />
            <FeatureCard
              icon={
                <IconBadge>
                  <FontAwesomeIcon icon={faGithub} />
                </IconBadge>
              }
              title="GitHub Sponsors"
              description={t(
                'support.donations.github.description',
                'Sponsor Heroic through GitHub and show your support publicly.'
              )}
              meta={
                <Badge variant="neutral">
                  {t('support.tags.sponsor', 'Sponsor')}
                </Badge>
              }
              action={openCta(
                () => window.api.openGithubSponsorsPage(),
                t('support.actions.open', 'Open')
              )}
            />
          </div>
        </section>

        <section className="Support__section">
          <SectionHeader
            title={t('support.affiliates.title', 'Affiliates')}
            subtitle={t(
              'support.affiliates.description',
              'Buy through our links and Heroic earns a small commission at no extra cost to you.'
            )}
          />
          <div className="Support__grid">
            <FeatureCard
              icon={
                <IconBadge>
                  <span className="Support__storeLogo">
                    <GOGLogo />
                  </span>
                </IconBadge>
              }
              title="GOG"
              description={t(
                'support.affiliates.gog.description',
                'DRM-free games and classics.'
              )}
              meta={
                <Badge variant="neutral">
                  {t('support.tags.drmFree', 'DRM-free')}
                </Badge>
              }
              action={openCta(
                () => openExternal(GOG_URL),
                t('support.actions.shop', 'Shop')
              )}
            />
            <FeatureCard
              icon={
                <IconBadge>
                  <span className="Support__storeLogo">
                    <GMGLogo />
                  </span>
                </IconBadge>
              }
              title="Green Man Gaming"
              description={t(
                'support.affiliates.gmg.description',
                'Official game keys at great prices.'
              )}
              meta={
                <Badge variant="neutral">
                  {t('support.tags.gameKeys', 'Game keys')}
                </Badge>
              }
              action={openCta(
                () => openExternal(GMG_URL),
                t('support.actions.shop', 'Shop')
              )}
            />
            <FeatureCard
              icon={
                <IconBadge>
                  <span className="Support__storeLogo">
                    <HumbleLogo />
                  </span>
                </IconBadge>
              }
              title="Humble Bundle"
              description={t(
                'support.affiliates.humble.description',
                'Games, books and bundles for charity.'
              )}
              meta={
                <Badge variant="neutral">
                  {t('support.tags.bundles', 'Bundles')}
                </Badge>
              }
              action={openCta(
                () => openExternal(HUMBLE_URL),
                t('support.actions.shop', 'Shop')
              )}
            />
          </div>
        </section>

        <section className="Support__section">
          <SectionHeader
            title={t('support.partnerships.title', 'Partnerships & press')}
            subtitle={t(
              'support.partnerships.description',
              'For sponsorships, brand partnerships or press enquiries, get in touch.'
            )}
          />
          <div className="Support__grid">
            <FeatureCard
              icon={<IconBadge glyph={Mail} />}
              title={t('support.email.label', 'Email us')}
              description={SUPPORT_EMAIL}
              action={
                <>
                  <Button
                    variant="primary"
                    size="md"
                    fullWidth
                    icon={<Icon glyph={Mail} size="sm" />}
                    onClick={() => openExternal(`mailto:${SUPPORT_EMAIL}`)}
                  >
                    {t('support.actions.sendEmail', 'Send email')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="md"
                    title={t('support.actions.copyEmail', 'Copy email')}
                    aria-label={t('support.actions.copyEmail', 'Copy email')}
                    icon={<Icon glyph={Copy} size="sm" />}
                    onClick={copyEmail}
                  />
                </>
              }
            />
          </div>
        </section>
      </div>
    </div>
  )
})
