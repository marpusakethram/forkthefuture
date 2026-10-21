import { navigate } from "../router";

export function useRouter() {
  return { push: navigate, replace: navigate, back: () => navigate("/"), refresh: () => {}, prefetch: () => {} };
}
