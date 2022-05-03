/**  @license Atomic State
 * Copyright (c) Dany Beltran
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { EventEmitter } from "events"
import React, {
  Dispatch,
  SetStateAction,
  useEffect,
  useMemo,
  useState,
} from "react"

type AtomType<T> = {
  name: string
  default?: T | (() => Promise<T>) | (() => T)
  localStoragePersistence?: boolean
  actions?: {
    [name: string]: (st: {
      args: any
      state: T
      dispatch: Dispatch<SetStateAction<T>>
    }) => any
  }
}

type ActionsObjectType = { [name: string]: (args?: any) => any }

const atomEmitters: {
  [key: string]: {
    emitter: EventEmitter
    notify: (storeName: string, hookCall: string, payload?: {}) => void
  }
} = {}

function createEmitter() {
  const emitter = new EventEmitter()
  emitter.setMaxListeners(10e12)
  function notify(storeName: string, hookCall: string, payload = {}) {
    emitter.emit(storeName, { hookCall, payload })
  }
  return {
    emitter,
    notify,
  }
}

const defaultAtomsValues: any = {}
const pendingAtoms: any = {}

export const AtomicState: React.FC<{
  children: any
  /**
   * Set default values using an atom's key
   */
  atoms?: {
    [key: string]: any
  }
  /**
   * Set default filters' values using filter key
   */
  filters?: {
    [key: string]: any
  }
}> = ({ children, atoms, filters }) => {
  if (atoms) {
    for (let atomKey in atoms) {
      defaultAtomsValues[atomKey] = atoms[atomKey]
    }
  }
  if (filters) {
    for (let filterKey in filters) {
      defaultFiltersValues[filterKey] = filters[filterKey]
    }
  }
  return children
}

function useAtomCreate<R>(init: AtomType<R>) {
  const hookCall = useMemo(() => `${Math.random()}`.split(".")[1], [])

  const isNumber = typeof init.default === "number"

  const initialValue = (function getInitialValue() {
    const isFunction = typeof init.default === "function"
    const initVal =
      init.default || isNumber ? init.default : defaultAtomsValues[init.name]
    try {
      return init.localStoragePersistence
        ? typeof localStorage !== "undefined"
          ? typeof localStorage[`store-${init.name}`] !== "undefined"
            ? JSON.parse(localStorage[`store-${init.name}`])
            : isFunction
            ? undefined
            : initVal
          : isFunction
          ? undefined
          : initVal
        : isFunction
        ? undefined
        : initVal
    } catch (err) {
      return initVal
    }
  })()

  const [state, setState] = useState<R>(
    initialValue instanceof Promise ? undefined : initialValue
  )

  if (!pendingAtoms[init.name]) {
    pendingAtoms[init.name] = 0
  }

  useEffect(() => {
    async function getPromiseInitialValue() {
      if (typeof init.default === "function") {
        if (pendingAtoms[init.name] === 0) {
          pendingAtoms[init.name] += 1
          let v = init.default
            ? (async () =>
                typeof init.default === "function"
                  ? (init.default as () => Promise<R>)()
                  : init.default)()
            : undefined
          if (v) {
            v.then((val) => {
              defaultAtomsValues[init.name] = val
              setState(val as R)
            })
          }
        } else {
          pendingAtoms[init.name] += 1
          if (state || defaultAtomsValues[init.name]) {
            atomEmitters[init.name].notify(
              init.name,
              hookCall,
              state || defaultAtomsValues[init.name]
            )
          }
        }
      }
    }
    getPromiseInitialValue()
  }, [state, init.default, init.name, hookCall])

  useEffect(() => {
    return () => {
      pendingAtoms[init.name] = 0
    }
  }, [])

  if (!atomEmitters[init.name]) {
    atomEmitters[init.name] = createEmitter()
  }

  const { emitter, notify } = atomEmitters[init.name]

  useEffect(() => {
    const handler = async (e: any) => {
      if (e.hookCall !== hookCall) {
        setState(e.payload)
      }
    }

    emitter.addListener(init.name, handler)

    return () => {
      emitter.removeListener(init.name, handler)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const updateState: Dispatch<SetStateAction<R>> = (v) => {
    setState((previous) => {
      // First notify other subscribers
      const newValue = typeof v === "function" ? (v as any)(previous) : v
      notify(init.name, hookCall, newValue)
      // Finally update state
      return newValue
    })
  }

  useEffect(() => {
    if (typeof localStorage !== "undefined") {
      if (init.localStoragePersistence) {
        localStorage[`store-${init.name}`] = JSON.stringify(state)
      } else {
        if (typeof localStorage[`store-${init.name}`] !== "undefined") {
          localStorage.removeItem(`store-${init.name}`)
        }
      }
    }
  }, [init.name, init.localStoragePersistence, state])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const actions = useMemo(() => init.actions || {}, [])
  const __actions = useMemo(
    () =>
      Object.fromEntries(
        Object.keys(actions).map((key) => [
          key,
          (args?: any) =>
            actions[key]({
              args,
              state,
              dispatch: updateState as Dispatch<SetStateAction<R>>,
            }),
        ])
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state]
  )

  return [state, updateState, __actions as ActionsObjectType]
}

/**
 * Creates an atom containing state
 */
export function atom<R>(init: AtomType<R>) {
  const useCreate = () => useAtomCreate<R>(init)
  useCreate["atom-name"] = init.name
  return useCreate
}
export const createAtom = atom

type useAtomType<R> = () => (
  | R
  | Dispatch<SetStateAction<R>>
  | ActionsObjectType
)[]

type filterCreateType<T> = {
  name?: string
  get(c: { get<R>(atom: useAtomType<R>): R }): T
}

const defaultFiltersValues: any = {}

export function filter<R>({ name, get: get }: filterCreateType<R>) {
  const useFilterGet = () => get({ get: useValue })
  useFilterGet["filter-name"] = name
  return useFilterGet
}

export function useFilter<T>(f: () => T) {
  return f() || (defaultFiltersValues[(f as any)["filter-name"]] as T)
}

/**
 * Get an atom's value and state setter
 */
export function useAtom<R>(atom: useAtomType<R>) {
  return atom() as [R, (cb: ((c: R) => R) | R) => void, ActionsObjectType]
}

/**
 * Get an atom's value
 */
export function useValue<R>(atom: useAtomType<R>) {
  return atom()[0] as R
}
export const useAtomValue = useValue

/**
 * Get the function that updates the atom's value
 */
export function useDispatch<R>(atom: useAtomType<R>) {
  return atom()[1] as (cb: ((c: R) => R) | R) => void
}
export const useAtomDispatch = useDispatch

/**
 * Get the actions of the atom as reducers
 */
export function useActions<R>(atom: useAtomType<R>) {
  return atom()[2] as ActionsObjectType
}
export const useAtomActions = useActions

// Selectors section

// localStorage utilities for web apps

const storageEmitter = (() => {
  const emm = new EventEmitter()
  emm.setMaxListeners(10 ** 10)
  return emm
})()

export function useStorage(): {
  [key: string]: any
} {
  const [keys, setKeys] = useState({})

  async function updateStore() {
    let $keys: {
      [key: string]: any
    } = {}

    if (typeof localStorage !== "undefined") {
      for (let k in localStorage) {
        if (!k.match(/clear|getItem|key|length|removeItem|setItem/)) {
          try {
            $keys[k] = JSON.parse(localStorage[k])
          } catch (err) {
            $keys[k] = localStorage[k]
          }
        }
      }
    }
    setKeys($keys)
  }

  useEffect(() => {
    updateStore()
  }, [])

  useEffect(() => {
    storageEmitter.addListener("store-changed", updateStore)
    return () => {
      storageEmitter.removeListener("store-changes", updateStore)
    }
  }, [])
  return keys
}

export const storage = {
  async set(k: string, v: any) {
    if (typeof localStorage !== "undefined") {
      localStorage[k] = JSON.stringify(v)
      storageEmitter.emit("store-changed", v)
    }
  },
  async remove(k: string) {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(k)
      storageEmitter.emit("store-changed", {})
    }
  },
  get(k: string) {
    if (typeof localStorage !== "undefined") {
      try {
        return JSON.parse(localStorage[k])
      } catch (err) {
        return ""
      }
    }
  },
}
