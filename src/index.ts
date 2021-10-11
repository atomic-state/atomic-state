/* eslint-disable react-hooks/exhaustive-deps */
import {
  Dispatch,
  SetStateAction,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { EventEmitter } from "events";

function createEmitter() {
  const emitter = new EventEmitter();
  emitter.setMaxListeners(10e12);
  function notify(storeName: string, hookCall: string, payload = {}) {
    emitter.emit(storeName, { hookCall, payload });
  }
  return {
    Aesthetic: emitter,
    notify,
  };
}
/**
 * Contains an event emitter for each store using the store name
 */
const emitters: any = {};

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
  if (!emitters[storeName]) {
    emitters[storeName] = createEmitter();
  }
  const { Aesthetic, notify } = emitters[storeName];
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
  const val = useRef(store);

  const updateStore = (update: (previousValue: T) => T) => {
    setStore((c) => {
      const newValue = typeof update === "function" ? update(c) : update;
      if (persist && typeof localStorage !== "undefined") {
        localStorage[`store-${storeName}`] = JSON.stringify(newValue);
      }
      val.current = newValue;
      return newValue;
    });
  };
  
  useEffect(() => {
    notify(storeName, hookCall, val?.current);
  }, [val.current]);

  useEffect(() => {
    const stateListener = async (e: any) => {
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
          (args?: any) =>
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

      { [name: string]: (args?: any) => void }
    ];
}

type atomType<T> = () => [
  T,
  (cb: ((c: T) => T) | T) => void,
  {
    [name: string]: (args?: any) => void;
  }
];
export function useAtom<T>(atom: atomType<T>) {
  return atom();
}

export function useAtomValue<T>(atom: atomType<T>) {
  const [value] = useAtom(atom);
  return value;
}

export function useAtomDispatch<T>(atom: atomType<T>) {
  const [, dispatch] = useAtom(atom);
  return dispatch;
}

export function useAtomActions<T>(atom: atomType<T>) {
  const [, , actions] = useAtom(atom);
  return actions;
}

export const atom = createAtom;
export const useActions = useAtomActions;
export const useValue = useAtomValue;
export const useDispatch = useAtomDispatch;
