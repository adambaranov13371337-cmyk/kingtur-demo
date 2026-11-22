(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const root = document.documentElement;
  const rail = document.querySelector('.rail');
  const story = document.querySelector('.service-story');
  const stage = document.querySelector('.pin-stage');
  const photos = story ? [...story.querySelectorAll('.story-images img')] : [];
  const steps = story ? [...story.querySelectorAll('.steps li')] : [];
  const hero = document.querySelector('.hero-photo');
  const menu = document.querySelector('.nav-menu');
  const clamp = (x, max) => Math.min(max, Math.max(0, x));
  let activeStep = -1;
  let paintFrame = 0;
  let activeFrame = 0;
  let activeNode = null;
  let destination = 0;
  let previousTime = 0;

  function paint() {
    paintFrame = 0;
    if (hero && !reduced.matches && innerWidth > 760) {
      hero.style.setProperty('--shift', Math.min(8, scrollY * 0.04) + 'px');
    }
    if (!story) return;
    const rect = story.getBoundingClientRect();
    const distance = rect.height - stage.offsetHeight;
    const step = distance > 20 ? Math.min(2, Math.floor(clamp(-rect.top / distance, 1) * 3)) : 0;
    if (step === activeStep) return;
    steps.forEach((item, index) => item.classList.toggle('is-current', index === step));
    photos.forEach((item, index) => item.classList.toggle('is-current', index === step));
    activeStep = step;
  }

  function schedulePaint() {
    if (!paintFrame) paintFrame = requestAnimationFrame(paint);
  }
  function stopWheel() {
    cancelAnimationFrame(activeFrame);
    activeFrame = 0;
    activeNode = null;
  }
  function position(node) { return node === window ? scrollY : node.scrollLeft; }
  function limit(node) { return node === window ? Math.max(0, root.scrollHeight - innerHeight) : node.scrollWidth - node.clientWidth; }
  function scrollAt(node, value) {
    if (node === window) window.scrollTo({top:value, behavior:'instant'});
    else node.scrollLeft = value;
  }
  function tick(time) {
    const node = activeNode;
    if (!node) return;
    const current = position(node);
    const difference = destination - current;
    if (Math.abs(difference) < 1.4) {
      scrollAt(node, destination);
      stopWheel();
      return;
    }
    const dt = Math.min(48, Math.max(1, time - previousTime));
    previousTime = time;
    const shift = Math.sign(difference) * Math.max(1, Math.abs(difference) * (1 - Math.exp(-dt / 74)));
    scrollAt(node, current + shift);
    activeFrame = requestAnimationFrame(tick);
  }
  function move(node, delta) {
    const base = activeNode === node ? destination : position(node);
    const next = clamp(base + delta, limit(node));
    if (Math.abs(next - base) < .5) return false;
    if (reduced.matches) {
      scrollAt(node, next);
      return true;
    }
    if (node !== activeNode) {
      if (activeNode && activeNode !== window) scrollAt(activeNode, destination);
      stopWheel();
      activeNode = node;
    }
    destination = next;
    if (!activeFrame) {
      previousTime = performance.now() - 15;
      activeFrame = requestAnimationFrame(tick);
    }
    return true;
  }
  window.addEventListener('wheel', (event) => {
    if (!event.cancelable || event.ctrlKey || event.target.closest('input, textarea, select, dialog[open]')) return;
    const factor = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1;
    const dy = event.deltaY * factor;
    const dx = event.deltaX * factor;
    if (rail && rail.contains(event.target) && move(rail, Math.abs(dx) > Math.abs(dy) ? dx : dy)) {
      event.preventDefault();
      return;
    }
    if (!reduced.matches && Math.abs(dy) >= Math.abs(dx) && move(window, dy)) event.preventDefault();
  }, {passive:false});

  rail?.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    if (move(rail, (event.key === 'ArrowRight' ? 1 : -1) * rail.clientWidth * .72)) event.preventDefault();
  });
  document.addEventListener('pointerdown', stopWheel, {passive:true});
  document.addEventListener('keydown', (event) => {
    if (!['ArrowLeft','ArrowRight'].includes(event.key)) stopWheel();
    if (event.key === 'Escape' && menu?.open) {
      menu.open = false;
      menu.querySelector('summary').focus();
    }
  });
  document.addEventListener('click', (event) => {
    if (menu?.open && (!menu.contains(event.target) || event.target.closest('a'))) menu.open = false;
  });
  window.addEventListener('scroll', schedulePaint, {passive:true});
  window.addEventListener('resize', () => {stopWheel(); schedulePaint();});
  reduced.addEventListener('change', () => {stopWheel(); schedulePaint();});
  root.classList.add('motion-ready');
  paint();
})();
