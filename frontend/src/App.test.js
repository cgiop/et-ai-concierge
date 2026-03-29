import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders the ET concierge chat UI", () => {
  render(<App />);
  expect(screen.getByText(/ET AI Concierge/i)).toBeInTheDocument();
  expect(screen.getByText(/Chat Interface/i)).toBeInTheDocument();
});
