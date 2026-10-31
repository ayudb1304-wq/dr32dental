// Dr.32: one orchestrated moment (the 32-tooth chart), plus motion that answers the visitor.
(function () {
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var gsap = window.gsap;
  var teeth = Array.prototype.slice.call(document.querySelectorAll(".chart .tooth"))
    .sort(function (a, b) { return +a.dataset.n - +b.dataset.n; });
  var count = document.querySelector(".chart .count");
  var gum = document.querySelector(".chart .gum");

  // Hovering a tooth lights it up. Works with or without GSAP.
  teeth.forEach(function (t) {
    t.addEventListener("pointerenter", function () {
      t.classList.add("lit");
      if (gsap && !reduce) gsap.to(t, { scale: 1.22, duration: 0.2, ease: "power2.out", transformOrigin: "50% 50%" });
    });
    t.addEventListener("pointerleave", function () {
      t.classList.remove("lit");
      if (gsap && !reduce) gsap.to(t, { scale: 1, duration: 0.35, ease: "power2.out", transformOrigin: "50% 50%" });
    });
  });

  if (!gsap || reduce) return;

  // Page-load sequence: the teeth appear in the order dentists number them (1 to 32),
  // and the counter in the middle counts along with them.
  var tl = gsap.timeline({ defaults: { ease: "power3.out" } });
  tl.from(".hero .reveal", { y: 22, opacity: 0, duration: 0.8, stagger: 0.09 }, 0);

  if (gum && gum.getTotalLength) {
    var len = gum.getTotalLength();
    gsap.set(gum, { strokeDasharray: len, strokeDashoffset: len });
    tl.to(gum, { strokeDashoffset: 0, duration: 1.7, ease: "power2.inOut" }, 0.1);
  }

  var n = 0;
  if (count) count.textContent = "0";
  gsap.set(teeth, { opacity: 0, scale: 0.2, transformOrigin: "50% 50%" });
  tl.to(teeth, {
    opacity: 1,
    scale: 1,
    duration: 0.38,
    ease: "back.out(2.4)",
    stagger: {
      each: 0.045,
      onStart: function () { n += 1; if (count) count.textContent = String(n); }
    }
  }, 0.3);
  if (count) tl.fromTo(count, { scale: 1 }, { scale: 1.08, duration: 0.18, yoyo: true, repeat: 1, transformOrigin: "50% 50%", ease: "power2.out" });

  // The first-visit line fills as you scroll through the steps.
  if (window.ScrollTrigger) {
    gsap.registerPlugin(window.ScrollTrigger);
    gsap.fromTo(".steps-wrap .progress", { scaleY: 0 }, {
      scaleY: 1, ease: "none",
      scrollTrigger: { trigger: ".steps-wrap", start: "top 75%", end: "bottom 55%", scrub: 0.6 }
    });
  }
})();
