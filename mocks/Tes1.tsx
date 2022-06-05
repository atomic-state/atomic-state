import React, { useEffect } from "react"
import { useDispatch, useValue } from "../"
import { clicks2 } from "./atoms"

export const RenderCount = () => {
  const clicksCount = useValue(clicks2)
  return <h2>count is {clicksCount}</h2>
}

export const IncreaseButton = () => {
  const setAtomValue = useDispatch(clicks2)
  return (
    <div>
      <button onClick={() => setAtomValue((value) => value + 1)}>
        increase
      </button>
    </div>
  )
}
