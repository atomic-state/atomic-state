import { Atom, atom } from "../"

export const clicks: Atom<number> = {
  name: "clicks-count",
  hydration: false,
  default: 0,
  effects: [
    async ({ state }) => {
      console.log("New state:", state)
    },
  ],
}

export const nameAtom: Atom<string> = {
  name: "user-name",
  hydration: false,
  default: "",
}
