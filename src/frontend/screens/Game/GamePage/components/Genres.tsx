import React from 'react'
import { Badge } from 'frontend/components/UI'

type GenresProps = {
  genres: string[]
}

const Genres: React.FC<GenresProps> = ({ genres }) => {
  if (genres[0] === '' || genres.length === 0) {
    return null
  }

  return (
    <span className="genres">
      {genres.map((genre) => (
        <Badge key={genre} variant="accent" className="genre">
          {genre}
        </Badge>
      ))}
    </span>
  )
}

export default Genres
