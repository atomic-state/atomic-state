import React from 'react'
import { useDispatch, useValue } from '../'
import { clicksState, doubleClicksState, tripleClicksState } from './atoms'

export const RenderCountDouble = () => {
  const constDoubleCount = useValue(doubleClicksState)
  const tripleDoubleCount = useValue(tripleClicksState)

  return (
    <h2>
      double is {constDoubleCount}, triple is {tripleDoubleCount}
    </h2>
  )
}

export const IncreaseButton2 = () => {
  const setAtomValue = useDispatch(clicksState)

  return (
    <div>
      <button onClick={() => setAtomValue(value => value + 1)}>increase</button>
    </div>
  )
}
