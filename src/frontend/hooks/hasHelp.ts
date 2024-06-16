import { useEffect } from 'react'
import { useShallowGlobalState } from '../state/GlobalStateV2'

export const hasHelp = (
  helpItemId: string,
  title: string,
  content: JSX.Element
) => {
  const { addHelpItem, removeHelpItem } = useShallowGlobalState(
    'addHelpItem',
    'removeHelpItem'
  )

  useEffect(() => {
    addHelpItem(helpItemId, {
      title,
      content
    })

    return () => removeHelpItem(helpItemId)
  }, [])
}
