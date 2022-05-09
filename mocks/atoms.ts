import { Atom, atom } from "../"

export const clicks: Atom<number> = {
  name: "clicks-count",
  hydration: false,
  default: 0,
}

export const nameAtom: Atom<string> = {
  name: "user-name",
  hydration: false,
  default: "",
}
