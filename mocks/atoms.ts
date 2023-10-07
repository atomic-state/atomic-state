import { atom } from '../'

export const clicksState = atom({
  key: 'clicks-count',
  default: 0
})

export const nameState = atom({
  key: 'user-name',
  default: ''
})

export const doubleClicksState = atom({
  key: 'clicksFilter',
  default: 0,
  get({ get }) {
    const count = get(clicksState)
    return count * 2
  }
})

export const tripleClicksState = atom({
  key: 'tripleCliksFilter',
  get({ get }) {
    const double = get(doubleClicksState)
    return double * 3
  }
})
