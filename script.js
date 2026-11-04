/**
 * Wedding Invitation Interactive Controller
 * Follows exact flow:
 * Step 1: Initial Cover Card -> Swipe left / tap to go to Step 2
 * Step 2: Closed Book -> Tap to open realistic 3D book
 * Step 3: Open Book Spread (Left & Right pages) with clickable QR locations -> Close book returns to Step 2
 */

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const stepCover = document.getElementById('stepCover');
  const stepBook = document.getElementById('stepBook');
  const coverCard = document.getElementById('coverCard');
  const coverCardContainer = document.getElementById('coverCardContainer');
  const bookContainer = document.getElementById('bookContainer');
  const turningLeaf = document.getElementById('turningLeaf');
  const btnBackToCover = document.getElementById('btnBackToCover');
  const btnCloseBook = document.getElementById('btnCloseBook');
  const qrChurch = document.getElementById('qrChurch');
  const qrReception = document.getElementById('qrReception');

  // State
  let currentStep = 1; // 1 = Cover, 2 = Closed Book, 3 = Open Book
  let isAnimating = false;

  // =========================================================================
  // STEP 1 -> STEP 2: Transition from Cover to Closed Book
  // =========================================================================
  function goToStep2() {
    if (currentStep !== 1 || isAnimating) return;
    isAnimating = true;

    // Slide out cover
    stepCover.classList.add('slide-out');

    setTimeout(() => {
      stepCover.classList.remove('active', 'slide-out');
      
      // Ensure book is in closed state
      bookContainer.classList.remove('open', 'animating');
      bookContainer.classList.add('closed');
      stepBook.classList.remove('book-is-open');

      // Activate Step 2
      stepBook.classList.add('active');
      currentStep = 2;
      isAnimating = false;
    }, 450);
  }

  // STEP 2 -> STEP 1: Back to Cover
  function goToStep1() {
    if (currentStep !== 2 || isAnimating) return;
    isAnimating = true;

    stepBook.classList.remove('active');
    setTimeout(() => {
      stepCover.classList.add('active');
      currentStep = 1;
      isAnimating = false;
    }, 350);
  }

  // Click on Cover Card to go to Step 2
  coverCard.addEventListener('click', () => {
    goToStep2();
  });

  // Touch Swipe on Cover Card
  let touchStartX = 0;
  let touchStartY = 0;
  let touchEndX = 0;
  let touchEndY = 0;
  const SWIPE_THRESHOLD = 40;

  coverCardContainer.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
  }, { passive: true });

  coverCardContainer.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    touchEndY = e.changedTouches[0].screenY;
    handleCoverSwipe();
  }, { passive: true });

  function handleCoverSwipe() {
    const diffX = touchEndX - touchStartX;
    const diffY = touchEndY - touchStartY;
    // Horizontal swipe left
    if (Math.abs(diffX) > Math.abs(diffY) && diffX < -SWIPE_THRESHOLD) {
      goToStep2();
    }
  }

  // =========================================================================
  // STEP 2 -> STEP 3: Book Opening Animation
  // =========================================================================
  function openBook() {
    if (currentStep !== 2 || isAnimating) return;
    isAnimating = true;

    if (navigator.vibrate) {
      try { navigator.vibrate(15); } catch (_) {}
    }

    bookContainer.classList.add('animating');
    bookContainer.classList.remove('closed');
    bookContainer.classList.add('open');
    stepBook.classList.add('book-is-open');

    // After animation finishes
    setTimeout(() => {
      bookContainer.classList.remove('animating');
      currentStep = 3;
      isAnimating = false;
    }, 1250);
  }

  // =========================================================================
  // STEP 3 -> STEP 2: Book Closing Animation
  // =========================================================================
  function closeBook() {
    if (currentStep !== 3 || isAnimating) return;
    isAnimating = true;

    if (navigator.vibrate) {
      try { navigator.vibrate(15); } catch (_) {}
    }

    bookContainer.classList.add('animating');
    bookContainer.classList.remove('open');
    bookContainer.classList.add('closed');
    stepBook.classList.remove('book-is-open');

    // After animation finishes
    setTimeout(() => {
      bookContainer.classList.remove('animating');
      currentStep = 2;
      isAnimating = false;
    }, 1250);
  }

  // Tap Turning Leaf (Closed Book Cover) to open
  turningLeaf.addEventListener('click', (e) => {
    if (currentStep === 2) {
      e.stopPropagation();
      openBook();
    }
  });

  // Close Book Button or tap left page when book is open
  btnCloseBook.addEventListener('click', (e) => {
    e.stopPropagation();
    closeBook();
  });

  const pageLeft = document.getElementById('pageLeft');
  if (pageLeft) {
    pageLeft.addEventListener('click', (e) => {
      if (currentStep === 3 && !isAnimating) {
        e.stopPropagation();
        closeBook();
      }
    });
  }

  // Back to Cover Button
  btnBackToCover.addEventListener('click', (e) => {
    e.stopPropagation();
    if (currentStep === 3) {
      // If currently open, close first then go to step 1
      closeBook();
      setTimeout(() => {
        goToStep1();
      }, 1280);
    } else {
      goToStep1();
    }
  });

  // Touch Swipe inside Step 2 (Closed Book)
  let bookTouchStartX = 0;
  let bookTouchStartY = 0;

  stepBook.addEventListener('touchstart', (e) => {
    bookTouchStartX = e.changedTouches[0].screenX;
    bookTouchStartY = e.changedTouches[0].screenY;
  }, { passive: true });

  stepBook.addEventListener('touchend', (e) => {
    const diffX = e.changedTouches[0].screenX - bookTouchStartX;
    const diffY = e.changedTouches[0].screenY - bookTouchStartY;
    
    // In Step 2: Swipe left opens book; swipe right goes back to cover
    if (currentStep === 2 && !isAnimating) {
      if (Math.abs(diffX) > Math.abs(diffY)) {
        if (diffX < -SWIPE_THRESHOLD) {
          openBook();
        } else if (diffX > SWIPE_THRESHOLD) {
          goToStep1();
        }
      }
    }
  }, { passive: true });

  // Keyboard navigation support (Arrow keys, Space, Enter)
  document.addEventListener('keydown', (e) => {
    if (isAnimating) return;

    if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') {
      if (currentStep === 1) {
        goToStep2();
      } else if (currentStep === 2) {
        openBook();
      }
    } else if (e.key === 'ArrowLeft' || e.key === 'Escape') {
      if (currentStep === 3) {
        closeBook();
      } else if (currentStep === 2) {
        goToStep1();
      }
    }
  });

  // Prevent QR hotspots from propagating clicks to other book triggers
  [qrChurch, qrReception].forEach(hotspot => {
    if (hotspot) {
      hotspot.addEventListener('click', (e) => {
        if (currentStep !== 3 || isAnimating) {
          e.preventDefault();
          return false;
        }
        // Let it open link in new tab naturally
      });
    }
  });

  // =========================================================================
  // DYNAMIC RESPONSIVE LAYOUT CALCULATION
  // Ensures invitation fits screen across mobile, tablet, desktop, and orientations
  // =========================================================================
  const SINGLE_RATIO = 564 / 787;      // ~0.7166455
  const SPREAD_RATIO = 1128 / 787;     // ~1.433291

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

    // 2. Step 3: Open Book Spread (calculated for the ENTIRE two-page book)
    const bookH = Math.min(availHBook, availW / SPREAD_RATIO);
    const bookW = bookH * SPREAD_RATIO;
    const pageW = bookW / 2;
    const pageH = bookH;

    // 3. Step 2: Closed Book
    const closedH = Math.min(availHBook, availW / SINGLE_RATIO);
    let closedScale = bookH > 0 ? (closedH / bookH) : 1;
    // Cap closed scale between 1.0 and 2.0 to maintain natural proportions
    closedScale = Math.max(1, Math.min(closedScale, 2.0));

    const rootStyle = document.documentElement.style;
    rootStyle.setProperty('--cover-width', `${Math.round(coverW)}px`);
    rootStyle.setProperty('--cover-height', `${Math.round(coverH)}px`);
    rootStyle.setProperty('--book-width', `${Math.round(bookW)}px`);
    rootStyle.setProperty('--book-height', `${Math.round(bookH)}px`);
    rootStyle.setProperty('--page-width', `${Math.round(pageW)}px`);
    rootStyle.setProperty('--page-height', `${Math.round(pageH)}px`);
    rootStyle.setProperty('--closed-scale', closedScale.toFixed(4));
  }

  // Run immediately and bind listeners
  updateResponsiveLayout();
  window.addEventListener('resize', updateResponsiveLayout);
  window.addEventListener('orientationchange', () => {
    setTimeout(updateResponsiveLayout, 100);
  });
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', updateResponsiveLayout);
  }
});
