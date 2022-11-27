import classNames from 'classnames'
import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import FormControl from 'frontend/components/UI/FormControl'
import ContextProvider from 'frontend/state/ContextProvider'
import { observer } from 'mobx-react'
import { Category } from '../../../types'

const StoreFilter: React.FC<{
  onChange: (val: Category) => void
  value?: Category
}> = ({ onChange, value }) => {
  const { gog, epic } = useContext(ContextProvider)
  const { t } = useTranslation()

  const isGOGLoggedin = gog.username
  const isEpicLoggedin = epic.username

  return (
    <div className="storeFilter">
      <FormControl segmented small>
        <ItemButton
          active={value === 'all'}
          onClick={() => onChange('all')}
          label={t('All').toUpperCase()}
        />
        {isEpicLoggedin && (
          <ItemButton
            active={value === 'legendary'}
            onClick={() => onChange('legendary')}
            label={'EPIC'}
          />
        )}
        {isGOGLoggedin && (
          <ItemButton
            active={value === 'gog'}
            onClick={() => onChange('gog')}
            label={'GOG'}
          />
        )}
        <ItemButton
          active={value === 'sideload'}
          onClick={() => onChange('sideload')}
          label={t('Other')}
        />
      </FormControl>
    </div>
  )
}

function ItemButton({
  active,
  onClick,
  label
}: {
  active?: boolean
  onClick?: () => void
  label: string
}) {
  const { t } = useTranslation()
  return (
    <button
      className={classNames('FormControl__button', {
        active
      })}
      title={`${t('header.store')}: ${t('store')}`}
      onClick={onClick}
    >
      {label}
    </button>
  )
}

export default observer(StoreFilter)
