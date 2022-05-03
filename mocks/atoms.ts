import { atom } from "../"

export const clicks = atom({
  name: "clicks-count",
  default: 0,
})

export const nameAtom = atom({
  name: "user-name",
  default: "",
})
