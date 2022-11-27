import { Search } from '@mui/icons-material'
import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import './index.css'
import { observer } from 'mobx-react'
import useDisclosure from '../../../hooks/useDisclosure'

const LibrarySearchBar: React.FC<{
  search: string
  handleSearch: (text: string) => void
}> = ({ search, handleSearch }) => {
  const listPopup = useDisclosure(!!search)

  const { t } = useTranslation()

  // const { list } = useFetchLibrarySearchBar({ term: search })
  //
  // const handleClick = (title: string) => {
  //   handleSearch(title)
  // }

  useEffect(() => {
    if (!search) {
      listPopup.close()
    }
  }, [search])

  return (
    <div className="SearchBar" data-testid="searchBar">
      <span className="searchButton" tabIndex={-1}>
        <Search />
      </span>
      <input
        value={search}
        onChange={(ev) => {
          handleSearch(ev.target.value)
          listPopup.open()
        }}
        data-testid="searchInput"
        placeholder={t('search')}
        id="search"
        className="searchBarInput"
      />
      {/*{list.length > 0 && listPopup.opened && (*/}
      {/*  <>*/}
      {/*    <ul className="auto-complete-container">*/}
      {/*      {list.length > 0 &&*/}
      {/*        list.map((title, i) => (*/}
      {/*          <li*/}
      {/*            onClick={(e) => {*/}
      {/*              handleClick(e.currentTarget.innerText)*/}
      {/*              listPopup.close()*/}
      {/*            }}*/}
      {/*            key={i}*/}
      {/*          >*/}
      {/*            {title}*/}
      {/*          </li>*/}
      {/*        ))}*/}
      {/*    </ul>*/}

      {/*    <button className="clearSearchButton" tabIndex={-1}>*/}
      {/*      <FontAwesomeIcon icon={faXmark} />*/}
      {/*    </button>*/}
      {/*  </>*/}
      {/*)}*/}
    </div>
  )
}

export default observer(LibrarySearchBar)
