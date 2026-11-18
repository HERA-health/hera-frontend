import { useLayoutEffect, type RefObject } from "react";

export function useProfessionalDemo(
  container: RefObject<HTMLDivElement | null>,
  html: string,
) {
  useLayoutEffect(() => {
    const demo = container.current?.querySelector<HTMLElement>(
      ".product-demo:has(.demo-controls)",
    );
    if (!demo) return;
    const views = demo.querySelectorAll<HTMLButtonElement>("button[data-view]");
    const panels = demo.querySelectorAll<HTMLElement>("[data-panel]");
    const play = demo.querySelector<HTMLButtonElement>(".demo-play");
    const title = demo.querySelector("[data-demo-title]");
    if (!play || !title) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let paused = motion.matches;
    let visible = false;
    let selected = "profile";
    let timer: number | undefined;
    function select(view: string) {
      if (selected === view) return;
      demo?.setAttribute("data-changing", "true");
      selected = view;
      views.forEach((button) =>
        button.setAttribute(
          "aria-pressed",
          String(button.dataset.view === view),
        ),
      );
      panels.forEach((panel) => {
        panel.hidden = panel.dataset.panel !== view;
      });
      if (title)
        title.textContent =
          view === "profile" ? "Perfil profesional" : "Agenda de consulta";
    }
    function schedule() {
      window.clearInterval(timer);
      if (!play) return;
      play.hidden = motion.matches;
      play.textContent = paused ? "▶" : "Ⅱ";
      play.setAttribute(
        "aria-label",
        paused ? "Reanudar demostración" : "Pausar demostración",
      );
      if (visible && !paused && !motion.matches && !document.hidden)
        timer = window.setInterval(
          () => select(selected === "profile" ? "agenda" : "profile"),
          6000,
        );
    }
    function click(event: Event) {
      const button =
        event.target instanceof Element ? event.target.closest("button") : null;
      if (!button) return;
      if (button.dataset.view) {
        select(button.dataset.view);
        paused = true;
      } else if (button === play) paused = !paused;
      schedule();
    }
    function preference() {
      paused = true;
      schedule();
    }
    function focusPanel(event: FocusEvent) {
      if (
        event.target instanceof Element &&
        event.target.closest("[data-panel]")
      )
        preference();
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        schedule();
      },
      { threshold: 0.25 },
    );
    observer.observe(demo);
    demo.dataset.ready = "true";
    demo.addEventListener("click", click);
    demo.addEventListener("focusin", focusPanel);
    document.addEventListener("visibilitychange", schedule);
    motion.addEventListener("change", preference);
    schedule();
    return () => {
      window.clearInterval(timer);
      observer.disconnect();
      demo.removeEventListener("click", click);
      demo.removeEventListener("focusin", focusPanel);
      document.removeEventListener("visibilitychange", schedule);
      motion.removeEventListener("change", preference);
    };
  }, [container, html]);
}
