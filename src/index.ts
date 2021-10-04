/* eslint-disable react-hooks/exhaustive-deps */
import { Dispatch, SetStateAction, useEffect, useMemo, useState } from "react";
import { EventEmitter } from "events";

const Aesthetic = new EventEmitter();

function notify(storeName: string, hookCall: string, payload = {}) {
  Aesthetic.emit(storeName, { hookCall, payload });
}
function useGlobalState<T>(
  initialValue: T,
  storeName = "",
  persist = false,
  actions: {
    [name: string]: (st: {
      args: any;
      state: T;
      dispatch: Dispatch<SetStateAction<T>>;
    }) => void;
  } = {}
) {
  if (typeof localStorage !== "undefined") {
    if (!localStorage[`store-${storeName}`] && persist) {
      localStorage[`store-${storeName}`] = JSON.stringify(initialValue);
    }
  }
  const hookCall = useMemo(() => `${Math.random()}`.split(".")[1], []);
  const [store, setStore] = useState<T>(
    persist && typeof localStorage !== "undefined"
      ? JSON.parse(localStorage[`store-${storeName}`])
      : initialValue
  );

  const updateStore = (update: (previousValue: T) => T) => {
    setStore((c) => {
      const newValue = typeof update === "function" ? update(c) : update;
      notify(storeName, hookCall, newValue);
      if (persist && typeof localStorage !== "undefined") {
        localStorage[`store-${storeName}`] = JSON.stringify(newValue);
      }
      return newValue;
    });
  };

  useEffect(() => {
    const stateListener = (e: any) => {
      if (e.hookCall !== hookCall) {
        setStore(e.payload);
      }
    };
    Aesthetic.addListener(storeName, stateListener);
    return () => {
      Aesthetic.removeListener(storeName, stateListener);
    };
  }, [store, hookCall, storeName]);

  const set = useMemo(
    () => (value: Dispatch<SetStateAction<T>>) => {
      updateStore(value as (previousValue: T) => T);
    },
    [store]
  );

  const __actions = useMemo(
    () =>
      Object.fromEntries(
        Object.keys(actions).map((key) => [
          key,
          (args: any) =>
            actions[key]({
              args,
              state: store,
              dispatch: set as Dispatch<SetStateAction<T>>,
            }),
        ])
      ),
    [store]
  );

  return [store, set as unknown as T, __actions];
}

export function createAtom<T>(init: {
  /**
   * Name of the store
   */
  name: string;
  /**
   * Default value for state
   */
  default: T;
  /**
   * Whether to save state to the `localStorage` object
   */
  localStoragePersistence?: boolean;
  /**
   * Actions/reducers of the state.
   * These will keep the state synchronised across multiple components
   * and if `localStoragePersistence` is `true` , also synchronised
   * with `localStorage`
   */
  actions?: {
    [name: string]: (st: {
      args: any;
      state: T;
      dispatch: Dispatch<SetStateAction<T>>;
    }) => void;
  };
}) {
  return () =>
    useGlobalState<T>(
      init.default,
      init.name,
      init.localStoragePersistence,
      init.actions
    ) as [
      T,
      (cb: ((c: T) => T) | T) => void,

      { [name: string]: (args: any) => void }
    ];
}

export function useAtom<T>(
  atom: () => [
    T,
    (cb: ((c: T) => T) | T) => void,
    {
      [name: string]: (args: any) => void;
    }
  ]
) {
  return atom();
}
