(() => {
  "use strict";

  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  class AnimatedCard {
    constructor(card) {
      this.card = card;
      this.tiltX = 0;
      this.tiltY = 0;
      this.targetTiltX = 0;
      this.targetTiltY = 0;
      this.scale = 1;
      this.targetScale = 1;
      this.raf = 0;
      this.last = performance.now();

      card.classList.add("flip-card");

      const original = Array.from(card.childNodes);
      this.shadow = document.createElement("span");
      this.shadow.className = "flip-card__shadow";
      this.shadow.setAttribute("aria-hidden", "true");

      this.rotor = document.createElement("span");
      this.rotor.className = "flip-card__rotor";

      this.front = document.createElement("span");
      this.front.className = "flip-card__face flip-card__face--front";
      original.forEach(node => this.front.appendChild(node));

      const glare = document.createElement("span");
      glare.className = "flip-card__glare";
      glare.setAttribute("aria-hidden", "true");
      this.front.appendChild(glare);
      this.rotor.appendChild(this.front);
      card.append(this.shadow, this.rotor);

      this.onPointerEnter = this.onPointerEnter.bind(this);
      this.onPointerMove = this.onPointerMove.bind(this);
      this.onPointerDown = this.onPointerDown.bind(this);
      this.onPointerUp = this.onPointerUp.bind(this);
      this.onPointerLeave = this.onPointerLeave.bind(this);
      this.frame = this.frame.bind(this);

      card.addEventListener("pointerenter", this.onPointerEnter, { passive: true });
      card.addEventListener("pointermove", this.onPointerMove, { passive: true });
      card.addEventListener("pointerdown", this.onPointerDown, { passive: true });
      card.addEventListener("pointerup", this.onPointerUp, { passive: true });
      card.addEventListener("pointercancel", this.onPointerUp, { passive: true });
      card.addEventListener("pointerleave", this.onPointerLeave, { passive: true });
    }

    onPointerEnter(event) {
      if (!reducedMotion && event.pointerType !== "touch") this.targetScale = 1.04;
      this.start();
    }

    onPointerMove(event) {
      const rect = this.card.getBoundingClientRect();
      const px = clamp((event.clientX - rect.left) / rect.width, 0, 1);
      const py = clamp((event.clientY - rect.top) / rect.height, 0, 1);
      this.card.style.setProperty("--fc-gx", `${px * 100}%`);
      this.card.style.setProperty("--fc-gy", `${py * 100}%`);
      this.card.style.setProperty("--fc-sheen", reducedMotion ? "0" : "1");

      if (!reducedMotion && event.pointerType !== "touch") {
        this.targetTiltX = (0.5 - py) * 24;
        this.targetTiltY = (px - 0.5) * 24;
        this.targetScale = 1.04;
      }
      this.start();
    }

    onPointerDown() {
      this.card.toggleAttribute("data-pressed", true);
      if (!reducedMotion) this.targetScale = 1.04;
      this.start();
    }

    onPointerUp() {
      this.card.removeAttribute("data-pressed");
      this.targetScale = this.card.matches(":hover") && !reducedMotion ? 1.04 : 1;
      this.start();
    }

    onPointerLeave() {
      this.card.removeAttribute("data-pressed");
      this.targetTiltX = 0;
      this.targetTiltY = 0;
      this.targetScale = 1;
      this.card.style.setProperty("--fc-sheen", "0");
      this.start();
    }

    start() {
      if (this.raf) return;
      this.last = performance.now();
      this.raf = requestAnimationFrame(this.frame);
    }

    frame(now) {
      this.raf = 0;
      const dt = Math.min(0.034, Math.max(0.001, (now - this.last) / 1000));
      this.last = now;
      const ease = reducedMotion ? 1 : 1 - Math.exp(-dt * 14);
      this.tiltX += (this.targetTiltX - this.tiltX) * ease;
      this.tiltY += (this.targetTiltY - this.tiltY) * ease;
      this.scale += (this.targetScale - this.scale) * ease;

      this.rotor.style.transform = reducedMotion
        ? "none"
        : `scale(${this.scale}) rotateX(${this.tiltX}deg) rotateY(${this.tiltY}deg)`;

      const moving =
        Math.abs(this.targetTiltX - this.tiltX) > 0.03 ||
        Math.abs(this.targetTiltY - this.tiltY) > 0.03 ||
        Math.abs(this.targetScale - this.scale) > 0.001;
      if (moving) this.raf = requestAnimationFrame(this.frame);
    }
  }

  const init = () => document.querySelectorAll(".menu-grid > .card").forEach(card => new AnimatedCard(card));
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
