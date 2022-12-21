/**  @license Atomic State
 * Copyright (c) Dany Beltran
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * An observable class that uses the observer pattern
 */
;(() => {
  const {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
  } = React
  class Observable {
    constructor() {
      this.suscribers = {}
    }
    async addListener(messageName, subscriber) {
      if (!(messageName in this.suscribers)) {
        this.suscribers[messageName] = {}
      }
      let subscriberId = Object.keys(this.suscribers[messageName]).length + 1
      if (messageName !== "__proto__" && messageName !== "prototype") {
        this.suscribers[messageName][subscriberId] = subscriber
      } else {
        console.warn('"prototype" and "__proto__" are not valid message names')
      }
    }
    async removeListener(messageName, subscriber) {
      for (let observer in this.suscribers[messageName]) {
        if (this.suscribers[messageName][observer] === subscriber) {
          delete this.suscribers[messageName][observer]
        }
      }
    }
    emit(messageName, payload) {
      for (let subscribers in this.suscribers[messageName]) {
        this.suscribers[messageName][subscribers](payload)
      }
    }
  }
  function createObserver() {
    const observer = new Observable()
    function notify(storeName, hookCall, payload) {
      observer.emit(storeName, { storeName, hookCall, payload })
    }
    return {
      observer: observer,
      notify,
    }
  }
  const atomObservables = {}
  const defaultAtomsValues = {}
  const atomsInitializeObjects = {}
  const filtersInitializeObjects = {}
  const defaultAtomsInAtomic = {}
  const defaultFiltersInAtomic = {}
  const usedKeys = {}
  const defaultFiltersValues = {}
  const atomsEffectsCleanupFunctons = {}
  const pendingAtoms = {}
  const atomicStateContext = createContext({
    prefix: "store",
  })
  function AtomInitialize({ atm }) {
    useAtom(atm)
    return null
  }
  function FilterInitialize({ filt }) {
    useFilter(filt)
    return null
  }
  function _isDefined(target) {
    return typeof target !== "undefined"
  }
  function _isFunction(target) {
    return typeof target === "function"
  }
  function _isPromise(target) {
    return target instanceof Promise
  }
  function jsonEquality(target1, target2) {
    return JSON.stringify(target1) === JSON.stringify(target2)
  }
  let loadedStores = {}
  const AtomicState = ({ children, atoms, filters, prefix = "store" }) => {
    const atomicContext = useContext(atomicStateContext)
    let atomicPrefix = !_isDefined(prefix) ? atomicContext.prefix : prefix
    if (atoms) {
      for (let atomKey in atoms) {
        const defaultsKey = `${atomicPrefix}-${atomKey}`
        if (!_isDefined(defaultAtomsValues[defaultsKey])) {
          defaultAtomsValues[defaultsKey] = atoms[atomKey]
          defaultAtomsInAtomic[defaultsKey] = true
        }
      }
    }
    if (filters) {
      for (let filterKey in filters) {
        const defaultsKey = `${atomicPrefix}-${filterKey}`
        if (!_isDefined(defaultFiltersValues[defaultsKey])) {
          defaultFiltersValues[defaultsKey] = filters[filterKey]
          defaultFiltersInAtomic[defaultsKey] = true
        }
      }
    }
    const createdAtoms = Object.values(atomsInitializeObjects)
    const initialized = useMemo(
      () =>
        createdAtoms.map((atm) => {
          return React.createElement(
            React.StrictMode,
            {
              key:
                (atm === null || atm === void 0 ? void 0 : atm.name) + prefix,
            },
            React.createElement(AtomInitialize, { atm: atm })
          )
        }),
      []
    )
    const createdFilters = Object.values(filtersInitializeObjects)
    const initializedFilters = useMemo(
      () =>
        createdFilters.map((flt) => {
          return React.createElement(
            React.StrictMode,
            {
              key:
                (flt === null || flt === void 0 ? void 0 : flt.name) + prefix,
            },
            React.createElement(FilterInitialize, { filt: flt })
          )
        }),
      []
    )
    return React.createElement(
      React.StrictMode,
      null,
      React.createElement(
        atomicStateContext.Provider,
        {
          value: {
            prefix: atomicPrefix,
          },
        },
        React.createElement(
          React.Fragment,
          null,
          initialized,
          initializedFilters
        ),
        children
      )
    )
  }
  const resolvedAtoms = {}
  const persistenceLoaded = {}
  /**
   * Take a snapshot of all atoms' and filters' values.
   * You can pass a string with the `prefix` you used in the `AtomicState` root component
   * if you want only atoms and filters using that prefix.
   */
  function takeSnapshot(storeName) {
    let stores = {}
    for (let atomKey in defaultAtomsValues) {
      const [prefixName, atomName] = atomKey.split("-")
      if (!_isDefined(stores[prefixName])) {
        stores[prefixName] = {
          filters: {},
          atoms: {},
        }
      }
      stores[prefixName].atoms[atomName] = defaultAtomsValues[atomKey]
    }
    for (let filterKey in defaultFiltersValues) {
      const [prefixName, filterName] = filterKey.split("-")
      if (!_isDefined(stores[prefixName])) {
        stores[prefixName] = {
          filters: {},
          atoms: {},
        }
      }
      stores[prefixName].filters[filterName] = defaultFiltersValues[filterKey]
    }
    return !_isDefined(storeName) ? stores : stores[storeName] || {}
  }
  /**
   * Get the current value of an atom. You can pass a specific prefix as the second argument.
   */
  function getAtomValue(atomName, prefix = "store") {
    const $atomKey = [prefix, atomName].join("-")
    return defaultAtomsValues[$atomKey]
  }
  /**
   * Get the current value of a filter. You can pass a specific prefix as the second argument.
   */
  function getFilterValue(filterName, prefix = "store") {
    const $filterKey = [prefix, filterName].join("-")
    return defaultFiltersValues[$filterKey]
  }
  function useAtomCreate(init) {
    const {
      effects = [],
      persist,
      localStoragePersistence,
      sync = true,
      onSync = () => {},
    } = init
    const { prefix } = useContext(atomicStateContext)
    const $atomKey = prefix + "-" + init.name
    const [isLSReady, setIsLSReady] = useState(false)
    const persistence = localStoragePersistence || persist
    const hookCall = useMemo(() => `${Math.random()}`.split(".")[1], [])
    if (!($atomKey in atomsEffectsCleanupFunctons)) {
      atomsEffectsCleanupFunctons[$atomKey] = []
    }
    const isDefined = _isDefined(init.default)
    const initialValue = (function getInitialValue() {
      const isFunction =
        !_isDefined(defaultAtomsValues[$atomKey]) && _isFunction(init.default)
      const initialIfFnOrPromise = isFunction
        ? init.default()
        : _isPromise(init.default)
        ? init.default
        : undefined
      const isPromiseValue = _isPromise(initialIfFnOrPromise)
      let initVal = isDefined
        ? !_isDefined(defaultAtomsValues[$atomKey])
          ? !isPromiseValue
            ? _isDefined(initialIfFnOrPromise)
              ? initialIfFnOrPromise
              : init.default
            : init.default
          : defaultAtomsValues[$atomKey]
        : defaultAtomsValues[$atomKey]
      try {
        if (persistence) {
          if (typeof localStorage !== "undefined") {
            if (
              !_isDefined(defaultAtomsValues[$atomKey]) ||
              defaultAtomsInAtomic[$atomKey]
            ) {
              defaultAtomsInAtomic[$atomKey] = false
              defaultAtomsValues[$atomKey] = isPromiseValue
                ? undefined
                : initVal
            }
          }
        } else {
          if (!_isDefined(defaultAtomsValues[$atomKey])) {
            defaultAtomsValues[$atomKey] = initVal
          }
        }
        return initVal
      } catch (err) {
        return initVal
      }
    })()
    const [vIfPersistence, setVIfPersistence] = useState(() => {
      if (persist) {
        try {
          return (async () => {
            const storageItem =
              typeof localStorage === "undefined"
                ? init.default
                : await localStorage.getItem($atomKey)
            return typeof localStorage === "undefined"
              ? init.default
              : JSON.parse(storageItem) || init.default
          })()
        } catch (err) {
          return initialValue
        }
      } else return undefined
    })
    const [state, setState] = useState(
      (_isPromise(initialValue) || _isFunction(initialValue)) &&
        !_isDefined(defaultAtomsValues[$atomKey])
        ? undefined
        : (() => {
            defaultAtomsValues[$atomKey] = initialValue
            return initialValue
          })()
    )
    if (!pendingAtoms[$atomKey]) {
      pendingAtoms[$atomKey] = 0
    }
    if (!atomObservables[$atomKey]) {
      atomObservables[$atomKey] = createObserver()
    }
    const { observer, notify } = atomObservables[$atomKey]
    const [runEffects, setRunEffects] = useState(false)
    const hydrated = useRef(false)
    const updateState = useCallback(
      (v) => {
        let willCancel = false
        let newValue
        let hasChanded
        function cancelUpdate() {
          willCancel = true
        }
        newValue = _isFunction(v) ? v(defaultAtomsValues[$atomKey]) : v
        hasChanded = (() => {
          try {
            return !jsonEquality(newValue, defaultAtomsValues[$atomKey])
          } catch (err) {
            return false
          }
        })()
        const notifyIfValueIsDefault = (() => {
          try {
            if (_isFunction(defaultAtomsValues[$atomKey])) {
              return true
            }
            if (
              jsonEquality(newValue, init.default) &&
              !resolvedAtoms[$atomKey]
            ) {
              resolvedAtoms[$atomKey] = true
              return true
            } else {
              return false
            }
          } catch (err) {
            return true
          }
        })()
        const shouldNotifyOtherSubscribers =
          _isFunction(defaultAtomsValues[$atomKey]) ||
          hasChanded ||
          notifyIfValueIsDefault
        // We first run every cleanup functions returned in atom effects
        try {
          for (let cleanupFunction of atomsEffectsCleanupFunctons[$atomKey]) {
            cleanupFunction()
          }
        } catch (err) {
        } finally {
          // We reset all atom cleanup functions
          atomsEffectsCleanupFunctons[$atomKey] = []
          try {
            for (let effect of effects) {
              const cancelStateUpdate = effect({
                previous: state,
                state: newValue,
                dispatch: updateState,
                cancel: cancelUpdate,
              })
              if (_isPromise(cancelStateUpdate)) {
                cancelStateUpdate.then((r) => {
                  if (_isDefined(r) && !r) {
                    willCancel = true
                  } else {
                    if (_isFunction(r)) {
                      atomsEffectsCleanupFunctons[$atomKey].push(r)
                    }
                  }
                })
              } else if (_isDefined(cancelStateUpdate) && !cancelStateUpdate) {
                willCancel = true
              } else {
                if (_isFunction(cancelStateUpdate)) {
                  atomsEffectsCleanupFunctons[$atomKey].push(cancelStateUpdate)
                }
              }
            }
          } catch (err) {
            setRunEffects(true)
          } finally {
            if (!willCancel) {
              defaultAtomsValues[$atomKey] = newValue
              if (persistence) {
                localStorage.setItem($atomKey, JSON.stringify(newValue))
              }
              try {
                if (shouldNotifyOtherSubscribers) {
                  notify($atomKey, hookCall, newValue)
                }
              } finally {
                // Finally update state
                setState(newValue)
              }
            }
          }
        }
      },
      [
        hookCall,
        notify,
        runEffects,
        $atomKey,
        persistence,
        hydrated,
        state,
        init.name,
      ]
    )
    useEffect(() => {
      async function storageListener() {
        if (typeof localStorage !== "undefined") {
          if (_isDefined(localStorage[$atomKey])) {
            try {
              /**
               * We compare our atom saved in the storage with the current
               * atom value and only update our state if they are different
               *
               **/
              if (
                !jsonEquality(
                  localStorage[$atomKey],
                  defaultAtomsValues[$atomKey]
                )
              ) {
                const newState = JSON.parse(localStorage[$atomKey])
                updateState(newState)
                await onSync(newState)
              }
            } catch (err) {}
          }
        }
      }
      if (persistence) {
        if (typeof window !== "undefined") {
          const canListen = _isDefined(window.addEventListener)
          if (canListen) {
            if (sync) {
              window.addEventListener("storage", storageListener)
              return () => {
                window.removeEventListener("storage", storageListener)
              }
            }
          }
        }
      }
      return () => {}
    }, [init.name])
    useEffect(() => {
      async function loadPersistence() {
        persistenceLoaded[$atomKey] = true
        if (_isDefined(vIfPersistence)) {
          if (!hydrated.current) {
            const tm1 = setTimeout(async () => {
              if (persistence) {
                const storageItem = await vIfPersistence
                if (!jsonEquality(storageItem, defaultAtomsValues[$atomKey])) {
                  if (!_isDefined(resolvedAtoms[$atomKey])) {
                    updateState(storageItem)
                  }
                }
                setIsLSReady(true)
              }
            }, 0)
            const tm2 = setTimeout(() => {
              setVIfPersistence(undefined)
              hydrated.current = true
            }, 0)
            return () => {
              clearTimeout(tm1)
              clearTimeout(tm2)
            }
          }
        }
        return () => {}
      }
      if (!persistenceLoaded[$atomKey]) {
        loadPersistence()
      }
    }, [vIfPersistence, updateState, hydrated, $atomKey])
    useEffect(() => {
      async function getPromiseInitialValue() {
        var _a
        // Only resolve promise if default or resolved value are not present
        if (!_isDefined(defaultAtomsValues[$atomKey])) {
          if (_isFunction(init.default)) {
            if (pendingAtoms[$atomKey] === 0) {
              pendingAtoms[$atomKey] += 1
              let v = _isDefined(init.default)
                ? (async () =>
                    _isFunction(init.default) ? init.default() : init.default)()
                : undefined
              if (_isDefined(v)) {
                v.then((val) => {
                  defaultAtomsValues[$atomKey] = val
                  notify($atomKey, hookCall, defaultAtomsValues[$atomKey])
                  updateState(val)
                })
              }
            } else {
              pendingAtoms[$atomKey] += 1
              if (state || defaultAtomsValues[$atomKey]) {
                ;(_a = atomObservables[$atomKey]) === null || _a === void 0
                  ? void 0
                  : _a.notify(
                      $atomKey,
                      hookCall,
                      _isDefined(state) ? state : defaultAtomsValues[$atomKey]
                    )
              }
            }
          }
        }
      }
      getPromiseInitialValue()
    }, [state, init.default, updateState, init.name, hookCall])
    useEffect(() => {
      return () => {
        pendingAtoms[$atomKey] = 0
      }
    }, [init.name])
    useEffect(() => {
      const handler = async (e) => {
        if (e.hookCall !== hookCall) {
          setState(e.payload)
        }
      }
      observer.addListener($atomKey, handler)
      return () => {
        observer.removeListener($atomKey, handler)
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [runEffects])
    useEffect(() => {
      async function updateStorage() {
        if (typeof localStorage !== "undefined") {
          const storageItem = await localStorage.getItem($atomKey)
          if (_isDefined(storageItem) || storageItem === null) {
            // Only remove from localStorage if persistence is false
            if (!persistence) {
              localStorage.removeItem($atomKey)
            } else {
              localStorage.setItem($atomKey, JSON.stringify(state))
            }
          }
        }
      }
      updateStorage()
    }, [init.name, persistence, state])
    const atomGet = useCallback(
      function ($atom) {
        const $key = [prefix, $atom["atom-name"]].join("-")
        const $atomValue = defaultAtomsValues[$key]
        return $atomValue
      },
      [prefix]
    )
    const filterRead = useCallback(
      function ($filter) {
        const $key = [prefix, $filter["filter-name"]].join("-")
        const $filterValue = defaultFiltersValues[$key]
        return $filterValue
      },
      [prefix]
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const actions = useMemo(() => init.actions || {}, [init.actions])
    const __actions = useMemo(
      () =>
        Object.fromEntries(
          Object.keys(actions).map((key) => [
            key,
            (args) =>
              actions[key]({
                args,
                state,
                dispatch: updateState,
                get: atomGet,
                read: filterRead,
              }),
          ])
        ),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [state]
    )
    return [state, updateState, __actions]
  }
  const ignoredAtomKeyWarnings = {}
  /**
   * Creates an atom containing state
   */
  function atom(init) {
    if (init.ignoreKeyWarning) {
      ignoredAtomKeyWarnings[init.name] = true
    }
    usedKeys[init.name] = true
    if (
      !atomsInitializeObjects[
        init === null || init === void 0 ? void 0 : init.name
      ]
    ) {
      atomsInitializeObjects[
        init === null || init === void 0 ? void 0 : init.name
      ] = init
    }
    const useCreate = () => useAtomCreate(init)
    useCreate["atom-name"] = init.name
    useCreate["init-object"] = init
    return useCreate
  }
  const createAtom = atom
  const objectFilters = {}
  const resolvedFilters = {}
  const filterObservables = {}
  const subscribedFilters = {}
  function filter(init) {
    const { name = "", get } = init
    if (
      !_isDefined(
        filtersInitializeObjects[
          init === null || init === void 0 ? void 0 : init.name
        ]
      )
    ) {
      filtersInitializeObjects[
        init === null || init === void 0 ? void 0 : init.name
      ] = init
    }
    let filterDeps = {}
    let $resolving = {}
    let readFilters = {}
    let readFiltersValues = {}
    let depsValues = {}
    const useFilterGet = () => {
      const hookCall = useMemo(() => Math.random(), [])
      useFilterGet["deps"] = {}
      const { prefix } = useContext(atomicStateContext)
      if (!filterDeps[`${prefix}-`]) {
        filterDeps[`${prefix}-`] = {}
      }
      const $filterKey = prefix + "-" + name
      if (!filterObservables[$filterKey]) {
        filterObservables[$filterKey] = createObserver()
      }
      const filterObserver = filterObservables[$filterKey]
      const notifyOtherFilters = useCallback(
        function notifyOtherFilters(hookCall, payload) {
          filterObserver.notify($filterKey, hookCall, payload)
        },
        [prefix, hookCall, $filterKey]
      )
      for (let dep in filterDeps[`${prefix}-`]) {
        if (depsValues[dep] !== defaultAtomsValues[dep]) {
          resolvedFilters[$filterKey] = false
          $resolving[$filterKey] = false
        }
      }
      for (let dep in readFilters) {
        if (readFiltersValues[dep] !== defaultFiltersValues[dep]) {
          resolvedFilters[$filterKey] = false
          $resolving[$filterKey] = false
        }
      }
      const getObject = useMemo(
        () => ({
          get: ($atom) => {
            var _a
            subscribedFilters[$filterKey] = true
            if (!_isFunction($atom)) {
              const depsKey = [prefix, $atom.name].join("-")
              filterDeps[`${prefix}-`][depsKey] = true
              depsValues[depsKey] = defaultAtomsValues[depsKey]
              useFilterGet["deps"] = Object.assign(
                Object.assign({}, useFilterGet["deps"]),
                { [depsKey]: true }
              )
            } else {
              const depsKey = [
                prefix,
                (_a =
                  $atom === null || $atom === void 0
                    ? void 0
                    : $atom["init-object"]) === null || _a === void 0
                  ? void 0
                  : _a.name,
              ].join("-")
              filterDeps[`${prefix}-`][depsKey] = true
              depsValues[depsKey] = defaultAtomsValues[depsKey]
              useFilterGet["deps"] = Object.assign(
                Object.assign({}, useFilterGet["deps"]),
                { [depsKey]: true }
              )
            }
            const __valuesKey = [prefix, atom.name].join("-")
            const __valuesKeyNames = [prefix, $atom["atom-name"]].join("-")
            return !_isFunction($atom)
              ? !_isDefined(defaultAtomsValues[__valuesKey])
                ? $atom.default
                : defaultAtomsValues[__valuesKey]
              : !_isDefined(defaultAtomsValues[__valuesKeyNames])
              ? $atom["init-object"].default
              : defaultAtomsValues[__valuesKeyNames]
          },
          read: ($filter) => {
            var _a
            subscribedFilters[$filterKey] = true
            const __filtersKey = !_isFunction($filter)
              ? [prefix, $filter.name].join("-")
              : [prefix, $filter["filter-name"]].join("-")
            if (!_isFunction($filter)) {
              readFilters[__filtersKey] = true
              readFiltersValues[__filtersKey] =
                defaultFiltersValues[__filtersKey]
            } else {
              // We want any re-renders from filters used to trigger a re-render of the current filter
              readFilters[__filtersKey] = true
              readFiltersValues[__filtersKey] =
                defaultFiltersValues[__filtersKey]
            }
            return !_isFunction($filter)
              ? !_isDefined(defaultFiltersValues[__filtersKey])
                ? $filter.default
                : defaultFiltersValues[__filtersKey]
              : !_isDefined(defaultFiltersValues[__filtersKey])
              ? (_a = $filter["init-object"]) === null || _a === void 0
                ? void 0
                : _a.default
              : defaultFiltersValues[__filtersKey]
          },
        }),
        [prefix]
      )
      function getInitialValue() {
        try {
          let firstResolved = undefined
          return !resolvedFilters[$filterKey]
            ? (() => {
                resolvedFilters[$filterKey] = true
                defaultFiltersValues[$filterKey] = init.default
                try {
                  firstResolved = get(getObject)
                  if (!_isDefined(firstResolved)) {
                    return init.default
                  } else {
                    ;(async () => {
                      firstResolved = await firstResolved
                      defaultFiltersValues[$filterKey] = firstResolved
                      // This hook will notify itself if any deps have changed
                      if (_isDefined(firstResolved)) {
                        notifyOtherFilters("", firstResolved)
                      }
                    })()
                    return firstResolved
                  }
                } catch (err) {
                } finally {
                  if (_isDefined(firstResolved)) {
                    notifyOtherFilters("", firstResolved)
                  }
                  return firstResolved
                }
              })()
            : (() => {
                return defaultFiltersValues[$filterKey]
              })()
        } catch (err) {
          return init.default
        }
      }
      let defValue = defaultFiltersValues[$filterKey]
      const initialValue = getInitialValue()
      if (_isPromise(initialValue)) {
        defaultFiltersValues[$filterKey] = initialValue
        setTimeout(async () => {
          defaultFiltersValues[$filterKey] = await initialValue
          notifyOtherFilters(hookCall, await defaultFiltersValues[$filterKey])
        }, 0)
      }
      if (_isDefined(initialValue)) {
        if (_isPromise(initialValue)) {
          initialValue.then((e) => {
            defValue = e
            defaultFiltersValues[$filterKey] = e
            filterObserver.notify($filterKey, "", e)
          })
        } else {
          defValue = initialValue
          defaultFiltersValues[$filterKey] = initialValue
        }
      } else {
        if (!_isDefined(defValue)) {
          defValue = init.default
        }
      }
      const [filterValue, setFilterValue] = useState(() =>
        _isDefined(defValue)
          ? _isPromise(defValue)
            ? _isPromise(initialValue)
              ? init.default
              : initialValue
            : defValue
          : (() => {
              return defValue
            })()
      )
      useEffect(() => {
        var _a
        ;(_a = atomObservables[$filterKey]) === null || _a === void 0
          ? void 0
          : _a.notify($filterKey, "", filterValue)
      }, [filterValue])
      useEffect(() => {
        if (!resolvedFilters[$filterKey]) {
          if (_isDefined(filterValue)) {
            notifyOtherFilters(hookCall, filterValue)
          }
        }
      }, [filterValue, hookCall, $filterKey, resolvedFilters[$filterKey]])
      useEffect(() => {
        // Render the first time if initialValue is a promise
        if (_isPromise(initialValue)) {
          initialValue.then((initial) => {
            if (_isDefined(initial)) {
              defaultFiltersValues[$filterKey] = initial
              setFilterValue(initial)
            }
          })
        }
      }, [initialValue])
      async function renderValue(e) {
        const isFilterUpdate = e.storeName in readFilters
        if (
          _isFunction(e.payload)
            ? true
            : isFilterUpdate
            ? !jsonEquality(
                defaultFiltersValues[e.storeName],
                readFiltersValues[e.storeName]
              )
            : !jsonEquality(e.payload, depsValues[e.storeName])
        ) {
          if (
            e.storeName in
            (isFilterUpdate ? readFilters : filterDeps[`${prefix}-`])
          ) {
            if (_isDefined(e.payload)) {
              if (isFilterUpdate) {
                readFiltersValues[e.storeName] = e.payload
              } else {
                depsValues[e.storeName] = e.payload
              }
            }
          }
          try {
            if (!$resolving[$filterKey]) {
              $resolving[$filterKey] = true
              const newValue =
                e.storeName in filterDeps[`${prefix}-`] ||
                e.storeName in readFilters
                  ? get(getObject)
                  : defaultFiltersValues[$filterKey]
              defaultFiltersValues[$filterKey] = newValue
              ;(async () => {
                if (_isFunction(newValue)) {
                  notifyOtherFilters(hookCall, newValue)
                  setFilterValue(() => newValue)
                } else {
                  if (_isDefined(newValue)) {
                    if (_isPromise(newValue)) {
                      const newV = await newValue
                      setFilterValue(newV)
                      notifyOtherFilters(hookCall, newV)
                    } else {
                      setFilterValue(newValue)
                      notifyOtherFilters(hookCall, newValue)
                    }
                  }
                }
                $resolving[$filterKey] = false
              })()
            }
          } catch (err) {}
        }
      }
      useEffect(() => {
        // Whenever the filter object / function changes, add atoms deps again
        var _a, _b
        for (let dep in filterDeps[`${prefix}-`]) {
          ;(_a = atomObservables[dep]) === null || _a === void 0
            ? void 0
            : _a.observer.addListener(dep, renderValue)
        }
        // We subscribe to any re-renders of filters that our current filter is using
        for (let readFilter in readFilters) {
          ;(_b = filterObservables[readFilter]) === null || _b === void 0
            ? void 0
            : _b.observer.addListener(readFilter, renderValue)
        }
        return () => {
          var _a, _b
          for (let dep in filterDeps[`${prefix}-`]) {
            ;(_a = atomObservables[dep]) === null || _a === void 0
              ? void 0
              : _a.observer.removeListener(dep, renderValue)
          }
          for (let readFilter in readFilters) {
            ;(_b = filterObservables[readFilter]) === null || _b === void 0
              ? void 0
              : _b.observer.removeListener(readFilter, renderValue)
          }
        }
      }, [init, hookCall, filtersInitializeObjects[$filterKey], prefix])
      async function updateValueFromObservableChange(e) {
        const { payload } = e
        if (hookCall !== e.hookCall) {
          const $payload = await payload
          if (_isFunction($payload)) {
            setFilterValue(() => $payload)
          } else {
            if (_isDefined($payload)) {
              setFilterValue($payload)
            }
          }
        }
      }
      useEffect(() => {
        var _a
        ;(_a = filterObserver.observer) === null || _a === void 0
          ? void 0
          : _a.addListener($filterKey, updateValueFromObservableChange)
        return () => {
          var _a
          ;(_a =
            filterObserver === null || filterObserver === void 0
              ? void 0
              : filterObserver.observer) === null || _a === void 0
            ? void 0
            : _a.removeListener($filterKey, updateValueFromObservableChange)
        }
      }, [$filterKey])
      return filterValue
    }
    useFilterGet["filter-name"] = name
    useFilterGet["init-object"] = init
    return useFilterGet
  }
  function useFilter(f) {
    const { prefix } = useContext(atomicStateContext)
    if (_isFunction(f)) {
      const $f = f["init-object"]
      if (
        $f !==
        filtersInitializeObjects[
          $f === null || $f === void 0 ? void 0 : $f.name
        ]
      ) {
        if (_isDefined($f)) {
          filtersInitializeObjects[
            $f === null || $f === void 0 ? void 0 : $f.name
          ] = $f
          resolvedFilters[
            prefix + "-" + ($f === null || $f === void 0 ? void 0 : $f.name)
          ] = false
          subscribedFilters[
            prefix + "-" + ($f === null || $f === void 0 ? void 0 : $f.name)
          ] = false
        }
      }
    } else {
      if (filtersInitializeObjects[f.name] !== f) {
        filtersInitializeObjects[f.name] = f
        resolvedFilters[prefix + "-" + f.name] = false
        subscribedFilters[prefix + "-" + f.name] = false
      }
    }
    return !_isFunction(f)
      ? (() => {
          const __filterSKey = [prefix, f.name].join("-")
          if (!_isDefined(objectFilters[__filterSKey])) {
            objectFilters[__filterSKey] = filter(
              filtersInitializeObjects[f.name]
            )
          } else {
            if (objectFilters[__filterSKey]["init-object"] !== f) {
              objectFilters[__filterSKey] = filter(f)
            }
          }
          return objectFilters[__filterSKey]()
        })()
      : f()
  }
  const objectAtoms = {}
  /**
   * Get an atom's value and state setter
   */
  function useAtom(atom) {
    if (!_isFunction(atom)) {
      if (!_isDefined(objectAtoms[atom.name])) {
        objectAtoms[atom.name] = createAtom(atom)
      } else {
        if (objectAtoms[atom.name]["init-object"] !== atom) {
          objectAtoms[atom.name] = createAtom(atom)
        }
      }
    }
    return !_isFunction(atom) ? objectAtoms[atom.name]() : atom()
  }
  /**
   * Get an atom's value
   */
  function useValue(atom) {
    return useAtom(atom)[0]
  }
  const useAtomValue = useValue
  /**
   * Get the function that updates the atom's value
   */
  function useDispatch(atom) {
    return useAtom(atom)[1]
  }
  const useAtomDispatch = useDispatch
  /**
   * Get the actions of the atom as reducers
   */
  function useActions(atom) {
    return useAtom(atom)[2]
  }
  const useAtomActions = useActions
  const storageOvservable = (() => {
    const emm = new Observable()
    return emm
  })()
  /**
   * Get all localStorage items as an object (they will be JSON parsed). You can pass default values (which work with SSR) and a type argument
   */
  function useStorage(defaults) {
    const [keys, setKeys] = useState(defaults || {})
    async function updateStore() {
      let $keys = {}
      if (typeof localStorage !== "undefined") {
        for (let k in localStorage) {
          if (!k.match(/clear|getItem|key|length|removeItem|setItem/)) {
            try {
              if (_isDefined(localStorage[k])) {
                $keys[k] = JSON.parse(localStorage[k])
              }
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
      storageOvservable.addListener("store-changed", updateStore)
      return () => {
        storageOvservable.removeListener("store-changed", updateStore)
      }
    }, [])
    return keys
  }
  const storage = {
    /**
     * Set an item in localStorage. Its value will be serialized as JSON
     */
    set(k, v) {
      if (typeof localStorage !== "undefined") {
        if (_isFunction(localStorage.setItem)) {
          localStorage.setItem(k, JSON.stringify(v))
          storageOvservable.emit("store-changed", v)
        }
      }
    },
    /**
     * Remove a localStorage item
     */
    async remove(k) {
      if (typeof localStorage !== "undefined") {
        if (_isFunction(localStorage.removeItem)) {
          localStorage.removeItem(k)
          storageOvservable.emit("store-changed", {})
        }
      }
    },
    /**
     * Get an item in localStorage. Its value will be JSON parsed. If it does not exist or
     * is an invalid JSON format, the default value passed in the second argument will be returned
     */
    get(k, def = null) {
      if (typeof localStorage !== "undefined") {
        if (_isFunction(localStorage.getItem)) {
          try {
            return JSON.parse(localStorage.getItem(k))
          } catch (err) {
            return def
          }
        } else {
          try {
            return JSON.parse(localStorage[k])
          } catch (err) {
            return def
          }
        }
      } else {
        return def
      }
    },
  }
  /**
   * Get a localStorage item. Whenever `storage.set` or `storage.remove` are called,
   * this hook will update its state
   */
  function useStorageItem(k, def = null) {
    const [value, setValue] = useState(def)
    const itemObserver = () => {
      if (typeof localStorage !== "undefined") {
        if (!jsonEquality(localStorage[k], def)) {
          try {
            setValue(JSON.parse(localStorage[k]))
          } catch (err) {
            setValue(def)
          }
        }
      }
    }
    useEffect(() => {
      itemObserver()
      storageOvservable.addListener("store-changed", itemObserver)
      return () => {
        storageOvservable.removeListener("store-changed", itemObserver)
      }
    }, [])
    return value
  }

  window.atom = atom
  window.useAtom = useAtom
  window.useValue = useValue
  window.useDispatch = useDispatch
  window.useActions = useActions
  window.AtomicState = AtomicState
  window.takeSnapshot = takeSnapshot
  window.getAtomValue = getAtomValue
  window.getFilterValue = getFilterValue
  window.filter = filter
  window.useFilter = useFilter
  window.storage = storage
  window.useStorage = useStorage
  window.useStorageItem = useStorageItem
})()
