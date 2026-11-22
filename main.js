(() => {
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const menu = document.querySelector('.nav-menu');
  const bound = (value, max) => Math.min(max, Math.max(0, value));

  const cover = document.querySelector('.cover');
  if (cover) {
    const selector = cover.querySelector('.place-selector');
    const buttons = [...selector.querySelectorAll('button')];
    const images = [...cover.querySelectorAll('.cover-image')];
    const caption = cover.querySelector('.place-caption');
    selector.hidden = false;
    buttons.forEach((button, index) => {
      button.addEventListener('click', () => {
        buttons.forEach((item, i) => {
          item.setAttribute('aria-pressed', String(i === index));
          images[i].classList.toggle('is-current', i === index);
          images[i].setAttribute('aria-hidden', String(i !== index));
        });
        caption.textContent = button.dataset.caption;
      });
    });
  }

  const story = document.querySelector('.service-story');
  const stage = story?.querySelector('.pin-stage');
  const steps = story ? [...story.querySelectorAll('.steps li')] : [];
  const storyPhotos = story ? [...story.querySelectorAll('.story-images img')] : [];
  let previousStep = -1;
  let paintFrame = 0;
  function paintStory() {
    paintFrame = 0;
    if (!story) return;
    const rect = story.getBoundingClientRect();
    const distance = rect.height - stage.offsetHeight;
    const progress = distance > 20 ? bound(-rect.top / distance, 1) : 0;
    const step = Math.min(steps.length - 1, Math.floor(progress * steps.length));
    if (step === previousStep) return;
    steps.forEach((item, i) => {
      item.classList.toggle('is-current', i === step);
      storyPhotos[i].classList.toggle('is-current', i === step);
      storyPhotos[i].setAttribute('aria-hidden', String(i !== step));
    });
    previousStep = step;
  }
  function scheduleStory() {
    if (story && !paintFrame) paintFrame = requestAnimationFrame(paintStory);
  }

  let scrollFrame = 0;
  let scrollNode = null;
  let target = 0;
  let previousTime = 0;
  const position = node => node === window ? scrollY : node.scrollLeft;
  const limit = node => node === window ? root.scrollHeight - innerHeight : node.scrollWidth - node.clientWidth;
  function scrollAt(node, value) {
    node.scrollTo(node === window ? {top:value,behavior:'instant'} : {left:value,behavior:'instant'});
  }
  function stopScroll() {
    cancelAnimationFrame(scrollFrame);
    scrollFrame = 0;
    scrollNode = null;
  }
  function tick(time) {
    const difference = target - position(scrollNode);
    if (Math.abs(difference) < 1.5) {
      scrollAt(scrollNode,target);
      stopScroll();
      return;
    }
    const dt = Math.min(48,Math.max(1,time - previousTime));
    previousTime = time;
    const shift = Math.sign(difference) * Math.max(1,Math.abs(difference)*(1 - Math.exp(-dt/72)));
    scrollAt(scrollNode,position(scrollNode) + shift);
    scrollFrame = requestAnimationFrame(tick);
  }
  function move(node, delta) {
    const base = node === scrollNode ? target : position(node);
    const next = bound(base + delta,limit(node));
    if (Math.abs(next - base) < .5) return false;
    if (node !== scrollNode) {
      if (scrollNode && scrollNode !== window) scrollAt(scrollNode,target);
      stopScroll();
    }
    if (reduced.matches) {
      scrollAt(node,next);
      return true;
    }
    scrollNode = node;
    target = next;
    if (!scrollFrame) {
      previousTime = performance.now() - 15;
      scrollFrame = requestAnimationFrame(tick);
    }
    return true;
  }
  window.addEventListener('wheel', event => {
    if (!event.cancelable || event.ctrlKey || event.metaKey || event.target.closest('input,textarea,select,.menu,dialog[open],table')) return;
    const factor = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1;
    const dy = event.deltaY * factor;
    const dx = event.deltaX * factor;
    const rail = event.target.closest('.rail');
    if (rail && move(rail,Math.abs(dx) > Math.abs(dy) ? dx : dy)) {
      event.preventDefault();
      return;
    }
    if (!reduced.matches && Math.abs(dy) >= Math.abs(dx) && move(window,dy)) event.preventDefault();
  },{passive:false});

  for (const rail of document.querySelectorAll('.rail')) {
    rail.addEventListener('keydown', event => {
      const direction = {ArrowRight:1,ArrowLeft:-1}[event.key];
      if (!direction) return;
      if (move(rail,direction * rail.clientWidth * .72)) event.preventDefault();
    });
  }

  const albums = document.querySelectorAll('.album');
  if (albums.length && 'showModal' in HTMLDialogElement.prototype) {
    const viewer = document.createElement('dialog');
    viewer.className = 'photo-dialog';
    viewer.setAttribute('aria-label','Просмотр фотографий');
    viewer.innerHTML = '<div class="viewer-toolbar"><button type="button" class="prev" aria-label="Предыдущая фотография">←</button><button type="button" class="next" aria-label="Следующая фотография">→</button><button type="button" class="close">Закрыть</button></div><figure><img alt=""><figcaption aria-live="polite"></figcaption></figure>';
    document.body.append(viewer);
    const photo = viewer.querySelector('img');
    let links = [], index = 0, trigger = null;
    function showImage(i) {
      index = (i + links.length) % links.length;
      const link = links[index];
      photo.src = link.dataset.photo;
      photo.alt = link.querySelector('img').alt;
      viewer.querySelector('figcaption').textContent = photo.alt;
    }
    albums.forEach(album => {
      album.addEventListener('click', event => {
        const link = event.target.closest('[data-photo]');
        if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        event.preventDefault(); stopScroll();
        trigger = link;
        links = [...album.querySelectorAll('[data-photo]')];
        showImage(links.indexOf(link));
        viewer.showModal();
        viewer.querySelector('.close').focus({preventScroll:true});
      });
    });
    viewer.querySelector('.prev').onclick = () => showImage(index - 1);
    viewer.querySelector('.next').onclick = () => showImage(index + 1);
    viewer.querySelector('.close').onclick = () => viewer.close();
    viewer.addEventListener('click', e => { if (e.target === viewer) viewer.close(); });
    viewer.addEventListener('close', () => { trigger?.focus({preventScroll:true}); });
    viewer.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault(); showImage(index + (e.key === 'ArrowRight' ? 1 : -1));
      }
    });
  }
  document.addEventListener('pointerdown',stopScroll,{passive:true});
  document.addEventListener('touchstart',stopScroll,{passive:true});
  document.addEventListener('keydown', e => {
    if (!['ArrowLeft','ArrowRight'].includes(e.key)) stopScroll();
    if (e.key === 'Escape' && menu?.open) {
      menu.open = false;
      menu.querySelector('summary').focus();
    }
  });
  document.addEventListener('click', e => {
    if (menu?.open && (!menu.contains(e.target) || e.target.closest('a'))) menu.open = false;
  });
  window.addEventListener('scroll',scheduleStory,{passive:true});
  window.addEventListener('resize',() => { stopScroll();scheduleStory(); });
  reduced.addEventListener('change',() => { stopScroll();scheduleStory(); });
  root.classList.add('motion-ready');
  paintStory();
})();
