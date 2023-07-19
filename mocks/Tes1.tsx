import React, { useEffect } from "react"
import { createStore, useDispatch, useValue } from "../"
import { clicks } from "./atoms"

export const RenderCount = () => {
  const clicksCount = useValue(clicks)
  return <h2>count is {clicksCount}</h2>
}

const useUser = createStore({
  name: "userState",
  default: {
    name: "Dany",
  },
})

export const IncreaseButton = () => {
  const setAtomValue = useDispatch(clicks)

  const [user, actions] = useUser()

  return (
    <div>
      <p
        onClick={() => {
          actions.setPartialvalue({
            name: "dnaiel",
          })
        }}
      >
        {user.name}
      </p>
      <button onClick={() => setAtomValue((value) => value + 1)}>
        increase
      </button>
    </div>
  )
}
