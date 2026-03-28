import React, { useContext } from 'react'
import ContextProvider from 'frontend/state/ContextProvider'

type GenresProps = {
  gameId: string
  genres: string[]
}

const Genres: React.FC<GenresProps> = ({ gameId, genres }) => {
  const { autoCategoriesCache } = useContext(ContextProvider)

  // Use auto-categories cache as primary source, fall back to passed genres
  const displayGenres = autoCategoriesCache[gameId]?.length
    ? autoCategoriesCache[gameId]
    : genres

  if (!displayGenres || displayGenres.length === 0 || displayGenres[0] === '') {
    return null
  }

  return (
    <span className="genres">
      {displayGenres.map((genre) => (
        <span key={genre} className="genre">
          {genre}
        </span>
      ))}
    </span>
  )
}

export default Genres
