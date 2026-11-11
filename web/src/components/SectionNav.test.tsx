import { render, screen } from "@testing-library/react";
import { eyebrowFor, SECTIONS } from "../sections";
import { SectionNav } from "./SectionNav";

describe("<SectionNav>", () => {
  it("links each pill to its section anchor", () => {
    render(<SectionNav active={null} />);
    const links = screen.getAllByRole("link");
    expect(links.map((a) => a.getAttribute("href"))).toEqual(SECTIONS.map((s) => `#${s.id}`));
    expect(links.map((a) => a.textContent)).toEqual(SECTIONS.map((s) => s.label));
  });

  it("marks only the active section as current", () => {
    render(<SectionNav active="attribution" />);
    expect(screen.getByRole("link", { name: "Attribution" })).toHaveAttribute("aria-current", "location");
    expect(screen.getByRole("link", { name: "Channels" })).not.toHaveAttribute("aria-current");
  });
});

describe("sections", () => {
  it("has unique ids and numbered eyebrows", () => {
    expect(new Set(SECTIONS.map((s) => s.id)).size).toBe(SECTIONS.length);
    expect(eyebrowFor("channels")).toBe("02 · Channels");
    expect(eyebrowFor("nope")).toBeNull();
  });
});
