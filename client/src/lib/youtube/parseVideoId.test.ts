import { describe, expect, it } from "vitest";
import { parseYoutubeVideoId } from "./parseVideoId.js";

describe("parseYoutubeVideoId", () => {
  it("accepts a bare 11-character video id", () => {
    expect(parseYoutubeVideoId("jNQXAC9IVRw")).toBe("jNQXAC9IVRw");
  });

  it("trims surrounding whitespace from a bare id", () => {
    expect(parseYoutubeVideoId("  jNQXAC9IVRw  ")).toBe("jNQXAC9IVRw");
  });

  it("parses a standard watch URL", () => {
    expect(parseYoutubeVideoId("https://www.youtube.com/watch?v=jNQXAC9IVRw")).toBe(
      "jNQXAC9IVRw",
    );
  });

  it("parses a watch URL with extra query params", () => {
    expect(
      parseYoutubeVideoId("https://www.youtube.com/watch?v=jNQXAC9IVRw&t=30s&list=PL123"),
    ).toBe("jNQXAC9IVRw");
  });

  it("parses a youtu.be short URL", () => {
    expect(parseYoutubeVideoId("https://youtu.be/jNQXAC9IVRw")).toBe("jNQXAC9IVRw");
  });

  it("parses a youtu.be short URL with query params", () => {
    expect(parseYoutubeVideoId("https://youtu.be/jNQXAC9IVRw?t=30")).toBe("jNQXAC9IVRw");
  });

  it("parses an embed URL", () => {
    expect(parseYoutubeVideoId("https://www.youtube.com/embed/jNQXAC9IVRw")).toBe(
      "jNQXAC9IVRw",
    );
  });

  it("parses a shorts URL", () => {
    expect(parseYoutubeVideoId("https://www.youtube.com/shorts/jNQXAC9IVRw")).toBe(
      "jNQXAC9IVRw",
    );
  });

  it("parses a mobile (m.youtube.com) URL", () => {
    expect(parseYoutubeVideoId("https://m.youtube.com/watch?v=jNQXAC9IVRw")).toBe(
      "jNQXAC9IVRw",
    );
  });

  it("returns null for a URL missing the v param", () => {
    expect(parseYoutubeVideoId("https://www.youtube.com/watch")).toBeNull();
  });

  it("returns null for an unrelated URL", () => {
    expect(parseYoutubeVideoId("https://example.com/watch?v=jNQXAC9IVRw")).toBeNull();
  });

  it("returns null for garbage input", () => {
    expect(parseYoutubeVideoId("not a url or id")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(parseYoutubeVideoId("")).toBeNull();
  });
});
