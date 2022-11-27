import useGlobalStore from './useGlobalStore'
import { useMemo } from 'react'

function fixFilter(text: string) {
  const regex = new RegExp(/([?\\|*|+|(|)|[|]|])+/, 'g')
  return text.replaceAll(regex, '')
}

export default function useFetchLibrarySearchBar({ term }: { term?: string }) {
  const { libraryGames } = useGlobalStore()

  const list = useMemo(() => {
    const library = new Set(
      libraryGames
        .filter(Boolean)
        .map((g) => g.title)
        .sort()
    )
    if (!term?.trim()) {
      return [...library]
    }
    return [...library].filter((i) => new RegExp(fixFilter(term), 'i').test(i))
  }, [libraryGames, term])

  return {
    list
  }
}
