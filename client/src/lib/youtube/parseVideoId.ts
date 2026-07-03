const VIDEO_ID_PATTERN = /^[\w-]{11}$/;

export function parseYoutubeVideoId(input: string): string | null {
  const trimmed = input.trim();
  if (VIDEO_ID_PATTERN.test(trimmed)) {
    return trimmed;
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\.|^m\./, "");

  let candidate: string | null = null;
  if (host === "youtu.be") {
    candidate = url.pathname.slice(1);
  } else if (host === "youtube.com") {
    if (url.pathname === "/watch") {
      candidate = url.searchParams.get("v");
    } else if (url.pathname.startsWith("/embed/")) {
      candidate = url.pathname.slice("/embed/".length);
    } else if (url.pathname.startsWith("/shorts/")) {
      candidate = url.pathname.slice("/shorts/".length);
    }
  }

  if (candidate && VIDEO_ID_PATTERN.test(candidate)) {
    return candidate;
  }
  return null;
}
