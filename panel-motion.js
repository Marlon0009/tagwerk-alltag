// Positive distance is always toward dismissal: down for the sheet, left for navigation.
export function panelMotion(dialog, openSheet) {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let frame = 0,
    offset = 0,
    velocity = 0,
    drag = null;
  let suppressClick = false;
  const drawer = () => dialog.matches(".drawer");
  const span = () => (drawer() ? dialog.offsetWidth : dialog.offsetHeight + 12);
  function paint(value) {
    offset = Math.max(0, Math.min(span(), value));
    dialog.style.transform = drawer()
      ? `translateX(${-offset}px)`
      : `translateY(${offset}px)`;
    if (drawer())
      document.body.style.setProperty(
        "--drawer-offset",
        span() - offset + "px",
      );
  }
  function reset() {
    cancelAnimationFrame(frame);
    frame = 0;
    drag = null;
    velocity = 0;
    offset = 0;
    dialog.style.removeProperty("transform");
    document.body.style.removeProperty("--drawer-offset");
  }
  function settle(closing) {
    cancelAnimationFrame(frame);
    const target = closing ? span() : 0;
    let last = performance.now();
    function tick(now) {
      if (!dialog.open || !dialog.matches(".drawer,.daysheet")) {
        reset();
        return;
      }
      const dt = Math.min(0.032, (now - last) / 1000);
      last = now;
      // Exact critically damped spring step, independent of refresh rate.
      const error = offset - target,
        rate = 23,
        decay = Math.exp(-rate * dt);
      const term = velocity + rate * error;
      const next = target + (error + term * dt) * decay;
      velocity = (velocity - rate * term * dt) * decay;
      if (
        reduced.matches ||
        (Math.abs(next - target) < 0.6 && Math.abs(velocity) < 22)
      ) {
        if (closing) dialog.close();
        reset();
      } else {
        paint(next);
        frame = requestAnimationFrame(tick);
      }
    }
    if (reduced.matches) {
      if (closing) dialog.close();
      reset();
    } else frame = requestAnimationFrame(tick);
  }
  function opened() {
    reset();
    if (!reduced.matches) {
      paint(span());
      settle(false);
    }
  }
  document.addEventListener("pointerdown", (e) => {
    if (!e.isPrimary || e.button !== 0) return;
    const opening = !dialog.open && !!e.target.closest(".nutribar");
    const inside =
      dialog.open &&
      dialog.contains(e.target) &&
      dialog.matches(".drawer,.daysheet");
    if (!opening && !inside) return;
    drag = {
      id: e.pointerId,
      opening,
      moved: false,
      x: e.clientX,
      y: e.clientY,
      sample: 0,
      time: e.timeStamp,
    };
  });
  document.addEventListener(
    "pointermove",
    (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x,
        dy = e.clientY - drag.y;
      const distance = !drag.opening && drawer() ? -dx : dy;
      if (!drag.moved) {
        if (Math.abs(distance) < 6) return;
        if (
          (drag.opening && distance > 0) ||
          Math.abs(distance) < Math.abs(drawer() && !drag.opening ? dy : dx)
        ) {
          drag = null;
          return;
        }
        if (!drag.opening && !drawer() && dialog.scrollTop > 0) {
          drag = null;
          return;
        }
        const active = drag;
        if (active.opening) {
          openSheet();
          drag = active;
        }
        cancelAnimationFrame(frame);
        active.base = active.opening ? span() : offset;
        active.moved = true;
        dialog.setPointerCapture(e.pointerId);
      }
      const elapsed = e.timeStamp - drag.time;
      if (elapsed > 0)
        velocity = Math.max(
          -3600,
          Math.min(3600, ((distance - drag.sample) * 1000) / elapsed),
        );
      drag.sample = distance;
      drag.time = e.timeStamp;
      if (!reduced.matches) paint(drag.base + distance);
      if (e.cancelable) e.preventDefault();
    },
    { passive: false },
  );
  function release(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const active = drag;
    drag = null;
    if (!active.moved) return;
    if (dialog.hasPointerCapture(e.pointerId))
      dialog.releasePointerCapture(e.pointerId);
    suppressClick = true;
    setTimeout(() => {
      suppressClick = false;
    }, 0);
    if (e.timeStamp - active.time > 100) velocity = 0;
    const projected = active.base + active.sample + velocity * 0.14;
    settle(
      e.type === "pointercancel" ? active.opening : projected > span() / 2,
    );
  }
  document.addEventListener("pointerup", release);
  document.addEventListener("pointercancel", release);
  document.addEventListener(
    "click",
    (e) => {
      if (suppressClick) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    },
    true,
  );
  dialog.addEventListener("close", reset);
  return { opened, reset, close: () => settle(true) };
}
