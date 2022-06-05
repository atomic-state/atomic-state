import { Atom, atom } from "../"

export const clicks: Atom<number> = {
  name: "clicks-count",
  default: 0,
  effects: [
    async ({ state }) => {
      console.log("New state:", state)
    },
  ],
}
export const clicks2: Atom<number> = {
  name: "clicks-count-2",
  default: 0,
  effects: [
    async ({ state }) => {
      console.log("New state:", state)
    },
  ],
}

export const nameAtom: Atom<string> = {
  name: "user-name",
  default: "",
}
