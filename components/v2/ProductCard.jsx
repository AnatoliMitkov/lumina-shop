import { formatProductCurrency } from '../../utils/products';

/**
 * A clean, consistent product card for the v2 storefront.
 * Accepts a normalised product object (from normalizeProductRecord /
 * resolveStorefrontProduct) and renders it without any editor coupling.
 */
export default function ProductCard({ product, baseHref = '/v2/product' }) {
    const href = `${baseHref}/${encodeURIComponent(product.slug || product.id)}`;
    const image = product.image_main;
    const isLowStock = product.inventory_count > 0 && product.inventory_count <= 2;
    const isMadeToOrder = product.inventory_count === 0;

    return (
        <a href={href} className="v2-product-card group">
            {/* Image */}
            <div className="v2-product-card__image-wrap">
                {image ? (
                    <img
                        src={image}
                        alt={product.name}
                        loading="lazy"
                        decoding="async"
                    />
                ) : (
                    <div className="w-full h-full bg-[#D9CBB9]" aria-hidden="true" />
                )}
            </div>

            {/* Info */}
            <div className="flex flex-col gap-1.5">
                {/* Eyebrow */}
                <p className="v2-label text-[#1C1C1C]/40">{product.category}</p>

                {/* Name */}
                <h3 className="v2-heading-lg leading-tight">{product.name}</h3>

                {/* Subtitle */}
                {product.subtitle ? (
                    <p className="v2-body-sm text-[#1C1C1C]/55 line-clamp-2">{product.subtitle}</p>
                ) : null}

                {/* Price row */}
                <div className="flex items-center gap-3 mt-1">
                    <span className="v2-price">
                        {formatProductCurrency(product.price)}
                    </span>
                    {product.compare_at_price && product.compare_at_price > product.price ? (
                        <span className="v2-price text-[#1C1C1C]/35 line-through text-sm">
                            {formatProductCurrency(product.compare_at_price)}
                        </span>
                    ) : null}
                    {isLowStock && (
                        <span className="v2-badge ml-auto">Low Stock</span>
                    )}
                    {isMadeToOrder && (
                        <span className="v2-badge ml-auto">Made to Order</span>
                    )}
                </div>
            </div>
        </a>
    );
}
