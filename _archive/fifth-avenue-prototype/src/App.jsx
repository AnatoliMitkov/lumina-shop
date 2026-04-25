import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { FALLBACK_PRODUCTS, loadProducts } from './lib/catalog.js';
import { COLLECTION_STAGE_CONFIG, MAIN_PAGE_PORTAL } from './lib/stageConfig.js';
import './App.css';

const COLLECTION_THEMES = {
  'Evening Structures': {
    accent: '#7f604a',
    accentSoft: 'rgba(127, 96, 74, 0.16)',
    paper: '#f3ece3',
    glow: 'rgba(255, 232, 214, 0.92)',
    shadow: 'rgba(88, 60, 40, 0.18)',
  },
  'Resort Grid': {
    accent: '#8d765f',
    accentSoft: 'rgba(141, 118, 95, 0.16)',
    paper: '#f6f0e8',
    glow: 'rgba(255, 245, 230, 0.94)',
    shadow: 'rgba(90, 69, 48, 0.16)',
  },
  Accessories: {
    accent: '#6f6d74',
    accentSoft: 'rgba(111, 109, 116, 0.14)',
    paper: '#f2efea',
    glow: 'rgba(248, 247, 244, 0.96)',
    shadow: 'rgba(67, 65, 72, 0.14)',
  },
  'Signature Weaves': {
    accent: '#8a694a',
    accentSoft: 'rgba(138, 105, 74, 0.16)',
    paper: '#f4ede4',
    glow: 'rgba(255, 239, 221, 0.95)',
    shadow: 'rgba(86, 58, 32, 0.16)',
  },
  Casual: {
    accent: '#7b4f54',
    accentSoft: 'rgba(123, 79, 84, 0.14)',
    paper: '#f4ece7',
    glow: 'rgba(250, 239, 238, 0.94)',
    shadow: 'rgba(89, 50, 56, 0.16)',
  },
  default: {
    accent: '#7b6d5d',
    accentSoft: 'rgba(123, 109, 93, 0.14)',
    paper: '#f3ede5',
    glow: 'rgba(255, 244, 233, 0.94)',
    shadow: 'rgba(80, 60, 41, 0.15)',
  },
};

function wrapIndex(index, total) {
  if (!total) {
    return 0;
  }

  return (index + total) % total;
}

function padIndex(value) {
  return String(value).padStart(2, '0');
}

function getDisplayParts(label) {
  const pieces = label
    .split('—')
    .map((piece) => piece.trim())
    .filter(Boolean);

  if (pieces.length > 1) {
    return {
      primary: pieces[0].replace(/^The\s+/i, '').trim(),
      secondary: pieces.slice(1).join(' — '),
    };
  }

  const cleaned = label.replace(/^The\s+/i, '').trim();
  const words = cleaned.split(/\s+/);

  if (!words.length) {
    return {
      primary: 'Collection',
      secondary: '',
    };
  }

  if (words.length === 1) {
    return {
      primary: words[0],
      secondary: '',
    };
  }

  if (words.length === 2) {
    return {
      primary: words[0],
      secondary: words[1],
    };
  }

  return {
    primary: words.slice(0, 2).join(' '),
    secondary: words.slice(2).join(' '),
  };
}

function normalizeCollectionName(value) {
  const normalizedValue = String(value || '').trim();

  return normalizedValue || 'Collection';
}

function slugify(value) {
  return normalizeCollectionName(value)
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/(^-|-$)/g, '');
}

function buildCollectionEntries(products, collectionStageMediaOverrides = {}) {
  const groupedCollections = new Map();

  products.forEach((product) => {
    const collectionName = normalizeCollectionName(product.collection);
    const existingGroup = groupedCollections.get(collectionName);

    if (existingGroup) {
      existingGroup.products.push(product);
      existingGroup.sortOrder = Math.min(existingGroup.sortOrder, product.sortOrder ?? Number.MAX_SAFE_INTEGER);
      return;
    }

    groupedCollections.set(collectionName, {
      collection: collectionName,
      products: [product],
      sortOrder: product.sortOrder ?? Number.MAX_SAFE_INTEGER,
    });
  });

  return Array.from(groupedCollections.values())
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((group) => {
      const collectionConfig = COLLECTION_STAGE_CONFIG[group.collection] ?? {};
      const collectionMediaOverride = collectionStageMediaOverrides[group.collection] ?? {};
      const anchorProduct = group.products.find((product) => product.featured) ?? group.products[0];
      const collectionId = slugify(group.collection) || slugify(anchorProduct.slug) || anchorProduct.id;
      const availableMedia = Array.from(
        new Set(group.products.flatMap((product) => [product.primaryMedia, product.secondaryMedia]).filter(Boolean)),
      );
      const primaryMedia =
        collectionMediaOverride.primaryMedia || collectionConfig.primaryMedia || availableMedia[0] || anchorProduct.primaryMedia;
      const secondaryMedia =
        collectionMediaOverride.secondaryMedia ||
        collectionConfig.secondaryMedia ||
        availableMedia.find((asset) => asset !== primaryMedia) ||
        availableMedia[1] ||
        primaryMedia;

      return {
        id: `collection-${collectionId}`,
        collection: group.collection,
        title: collectionConfig.title || group.collection,
        subtitle: collectionConfig.subtitle || anchorProduct.subtitle || 'Curated collection edit.',
        primaryMedia,
        secondaryMedia,
        pieceCount: group.products.length,
        sortOrder: collectionConfig.order ?? group.sortOrder,
      };
    })
    .sort((left, right) => left.sortOrder - right.sortOrder || left.collection.localeCompare(right.collection));
}

function getTheme(collection) {
  return COLLECTION_THEMES[collection] ?? COLLECTION_THEMES.default;
}

function App({ collectionStageMediaOverrides = {} }) {
  const rootRef = useRef(null);
  const stageRef = useRef(null);
  const focusCountRef = useRef(null);
  const wheelDeltaRef = useRef(0);
  const touchStartRef = useRef(null);
  const lockRef = useRef(false);
  const unlockTimerRef = useRef(null);
  const [products, setProducts] = useState(FALLBACK_PRODUCTS);
  const [, setCatalogStatus] = useState('fallback');
  const [activeIndex, setActiveIndex] = useState(0);
  const collectionStageOverridesKey = JSON.stringify(collectionStageMediaOverrides || {});
  const collectionEntries = buildCollectionEntries(products, collectionStageMediaOverrides);
  const fallbackCollections = buildCollectionEntries(FALLBACK_PRODUCTS, collectionStageMediaOverrides);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    loadProducts({ signal: controller.signal })
      .then((catalog) => {
        if (cancelled || !catalog.length) {
          return;
        }

        const nextProducts = catalog;
        setProducts(nextProducts);
        setCatalogStatus('live');
        setActiveIndex((current) => wrapIndex(current, buildCollectionEntries(nextProducts, collectionStageMediaOverrides).length));
      })
      .catch((error) => {
        if (cancelled || error.name === 'AbortError') {
          return;
        }

        setCatalogStatus('fallback');
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [collectionStageOverridesKey]);

  useEffect(() => {
    setActiveIndex((current) => wrapIndex(current, collectionEntries.length || 1));
  }, [collectionEntries.length]);

  useEffect(() => {
    const syncViewportHeight = () => {
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;

      if (!rootRef.current || !viewportHeight) {
        return;
      }

      rootRef.current.style.setProperty('--app-height', `${viewportHeight}px`);
    };

    const visualViewport = window.visualViewport;

    syncViewportHeight();
    window.addEventListener('resize', syncViewportHeight);
    visualViewport?.addEventListener('resize', syncViewportHeight);
    visualViewport?.addEventListener('scroll', syncViewportHeight);

    return () => {
      window.removeEventListener('resize', syncViewportHeight);
      visualViewport?.removeEventListener('resize', syncViewportHeight);
      visualViewport?.removeEventListener('scroll', syncViewportHeight);
    };
  }, []);

  useEffect(() => {
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverscroll = document.documentElement.style.overscrollBehavior;
    const previousBodyOverscroll = document.body.style.overscrollBehavior;

    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overscrollBehavior = 'none';
    document.body.style.overscrollBehavior = 'none';

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overscrollBehavior = previousHtmlOverscroll;
      document.body.style.overscrollBehavior = previousBodyOverscroll;

      if (unlockTimerRef.current) {
        window.clearTimeout(unlockTimerRef.current);
      }
    };
  }, []);

  const totalCollections = collectionEntries.length || 1;
  const activeCollection = collectionEntries[activeIndex] ?? fallbackCollections[0];
  const activeTheme = getTheme(activeCollection.collection);
  const titleParts = getDisplayParts(activeCollection.title);
  const pieceLabel = activeCollection.pieceCount === 1 ? 'piece' : 'pieces';
  const activeCollectionHref = `/collections?collection=${encodeURIComponent(activeCollection.collection)}`;

  const scheduleUnlock = () => {
    if (unlockTimerRef.current) {
      window.clearTimeout(unlockTimerRef.current);
    }

    unlockTimerRef.current = window.setTimeout(() => {
      lockRef.current = false;
    }, 680);
  };

  const moveBy = (delta) => {
    if (lockRef.current || totalCollections < 2) {
      return;
    }

    lockRef.current = true;
    wheelDeltaRef.current = 0;
    setActiveIndex((current) => wrapIndex(current + delta, totalCollections));
    scheduleUnlock();
  };

  const jumpTo = (index) => {
    if (index === activeIndex || lockRef.current || totalCollections < 2) {
      return;
    }

    lockRef.current = true;
    wheelDeltaRef.current = 0;
    setActiveIndex(wrapIndex(index, totalCollections));
    scheduleUnlock();
  };

  useEffect(() => {
    const handleWheel = (event) => {
      event.preventDefault();

      if (totalCollections < 2) {
        return;
      }

      wheelDeltaRef.current += event.deltaY;

      if (Math.abs(wheelDeltaRef.current) < 48) {
        return;
      }

      moveBy(wheelDeltaRef.current > 0 ? 1 : -1);
    };

    const handleKeyDown = (event) => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowRight' || event.key === 'PageDown') {
        event.preventDefault();
        moveBy(1);
      }

      if (event.key === 'ArrowUp' || event.key === 'ArrowLeft' || event.key === 'PageUp') {
        event.preventDefault();
        moveBy(-1);
      }
    };

    const handleTouchStart = (event) => {
      touchStartRef.current = event.touches[0]?.clientY ?? null;
    };

    const handleTouchEnd = (event) => {
      if (touchStartRef.current === null) {
        return;
      }

      const endY = event.changedTouches[0]?.clientY ?? touchStartRef.current;
      const distance = touchStartRef.current - endY;
      touchStartRef.current = null;

      if (Math.abs(distance) < 36) {
        return;
      }

      moveBy(distance > 0 ? 1 : -1);
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('keydown', handleKeyDown);

    const stageNode = stageRef.current;
    stageNode?.addEventListener('touchstart', handleTouchStart, { passive: true });
    stageNode?.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKeyDown);
      stageNode?.removeEventListener('touchstart', handleTouchStart);
      stageNode?.removeEventListener('touchend', handleTouchEnd);
    };
  }, [totalCollections]);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (focusCountRef.current) {
      focusCountRef.current.textContent = padIndex(0);
    }

    if (prefersReducedMotion) {
      if (focusCountRef.current) {
        focusCountRef.current.textContent = padIndex(activeCollection.pieceCount);
      }

      return undefined;
    }

    const ctx = gsap.context(() => {
      const countState = { value: 0 };
      const timeline = gsap.timeline({ defaults: { ease: 'power3.out' } });

      timeline
        .fromTo(
          '.stage__wash',
          { opacity: 0.35, scale: 0.92 },
          { opacity: 1, scale: 1, duration: 1.1 },
          0,
        )
        .fromTo(
          '.stage__visual-card',
          { y: 42, autoAlpha: 0, scale: 0.94, rotate: -1.5 },
          { y: 0, autoAlpha: 1, scale: 1, rotate: 0, duration: 0.95 },
          0.04,
        )
        .fromTo(
          '.stage__detail-card',
          { x: 28, y: 28, autoAlpha: 0, rotate: 5 },
          { x: 0, y: 0, autoAlpha: 1, rotate: 0, duration: 0.88 },
          0.14,
        )
        .fromTo(
          '.js-product-line .inner',
          { yPercent: 112 },
          { yPercent: 0, duration: 0.9, stagger: 0.08, ease: 'power4.out' },
          0.08,
        )
        .fromTo(
          '.js-product-fade',
          { y: 18, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, duration: 0.72, stagger: 0.05 },
          0.15,
        )
        .fromTo(
          '.stage__word',
          { y: 18, autoAlpha: 0.2 },
          { y: 0, autoAlpha: 1, duration: 1.05, stagger: 0.05 },
          0.02,
        );

      if (focusCountRef.current) {
        timeline.to(
          countState,
          {
            value: activeCollection.pieceCount,
            duration: 0.95,
            ease: 'power2.out',
            onUpdate: () => {
              if (focusCountRef.current) {
                focusCountRef.current.textContent = padIndex(Math.round(countState.value));
              }
            },
          },
          0.18,
        );
      }
    }, rootRef);

    return () => {
      ctx.revert();
    };
  }, [activeCollection.id]);

  const themeStyle = {
    '--accent': activeTheme.accent,
    '--accent-soft': activeTheme.accentSoft,
    '--paper': activeTheme.paper,
    '--glow': activeTheme.glow,
    '--shadow-color': activeTheme.shadow,
    '--progress': `${(activeIndex + 1) / totalCollections}`,
  };

  return (
    <div ref={rootRef} className="app is-ready" style={themeStyle}>
      <div className="app__grain" aria-hidden="true" />

      <header className="topbar">
        <div className="topbar__brand">
          <span>5TH AVENUE</span>
          <span>Editorial feature</span>
        </div>

        <a className="topbar__portal transition-link" href={MAIN_PAGE_PORTAL.href}>
          <span className="topbar__portal-line">{MAIN_PAGE_PORTAL.label}</span>
          <span className="topbar__portal-subline">{MAIN_PAGE_PORTAL.subline}</span>
        </a>

        <div className="topbar__spacer" aria-hidden="true" />
      </header>

      <main ref={stageRef} className="stage" aria-label="5th Avenue collection motion stage">
        <div className="stage__wash" aria-hidden="true" />
        <div className="stage__word stage__word--top" aria-hidden="true">
          FIFTH
        </div>
        <div className="stage__word stage__word--bottom" aria-hidden="true">
          AVENUE
        </div>

        <div className="stage__focus js-product-fade" aria-hidden="true">
          <strong ref={focusCountRef} className="stage__focus-count">
            {padIndex(activeCollection.pieceCount)}
          </strong>
          <span className="stage__focus-label">{pieceLabel}</span>
        </div>

        <aside className="stage__aside">
          <div className="stage__counter js-product-fade">
            {padIndex(activeIndex + 1)} / {padIndex(totalCollections)}
          </div>

          <div className="stage__progress" aria-hidden="true">
            <span />
          </div>

          <div className="stage__hint js-product-fade">Wheel / swipe / keys</div>
        </aside>

        <section className="stage__visual" aria-live="polite">
          <div key={activeCollection.id} className="stage__visual-group">
            <figure className="stage__visual-card">
              <img src={activeCollection.primaryMedia} alt={activeCollection.title} />
            </figure>

            <div className="stage__detail-card">
              <img src={activeCollection.secondaryMedia} alt="" aria-hidden="true" />
            </div>
          </div>
        </section>

        <section key={activeCollection.id} className="stage__copy">
          <h1 className="stage__title">
            <span className="js-product-line">
              <span className="inner">{titleParts.primary.toUpperCase()}</span>
            </span>
            {titleParts.secondary ? (
              <span className="js-product-line stage__title-accent">
                <span className="inner">{titleParts.secondary}</span>
              </span>
            ) : null}
          </h1>

          <p className="stage__piece-inline js-product-fade">
            {padIndex(activeCollection.pieceCount)} {pieceLabel}
          </p>

          <p className="stage__subtitle js-product-fade">{activeCollection.subtitle}</p>

          <div className="stage__controls js-product-fade">
            <a className="transition-link" href={activeCollectionHref} aria-label={`Visit ${activeCollection.collection} in collections`}>
              Visit Collection
            </a>
          </div>
        </section>

        <nav className="stage__rail" aria-label="Collection lineup">
          {collectionEntries.map((entry, index) => {
            return (
              <button
                key={entry.id}
                type="button"
                className={`stage__rail-item js-rail-item${index === activeIndex ? ' is-active' : ''}`}
                onClick={() => jumpTo(index)}
              >
                <span>{padIndex(index + 1)}</span>
                <span>{entry.collection}</span>
              </button>
            );
          })}
        </nav>
      </main>
    </div>
  );
}

export default App;