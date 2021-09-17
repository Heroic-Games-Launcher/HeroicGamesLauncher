import React, { useState } from 'react'
import { GameCard } from '../Library/components'
import { Element } from './apiResponseType'
import { extractValidPromotions } from './utils'
import { IpcRenderer } from 'electron'
const { ipcRenderer } = window.require('electron') as {
    ipcRenderer: IpcRenderer
  }

const FreeProducts = () => {

  const [products, setProducts] = useState<Element[]>([])

  ipcRenderer.invoke('requestFreeProducts').then(response => {
    const products = response.data.Catalog.searchStore
    setProducts(extractValidPromotions(products))
  })


  return (
    <div>
      {products.map((p) => {
        return (
          <GameCard
            key={p.id}
            cover={p.keyImages.filter(img => img.type === 'OfferImageTall')[0].url}
            coverList={p.keyImages.filter(img => img.type === 'OfferImageTall')[0].url}
            logo={p.keyImages.filter(img => img.type === 'OfferImageTall')[0].url}
            title={p.title}
            appName={p.title}
            isInstalled={false}
            isGame={true}
            version='unknown'
            size='2'
            hasUpdate={false}
            buttonClick={() => console.log(p.title)}
          />
        )
      })}
    </div>
  )

}

export default FreeProducts