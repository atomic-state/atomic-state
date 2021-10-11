import React from "react";
import { atom, useAtom } from "..";

const nameAtom = atom({
  name: "user-name",
  default: "",
});

export const NameDisplay = () => {
  const [name] = useAtom(nameAtom);
  return <p>Username: {name}</p>;
};

export const NameField = () => {
  const [name, setName] = useAtom(nameAtom);
  return (
    <div>
      <input
        title="name field"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
    </div>
  );
};
