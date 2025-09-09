import * as React from "react"

const MOBILE_BREAKPOINT = 1024

export function useIsMobile() {
  const getIsMobile = () => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`).matches;
  };

  const [isMobile, setIsMobile] = React.useState<boolean>(getIsMobile());

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    const onResize = () => setIsMobile(getIsMobile());

    mql.addEventListener("change", onChange);
    window.addEventListener("resize", onResize);
    // ensure we sync immediately
    setIsMobile(mql.matches);

    return () => {
      mql.removeEventListener("change", onChange);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return isMobile;
}
