'use client'
import { AtomicState as AtomicStateSync } from '../mod'

import { AtomicStateAsync } from './AtomicStateAsync'

const AtomicState =
  typeof window === 'undefined' ? AtomicStateAsync : AtomicStateSync

export { AtomicState }
