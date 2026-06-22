import { useEffect, useRef } from "react";
import twemoji from "@twemoji/api";

// Returns a ref to attach to a container. Every emoji inside it is rendered as
// a Twemoji image so they look identical across devices (and flags show up on
// Windows, which has no native flag emoji). Re-runs after each render so
// dynamically-added content (e.g. chat messages) is covered too.
export function useTwemoji<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (ref.current) twemoji.parse(ref.current, { folder: "svg", ext: ".svg" });
  });
  return ref;
}
