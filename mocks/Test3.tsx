import React from "react"
import { atom, useDispatch, useFilter, filter } from "../"

const clicks = atom({
  name: "clicks-count",
  default: 0,
})

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
  return (
    <div>
      <button onClick={() => setAtomValue((value) => value + 1)}>
        increase
      </button>
    </div>
  )
}
