import { UpdateComponentBase } from 'frontend/components/UI/UpdateComponent'
import { useTranslation } from 'react-i18next'

const Loading = function () {
  const { t } = useTranslation()
  return <UpdateComponentBase message={t('label.loading', 'Loading')} />
}

export default Loading
