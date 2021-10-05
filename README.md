### Atomic State

An experimental state managment library I'm working on as a side project:)

Currently, this works for any React application (native or web), but persistence only works in the web, if you are using React Native, you'll have to implement your own persistence method:)

### How does it work?

You can have your state(s), or atoms (yes, like Recoil), separated from your components, in different modules, etc.

### Creating an atom

The `createAtom` creates a state that can be used by different components, and will be in sync across them (and can be updated by them)

(You don't need to use a Context).

First:

```jsx
import { createAtom, useAtom } from "aesthetic-state";
```

For example:

```jsx
const EMAIL = createAtom({
  /* the name of the atom */
  name: "email-state",
  /* default value */
  default: "",
  /* if true, this atom's value will be saved to localStorage */
  localStoragePersistence: true,
  /* custom methods for updating the state of this atom, or just running some code */
  actions: {
    /*
        Actions take one param with three properties:
        'args' - The only param passed when calling the action
        'state' - Current state
        'dispatch' - Function to update the state
        For example, this changes the case of this atom's value.
        */
    changeCase({ args, state, dispatch }) {
      dispatch((email) =>
        args.type === "uper" ? email.toUpperCase() : email.toLowerCase()
      );
    },
  },
});
```

### Using an atom

You've created your first aesthetic atom 🎉
Let's use it.

You have your app, your main component, you can use an atom in a similar way than with `useState`, using the `useAtom` hook.

`useState` returns two items, the state, and the function to update it.

`useAtom` returns three items, the first two are just like in a normal `useState` call, the third item is the `actions` object of that atom (except it's not, you can only pass one argument to these actions, and that will become the `args` property of the action).

Take a look:

```jsx
import { createAtom, useAtom } from "aesthetic-state";

const EMAIL = createAtom({
  name: "email-state",
  default: "",
  localStoragePersistence: true,
  actions: {
    changeCase({ args, state, dispatch }) {
      dispatch((email) =>
        args.type === "upper" ? email.toUpperCase() : email.toLowerCase()
      );
    },
  },
});

const EmailForm = ({ onEmailChange }) => {
  const [email, setEmail, actions] = useAtom(EMAIL);
  useEffect(() => {
    onEmailChange(email);
  }, [email]);
  return (
    <div>
      <h3>{email}</h3>
      <input
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
        }}
      />
      <br />
      <button onClick={() => actions.changeCase({ type: "upper" })}>
        Uppercase
      </button>
      <button onClick={() => actions.changeCase({ type: "meh" })}>
        Lowercase
      </button>
    </div>
  );
};

export default function App() {
  const onEmailChange = (email) => {
    console.log(email);
  };
  console.log("Main tree was rendered");
  return (
    <div>
      <EmailForm onEmailChange={onEmailChange} />
    </div>
  );
}
```

### Getting specific atom items

(New) If you wan to use only the atom's value, you can use the `useAtomValue` hook, which returns the atom value

So, instead of:

```js
const [value] = useAtom(atom);
```

You would do:

```js
const value = useAtomValue(atom);
```

Same with your atom's actions, and the dispatcher that sets the atoms value.

So it will be something like this

Before (still works the exact same way)

```js
const [value, dispatch, actions] = useAtom(atom);
```

After (if you don't want to be destructuring the value, the dispatcher or the actions, and only need one of them)

```js
const value = useAtomValue(atom);
const dispatch = useAtomDispatch(atom);
const actions = useAtomActions(atom);
```

Updating a component that uses an atom will only update that component's React tree, and other components subscribed to that atom's state.

That's basically it:)
