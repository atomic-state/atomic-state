import { EventEmitter } from "events";
import { Dispatch, SetStateAction, useEffect, useMemo, useState } from "react";

type AtomType<T> = {
  name: string;
  default: T;
  localStoragePersistence?: boolean;
  actions?: {
    [name: string]: (st: {
      args: any;
      state: T;
      dispatch: Dispatch<SetStateAction<T>>;
    }) => void;
  };
};

const atomEmitters: {
  [key: string]: {
    emitter: EventEmitter;
    notify: (storeName: string, hookCall: string, payload?: {}) => void;
  };
} = {};

function createEmitter() {
  const emitter = new EventEmitter();
  emitter.setMaxListeners(10e12);
  function notify(storeName: string, hookCall: string, payload = {}) {
    emitter.emit(storeName, { hookCall, payload });
  }
  return {
    emitter,
    notify,
  };
}

function useAtomCreate<R>(init: AtomType<R>) {
  const hookCall = useMemo(() => `${Math.random()}`.split(".")[1], []);

  const initialValue = (function getInitialValue() {
    return init.localStoragePersistence
      ? typeof localStorage !== "undefined"
        ? typeof localStorage[`store-${init.name}`] !== "undefined"
          ? JSON.parse(localStorage[`store-${init.name}`])
          : init.default
        : init.default
      : init.default;
  })();

  const [state, setState] = useState<R>(initialValue);

  if (!atomEmitters[init.name]) {
    atomEmitters[init.name] = createEmitter();
  }

  const { emitter, notify } = atomEmitters[init.name];

  useEffect(() => {
    const handler = async (e: any) => {
      if (e.hookCall !== hookCall) {
        setState(e.payload);
      }
    };

    emitter.addListener(init.name, handler);

    return () => {
      emitter.removeListener(init.name, handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateState: Dispatch<SetStateAction<R>> = (v) => {
    // First notify other subscribers
    notify(init.name, hookCall, v);
    // Finally update state
    setState(v);
  };

  useEffect(() => {
    if (typeof localStorage !== "undefined") {
      localStorage[`store-${init.name}`] = JSON.stringify(state);
    }
  }, [init.name, state]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const actions = useMemo(() => init.actions || {}, []);
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
  );

  return [
    state,
    updateState,
    __actions as { [name: string]: (args?: any) => void },
  ];
}

/**
 * Creates an atom containing state
 */
export function atom<R>(init: AtomType<R>) {
  return () => useAtomCreate<R>(init);
}
export const createAtom = atom;

type useAtomType<R> = () => (
  | R
  | Dispatch<SetStateAction<R>>
  | { [name: string]: (args?: any) => void }
)[];

/**
 * Get an atom's value and state setter
 */
export function useAtom<R>(atom: useAtomType<R>) {
  return atom() as [
    R,
    (cb: ((c: R) => R) | R) => void,
    { [name: string]: (args?: any) => void }
  ];
}

/**
 * Get an atom's value
 */
export function useValue<R>(atom: useAtomType<R>) {
  return atom()[0] as R;
}
export const useAtomValue = useValue;

/**
 * Get the function that updates the atom's value
 */
export function useDispatch<R>(atom: useAtomType<R>) {
  return atom()[1] as (cb: ((c: R) => R) | R) => void;
}
export const useAtomDispatch = useDispatch;

/**
 * Get the actions of the atom as reducers
 */
export function useActions<R>(atom: useAtomType<R>) {
  return atom()[2] as { [name: string]: (args?: any) => void };
}
export const useAtomActions = useActions;
