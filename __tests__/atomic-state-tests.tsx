import React from "react"
import { render, fireEvent, waitFor } from "@testing-library/react"
import { RenderCount, IncreaseButton } from "../mocks/Tes1"
import { NameDisplay, NameField } from "../mocks/Test2"
import { RenderCountDouble, IncreaseButton2 } from "../mocks/Test3"
import { act } from "react-dom/test-utils"

it("Should increase clicks' atom value", async () => {
  const Button = render(<IncreaseButton />)
  const CountDisplay = render(<RenderCount />)
  act(() => {
    fireEvent.click(Button.getByText(/increase/), null as unknown as Event)
  })

  await waitFor(() => {
    expect(CountDisplay.queryByText(/count is /)!.innerHTML).toBe("count is 1")
  })
})

it("Should show the double of the count atom", async () => {
  const Button = render(<IncreaseButton2 />)
  const CountDisplay = render(<RenderCountDouble />)
  act(() => {
    fireEvent.click(Button.getByText(/increase/), null as unknown as Event)
  })
  act(() => {
    fireEvent.click(Button.getByText(/increase/), null as unknown as Event)
  })

  await waitFor(() => {
    expect(CountDisplay.queryByText(/double is /)!.innerHTML).toBe("double is 4")
  })
})

it("Should update an atom's value on user input", async () => {
  const Field = render(<NameField />)
  const NameDisp = render(<NameDisplay />)
  act(() => {
    fireEvent.change(Field.getByTitle(/name field/), {
      target: {
        value: "inuyasha",
      },
    })
  })

  await waitFor(() => {
    expect(NameDisp.queryByText(/Username:/)!.innerHTML).toBe(
      "Username: inuyasha"
    )
  })
})
