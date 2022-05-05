import { Atom, atom } from "../"

export const clicks: Atom<number> = {
  name: "clicks-count",
  default: 0,
}

export const nameAtom: Atom<string> = {
  name: "user-name",
  default: "",
}
