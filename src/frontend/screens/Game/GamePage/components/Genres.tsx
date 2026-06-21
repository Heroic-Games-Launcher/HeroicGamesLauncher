import { useAwaited } from 'frontend/hooks/useAwaited'
import type { GameHandle } from 'frontend/helpers/ipc'

type Props = {
  game: GameHandle
}

function Genres({ game }: Props) {
  const genres = useAwaited(window.api.game.getGenres, game)

  if (!genres || !genres.length) {
    return null
  }

  return (
    <span className="genres">
      {genres.map((genre, i) => (
        <span key={i} className="genre">
          {genre}
        </span>
      ))}
    </span>
  )
}

export default Genres
