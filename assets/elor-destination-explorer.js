(() => {
  'use strict';

  const explorer = document.querySelector('[data-destination-explorer]');
  const navigation = explorer?.querySelector('[data-destination-tabs]');
  if (!navigation) return;

  const panels = [...explorer.querySelectorAll('[data-destination-panel]')];
  const entries = [...navigation.querySelectorAll('a[data-destination-tab]')].map(tab => ({
    tab,
    panel: panels.find(panel => panel.dataset.destinationPanel === tab.dataset.destinationTab),
  }));
  if (!entries.length || entries.length !== panels.length ||
      entries.some(({tab, panel}) => !tab.id || !tab.hash || !panel?.id) ||
      new Set(entries.map(({panel}) => panel)).size !== panels.length) return;

  const desktop = matchMedia('(min-width: 1024px) and (hover: hover) and (pointer: fine)');
  let active = entries[0];
  let scrollMode;
  let scrollFrame = 0;

  function setTabStop(entry) {
    entries.forEach(item => { item.tab.tabIndex = item === entry ? 0 : -1; });
  }

  function updateSelection() {
    for (const item of entries) {
      const {tab, panel} = item;
      const selected = item === active;
      if (scrollMode) {
        if (selected) tab.setAttribute('aria-current', 'location');
        else tab.removeAttribute('aria-current');
      } else {
        tab.setAttribute('aria-selected', String(selected));
        panel.hidden = !selected;
      }
    }
    if (!scrollMode) setTabStop(active);
  }

  function select(entry) {
    if (active === entry) return false;
    active = entry;
    updateSelection();
    return true;
  }

  function updateFromScroll() {
    scrollFrame = 0;
    if (!scrollMode) return;

    const stickyTop = parseFloat(getComputedStyle(navigation).top);
    const readingLine = Math.max(stickyTop, navigation.getBoundingClientRect().top) + navigation.offsetHeight + 2;
    let current = entries[0];
    for (const entry of entries) {
      if (entry.panel.getBoundingClientRect().top > readingLine) break;
      current = entry;
    }
    select(current);
  }

  function scheduleScrollUpdate() {
    if (scrollMode && !scrollFrame) scrollFrame = requestAnimationFrame(updateFromScroll);
  }

  function applyMode() {
    if (scrollMode === desktop.matches) return;
    scrollMode = desktop.matches;
    explorer.toggleAttribute('data-destination-scroll', scrollMode);

    // Desktop presents a linked chapter index. The compact touch layout is a
    // tab interface because it removes unselected panels from the reading order.
    if (scrollMode) navigation.removeAttribute('role');
    else navigation.setAttribute('role', 'tablist');
    for (const {tab, panel} of entries) {
      if (scrollMode) {
        tab.removeAttribute('role');
        tab.removeAttribute('aria-controls');
        tab.removeAttribute('aria-selected');
        tab.removeAttribute('tabindex');
        panel.removeAttribute('role');
        panel.removeAttribute('aria-labelledby');
        panel.removeAttribute('tabindex');
        panel.hidden = false;
      } else {
        tab.setAttribute('role', 'tab');
        tab.setAttribute('aria-controls', panel.id);
        tab.removeAttribute('aria-current');
        panel.setAttribute('role', 'tabpanel');
        panel.setAttribute('aria-labelledby', tab.id);
        panel.tabIndex = 0;
      }
    }
    updateSelection();
    scheduleScrollUpdate();
  }

  function findDestination(hash) {
    if (!hash) return null;
    let id;
    try {
      id = decodeURIComponent(hash.slice(1));
    } catch {
      return null;
    }
    const target = document.getElementById(id);
    const panel = target?.closest('[data-destination-panel]');
    const entry = entries.find(item => item.panel === panel);
    return entry ? {entry, target} : null;
  }

  function reveal({entry, target}) {
    let changed = !scrollMode && select(entry);
    for (let element = target; element && element !== entry.panel; element = element.parentElement) {
      if (element.matches('details:not([open])')) {
        element.open = true;
        changed = true;
      }
    }
    return changed;
  }

  function syncLocation(initial = false) {
    const hash = location.hash;
    const destination = findDestination(hash);
    if (!destination) {
      if (!scrollMode && !hash) select(entries[0]);
      return;
    }

    const changed = reveal(destination);
    // Tab history entries use normal scroll restoration. A direct fragment may
    // have been hidden when the browser first tried to scroll to it.
    if (initial || (changed && !history.state?.elorDestinationTab)) {
      requestAnimationFrame(() => {
        if (location.hash === hash) {
          destination.target.scrollIntoView({block: 'start', behavior: 'instant'});
        }
      });
    }
  }

  function activateTab(entry) {
    if (!select(entry)) setTabStop(entry);
    if (location.hash !== entry.tab.hash) {
      history.pushState({...history.state, elorDestinationTab: true}, '', entry.tab.hash);
    }
  }

  navigation.addEventListener('keydown', event => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const index = entries.findIndex(({tab}) => tab === event.target);
    if (index < 0) return;

    let next;
    switch (event.key) {
      case 'ArrowLeft': next = (index + entries.length - 1) % entries.length; break;
      case 'ArrowRight': next = (index + 1) % entries.length; break;
      case 'Home': next = 0; break;
      case 'End': next = entries.length - 1; break;
      case 'Enter':
      case ' ':
        if (scrollMode) return;
        event.preventDefault();
        activateTab(entries[index]);
        return;
      default: return;
    }
    event.preventDefault();
    if (!scrollMode) setTabStop(entries[next]);
    entries[next].tab.focus({preventScroll: true});
  });

  navigation.addEventListener('focusout', event => {
    if (!scrollMode && !navigation.contains(event.relatedTarget)) setTabStop(active);
  });

  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.altKey || event.ctrlKey ||
        event.metaKey || event.shiftKey) return;
    const link = event.target.closest?.('a[href]');
    if (!link?.hash || (link.target && link.target !== '_self') || link.hasAttribute('download')) return;
    if (link.origin !== location.origin || link.pathname !== location.pathname || link.search !== location.search) return;
    const entry = entries.find(item => item.tab === link);
    if (entry && !scrollMode) {
      event.preventDefault();
      activateTab(entry);
      return;
    }

    // Reveal a same-page target before native link focus, history, and scrolling.
    const destination = findDestination(link.hash);
    if (destination) reveal(destination);
  });

  window.addEventListener('popstate', () => syncLocation());
  window.addEventListener('hashchange', () => syncLocation());
  window.addEventListener('scroll', scheduleScrollUpdate, {passive: true});
  window.addEventListener('resize', scheduleScrollUpdate);
  desktop.addEventListener('change', applyMode);
  if ('ResizeObserver' in window) new ResizeObserver(scheduleScrollUpdate).observe(explorer);
  applyMode();
  syncLocation(true);
  navigation.hidden = false;
})();
