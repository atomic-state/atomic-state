/**  @license Atomic State
 * Copyright (c) Dany Beltran
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import React, { Dispatch, SetStateAction } from "react";
/**
 * Atom type
 */
export declare type Atom<T = any> = {
    name: string;
    default?: T | Promise<T> | (() => Promise<T>) | (() => T);
    localStoragePersistence?: boolean;
    /**
     * Short for `localStoragePersistence`
     */
    persist?: boolean;
    /**
     * This is for use when `localStoragePersistence` is `true`
     * By default it's false. This is to prevent hydration errors.
     * If set to `false`, data from localStorage will be loaded during render, not after.
     */
    hydration?: boolean;
    actions?: {
        [name: string]: (st: {
            args: any;
            state: T;
            dispatch: Dispatch<SetStateAction<T>>;
        }) => any;
    };
    effects?: ((s: {
        previous: T;
        state: T;
        dispatch: Dispatch<SetStateAction<T>>;
    }) => void)[];
};
declare type ActionsObjectType = {
    [name: string]: (args?: any) => any;
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
}>;
/**
 * Creates an atom containing state
 */
export declare function atom<R>(init: Atom<R>): {
    (): (ActionsObjectType | R | React.Dispatch<React.SetStateAction<R>>)[];
    "atom-name": string;
    "init-object": Atom<R>;
};
export declare const createAtom: typeof atom;
declare type useAtomType<R> = () => (R | Dispatch<SetStateAction<R>> | ActionsObjectType)[];
/**
 * Type for the `get` function of filters
 */
export declare type FilterGet = {
    get<R>(atom: useAtomType<R> | Atom<R>): R;
};
/**
 * Filter type
 */
export declare type Filter<T = any> = {
    name?: string;
    get(c: FilterGet): T;
};
export declare function filter<R>(init: Filter<R | Promise<R>>): {
    (): R;
    "filter-name": string | undefined;
    "init-object": Filter<R | Promise<R>>;
};
export declare function useFilter<T>(f: (() => T | Promise<T>) | Filter<T | Promise<T>>): T;
/**
 * Get an atom's value and state setter
 */
export declare function useAtom<R>(atom: useAtomType<R> | Atom<R>): [R, (cb: R | ((c: R) => R)) => void, ActionsObjectType];
/**
 * Get an atom's value
 */
export declare function useValue<R>(atom: useAtomType<R> | Atom<R>): R;
export declare const useAtomValue: typeof useValue;
/**
 * Get the function that updates the atom's value
 */
export declare function useDispatch<R>(atom: useAtomType<R> | Atom<R>): (cb: R | ((c: R) => R)) => void;
export declare const useAtomDispatch: typeof useDispatch;
/**
 * Get the actions of the atom as reducers
 */
export declare function useActions<R>(atom: useAtomType<R> | Atom<R>): ActionsObjectType;
export declare const useAtomActions: typeof useActions;
export declare function useStorage(): {
    [key: string]: any;
};
export declare const storage: {
    set(k: string, v: any): Promise<void>;
    remove(k: string): Promise<void>;
    get(k: string): any;
};
export {};
