import React, { useEffect } from "react"
import {  useDispatch, useFilter, filter } from "../"
import { clicks } from "./atoms"

const clicksFilter = filter<number>({
  name: "clicksFilter",
  get({ get }) {
    const count = get(clicks)
    return count * 2
  },
})

export const RenderCountDouble = () => {
  const constDoubleCount = useFilter(clicksFilter)
  return <h2>double is {constDoubleCount}</h2>
}

export const IncreaseButton2 = () => {
  const setAtomValue = useDispatch(clicks)
  useEffect(() => {
    // Reset count when mounting to prevent conflicts with other tests
    setAtomValue(0)
  }, [])
  return (
    <div>
      <button onClick={() => setAtomValue((value) => value + 1)}>
        increase
      </button>
    </div>
  )
}
