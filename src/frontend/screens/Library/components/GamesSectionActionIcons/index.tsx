import {
  faArrowDownAZ,
  faArrowDownZA,
  faBorderAll,
  faHardDrive as hardDriveSolid,
  faList,
  faSyncAlt
} from '@fortawesome/free-solid-svg-icons'
import { faHardDrive as hardDriveLight } from '@fortawesome/free-regular-svg-icons'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import React from 'react'
import { useTranslation } from 'react-i18next'
import FormControl from '../../../../components/UI/FormControl'
import './index.css'
import { Visibility, VisibilityOff } from '@mui/icons-material'
import classNames from 'classnames'
import { observer } from 'mobx-react'
import { Box } from '../../../../state/new/utils'
import { SortGame } from '../../../../state/new/common'

type Layout = 'grid' | 'list'

interface Props {
  sortBox: Box<SortGame>
  showHiddenBox: Box<boolean>
  layoutBox: Box<Layout>
  refresh: () => void
  refreshing: boolean
}

const ActionIcons = ({
  sortBox,
  layoutBox,
  refresh,
  refreshing,
  showHiddenBox
}: Props) => {
  const { t } = useTranslation()

  const showHiddenTitle = showHiddenBox.get()
    ? t('header.ignore_hidden', 'Ignore Hidden')
    : t('header.show_hidden', 'Show Hidden')

  return (
    <div className="ActionIcons">
      <FormControl segmented small>
        {layoutBox.get() === 'grid' ? (
          <button
            className={classNames('FormControl__button', {
              active: layoutBox.get() === 'grid'
            })}
            title={t('library.toggleLayout.list', 'Toggle to a list layout')}
            onClick={() => layoutBox.set('list')}
          >
            <FontAwesomeIcon
              className="FormControl__segmentedFaIcon"
              icon={faList}
            />
          </button>
        ) : (
          <button
            className={classNames('FormControl__button')}
            title={t('library.toggleLayout.grid', 'Toggle to a grid layout')}
            onClick={() => layoutBox.set('grid')}
          >
            <FontAwesomeIcon
              className="FormControl__segmentedFaIcon"
              icon={faBorderAll}
            />
          </button>
        )}
        <button
          className={classNames('FormControl__button', {
            active: sortBox.is('ascending', 'descending')
          })}
          title={
            sortBox.is('descending')
              ? t('library.sortDescending', 'Sort Descending')
              : t('library.sortAscending', 'Sort Ascending')
          }
          onClick={() => sortBox.setIf('descending', 'ascending', 'descending')}
        >
          <FontAwesomeIcon
            className="FormControl__segmentedFaIcon"
            icon={sortBox.is('descending') ? faArrowDownZA : faArrowDownAZ}
          />
        </button>
        <button
          className={classNames('FormControl__button', {
            active: sortBox.is('installed', 'not-installed')
          })}
          title={t('library.sortByStatus', 'Sort by Status')}
          onClick={() =>
            sortBox.setIf('installed', 'not-installed', 'installed')
          }
        >
          <FontAwesomeIcon
            className="FormControl__segmentedFaIcon"
            icon={sortBox.is('installed') ? hardDriveSolid : hardDriveLight}
          />
        </button>
        {/*<button*/}
        {/*  className={classNames('FormControl__button', {*/}
        {/*    active: showFavourites*/}
        {/*  })}*/}
        {/*  title={showFavouritesTitle}*/}
        {/*  onClick={toggleShowFavourites}*/}
        {/*>*/}
        {/*  <FontAwesomeIcon*/}
        {/*    className="FormControl__segmentedFaIcon"*/}
        {/*    icon={faHeart}*/}
        {/*  />*/}
        {/*</button>*/}
        <button
          className={classNames('FormControl__button', {
            active: showHiddenBox.get()
          })}
          title={showHiddenTitle}
          onClick={() => showHiddenBox.setIf(true, false, true)}
        >
          {showHiddenBox.get() ? <Visibility /> : <VisibilityOff />}
        </button>
        <button
          className={classNames('FormControl__button', {
            active: refreshing
          })}
          title={t('generic.library.refresh', 'Refresh Library')}
          onClick={() => refresh()}
        >
          <FontAwesomeIcon
            className={classNames('FormControl__segmentedFaIcon', {
              ['fa-spin']: refreshing
            })}
            icon={faSyncAlt}
          />
        </button>
      </FormControl>
    </div>
  )
}

export default observer(ActionIcons)
