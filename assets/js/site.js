// Dr.32: a calm hero video (leaf shadows drifting past a faceted porcelain tooth), a floating header,
// a hero that stays put and turns translucent as the page slides over it, and motion that answers the visitor.
//
// Ayush's call (31 Oct 2026): the motion runs for everyone, even with the phone's Reduce Motion setting on,
// because many iPhones have it on and the site looked static. To honour that setting again, return early from
// the video and GSAP blocks when matchMedia("(prefers-reduced-motion: reduce)").matches is true.
(function () {
  var gsap = window.gsap;

  // Floating header: firmer glass once the page has moved.
  var head = document.querySelector(".site-head");
  if (head) {
    var onScroll = function () { head.classList.toggle("is-scrolled", window.scrollY > 8); };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  // First-visit steps: the line ends at the centre of the last number, at every width.
  var wrap = document.querySelector(".steps-wrap");
  if (wrap) {
    var sizeLine = function () {
      var nums = wrap.querySelectorAll(".steps .num");
      if (!nums.length) return;
      var last = nums[nums.length - 1].getBoundingClientRect();
      var box = wrap.getBoundingClientRect();
      wrap.style.setProperty("--line-end", Math.max(0, box.bottom - (last.top + last.height / 2)) + "px");
    };
    sizeLine();
    if ("ResizeObserver" in window) new ResizeObserver(sizeLine).observe(wrap);
    else window.addEventListener("resize", sizeLine);
  }

  // Hero video. The cut is chosen by screen size (9:16 phone, 16:9 wider) and swapped if that changes,
  // e.g. on rotation. It starts after the page has loaded and plays only while the hero is on screen.
  // The poster underneath is its first frame, so the fade-in has no jump.
  var video = document.querySelector(".hero-video");
  if (video && "IntersectionObserver" in window) {
    var phone = window.matchMedia("(max-width: 759px)");
    var ua = navigator.userAgent;
    var appleWebKit = /AppleWebKit/.test(ua) && !/Chrome|Chromium|Edg|OPR/.test(ua);
    var webm = !appleWebKit && video.canPlayType('video/webm; codecs="vp9"') === "probably";
    var inView = false;
    var wanted = function () {
      return "assets/video/hero-" + (phone.matches ? "mobile" : "desktop") + (webm ? ".webm" : ".mp4");
    };
    var useSource = function () {
      var src = wanted();
      if (video.getAttribute("src") === src) return;
      video.classList.remove("is-playing");
      video.setAttribute("src", src);
    };
    // If the browser refuses autoplay (iPhone Low Power Mode, data saver), the first tap anywhere starts it.
    var waitingForTap = false;
    var onTap = function () {
      waitingForTap = false;
      document.removeEventListener("pointerdown", onTap);
      document.removeEventListener("touchend", onTap);
      if (inView) play();
    };
    var play = function () {
      useSource();
      var p = video.play();
      if (p && p.catch) p.catch(function () {
        if (waitingForTap) return;
        waitingForTap = true;
        document.addEventListener("pointerdown", onTap, { passive: true });
        document.addEventListener("touchend", onTap, { passive: true });
      });
    };
    video.addEventListener("playing", function () { video.classList.add("is-playing"); });
    var start = function () {
      useSource();
      var swap = function () { useSource(); if (inView) play(); };
      if (phone.addEventListener) phone.addEventListener("change", swap);
      else if (phone.addListener) phone.addListener(swap);
      new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          inView = entry.isIntersecting;
          if (inView) play(); else video.pause();
        });
      }, { threshold: 0.15 }).observe(video.closest(".hero") || video);
    };
    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });
  }

  if (!gsap) return;

  // Page-load: the hero text settles in.
  gsap.from(".hero .reveal", { y: 22, opacity: 0, duration: 0.8, stagger: 0.09, ease: "power3.out" });

  if (window.ScrollTrigger) {
    gsap.registerPlugin(window.ScrollTrigger);

    // The hero stays in place while the rest of the page floats up over it as a sheet.
    // On tall phone heroes the pin starts once the whole hero has been seen.
    var hero = document.querySelector(".hero");
    if (hero) {
      var range = {
        trigger: hero,
        start: function () { return hero.offsetHeight > window.innerHeight ? "bottom bottom" : "top top"; },
        end: function () { return "+=" + Math.min(hero.offsetHeight, window.innerHeight); },
        invalidateOnRefresh: true
      };
      window.ScrollTrigger.create(Object.assign({ pin: true, pinSpacing: false }, range));
      // As it is covered, the hero turns translucent: text lifts away, the media fades and drifts at most 40px.
      gsap.timeline({ scrollTrigger: Object.assign({ scrub: true }, range) })
        .to(".hero-text", { opacity: 0, y: -48, ease: "none" }, 0)
        .to(".hero-media", { opacity: 0.45, y: 40, ease: "none" }, 0);
    }

    // The first-visit line fills as you scroll through the steps.
    gsap.fromTo(".steps-wrap .progress", { scaleY: 0 }, {
      scaleY: 1, ease: "none",
      scrollTrigger: { trigger: ".steps-wrap", start: "top 75%", end: "bottom 55%", scrub: 0.6 }
    });
  }
})();
