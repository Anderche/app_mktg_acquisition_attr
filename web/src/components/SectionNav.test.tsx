import { render, screen } from "@testing-library/react";
import { eyebrowFor, hueFor, SECTIONS } from "../sections";
import { SectionNav } from "./SectionNav";

describe("<SectionNav>", () => {
  it("links each pill to its section anchor", () => {
    render(<SectionNav active={null} />);
    const links = screen.getAllByRole("link");
    expect(links.map((a) => a.getAttribute("href"))).toEqual(SECTIONS.map((s) => `#${s.id}`));
    expect(links.map((a) => a.textContent)).toEqual(SECTIONS.map((s) => s.label));
  });

  it("marks only the active section as current, tinted with its pastel", () => {
    render(<SectionNav active="attribution" />);
    const active = screen.getByRole("link", { name: "Attribution" });
    expect(active).toHaveAttribute("aria-current", "location");
    expect(active.style.background).toBe("var(--hue-lavender)");
    const idle = screen.getByRole("link", { name: "Channels" });
    expect(idle).not.toHaveAttribute("aria-current");
    expect(idle.style.background).toBe("");
  });
});

describe("sections", () => {
  it("has unique ids and numbered eyebrows", () => {
    expect(new Set(SECTIONS.map((s) => s.id)).size).toBe(SECTIONS.length);
    expect(eyebrowFor("channels")).toBe("02 · Channels");
    expect(eyebrowFor("nope")).toBeNull();
  });

  it("gives every section its own pastel", () => {
    expect(new Set(SECTIONS.map((s) => s.hue)).size).toBe(SECTIONS.length);
    expect(hueFor("paths")).toBe("peach");
  });
});
