import React from "react";
import { render, fireEvent } from "@testing-library/react";
import { RenderCount, IncreaseButton } from "../tests/Tes1";
import { NameDisplay, NameField } from "../tests/Test2";

it("Should increase clicks' atom value", () => {
  const Button = render(<IncreaseButton />);
  const CountDisplay = render(<RenderCount />);

  fireEvent.click(Button.getByText(/increase/), null as unknown as Event);

  expect(CountDisplay.queryByText(/count is /)!.innerHTML).toBe("count is 1");
});

it("Should update an atom's value on user input", () => {
  const Field = render(<NameField />);
  const NameDisp = render(<NameDisplay />);

  fireEvent.change(Field.getByTitle(/name field/), {
    target: {
      value: "inuyasha",
    },
  });

  expect(NameDisp.queryByText(/Username:/)!.innerHTML).toBe(
    "Username: inuyasha"
  );
});
