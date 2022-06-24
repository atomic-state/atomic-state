import React, { useEffect } from "react"
import { useDispatch, useValue } from "../"
import { clicks } from "./atoms"

export const RenderCount = () => {
  const clicksCount = useValue(clicks)
  return <h2>count is {clicksCount}</h2>
}

export const IncreaseButton = () => {
  const setAtomValue = useDispatch(clicks)
  return (
    <div>
      <button onClick={() => setAtomValue((value) => value + 1)}>
        increase
      </button>
    </div>
  )
}
