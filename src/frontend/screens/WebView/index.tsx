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


  const ref = useRef<HTMLDivElement>(null)

  const browserview = new api.RemoteBrowserView(identifier, { initialURL })
  useEffect(() => setLoading({ refresh: browserview.isLoading, message: loading.message }), [browserview.isLoading])
  if (ref.current) {
    const { x, y, width, height } = ref.current.getBoundingClientRect()
    browserview.bounds = { x, y, width, height }
    api.setMainBrowserView(identifier, { initialURL })
  }
  return <div ref={ref} />
}
