/**
 * Wedding Invitation Interactive Controller
 * Follows exact flow:
 * Step 1: Initial Cover Card -> Swipe left / drag / tap to go to Step 2
 * Step 2: Blank Folded Invitation -> Tap / swipe left to unfold 3-panel invitation (swipe right to go back to cover)
 * Step 3: Unfolded 3-Panel Spread (Left: QR codes 25%, Center: Details 50%, Right: Calendar 25%)
 *         Fold button or swipe right returns to Step 2
 */

function initInvitationApp() {
  // DOM Elements
  const stepCover = document.getElementById('stepCover');
  const stepBook = document.getElementById('stepBook');
  const coverCard = document.getElementById('coverCard');
  const bookContainer = document.getElementById('bookContainer');
  const panelCenter = document.getElementById('panelCenter');
  const flapLeft = document.getElementById('flapLeft');
  const flapRight = document.getElementById('flapRight');
  const foldedPrompt = document.getElementById('foldedPrompt');
  const btnBackToCover = document.getElementById('btnBackToCover');
  const btnCloseBook = document.getElementById('btnCloseBook');
  const qrChurch = document.getElementById('qrChurch');
  const qrReception = document.getElementById('qrReception');

  // Navigation State
  let currentStep = 1; // 1 = Cover, 2 = Folded Invitation, 3 = Unfolded 3-Panel Spread
  let isAnimating = false;
  let animTimer = null;
  let justSwiped = false;

  function setAnimating(durationMs, callback) {
    isAnimating = true;
    if (animTimer) clearTimeout(animTimer);
    animTimer = setTimeout(() => {
      isAnimating = false;
      if (typeof callback === 'function') {
        callback();
      }
    }, durationMs);
  }

  // =========================================================================
  // STEP TRANSITIONS
  // =========================================================================

  // STEP 1 -> STEP 2: Transition from Cover to Folded Invitation
  function goToStep2() {
    if (currentStep !== 1 || isAnimating) return;

    stepCover.classList.add('slide-out');

    setAnimating(450, () => {
      stepCover.classList.remove('active', 'slide-out');

      // Ensure invitation starts in folded state
      bookContainer.classList.remove('unfolded', 'animating');
      bookContainer.classList.add('folded');
      stepBook.classList.remove('book-is-open');

      // Activate Step 2
      stepBook.classList.add('active');
      currentStep = 2;
      updateResponsiveLayout();
    });
  }

  // STEP 2 -> STEP 1: Back to Cover
  function goToStep1() {
    if (currentStep !== 2 || isAnimating) return;

    stepBook.classList.remove('active');

    setAnimating(350, () => {
      stepCover.classList.remove('slide-out');
      stepCover.classList.add('active');
      currentStep = 1;
      updateResponsiveLayout();
    });
  }

  // STEP 2 -> STEP 3: Unfold Three-Panel Invitation Animation
  function unfoldInvitation() {
    if (currentStep !== 2 || isAnimating) return;

    if (navigator.vibrate) {
      try { navigator.vibrate(15); } catch (_) {}
    }

    bookContainer.classList.add('animating');
    bookContainer.classList.remove('folded');
    bookContainer.classList.add('unfolded');
    stepBook.classList.add('book-is-open');

    setAnimating(1250, () => {
      bookContainer.classList.remove('animating');
      currentStep = 3;
    });
  }

  // STEP 3 -> STEP 2: Fold Three-Panel Invitation Animation
  function foldInvitation(onFinished) {
    if (currentStep !== 3 || isAnimating) return;

    if (navigator.vibrate) {
      try { navigator.vibrate(15); } catch (_) {}
    }

    bookContainer.classList.add('animating');
    bookContainer.classList.remove('unfolded');
    bookContainer.classList.add('folded');
    stepBook.classList.remove('book-is-open');

    setAnimating(1250, () => {
      bookContainer.classList.remove('animating');
      currentStep = 2;
      if (typeof onFinished === 'function') {
        onFinished();
      }
    });
  }

  // =========================================================================
  // GESTURE & SWIPE CONTROLLER (Touch & Mouse unified)
  // Supports:
  // - Tap / click to advance
  // - Horizontal swipe / drag (left: next/unfold, right: back/fold)
  // - Ignores vertical drags to prevent accidental navigation during scroll
  // =========================================================================

  function enableHorizontalGestures(element, { onSwipeLeft, onSwipeRight }) {
    let startX = 0;
    let startY = 0;
    let startTime = 0;
    let isTracking = false;

    element.addEventListener('pointerdown', (e) => {
      // Don't intercept clicks on navigation buttons or QR hotspots
      if (e.target.closest('.nav-btn') || e.target.closest('.qr-hitbox')) {
        return;
      }
      // For mouse, only track left button
      if (e.pointerType === 'mouse' && e.button !== 0) {
        return;
      }

      startX = e.clientX;
      startY = e.clientY;
      startTime = Date.now();
      isTracking = true;
    }, { passive: true });

    element.addEventListener('pointermove', () => {
      if (!isTracking) return;
    }, { passive: true });

    element.addEventListener('pointerup', (e) => {
      if (!isTracking) return;
      isTracking = false;

      const diffX = e.clientX - startX;
      const diffY = e.clientY - startY;
      const absX = Math.abs(diffX);
      const absY = Math.abs(diffY);
      const elapsed = Date.now() - startTime;

      // Require at least 35px horizontal travel AND horizontal dominance over vertical
      if (absX >= 35 && absX > absY * 1.25 && elapsed < 1000) {
        justSwiped = true;
        setTimeout(() => { justSwiped = false; }, 300);

        if (diffX < 0 && typeof onSwipeLeft === 'function') {
          onSwipeLeft();
        } else if (diffX > 0 && typeof onSwipeRight === 'function') {
          onSwipeRight();
        }
      }
    }, { passive: true });

    element.addEventListener('pointercancel', () => {
      isTracking = false;
    }, { passive: true });
  }

  // Step 1 Cover Gestures: Swipe left to go to Step 2
  enableHorizontalGestures(stepCover, {
    onSwipeLeft: () => {
      if (currentStep === 1) goToStep2();
    }
  });

  // Step 2 & 3 Book Gestures
  enableHorizontalGestures(stepBook, {
    onSwipeLeft: () => {
      if (currentStep === 2) unfoldInvitation();
    },
    onSwipeRight: () => {
      if (currentStep === 3) {
        foldInvitation();
      } else if (currentStep === 2) {
        goToStep1();
      }
    }
  });

  // =========================================================================
  // CLICK & TAP HANDLERS
  // =========================================================================

  // Step 1: Click or tap cover to advance to Step 2
  coverCard.addEventListener('click', () => {
    if (justSwiped) return;
    if (currentStep === 1) {
      goToStep2();
    }
  });

  // Step 2: Click or tap closed folded invitation to unfold
  bookContainer.addEventListener('click', (e) => {
    if (justSwiped || isAnimating) return;
    if (e.target.closest('.qr-hitbox') || e.target.closest('.nav-btn')) return;

    if (currentStep === 2) {
      unfoldInvitation();
    }
  });

  // Step 3: Tap center panel to fold invitation
  if (panelCenter) {
    panelCenter.addEventListener('click', () => {
      if (justSwiped || isAnimating) return;
      if (currentStep === 3) {
        foldInvitation();
      }
    });
  }

  // Top Nav: Close / Fold Button
  btnCloseBook.addEventListener('click', (e) => {
    e.stopPropagation();
    if (currentStep === 3) {
      foldInvitation();
    }
  });

  // Top Nav: Back to Cover Button
  btnBackToCover.addEventListener('click', (e) => {
    e.stopPropagation();
    if (currentStep === 3) {
      foldInvitation(() => {
        goToStep1();
      });
    } else if (currentStep === 2) {
      goToStep1();
    }
  });

  // Keyboard navigation support (Arrow keys, Space, Enter, Escape)
  document.addEventListener('keydown', (e) => {
    if (isAnimating) return;

    if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') {
      if (currentStep === 1) {
        goToStep2();
      } else if (currentStep === 2) {
        unfoldInvitation();
      }
    } else if (e.key === 'ArrowLeft' || e.key === 'Escape') {
      if (currentStep === 3) {
        foldInvitation();
      } else if (currentStep === 2) {
        goToStep1();
      }
    }
  });

  // QR Hotspots: allow default navigation (opens in new tab) and stop propagation
  [qrChurch, qrReception].forEach(hotspot => {
    if (hotspot) {
      hotspot.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
      });
      hotspot.addEventListener('click', (e) => {
        e.stopPropagation();
        if (currentStep !== 3 || isAnimating) {
          e.preventDefault();
        }
      });
    }
  });

  // =========================================================================
  // DYNAMIC RESPONSIVE LAYOUT CALCULATION
  // Treats the entire invitation as ONE physical, proportionally scaled object
  // =========================================================================
  const SINGLE_RATIO = 547 / 768;        // ~0.7122396 (Center panel and Cover artwork ratio)
  const SPREAD_RATIO = SINGLE_RATIO * 2;   // ~1.4244792 (Complete 3-panel spread: 25% + 50% + 25%)

  function updateResponsiveLayout() {
    const vw = window.visualViewport ? window.visualViewport.width : window.innerWidth;
    const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;

    // Comfortable, visually balanced padding so invitation does not stretch edge-to-edge
    const isMobile = vw < 600;
    const padX = isMobile ? Math.max(32, Math.round(vw * 0.10)) : (vw < 900 ? 56 : 80);
    const padYBook = vh < 500 ? 50 : (vh < 700 ? 64 : 76);
    const padYCover = vh < 500 ? 24 : (vh < 700 ? 36 : 48);

    const availW = Math.max(vw - padX, 160);
    const availHBook = Math.max(vh - padYBook, 160);
    const availHCover = Math.max(vh - padYCover, 160);

    // 1. Step 3: Unfolded 3-Panel Spread
    // Calculate proportional scale based on available width and height as ONE physical object
    const maxDesktopH = 740;
    const bookH = Math.min(availHBook, maxDesktopH, availW / SPREAD_RATIO);
    const bookW = bookH * SPREAD_RATIO;

    // 2. Physical center panel / folded card dimensions
    // Maintains the exact same physical card dimensions as the unfolded center panel
    const centerPanelW = bookW * 0.5;
    const centerPanelH = bookH;

    // 3. Step 1: Cover Card
    let coverW;
    let coverH;
    if (isMobile) {
      // Fit nicely within portrait viewport with balanced breathing room
      const maxCoverW = Math.min(availW, 340);
      coverH = Math.min(availHCover, maxCoverW / SINGLE_RATIO);
      coverW = coverH * SINGLE_RATIO;
    } else {
      // On desktop, match the physical invitation scale
      coverH = centerPanelH;
      coverW = centerPanelW;
    }

    const rootStyle = document.documentElement.style;
    rootStyle.setProperty('--cover-width', `${Math.round(coverW)}px`);
    rootStyle.setProperty('--cover-height', `${Math.round(coverH)}px`);
    rootStyle.setProperty('--book-width', `${Math.round(bookW)}px`);
    rootStyle.setProperty('--book-height', `${Math.round(bookH)}px`);
    rootStyle.setProperty('--center-width', `${Math.round(centerPanelW)}px`);
  }

  // Initial calculation & event listeners
  updateResponsiveLayout();
  window.addEventListener('resize', updateResponsiveLayout);
  window.addEventListener('orientationchange', () => {
    setTimeout(updateResponsiveLayout, 100);
  });
  if (window.visualViewport && typeof window.visualViewport.addEventListener === 'function') {
    window.visualViewport.addEventListener('resize', updateResponsiveLayout);
  }
}

// Ensure execution whether DOM is loading, interactive, or already complete
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initInvitationApp);
} else {
  initInvitationApp();
}
