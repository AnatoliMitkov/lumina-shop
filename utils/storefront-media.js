const STOCK_IMAGE_LIBRARY = [
  'https://images.pexels.com/photos/8443637/pexels-photo-8443637.jpeg?auto=compress&cs=tinysrgb&w=1800',
  'https://images.pexels.com/photos/30816952/pexels-photo-30816952.jpeg?auto=compress&cs=tinysrgb&w=1800',
  'https://images.pexels.com/photos/10131765/pexels-photo-10131765.jpeg?auto=compress&cs=tinysrgb&w=1800',
  'https://images.pexels.com/photos/20441555/pexels-photo-20441555.jpeg?auto=compress&cs=tinysrgb&w=1800',
  'https://images.pexels.com/photos/8396314/pexels-photo-8396314.jpeg?auto=compress&cs=tinysrgb&w=1800',
  'https://images.pexels.com/photos/28379474/pexels-photo-28379474.jpeg?auto=compress&cs=tinysrgb&w=1800',
  'https://images.pexels.com/photos/12585895/pexels-photo-12585895.jpeg?auto=compress&cs=tinysrgb&w=1800',
  'https://images.pexels.com/photos/7779758/pexels-photo-7779758.jpeg?auto=compress&cs=tinysrgb&w=1800',
  'https://images.pexels.com/photos/8945179/pexels-photo-8945179.jpeg?auto=compress&cs=tinysrgb&w=1800',
  'https://images.pexels.com/photos/29564415/pexels-photo-29564415.jpeg?auto=compress&cs=tinysrgb&w=1800',
  'https://images.pexels.com/photos/6069975/pexels-photo-6069975.jpeg?auto=compress&cs=tinysrgb&w=1800',
  'https://images.pexels.com/photos/21390399/pexels-photo-21390399.jpeg?auto=compress&cs=tinysrgb&w=1800',
  'https://images.pexels.com/photos/29265225/pexels-photo-29265225.jpeg?auto=compress&cs=tinysrgb&w=1800',
  'https://images.pexels.com/photos/10622546/pexels-photo-10622546.jpeg?auto=compress&cs=tinysrgb&w=1800',
  'https://images.pexels.com/photos/36555552/pexels-photo-36555552.jpeg?auto=compress&cs=tinysrgb&w=1800',
  'https://images.pexels.com/photos/33179938/pexels-photo-33179938.jpeg?auto=compress&cs=tinysrgb&w=1800',
  'https://images.pexels.com/photos/8126157/pexels-photo-8126157.jpeg?auto=compress&cs=tinysrgb&w=1800',
  'https://images.pexels.com/photos/18428517/pexels-photo-18428517.jpeg?auto=compress&cs=tinysrgb&w=1800',
];

export const STOREFRONT_VIDEO_SLOTS = {
  homeHero: {
    videoUrl: 'https://videos.pexels.com/video-files/8443732/8443732-uhd_2732_1440_25fps.mp4',
    poster: STOCK_IMAGE_LIBRARY[2],
  },
  homeMotion: {
    videoUrl: 'https://videos.pexels.com/video-files/9257197/9257197-uhd_1440_2732_25fps.mp4',
    poster: STOCK_IMAGE_LIBRARY[3],
  },
  spotlightBanner: {
    videoUrl: 'https://videos.pexels.com/video-files/8371251/8371251-uhd_1440_2732_25fps.mp4',
    poster: STOCK_IMAGE_LIBRARY[11],
  },
};

function hashSeed(value = '') {
  return Array.from(String(value || '')).reduce((hash, character) => {
    const nextHash = ((hash << 5) - hash) + character.charCodeAt(0);

    return nextHash | 0;
  }, 0) >>> 0;
}

export function getStockProductGallery(product = {}, count = 5) {
  const librarySize = STOCK_IMAGE_LIBRARY.length;

  if (librarySize === 0) {
    return [];
  }

  const seed = hashSeed(`${product.slug || product.name || 'atelier-piece'}-${product.collection || ''}-${product.category || ''}`);
  const startIndex = seed % librarySize;

  return Array.from({ length: Math.min(count, librarySize) }, (_, index) => {
    return STOCK_IMAGE_LIBRARY[(startIndex + index) % librarySize];
  });
}

export function getStorefrontVideoSlot(slot) {
  return STOREFRONT_VIDEO_SLOTS[slot] || null;
}