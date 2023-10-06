import React from "react"
import { useDispatch, useValue } from "../"
import { clicksState } from "./atoms"

export const RenderCount = () => {
  const clicksCount = useValue(clicksState)
  return <h2>count is {clicksCount}</h2>
}

export const IncreaseButton = () => {
  const setAtomValue = useDispatch(clicksState)

  return (
    <div>
      <button onClick={() => setAtomValue((value) => value + 1)}>
        increase
      </button>
    </div>
  )
}
