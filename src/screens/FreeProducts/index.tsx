import './index.css'

import React, { useState, useEffect } from 'react'
import { Header } from 'src/components/UI'
import { generateLink } from './utils/utils'
import { createNewWindow } from 'src/helpers'
import { useTranslation } from 'react-i18next'
import { IpcRenderer } from 'electron'
import { FreeGameElement } from 'src/types'
const { ipcRenderer } = window.require('electron') as {
    ipcRenderer: IpcRenderer
}

const FreeProducts = () => {
  const { t, i18n } = useTranslation()
  let lang = i18n.language
  if (i18n.language === 'pt') {
    lang = 'pt-BR'
  }
  const [products, setProducts] = useState<FreeGameElement[]>([])

  const fetchProducts = async () => {
    const response = await ipcRenderer.invoke('requestFreeProducts')
    setProducts(response)
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  return (
    <>
      <Header goTo={'/'} renderBackButton title={t('freeproducts.title', 'Free This Week')} />
      <div className="freeProductsContainer">
        {products.map((p) => {
          return (<>
            <div
              key={`display-${p.id}-image`}
              className='freeProductItem'
              data-testid='test-free-product-image'
            >
              <a
                onClick={() => createNewWindow(generateLink(p, lang))}
                data-testid='test-free-product-link'
              >
                <img
                  src={p.keyImages.filter(i => i.type === 'DieselStoreFrontWide')[0].url}
                  style={{
                    backgroundSize: '100% 100%',
                    backgroundRepeat: 'no-repeat'
                  }}
                  className='productImg' />
              </a>
            </div>
            <div
              key={`text-${p.id}-title`}
            >
              <h3 data-testid='test-free-product-title'>{p.title}</h3>
              <p className="description">{p.description}</p>
            </div>
          </>
          )
        })}
      </div>
    </>
  )

}

export default FreeProducts