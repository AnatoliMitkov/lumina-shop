"use client";

import { useDeferredValue, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ProductCard from './ProductCard';
import { PRODUCT_CATEGORY_OPTIONS, PRODUCT_COLLECTION_OPTIONS } from '../../utils/products';

const ALL = 'All';

function buildOptionList(seed, values) {
    const seedSet = new Set(seed.map((o) => o.toLowerCase()));
    const custom = [...new Set(values)]
        .filter((v) => v && !seedSet.has(v.toLowerCase()))
        .sort((a, b) => a.localeCompare(b));

    return [ALL, ...seed, ...custom];
}

function FilterButton({ label, isActive, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`v2-btn v2-btn ${
                isActive
                    ? 'v2-btn-primary'
                    : 'v2-btn-secondary'
            } py-2 px-4 text-[10px]`}
        >
            {label}
        </button>
    );
}

export default function CollectionsClient({ products }) {
    const searchParams = useSearchParams();
    const router = useRouter();

    const [searchText, setSearchText] = useState('');
    const deferredSearch = useDeferredValue(searchText);

    const [activeCategory, setActiveCategory] = useState(
        () => searchParams.get('category') || ALL
    );
    const [activeCollection, setActiveCollection] = useState(
        () => searchParams.get('collection') || ALL
    );

    const categoryOptions = useMemo(
        () => buildOptionList(PRODUCT_CATEGORY_OPTIONS, products.map((p) => p.category)),
        [products]
    );

    const collectionOptions = useMemo(
        () => buildOptionList(PRODUCT_COLLECTION_OPTIONS, products.map((p) => p.collection)),
        [products]
    );

    const filtered = useMemo(() => {
        const query = deferredSearch.toLowerCase().trim();

        return products.filter((p) => {
            if (activeCategory !== ALL && p.category.toLowerCase() !== activeCategory.toLowerCase()) {
                return false;
            }

            if (activeCollection !== ALL && p.collection.toLowerCase() !== activeCollection.toLowerCase()) {
                return false;
            }

            if (query) {
                const searchable = [p.name, p.subtitle, p.category, p.collection, p.description, ...(p.tags || [])]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase();

                if (!searchable.includes(query)) {
                    return false;
                }
            }

            return true;
        });
    }, [products, activeCategory, activeCollection, deferredSearch]);

    function applyFilter(key, value) {
        const params = new URLSearchParams(searchParams.toString());

        if (value === ALL) {
            params.delete(key);
        } else {
            params.set(key, value);
        }

        router.replace(`/v2/collections?${params.toString()}`, { scroll: false });
    }

    function handleCategoryChange(value) {
        setActiveCategory(value);
        applyFilter('category', value);
    }

    function handleCollectionChange(value) {
        setActiveCollection(value);
        applyFilter('collection', value);
    }

    return (
        <div>
            {/* Search bar */}
            <div className="mb-8">
                <input
                    type="search"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    placeholder="Search pieces…"
                    aria-label="Search pieces"
                    className="v2-input max-w-md"
                />
            </div>

            {/* Category filter */}
            <div className="mb-4">
                <p className="v2-label text-[#1C1C1C]/40 mb-3">Category</p>
                <div className="flex flex-wrap gap-2">
                    {categoryOptions.map((option) => (
                        <FilterButton
                            key={option}
                            label={option}
                            isActive={activeCategory === option}
                            onClick={() => handleCategoryChange(option)}
                        />
                    ))}
                </div>
            </div>

            {/* Collection filter */}
            <div className="mb-10">
                <p className="v2-label text-[#1C1C1C]/40 mb-3">Collection</p>
                <div className="flex flex-wrap gap-2">
                    {collectionOptions.map((option) => (
                        <FilterButton
                            key={option}
                            label={option}
                            isActive={activeCollection === option}
                            onClick={() => handleCollectionChange(option)}
                        />
                    ))}
                </div>
            </div>

            <hr className="v2-divider mb-10" />

            {/* Results count */}
            <p className="v2-label text-[#1C1C1C]/40 mb-8">
                {filtered.length} piece{filtered.length !== 1 ? 's' : ''}
                {activeCategory !== ALL ? ` · ${activeCategory}` : ''}
                {activeCollection !== ALL ? ` · ${activeCollection}` : ''}
            </p>

            {/* Grid */}
            {filtered.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 md:gap-10">
                    {filtered.map((product) => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>
            ) : (
                <div className="py-20 text-center">
                    <p className="v2-heading-lg text-[#1C1C1C]/30 mb-4">No pieces found</p>
                    <p className="v2-body-sm text-[#1C1C1C]/45 mb-8">
                        Try adjusting the filters or clearing the search.
                    </p>
                    <button
                        type="button"
                        onClick={() => {
                            setActiveCategory(ALL);
                            setActiveCollection(ALL);
                            setSearchText('');
                            router.replace('/v2/collections', { scroll: false });
                        }}
                        className="v2-btn v2-btn-secondary"
                    >
                        Clear Filters
                    </button>
                </div>
            )}
        </div>
    );
}
