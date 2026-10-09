/**
 * carousel.js
 * Self-contained horizontal carousel widget.
 *
 * Takes an array of items and a render function, builds the track,
 * wires autoplay + dots + prev/next + swipe. Returns a controller.
 *
 * Usage:
 *   const c = createCarousel({
 *     root,
 *     trackEl: root.querySelector('[data-carousel-track]'),
 *     dotsEl:  root.querySelector('[data-carousel-dots]'),
 *     prevEl:  root.querySelector('[data-carousel-prev]'),
 *     nextEl:  root.querySelector('[data-carousel-next]'),
 *     items,
 *     renderSlide: (item) => TrendingSlide(item),
 *     interval: 5000,
 *   });
 *   c.destroy();
 */

export function createCarousel({
  root,
  trackEl,
  dotsEl,
  prevEl,
  nextEl,
  items = [],
  renderSlide,
  interval = 5000,
}) {
  if (!root || !trackEl || !renderSlide) return { destroy() {} };

  let idx = 0;
  let timer = null;
  let x0 = null;

  const slides = items.map(renderSlide);
  trackEl.innerHTML = '';
  slides.forEach(s => trackEl.appendChild(s));

  dotsEl.innerHTML = '';
  slides.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.className = 'trending-dot' + (i === 0 ? ' active' : '');
    dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
    dot.addEventListener('click', () => { go(i); restart(); });
    dotsEl.appendChild(dot);
  });

  const dots = dotsEl.querySelectorAll('.trending-dot');
  const n = slides.length;

  function go(i) {
    if (!n) return;
    idx = ((i % n) + n) % n;
    trackEl.style.transform = `translateX(-${idx * 100}%)`;
    dots.forEach((d, k) => d.classList.toggle('active', k === idx));
  }
  function next() { go(idx + 1); }
  function prev() { go(idx - 1); }

  function start()   { stop(); if (n > 1) timer = setInterval(next, interval); }
  function stop()    { if (timer) { clearInterval(timer); timer = null; } }
  function restart() { start(); }

  const onPrevClick = () => { prev(); restart(); };
  const onNextClick = () => { next(); restart(); };
  prevEl?.addEventListener('click', onPrevClick);
  nextEl?.addEventListener('click', onNextClick);

  const onEnter = stop;
  const onLeave = start;
  const onTouchStart = (e) => { stop(); x0 = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    if (x0 == null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 40) dx < 0 ? next() : prev();
    x0 = null;
    start();
  };

  root.addEventListener('mouseenter', onEnter);
  root.addEventListener('mouseleave', onLeave);
  root.addEventListener('touchstart', onTouchStart, { passive: true });
  root.addEventListener('touchend', onTouchEnd, { passive: true });

  start();

  return {
    destroy() {
      stop();
      prevEl?.removeEventListener('click', onPrevClick);
      nextEl?.removeEventListener('click', onNextClick);
      root.removeEventListener('mouseenter', onEnter);
      root.removeEventListener('mouseleave', onLeave);
      root.removeEventListener('touchstart', onTouchStart);
      root.removeEventListener('touchend', onTouchEnd);
    },
  };
}