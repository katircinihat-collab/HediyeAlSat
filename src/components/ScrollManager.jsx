import { useEffect, useLayoutEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";
import { getRouteScrollAction } from "../utils/routeScroll";

const savedPositions = new Map();

function scrollElement() {
  return document.scrollingElement || document.documentElement;
}

function currentPosition() {
  const element = scrollElement();
  return { left: element.scrollLeft, top: element.scrollTop };
}

function scrollToPosition(position) {
  scrollElement().scrollTo({ ...position, behavior: "auto" });
}

function scrollToHash(hash) {
  const id = decodeURIComponent(hash.slice(1));
  const target = document.getElementById(id) || document.getElementsByName(id)[0];
  if (target) target.scrollIntoView({ block: "start", behavior: "auto" });
  return Boolean(target);
}

function ScrollManager() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const currentKey = useRef(location.key);

  useEffect(() => {
    const previousSetting = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    return () => { window.history.scrollRestoration = previousSetting; };
  }, []);

  useLayoutEffect(() => {
    currentKey.current = location.key;
    const save = () => savedPositions.set(currentKey.current, currentPosition());
    window.addEventListener("scroll", save, { passive: true });
    return () => {
      save();
      window.removeEventListener("scroll", save);
    };
  }, [location.key]);

  useLayoutEffect(() => {
    const action = getRouteScrollAction({
      navigationType,
      hash: location.hash,
      savedPosition: savedPositions.get(location.key)
    });

    if (action.type === "top" || action.type === "restore") {
      scrollToPosition(action.position);
      return undefined;
    }

    if (action.type === "anchor") {
      if (scrollToHash(action.hash)) return undefined;
      const root = document.getElementById("root");
      if (!root) return undefined;
      const observer = new MutationObserver(() => {
        if (scrollToHash(action.hash)) observer.disconnect();
      });
      observer.observe(root, { childList: true, subtree: true });
      const timeout = window.setTimeout(() => observer.disconnect(), 5000);
      return () => {
        observer.disconnect();
        window.clearTimeout(timeout);
      };
    }

    return undefined;
  }, [location.hash, location.key, navigationType]);

  return null;
}

export default ScrollManager;
