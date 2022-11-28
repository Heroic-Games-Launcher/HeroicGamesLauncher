import { createContext } from 'react'
import { Box } from '../../state/new/common/utils'

export default createContext<Box<{ top: number; left: number }> | null>(null)
