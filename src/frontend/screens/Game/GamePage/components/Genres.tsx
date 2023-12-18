import React from 'react'

type GenresProps = {
  genres: string[] | undefined
}

const Genres: React.FC<GenresProps> = ({ genres }) => {
  if (!genres || genres[0] === '' || genres.length === 0) {
    return null
  }

  return (
    <span className="genres">
      {genres.map((genre) => (
        <span key={genre} className="genre">
          {genre}
        </span>
      ))}
    </span>
  )
}

export default Genres
