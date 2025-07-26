import UpdateComponent from 'frontend/components/UI/UpdateComponent'
import { useTranslation } from 'react-i18next'

const Loading = function () {
  const { t } = useTranslation()
  return <UpdateComponent message={t('label.loading', 'Loading')} />
}

export default Loading
