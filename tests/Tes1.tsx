import React from "react";
import { atom, useDispatch, useValue } from "../index";
const clicks = atom({
  name: "clicks-count",
  default: 0,
});

export const RenderCount = () => {
  const clicksCount = useValue(clicks);
  return <h2>count is {clicksCount}</h2>;
};

export const IncreaseButton = () => {
  const setAtomValue = useDispatch(clicks);
  return (
    <div>
      <button onClick={() => setAtomValue((value) => value + 1)}>
        increase
      </button>
    </div>
  );
};
