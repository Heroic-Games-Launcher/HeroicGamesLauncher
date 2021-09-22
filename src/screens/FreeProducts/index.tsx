import './index.css'

import React, { useState, useEffect } from 'react'
import { Header } from 'src/components/UI'
import { Element } from './utils/apiResponseType'
import { extractValidPromotions, generateLink } from './utils/utils'
import { createNewWindow } from 'src/helpers'
import { useTranslation } from 'react-i18next'
import { IpcRenderer } from 'electron'
const { ipcRenderer } = window.require('electron') as {
    ipcRenderer: IpcRenderer
}

const FreeProducts = () => {
  const { t, i18n } = useTranslation()
  let lang = i18n.language
  if (i18n.language === 'pt') {
    lang = 'pt-BR'
  }
  const [products, setProducts] = useState<Element[]>([])

  const fetchProducts = async () => {
    const response = await ipcRenderer.invoke('requestFreeProducts')
    const products = response.data.Catalog.searchStore
    const validProducts = extractValidPromotions(products)
    setProducts(validProducts)
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  return (
    <>
      <Header goTo={'/'} renderBackButton title={t('freeproducts.title', 'Free This Week')} />
      <div className="freeProductsContainer">
        {products.map((p) => {
          return (
            <div
              key={`display-${p.id}`}
              className='freeProductItem'
              data-testid='test-free-product-image'
            >
              <a
                onClick={() => createNewWindow(generateLink(p, lang))}
                data-testid='test-free-product-link'
              >
                <span
                  style={{
                    backgroundImage:
                    `url('${p.keyImages.filter(i => i.type === 'DieselStoreFrontWide')[0].url}')`,
                    backgroundSize: '100% 100%',
                    backgroundRepeat: 'no-repeat'
                  }}
                  className='productImg'>
                </span>
              </a>
            </div>
          )
        })}
        {products.map((p) => {
          return (
            <div
              key={`text-${p.id}`}
              data-testid='test-free-product-title'
            >
              <p>{p.title}</p>
            </div>
          )
        })}
      </div>
    </>
  )

}

export default FreeProducts