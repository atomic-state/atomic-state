/// <reference types="node" />
/**  @license Atomic State
 * Copyright (c) Dany Beltran
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import React, { Dispatch, SetStateAction } from "react";
import { EventEmitter as Observable } from "events";
export declare type ActionType<Args, T = any> = (args: {
    args: Args;
    state: T;
    dispatch: Dispatch<SetStateAction<T>>;
} & FilterGet) => void;
/**
 * Atom type
 */
export declare type Atom<T = any, ActionArgs = any> = {
    name: string;
    default?: T | Promise<T> | (() => Promise<T>) | (() => T);
    localStoragePersistence?: boolean;
    /**
     * Short for `localStoragePersistence`
     */
    persist?: boolean;
    /**
     * The persistence provider (optional). It should have the `getItem`, `setItem` and `removeItem` methods.
     *
     * @default localStorage
     */
    persistenceProvider?: PersistenceStoreType;
    /**
     * If true, `persist` will keep the value in sync between tabs.
     * By default it's `true`
     */
    sync?: boolean;
    /**
     * If `persist` is true, this will run whenever the state is updated from another tab. This will not run in the tab that updated the state.
     */
    onSync?(message: T): void;
    /**
     * If false, no warning for duplicate keys will be shown
     */
    ignoreKeyWarning?: boolean;
    /**
     * @deprecated
     * This is for use when `localStoragePersistence` is `true`
     * By default it's false. This is to prevent hydration errors.
     * If set to `false`, data from localStorage will be loaded during render, not after.
     * May have some bugs
     */
    hydration?: boolean;
    actions?: {
        [E in keyof Partial<ActionArgs>]: ActionType<ActionArgs[E], T>;
    };
    effects?: ((s: {
        previous: T;
        state: T;
        dispatch: Dispatch<SetStateAction<T>>;
        /**
         * Cancel the new state update
         */
        cancel: () => void;
    }) => void)[];
};
export declare type ActionsObjectType<ArgsTypes = any> = {
    [E in keyof ArgsTypes]: <Returns = any>(args?: ArgsTypes[E]) => Returns;
};
export declare type useAtomType<R, ActionsArgs = any> = () => (R | Dispatch<SetStateAction<R>> | ActionsObjectType<ActionsArgs>)[];
/**
 * Type for the `get` function of filters
 */
export declare type FilterGet = {
    get<R>(atom: useAtomType<R> | Atom<R, any>): R;
    read<R>(filter: (() => R | Promise<R>) | Filter<R | Promise<R>>): R;
};
/**
 * Filter type
 */
export declare type Filter<T = any> = {
    name: string;
    default?: T;
    get(c: FilterGet): T | Promise<T>;
};
export declare function createObserver(): {
    observer: Observable;
    notify: (storeName: string, hookCall: string, payload: any) => void;
};
export declare type PersistenceStoreType = {
    getItem: (key: string) => any;
    setItem: (key: string, value: any) => void;
    removeItem: (key: string) => void;
};
export declare const AtomicState: React.FC<{
    children: any;
    /**
     * Set default values using an atom's key
     */
    atoms?: {
        [key: string]: any;
    };
    /**
     * Set default filters' values using filter key
     */
    filters?: {
        [key: string]: any;
    };
    /**
     * The prefix added to atoms inside this component
     */
    prefix?: string;
    /**
     * The persistence provider (optional). It should have the `getItem`, `setItem` and `removeItem` methods.
     *
     * @default localStorage
     */
    persistenceProvider?: PersistenceStoreType;
}>;
/**
 * Take a snapshot of all atoms' and filters' values.
 * You can pass a string with the `prefix` you used in the `AtomicState` root component
 * if you want only atoms and filters using that prefix.
 */
export declare function takeSnapshot(storeName?: string): any;
/**
 * Get the current value of an atom. You can pass a specific prefix as the second argument.
 */
export declare function getAtomValue<T = any>(atomName: string, prefix?: string): any;
/**
 * Get the current value of a filter. You can pass a specific prefix as the second argument.
 */
export declare function getFilterValue<T = any>(filterName: string, prefix?: string): any;
/**
 * Creates an atom containing state
 */
export declare function atom<R, ActionsArgs = any>(init: Atom<R, ActionsArgs>): Atom<R, ActionsArgs>;
export declare const createAtom: typeof atom;
export declare function filter<R>(init: Filter<R | Promise<R>>): Filter<R>;
export declare function useFilter<T>(f: (() => T | Promise<T>) | Filter<T | Promise<T>>): T;
/**
 * Get an atom's value and state setter
 */
export declare function useAtom<R, ActionsArgs = any>(atom: Atom<R, ActionsArgs>): [R, (cb: R | ((c: R) => R)) => void, ActionsObjectType<ActionsArgs>];
/**
 * Get an atom's value
 */
export declare function useValue<R>(atom: useAtomType<R> | Atom<R, any>): R;
export declare const useAtomValue: typeof useValue;
/**
 * Get the function that updates the atom's value
 */
export declare function useDispatch<R>(atom: useAtomType<R> | Atom<R, any>): (cb: R | ((c: R) => R)) => void;
export declare const useAtomDispatch: typeof useDispatch;
/**
 * Get the actions of the atom as reducers
 */
export declare function useActions<R, ActionsArgs = any>(atom: useAtomType<R, ActionsArgs> | Atom<R, ActionsArgs>): Required<ActionsObjectType<ActionsArgs>>;
export declare const useAtomActions: typeof useActions;
/**
 * Create a single provider hook with atoms
 */
export declare function atomProvider<R>(states: {
    [e in keyof R]: Atom<R[e]>;
}): {
    <E extends keyof R>(name: E): [R[E], (cb: R[E] | ((c: R[E]) => R[E])) => void, ActionsObjectType<{
        [x: string]: any;
    }>] & {
        value: R[E];
        dispatch: (cb: R[E] | ((c: R[E]) => R[E])) => void;
        actions: ActionsObjectType<{
            [x: string]: any;
        }>;
    };
    value<E_1 extends keyof R>(name: E_1): R[E_1];
    dispatch<E_2 extends keyof R>(name: E_2): (cb: R[E_2] | ((c: R[E_2]) => R[E_2])) => void;
    actions<E_3 extends keyof R>(name: E_3): Required<ActionsObjectType<{
        [x: string]: any;
    }>>;
};
/**
 * Create a single provider hook with filters
 */
export declare function filterProvider<R>(states: {
    [e in keyof R]: Filter<R[e]>;
}): <E extends keyof R>(name: E) => R[E];
/**
 * Get all localStorage items as an object (they will be JSON parsed). You can pass default values (which work with SSR) and a type argument
 */
export declare function useStorage<K = any>(defaults?: K): K;
export declare const storage: {
    /**
     * Set an item in localStorage. Its value will be serialized as JSON
     */
    set<T = any>(k: string, v: T): void;
    /**
     * Remove a localStorage item
     */
    remove(k: string): Promise<void>;
    /**
     * Get an item in localStorage. Its value will be JSON parsed. If it does not exist or
     * is an invalid JSON format, the default value passed in the second argument will be returned
     */
    get<T_1 = any>(k: string, def?: T_1): T_1;
};
/**
 * Get a localStorage item. Whenever `storage.set` or `storage.remove` are called,
 * this hook will update its state
 */
export declare function useStorageItem<T = any>(k: string, def?: T): T;
