import React, { useContext } from 'react'
import ContextProvider from 'frontend/state/ContextProvider'

type GenresProps = {
  gameId: string
  genres: string[]
}

const Genres: React.FC<GenresProps> = ({ gameId, genres }) => {
  const { genresCache } = useContext(ContextProvider)

  // Use genres cache as primary source, fall back to passed genres
  const displayGenres = genresCache[gameId]?.length
    ? genresCache[gameId]
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
