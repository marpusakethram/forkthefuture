// In-memory router for the standalone preview build (the artifact host keeps no URL paths or hash routes).
type Listener = (path: string) => void;
let current = "/";
const listeners = new Set<Listener>();

export function currentPath() {
  return current;
}

export function navigate(href: string) {
  const [path, anchor] = href.split("#");
  current = path || "/";
  listeners.forEach((l) => l(current));
  requestAnimationFrame(() => {
    if (anchor) document.getElementById(anchor)?.scrollIntoView({ behavior: "smooth" });
    else window.scrollTo(0, 0);
  });
}

export function subscribe(l: Listener) {
  listeners.add(l);
  return () => listeners.delete(l);
}
