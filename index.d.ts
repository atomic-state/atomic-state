import { Dispatch, SetStateAction } from "react";
export declare function createAtom<T>(init: {
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
}): () => [T, (cb: T | ((c: T) => T)) => void, {
    [name: string]: (args: any) => void;
}];
export declare function useAtom<T>(atom: () => [
    T,
    (cb: ((c: T) => T) | T) => void,
    {
        [name: string]: (args: any) => void;
    }
]): [T, (cb: T | ((c: T) => T)) => void, {
    [name: string]: (args: any) => void;
}];
