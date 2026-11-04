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
  // Ensures invitation fits screen across mobile, tablet, desktop, and orientations
  // =========================================================================
  const SINGLE_RATIO = 564 / 787;      // ~0.7166455 (Cover and Folded card ratio)
  const SPREAD_RATIO = 1128 / 787;     // ~1.433291 (Full 3-panel 25% + 50% + 25% spread ratio)

  function updateResponsiveLayout() {
    const vw = window.visualViewport ? window.visualViewport.width : window.innerWidth;
    const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;

    // Responsive padding based on viewport size
    const padX = vw < 480 ? 12 : (vw < 768 ? 16 : 24);
    const padYBook = vh < 500 ? 46 : (vh < 700 ? 56 : 68);
    const padYCover = vh < 500 ? 20 : (vh < 700 ? 28 : 36);

    const availW = Math.max(vw - padX, 160);
    const availHBook = Math.max(vh - padYBook, 160);
    const availHCover = Math.max(vh - padYCover, 160);

    // 1. Step 1: Cover Card (single portrait image)
    const coverH = Math.min(availHCover, availW / SINGLE_RATIO);
    const coverW = coverH * SINGLE_RATIO;

    // 2. Step 3: Unfolded 3-Panel Spread (Left 25% + Center 50% + Right 25%)
    const bookH = Math.min(availHBook, availW / SPREAD_RATIO);
    const bookW = bookH * SPREAD_RATIO;

    // 3. Step 2: Folded Invitation (center 50% visible, ratio identical to SINGLE_RATIO)
    const closedH = Math.min(availHBook, availW / SINGLE_RATIO);
    let closedScale = bookH > 0 ? (closedH / bookH) : 1;
    // Cap closed scale between 1.0 and 1.6 to maintain natural proportions and guaranteed fit
    closedScale = Math.max(1, Math.min(closedScale, 1.6));

    const rootStyle = document.documentElement.style;
    rootStyle.setProperty('--cover-width', `${Math.round(coverW)}px`);
    rootStyle.setProperty('--cover-height', `${Math.round(coverH)}px`);
    rootStyle.setProperty('--book-width', `${Math.round(bookW)}px`);
    rootStyle.setProperty('--book-height', `${Math.round(bookH)}px`);
    rootStyle.setProperty('--closed-scale', closedScale.toFixed(4));
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
