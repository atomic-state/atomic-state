import { Atom, atom, filter } from "../"

export const clicks: Atom<number> = atom({
  name: "clicks-count",
  default: 0,
})

export const nameAtom: Atom<string> = {
  name: "user-name",
  default: "",
}

export const clicksFilter = filter<number>({
  name: "clicksFilter",
  default: 0,
  get({ get }) {
    const count = get(clicks)
    return count * 2
  },
})
