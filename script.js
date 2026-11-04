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
  const btnOpenInvitation = document.getElementById('btnOpenInvitation');
  const bookContainer = document.getElementById('bookContainer');
  const panelCenter = document.getElementById('panelCenter');
  const flapLeft = document.getElementById('flapLeft');
  const flapRight = document.getElementById('flapRight');
  const foldedPrompt = document.getElementById('foldedPrompt');
  const btnBackToCover = document.getElementById('btnBackToCover');
  const btnCloseBook = document.getElementById('btnCloseBook');
  const qrChurch = document.getElementById('qrChurch');
  const qrReception = document.getElementById('qrReception');
   const foldedCardCover = document.getElementById('foldedCardCover');

  

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

    setAnimating(350, () => {
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

  function enableHorizontalGestures(element, { onSwipeLeft, onSwipeRight, onTap }) {
    // 1. Direct Touch Events (100% reliable on mobile touch screens)
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;
    let isTouchActive = false;

    element.addEventListener('touchstart', (e) => {
      if (e.target.closest('.nav-btn') || e.target.closest('.qr-hitbox')) return;
      if (e.touches && e.touches.length > 0) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchStartTime = Date.now();
        isTouchActive = true;
      }
    }, { passive: true });

    element.addEventListener('touchend', (e) => {
      if (!isTouchActive) return;
      isTouchActive = false;
      if (!e.changedTouches || e.changedTouches.length === 0) return;

      const diffX = e.changedTouches[0].clientX - touchStartX;
      const diffY = e.changedTouches[0].clientY - touchStartY;
      const absX = Math.abs(diffX);
      const absY = Math.abs(diffY);
      const elapsed = Date.now() - touchStartTime;

      if (absX >= 25 && absX > absY && elapsed < 1200) {
        justSwiped = true;
        setTimeout(() => { justSwiped = false; }, 350);

        if (diffX < 0 && typeof onSwipeLeft === 'function') {
          onSwipeLeft();
        } else if (diffX > 0 && typeof onSwipeRight === 'function') {
          onSwipeRight();
        }
      } else if (absX < 25 && absY < 25 && elapsed < 800) {
        if (typeof onTap === 'function') {
          onTap(e);
        }
      }
    }, { passive: true });

    element.addEventListener('touchcancel', () => {
      isTouchActive = false;
    }, { passive: true });

    // 2. Pointer Events (Desktop Mouse and Stylus)
    let pointerStartX = 0;
    let pointerStartY = 0;
    let pointerStartTime = 0;
    let isPointerActive = false;

    element.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch') return; // Handled by touch events above
      if (e.target.closest('.nav-btn') || e.target.closest('.qr-hitbox')) {
        return;
      }
      if (e.pointerType === 'mouse' && e.button !== 0) {
        return;
      }

      pointerStartX = e.clientX;
      pointerStartY = e.clientY;
      pointerStartTime = Date.now();
      isPointerActive = true;
    });

    element.addEventListener('pointerup', (e) => {
      if (!isPointerActive) return;
      isPointerActive = false;

      const diffX = e.clientX - pointerStartX;
      const diffY = e.clientY - pointerStartY;
      const absX = Math.abs(diffX);
      const absY = Math.abs(diffY);
      const elapsed = Date.now() - pointerStartTime;

      if (absX >= 25 && absX > absY && elapsed < 1200) {
        justSwiped = true;
        setTimeout(() => { justSwiped = false; }, 350);

        if (diffX < 0 && typeof onSwipeLeft === 'function') {
          onSwipeLeft();
        } else if (diffX > 0 && typeof onSwipeRight === 'function') {
          onSwipeRight();
        }
      } else if (absX < 20 && absY < 20 && elapsed < 800) {
        if (typeof onTap === 'function') {
          onTap(e);
        }
      }
    });

    element.addEventListener('pointercancel', () => {
      isPointerActive = false;
    });
  }

  // Step 1 Cover Gestures: Swipe left or Tap to go to Step 2
  enableHorizontalGestures(stepCover, {
    onSwipeLeft: () => {
      if (currentStep === 1) goToStep2();
    },
    onTap: () => {
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
    },
    onTap: (e) => {
      if (e.target.closest('.nav-btn') || e.target.closest('.qr-hitbox')) return;
      if (currentStep === 2) {
        unfoldInvitation();
      } else if (currentStep === 3 && e.target.closest('.panel-center')) {
        foldInvitation();
      }
    }
  });

  // =========================================================================
  // CLICK & TAP HANDLERS (Direct click event backup)
  // =========================================================================

  function triggerCoverAdvance(e) {
    if (e && e.cancelable && e.type === 'keydown') e.preventDefault();
    if (currentStep === 1 && !isAnimating) {
      goToStep2();
    }
  }

  // Cover Button ("SWIPE LEFT OR TAP ->") handlers
  if (btnOpenInvitation) {
    btnOpenInvitation.addEventListener('touchend', (e) => {
      e.stopPropagation();
      triggerCoverAdvance(e);
    });
    btnOpenInvitation.addEventListener('click', (e) => {
      e.stopPropagation();
      triggerCoverAdvance(e);
    });
  }

  // Cover Card click / tap handler
  coverCard.addEventListener('touchend', (e) => {
    if (!justSwiped) {
      triggerCoverAdvance(e);
    }
  });
  coverCard.addEventListener('click', (e) => {
    if (!justSwiped) {
      triggerCoverAdvance(e);
    }
  });
  coverCard.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') {
      triggerCoverAdvance(e);
    }
  });

  // Step 1: Click anywhere on cover stage
  stepCover.addEventListener('click', (e) => {
    if (e.target.closest('.nav-btn') || e.target.closest('.qr-hitbox')) return;
    if (!justSwiped) {
      triggerCoverAdvance(e);
    }
  });

  // Step 2: Click or tap closed folded invitation to unfold
  if (foldedCardCover) {
    foldedCardCover.addEventListener('touchend', (e) => {
      if (!justSwiped && currentStep === 2) {
        unfoldInvitation();
      }
    });
    foldedCardCover.addEventListener('click', (e) => {
      if (!justSwiped && currentStep === 2) {
        unfoldInvitation();
      }
    });
    foldedCardCover.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (currentStep === 2) {
          unfoldInvitation();
        }
      }
    });
  }

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
  const SINGLE_RATIO = 564 / 787;        // ~0.7166455 (Center panel and Cover artwork ratio)
  const SPREAD_RATIO = SINGLE_RATIO * 2;   // ~1.433291 (Complete 3-panel spread: 25% + 50% + 25%)

  function updateResponsiveLayout() {
    const vw = window.visualViewport ? window.visualViewport.width : window.innerWidth;
    const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;

    const isMobile = vw < 600;
    const isLandscape = vw > vh && vh < 550;

    // Viewport padding tailored for mobile and desktop screens
    const padX = isMobile ? (vw < 380 ? 16 : 24) : (vw < 900 ? 48 : 80);
    const padYBook = isLandscape ? 40 : (vh < 600 ? 56 : (vh < 800 ? 70 : 84));
    const padYCover = isLandscape ? 20 : (vh < 600 ? 28 : (vh < 800 ? 36 : 48));

    const availW = Math.max(vw - padX, 160);
    const availHBook = Math.max(vh - padYBook, 160);
    const availHCover = Math.max(vh - padYCover, 160);

    // 1. Step 3: Unfolded 3-Panel Spread
    const maxDesktopH = isLandscape ? Math.min(availHBook, 360) : (vh < 700 ? 600 : 720);
    const bookH = Math.min(availHBook, maxDesktopH, availW / SPREAD_RATIO);
    const bookW = bookH * SPREAD_RATIO;

    // 2. Physical center panel dimensions
    const centerPanelW = bookW * 0.5;
    const centerPanelH = bookH;

    // 3. Step 1: Cover Card Dimensions
    let coverW;
    let coverH;
    if (isMobile && !isLandscape) {
      // Fit mobile viewport prominently with balanced breathing room
      const maxCoverW = Math.min(availW, 360);
      coverH = Math.min(availHCover, maxCoverW / SINGLE_RATIO);
      coverW = coverH * SINGLE_RATIO;
    } else {
      // On desktop and landscape, match the physical invitation scale
      coverH = Math.min(availHCover, maxDesktopH, (availW * 0.5) / SINGLE_RATIO);
      coverW = coverH * SINGLE_RATIO;
    }

    // 4. Step 2: Folded Scale
    // Scales up the folded card on mobile so it fills the portrait viewport just like the cover
    let foldedScale = 1.0;
    if (isMobile && !isLandscape) {
      foldedScale = centerPanelW > 0 ? (coverW / centerPanelW) : 1;
    }

    const rootStyle = document.documentElement.style;
    rootStyle.setProperty('--cover-width', `${Math.round(coverW)}px`);
    rootStyle.setProperty('--cover-height', `${Math.round(coverH)}px`);
    rootStyle.setProperty('--book-width', `${Math.round(bookW)}px`);
    rootStyle.setProperty('--book-height', `${Math.round(bookH)}px`);
    rootStyle.setProperty('--center-width', `${Math.round(centerPanelW)}px`);
    rootStyle.setProperty('--folded-scale', foldedScale.toFixed(4));
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