import React, {
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState
} from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useLocation, useParams } from 'react-router'

import { UpdateComponent } from 'frontend/components/UI'
import WebviewControls from 'frontend/components/UI/WebviewControls'
import ContextProvider from 'frontend/state/ContextProvider'
import { Runner } from 'common/types'
import {
  IBrowserView,
  IBrowserViewIdentifier,
  IBrowserViewOptions
} from 'common/types/browserview'
import './index.css'
import LoginWarning from '../Login/components/LoginWarning'
import api from 'backend/api'

export default function WebView({
  identifier,
  initialURL
}: {
  identifier: IBrowserViewIdentifier
  initialURL: string
}) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState<{
    refresh: boolean
    message: string
  }>(() => ({
    refresh: true,
    message: t('loading.website', 'Loading Website')
  }))

  api.setMainBrowserView(identifier, { initialURL })

  return <div></div>
}
