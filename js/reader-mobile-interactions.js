export function bindMobileReaderInteractions({
  mobilePreviousChapter,
  mobileNextChapter,
  pullRefreshIndicator,
  pullRefreshLabel,
  appShell,
  sidebar,
  feedbackDialog,
  uiText,
  navigate,
  openSidebar,
  closeSidebar,
}) {
  bindMobileChapterButtons();
  bindMobilePullToRefresh();
  bindMobileSidebarSwipe();

  function bindMobileChapterButtons() {
    for (const [button, offset] of [
      [mobilePreviousChapter, -1],
      [mobileNextChapter, 1]
    ]) {
      button.addEventListener("click", () => {
        navigate(offset);
        button.classList.remove("did-navigate");
        void button.offsetWidth;
        button.classList.add("did-navigate");
      });
      button.addEventListener("animationend", (event) => {
        if (event.animationName === "chapter-tap") button.classList.remove("did-navigate");
      });
    }
  }

  function bindMobilePullToRefresh() {
    const threshold = 72;
    const maxDistance = 96;
    const excludedTargets = "button, a, input, textarea, select, [contenteditable='true'], dialog[open], .search-results, .sidebar, .chapter-popover, .edition-options, .mobile-chapter-cues";
    let startX = null;
    let startY = null;
    let distance = 0;

    const reset = () => {
      startX = null;
      startY = null;
      distance = 0;
      document.body.classList.remove("is-pull-refreshing", "is-pull-refresh-ready");
      pullRefreshIndicator.setAttribute("aria-hidden", "true");
      pullRefreshIndicator.style.removeProperty("--pull-refresh-offset");
      pullRefreshIndicator.style.removeProperty("--pull-refresh-progress");
    };
    const isAtTop = () => window.scrollY <= 0 && (document.scrollingElement?.scrollTop ?? 0) <= 0;

    document.addEventListener("touchstart", (event) => {
      if (
        event.touches.length !== 1 ||
        !isAtTop() ||
        (event.target instanceof Element && event.target.closest(excludedTargets))
      ) {
        reset();
        return;
      }

      startX = event.touches[0].clientX;
      startY = event.touches[0].clientY;
    }, { passive: true });

    document.addEventListener("touchmove", (event) => {
      if (startY === null || event.touches.length !== 1 || !isAtTop()) {
        reset();
        return;
      }

      const touch = event.touches[0];
      const deltaX = touch.clientX - startX;
      const deltaY = touch.clientY - startY;
      if (deltaY <= 0 || Math.abs(deltaX) > Math.abs(deltaY)) {
        reset();
        return;
      }

      if (event.cancelable) event.preventDefault();
      distance = Math.min(deltaY * 0.6, maxDistance);
      const ready = distance >= threshold;
      document.body.classList.toggle("is-pull-refreshing", distance > 0);
      document.body.classList.toggle("is-pull-refresh-ready", ready);
      pullRefreshIndicator.setAttribute("aria-hidden", "false");
      pullRefreshLabel.textContent = uiText(ready ? "releaseToRefresh" : "pullToRefresh");
      pullRefreshIndicator.style.setProperty("--pull-refresh-offset", `${distance}px`);
      pullRefreshIndicator.style.setProperty(
        "--pull-refresh-progress",
        `${Math.min(distance / threshold, 1) * 360}deg`,
      );
    }, { passive: false });

    document.addEventListener("touchend", () => {
      if (startY === null) return;
      const shouldRefresh = distance >= threshold;
      startX = null;
      startY = null;
      if (!shouldRefresh) {
        reset();
        return;
      }

      document.body.classList.add("is-refreshing");
      document.body.classList.remove("is-pull-refresh-ready");
      pullRefreshLabel.textContent = uiText("refreshing");
      pullRefreshIndicator.setAttribute("aria-label", uiText("refreshing"));
      pullRefreshIndicator.style.setProperty("--pull-refresh-offset", "88px");
      requestAnimationFrame(() => window.location.reload());
    }, { passive: true });

    document.addEventListener("touchcancel", reset, { passive: true });
  }

  function bindMobileSidebarSwipe() {
    const edgeWidth = 28;
    const swipeThreshold = 72;
    const excludedTargets = "button, a, input, textarea, select, [contenteditable='true'], dialog[open], .search-wrap, .sidebar, .sidebar-scrim, .chapter-popover, .edition-options, .mobile-chapter-cues";
    let startX = null;
    let startY = null;
    let gesture = null;

    const reset = () => {
      startX = null;
      startY = null;
      gesture = null;
    };

    document.addEventListener("touchstart", (event) => {
      const target = event.target;
      if (
        window.innerWidth > 640 ||
        event.touches.length !== 1 ||
        appShell.classList.contains("is-quiet-reading") ||
        feedbackDialog.open
      ) {
        reset();
        return;
      }

      const touch = event.touches[0];
      if (sidebar.classList.contains("is-open")) {
        if (!(target instanceof Element) || !sidebar.contains(target)) {
          reset();
          return;
        }
        gesture = "close";
        startX = touch.clientX;
        startY = touch.clientY;
        return;
      }

      if (target instanceof Element && target.closest(excludedTargets)) {
        reset();
        return;
      }
      if (touch.clientX > edgeWidth) {
        reset();
        return;
      }
      gesture = "open";
      startX = touch.clientX;
      startY = touch.clientY;
    }, { passive: true });

    document.addEventListener("touchmove", (event) => {
      if (startX === null || startY === null || event.touches.length !== 1) return;
      const touch = event.touches[0];
      const deltaX = touch.clientX - startX;
      const deltaY = touch.clientY - startY;
      const directionalDeltaX = gesture === "close" ? -deltaX : deltaX;
      if (directionalDeltaX > 12 && directionalDeltaX > Math.abs(deltaY)) {
        if (event.cancelable) event.preventDefault();
      } else if (Math.abs(deltaY) > 32 || directionalDeltaX < 0) {
        reset();
      }
    }, { passive: false });

    document.addEventListener("touchend", (event) => {
      if (startX === null || startY === null) return;
      const touch = event.changedTouches[0];
      const deltaX = touch ? touch.clientX - startX : 0;
      const deltaY = touch ? touch.clientY - startY : 0;
      const isHorizontalSwipe = Math.abs(deltaX) >= swipeThreshold && Math.abs(deltaX) > Math.abs(deltaY) * 1.25;
      const shouldOpen = gesture === "open" && isHorizontalSwipe && deltaX > 0;
      const shouldClose = gesture === "close" && isHorizontalSwipe && deltaX < 0;
      reset();
      if (shouldOpen) openSidebar();
      if (shouldClose) closeSidebar();
    }, { passive: true });

    document.addEventListener("touchcancel", reset, { passive: true });
  }
}
