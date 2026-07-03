// YouTube IFrame API onError codes: https://developers.google.com/youtube/iframe_api_reference#onError
const ERROR_MESSAGES: Record<number, string> = {
  2: "That doesn't look like a valid YouTube video.",
  5: "This video can't be played in the embedded player.",
  100: "That video was not found — it may have been removed or made private.",
  101: "The owner of that video doesn't allow it to be played outside of YouTube.",
  150: "The owner of that video doesn't allow it to be played outside of YouTube.",
};

export function describeYoutubeError(code: number): string {
  return ERROR_MESSAGES[code] ?? "Something went wrong loading that video.";
}
