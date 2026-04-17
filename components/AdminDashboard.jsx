"use client";

import { useDeferredValue, useState } from 'react';
import { createClient } from '../utils/supabase/client';
import {
    PRODUCT_CATEGORY_OPTIONS,
    PRODUCT_COLLECTION_OPTIONS,
    PRODUCT_STATUS_OPTIONS,
    PRODUCT_STORAGE_BUCKET,
    buildProductMutationInput,
    createEmptyProductDraft,
    createProductEditorState,
    formatProductCurrency,
    normalizeProductRecord,
    resolveProductGallery,
    slugifyProductName,
    sortProducts,
} from '../utils/products';

const supabase = createClient();

function formatDate(value) {
    if (!value) {
        return 'Pending';
    }

    return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(new Date(value));
}

function getStatusClasses(status) {
    switch (status) {
        case 'active':
            return 'border-emerald-200 bg-emerald-50 text-emerald-700';
        case 'archived':
            return 'border-[#1C1C1C]/12 bg-[#EFE7DA] text-[#1C1C1C]/62';
        default:
            return 'border-[#D9C08A] bg-[#FFF8E8] text-[#8A6A2F]';
    }
}

function buildOrderSummary(order) {
    if (!Array.isArray(order?.items) || order.items.length === 0) {
        return 'Selection archived in Supabase.';
    }

    const names = order.items.map((item) => item?.name).filter(Boolean);

    if (names.length === 0) {
        return 'Selection archived in Supabase.';
    }

    if (names.length <= 2) {
        return names.join(', ');
    }

    return `${names.slice(0, 2).join(', ')} +${names.length - 2} more`;
}

function buildInquiryPreview(message) {
    const safeMessage = typeof message === 'string' ? message : '';
    const trimmedMessage = safeMessage.split('\n\nAttached selection:')[0].trim() || safeMessage.trim();

    if (!trimmedMessage) {
        return 'Atelier note saved for follow-up.';
    }

    return trimmedMessage.length > 140 ? `${trimmedMessage.slice(0, 137)}...` : trimmedMessage;
}

function MetricCard({ label, value, copy }) {
    return (
        <div className="border border-[#1C1C1C]/10 bg-white/65 rounded-sm p-5 md:p-6 flex flex-col gap-3">
            <p className="text-[10px] uppercase tracking-[0.28em] text-[#1C1C1C]/42">{label}</p>
            <p className="font-serif text-3xl md:text-4xl font-light leading-none text-[#1C1C1C]">{value}</p>
            <p className="text-sm leading-relaxed text-[#1C1C1C]/56">{copy}</p>
        </div>
    );
}

function FilterButton({ label, active, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`hover-target rounded-full border px-4 py-3 text-[10px] uppercase tracking-[0.22em] transition-colors ${active ? 'border-[#1C1C1C] bg-[#1C1C1C] text-[#EFECE8]' : 'border-[#1C1C1C]/12 bg-white/70 text-[#1C1C1C]/58 hover:text-[#1C1C1C]'}`}
        >
            {label}
        </button>
    );
}

function ProductListItem({ product, active, onSelect }) {
    return (
        <button
            type="button"
            onClick={onSelect}
            className={`w-full text-left rounded-sm border p-4 transition-colors ${active ? 'border-[#1C1C1C] bg-[#1C1C1C] text-[#EFECE8]' : 'border-[#1C1C1C]/10 bg-white/70 text-[#1C1C1C] hover:bg-white'}`}
        >
            <div className="flex items-start justify-between gap-3 mb-4">
                <div className="min-w-0">
                    <p className="font-serif text-2xl font-light leading-none truncate">{product.name}</p>
                    <p className={`mt-2 text-[10px] uppercase tracking-[0.24em] ${active ? 'text-white/55' : 'text-[#1C1C1C]/42'}`}>{product.collection}</p>
                </div>
                <span className={`shrink-0 rounded-full border px-3 py-2 text-[10px] uppercase tracking-[0.22em] ${active ? 'border-white/15 bg-white/10 text-white/70' : getStatusClasses(product.status)}`}>{product.status}</span>
            </div>

            <div className={`flex items-center justify-between gap-4 text-[10px] uppercase tracking-[0.22em] ${active ? 'text-white/55' : 'text-[#1C1C1C]/45'}`}>
                <span>{formatProductCurrency(product.price)}</span>
                <span>{formatDate(product.updated_at || product.created_at)}</span>
            </div>
        </button>
    );
}

function ImageField({ label, value, field, onChange, onUpload, isUploading }) {
    return (
        <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
            {label}
            <div className="grid grid-cols-[minmax(0,1fr)_120px] gap-3">
                <input value={value} onChange={(event) => onChange(field, event.target.value)} className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]" />
                <label className={`h-14 border border-[#1C1C1C]/12 flex items-center justify-center bg-white text-[10px] uppercase tracking-[0.22em] ${isUploading ? 'opacity-60' : 'hover:bg-[#1C1C1C] hover:text-[#EFECE8]'} transition-colors cursor-pointer`}>
                    {isUploading ? 'Uploading' : 'Upload'}
                    <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => onUpload(event, field)} disabled={isUploading} />
                </label>
            </div>
        </label>
    );
}

export default function AdminDashboard({
    user,
    profile,
    initialProducts,
    recentOrders,
    recentInquiries,
    maintenanceMessage,
}) {
    const sortedInitialProducts = sortProducts(initialProducts ?? []);
    const [products, setProducts] = useState(sortedInitialProducts);
    const [selectedProductId, setSelectedProductId] = useState(sortedInitialProducts[0]?.id || 'new');
    const [draft, setDraft] = useState(
        sortedInitialProducts[0]
            ? createProductEditorState(sortedInitialProducts[0])
            : createEmptyProductDraft({
                category: 'Top',
                collection: 'Atelier Archive',
                status: 'draft',
                sort_order: 10,
            })
    );
    const [searchValue, setSearchValue] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const deferredSearch = useDeferredValue(searchValue.trim().toLowerCase());
    const [feedback, setFeedback] = useState({ type: 'idle', message: '' });
    const [uploadFeedback, setUploadFeedback] = useState({ type: 'idle', message: '' });
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    const activeCount = products.filter((product) => product.status === 'active').length;
    const draftCount = products.filter((product) => product.status === 'draft').length;
    const featuredCount = products.filter((product) => product.featured).length;
    const previewProduct = normalizeProductRecord({
        ...draft,
        gallery: draft.gallery,
        highlights: draft.highlights,
        tags: draft.tags,
        palette: draft.palette,
    });
    const previewImages = resolveProductGallery(previewProduct);
    const visibleProducts = sortProducts(products).filter((product) => {
        const matchesStatus = statusFilter === 'all' || product.status === statusFilter;
        const matchesSearch = !deferredSearch
            || [product.name, product.collection, product.category, ...(product.tags || [])]
                .filter(Boolean)
                .join(' ')
                .toLowerCase()
                .includes(deferredSearch);

        return matchesStatus && matchesSearch;
    });

    const resetToNewDraft = () => {
        const highestSortOrder = products.reduce((runningMax, product) => Math.max(runningMax, product.sort_order || 0), 0);

        setSelectedProductId('new');
        setDraft(createEmptyProductDraft({
            category: 'Top',
            collection: 'Atelier Archive',
            status: 'draft',
            sort_order: highestSortOrder + 10,
        }));
        setFeedback({ type: 'idle', message: '' });
        setUploadFeedback({ type: 'idle', message: '' });
    };

    const selectExistingProduct = (product) => {
        setSelectedProductId(product.id);
        setDraft(createProductEditorState(product));
        setFeedback({ type: 'idle', message: '' });
        setUploadFeedback({ type: 'idle', message: '' });
    };

    const handleFieldChange = (field, value) => {
        setDraft((currentDraft) => {
            const nextDraft = {
                ...currentDraft,
                [field]: value,
            };

            if (field === 'name') {
                const currentSlug = String(currentDraft.slug || '');
                const previousGeneratedSlug = slugifyProductName(currentDraft.name || '');

                if (!currentSlug || currentSlug === previousGeneratedSlug) {
                    nextDraft.slug = slugifyProductName(value);
                }
            }

            return nextDraft;
        });
    };

    const handleUpload = async (event, field) => {
        const file = event.target.files?.[0];

        if (!file) {
            return;
        }

        setIsUploading(true);
        setUploadFeedback({ type: 'idle', message: '' });

        try {
            const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
            const fileName = `${Date.now()}-${slugifyProductName(file.name.replace(/\.[^.]+$/, ''))}.${extension}`;
            const filePath = `products/${fileName}`;
            const { error } = await supabase.storage.from(PRODUCT_STORAGE_BUCKET).upload(filePath, file, {
                cacheControl: '3600',
                upsert: false,
                contentType: file.type || undefined,
            });

            if (error) {
                throw error;
            }

            const { data } = supabase.storage.from(PRODUCT_STORAGE_BUCKET).getPublicUrl(filePath);
            const uploadedUrl = data.publicUrl;

            setDraft((currentDraft) => {
                if (field === 'gallery') {
                    const existingGallery = String(currentDraft.gallery || '').trim();

                    return {
                        ...currentDraft,
                        gallery: existingGallery ? `${existingGallery}\n${uploadedUrl}` : uploadedUrl,
                    };
                }

                return {
                    ...currentDraft,
                    [field]: uploadedUrl,
                };
            });

            setUploadFeedback({ type: 'success', message: 'Image uploaded to Supabase Storage.' });
        } catch (error) {
            setUploadFeedback({ type: 'error', message: error.message || 'Unable to upload this image.' });
        } finally {
            event.target.value = '';
            setIsUploading(false);
        }
    };

    const handleSave = async (event) => {
        event.preventDefault();
        setIsSaving(true);
        setFeedback({ type: 'idle', message: '' });

        try {
            const payload = buildProductMutationInput(draft);

            if (!payload.name) {
                throw new Error('Product name is required.');
            }

            if (!payload.image_main) {
                throw new Error('A main image is required before saving.');
            }

            const method = selectedProductId === 'new' ? 'POST' : 'PUT';
            const response = await fetch('/api/admin/products', {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(selectedProductId === 'new' ? payload : { id: selectedProductId, ...payload }),
            });
            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(data.error || 'Unable to save this product.');
            }

            const savedProduct = normalizeProductRecord(data.product);
            const nextProducts = sortProducts([
                savedProduct,
                ...products.filter((product) => product.id !== savedProduct.id),
            ]);

            setProducts(nextProducts);
            setSelectedProductId(savedProduct.id);
            setDraft(createProductEditorState(savedProduct));
            setFeedback({ type: 'success', message: method === 'POST' ? 'Product created.' : 'Product saved.' });
        } catch (error) {
            setFeedback({ type: 'error', message: error.message || 'Unable to save this product.' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (selectedProductId === 'new' || isDeleting) {
            return;
        }

        const confirmed = window.confirm('Delete this product from the catalog?');

        if (!confirmed) {
            return;
        }

        setIsDeleting(true);
        setFeedback({ type: 'idle', message: '' });

        try {
            const response = await fetch(`/api/admin/products?id=${encodeURIComponent(selectedProductId)}`, {
                method: 'DELETE',
            });
            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(data.error || 'Unable to delete this product.');
            }

            const nextProducts = products.filter((product) => product.id !== selectedProductId);
            setProducts(nextProducts);
            resetToNewDraft();
            setFeedback({ type: 'success', message: 'Product deleted.' });
        } catch (error) {
            setFeedback({ type: 'error', message: error.message || 'Unable to delete this product.' });
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="flex flex-col gap-10 md:gap-12">
            <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 md:gap-5">
                <MetricCard label="Catalog" value={String(products.length).padStart(2, '0')} copy="Total pieces in the current admin catalog." />
                <MetricCard label="Active" value={String(activeCount).padStart(2, '0')} copy="Visible on the storefront right now." />
                <MetricCard label="Drafts" value={String(draftCount).padStart(2, '0')} copy="Internal pieces waiting for polish or approval." />
                <MetricCard label="Featured" value={String(featuredCount).padStart(2, '0')} copy="Lead products carrying the archive direction." />
                <MetricCard label="Inbox" value={String(recentInquiries.length).padStart(2, '0')} copy="Recent inquiries visible from the same admin view." />
            </section>

            <section className="grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-8 md:gap-10 items-start">
                <aside className="border border-[#1C1C1C]/10 bg-white/45 rounded-sm p-5 md:p-6 flex flex-col gap-5 xl:sticky xl:top-28">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-[10px] uppercase tracking-[0.28em] text-[#1C1C1C]/45 mb-3">Catalog Control</p>
                            <h2 className="font-serif text-3xl md:text-4xl font-light uppercase tracking-[0.12em] leading-none">Products</h2>
                        </div>
                        <button type="button" onClick={resetToNewDraft} className="hover-target rounded-full border border-[#1C1C1C]/12 bg-white/70 px-4 py-3 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/62 transition-colors hover:text-[#1C1C1C]">
                            New Piece
                        </button>
                    </div>

                    <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/45">
                        Search Catalog
                        <input value={searchValue} onChange={(event) => setSearchValue(event.target.value)} placeholder="Search name or collection" className="h-14 border border-[#1C1C1C]/12 bg-white/75 px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]" />
                    </label>

                    <div className="flex flex-wrap gap-2">
                        <FilterButton label="All" active={statusFilter === 'all'} onClick={() => setStatusFilter('all')} />
                        {PRODUCT_STATUS_OPTIONS.map((option) => (
                            <FilterButton key={option.value} label={option.label} active={statusFilter === option.value} onClick={() => setStatusFilter(option.value)} />
                        ))}
                    </div>

                    <div className="flex flex-col gap-3 max-h-[720px] overflow-y-auto pr-1">
                        <button
                            type="button"
                            onClick={resetToNewDraft}
                            className={`w-full text-left rounded-sm border p-4 transition-colors ${selectedProductId === 'new' ? 'border-[#1C1C1C] bg-[#1C1C1C] text-[#EFECE8]' : 'border-dashed border-[#1C1C1C]/16 bg-white/75 text-[#1C1C1C]/72 hover:bg-white'}`}
                        >
                            <p className="font-serif text-2xl font-light leading-none">Create New Product</p>
                            <p className={`mt-3 text-[10px] uppercase tracking-[0.24em] ${selectedProductId === 'new' ? 'text-white/55' : 'text-[#1C1C1C]/42'}`}>Fresh entry with image upload and draft support.</p>
                        </button>

                        {visibleProducts.map((product) => (
                            <ProductListItem key={product.id} product={product} active={selectedProductId === product.id} onSelect={() => selectExistingProduct(product)} />
                        ))}
                    </div>
                </aside>

                <form onSubmit={handleSave} className="border border-[#1C1C1C]/10 bg-white/50 rounded-sm p-6 md:p-8 flex flex-col gap-8 md:gap-10">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-5">
                        <div>
                            <p className="text-[10px] uppercase tracking-[0.28em] text-[#1C1C1C]/45 mb-3">Studio Admin</p>
                            <h2 className="font-serif text-4xl md:text-5xl font-light uppercase tracking-[0.12em] leading-none">{selectedProductId === 'new' ? 'New Product' : draft.name || 'Edit Product'}</h2>
                            <p className="mt-4 text-sm leading-relaxed text-[#1C1C1C]/58">Signed in as {profile?.full_name || user.email}. The form below writes directly to Supabase through the guarded admin API.</p>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <button type="button" onClick={resetToNewDraft} className="hover-target h-12 px-5 border border-[#1C1C1C]/12 text-[10px] uppercase tracking-[0.22em] transition-colors hover:bg-white">New Draft</button>
                            {selectedProductId !== 'new' && (
                                <button type="button" onClick={handleDelete} disabled={isDeleting} className={`hover-target h-12 px-5 border border-red-200 bg-red-50 text-[10px] uppercase tracking-[0.22em] text-red-700 transition-colors ${isDeleting ? 'opacity-60' : 'hover:bg-red-100'}`}>
                                    {isDeleting ? 'Deleting' : 'Delete'}
                                </button>
                            )}
                            <button disabled={isSaving} className={`hover-target h-12 px-6 bg-[#1C1C1C] text-[#EFECE8] text-[10px] uppercase tracking-[0.24em] font-medium transition-colors ${isSaving ? 'opacity-60' : 'hover:bg-black'}`}>
                                {isSaving ? 'Saving' : 'Save Product'}
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-[0.92fr_1.08fr] gap-6 md:gap-8 items-stretch">
                        <div className="border border-[#1C1C1C]/10 bg-[#1C1C1C] text-[#EFECE8] rounded-sm overflow-hidden min-h-[420px] flex flex-col">
                            <div className="aspect-[4/5] bg-black/20 overflow-hidden">
                                {previewImages[0] ? (
                                    <img src={previewImages[0]} alt={previewProduct.name || 'Preview'} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-[10px] uppercase tracking-[0.28em] text-white/38">Main image preview</div>
                                )}
                            </div>
                            <div className="p-6 flex flex-col gap-4">
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <p className="text-[10px] uppercase tracking-[0.28em] text-white/40 mb-2">Storefront Preview</p>
                                        <h3 className="font-serif text-3xl font-light leading-none uppercase tracking-[0.1em]">{previewProduct.name || 'Untitled Piece'}</h3>
                                    </div>
                                    <span className="rounded-full border border-white/12 bg-white/8 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-white/68">{previewProduct.status}</span>
                                </div>
                                <p className="text-sm leading-relaxed text-white/68">{previewProduct.subtitle || previewProduct.description || 'Add copy so the storefront preview feels complete before publishing.'}</p>
                                <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.22em] text-white/45">
                                    <span className="rounded-full border border-white/12 bg-white/6 px-3 py-2">{previewProduct.collection}</span>
                                    <span className="rounded-full border border-white/12 bg-white/6 px-3 py-2">{previewProduct.category}</span>
                                    <span className="rounded-full border border-white/12 bg-white/6 px-3 py-2">{formatProductCurrency(previewProduct.price)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55 md:col-span-2">
                                Product Name
                                <input value={draft.name} onChange={(event) => handleFieldChange('name', event.target.value)} className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]" />
                            </label>

                            <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55 md:col-span-2">
                                Subtitle
                                <input value={draft.subtitle} onChange={(event) => handleFieldChange('subtitle', event.target.value)} className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]" />
                            </label>

                            <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                                Slug
                                <div className="grid grid-cols-[minmax(0,1fr)_110px] gap-3">
                                    <input value={draft.slug} onChange={(event) => handleFieldChange('slug', event.target.value)} className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]" />
                                    <button type="button" onClick={() => handleFieldChange('slug', slugifyProductName(draft.name || draft.slug || 'atelier-piece'))} className="hover-target h-14 border border-[#1C1C1C]/12 bg-white text-[10px] uppercase tracking-[0.22em] transition-colors hover:bg-[#1C1C1C] hover:text-[#EFECE8]">Refresh</button>
                                </div>
                            </label>

                            <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                                Status
                                <select value={draft.status} onChange={(event) => handleFieldChange('status', event.target.value)} className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]">
                                    {PRODUCT_STATUS_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                </select>
                            </label>

                            <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                                Category
                                <select value={draft.category} onChange={(event) => handleFieldChange('category', event.target.value)} className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]">
                                    {PRODUCT_CATEGORY_OPTIONS.map((option) => (
                                        <option key={option} value={option}>{option}</option>
                                    ))}
                                </select>
                            </label>

                            <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                                Collection
                                <select value={draft.collection} onChange={(event) => handleFieldChange('collection', event.target.value)} className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]">
                                    {PRODUCT_COLLECTION_OPTIONS.map((option) => (
                                        <option key={option} value={option}>{option}</option>
                                    ))}
                                </select>
                            </label>

                            <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                                Price
                                <input value={draft.price} onChange={(event) => handleFieldChange('price', event.target.value)} type="number" min="0" step="0.01" className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]" />
                            </label>

                            <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                                Compare At Price
                                <input value={draft.compare_at_price} onChange={(event) => handleFieldChange('compare_at_price', event.target.value)} type="number" min="0" step="0.01" className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]" />
                            </label>

                            <label className="md:col-span-2 flex items-center gap-3 rounded-sm border border-[#1C1C1C]/10 bg-white/70 px-4 py-4 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                                <input type="checkbox" checked={Boolean(draft.featured)} onChange={(event) => handleFieldChange('featured', event.target.checked)} className="h-4 w-4 border border-[#1C1C1C]/20" />
                                Featured Product
                            </label>
                            <p className="md:col-span-2 -mt-2 text-xs leading-relaxed text-[#1C1C1C]/52">Featured products now power both the collections carousel and the Spotlight page. Use sort order to decide which featured piece appears first.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <label className="md:col-span-2 flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                            Short Description
                            <textarea value={draft.description} onChange={(event) => handleFieldChange('description', event.target.value)} rows={4} className="border border-[#1C1C1C]/12 bg-white px-4 py-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C] resize-none" />
                        </label>
                        <label className="md:col-span-2 flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                            Story Section
                            <textarea value={draft.story} onChange={(event) => handleFieldChange('story', event.target.value)} rows={5} className="border border-[#1C1C1C]/12 bg-white px-4 py-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C] resize-none" />
                        </label>
                        <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                            Materials
                            <textarea value={draft.materials} onChange={(event) => handleFieldChange('materials', event.target.value)} rows={4} className="border border-[#1C1C1C]/12 bg-white px-4 py-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C] resize-none" />
                        </label>
                        <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                            Care
                            <textarea value={draft.care} onChange={(event) => handleFieldChange('care', event.target.value)} rows={4} className="border border-[#1C1C1C]/12 bg-white px-4 py-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C] resize-none" />
                        </label>
                        <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                            Fit Notes
                            <textarea value={draft.fit_notes} onChange={(event) => handleFieldChange('fit_notes', event.target.value)} rows={4} className="border border-[#1C1C1C]/12 bg-white px-4 py-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C] resize-none" />
                        </label>
                        <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                            Artisan Note
                            <textarea value={draft.artisan_note} onChange={(event) => handleFieldChange('artisan_note', event.target.value)} rows={4} className="border border-[#1C1C1C]/12 bg-white px-4 py-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C] resize-none" />
                        </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <ImageField label="Main Image URL" value={draft.image_main} field="image_main" onChange={handleFieldChange} onUpload={handleUpload} isUploading={isUploading} />
                        <ImageField label="Detail Image URL" value={draft.image_detail} field="image_detail" onChange={handleFieldChange} onUpload={handleUpload} isUploading={isUploading} />
                        <label className="md:col-span-2 flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                            Gallery URLs
                            <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_140px] gap-3 items-start">
                                <textarea value={draft.gallery} onChange={(event) => handleFieldChange('gallery', event.target.value)} rows={4} placeholder="One image URL per line" className="border border-[#1C1C1C]/12 bg-white px-4 py-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C] resize-none" />
                                <label className={`h-14 border border-[#1C1C1C]/12 flex items-center justify-center bg-white text-[10px] uppercase tracking-[0.22em] ${isUploading ? 'opacity-60' : 'hover:bg-[#1C1C1C] hover:text-[#EFECE8]'} transition-colors cursor-pointer`}>
                                    {isUploading ? 'Uploading' : 'Upload'}
                                    <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => handleUpload(event, 'gallery')} disabled={isUploading} />
                                </label>
                            </div>
                        </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                            Highlights
                            <textarea value={draft.highlights} onChange={(event) => handleFieldChange('highlights', event.target.value)} rows={4} placeholder="One highlight per line" className="border border-[#1C1C1C]/12 bg-white px-4 py-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C] resize-none" />
                        </label>
                        <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                            Tags
                            <textarea value={draft.tags} onChange={(event) => handleFieldChange('tags', event.target.value)} rows={4} placeholder="Comma-separated tags" className="border border-[#1C1C1C]/12 bg-white px-4 py-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C] resize-none" />
                        </label>
                        <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                            Palette
                            <textarea value={draft.palette} onChange={(event) => handleFieldChange('palette', event.target.value)} rows={3} placeholder="Comma-separated tones" className="border border-[#1C1C1C]/12 bg-white px-4 py-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C] resize-none" />
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                            <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                                Inventory
                                <input value={draft.inventory_count} onChange={(event) => handleFieldChange('inventory_count', event.target.value)} type="number" min="0" step="1" className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]" />
                            </label>
                            <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                                Lead Time
                                <input value={draft.lead_time_days} onChange={(event) => handleFieldChange('lead_time_days', event.target.value)} type="number" min="1" step="1" className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]" />
                            </label>
                            <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                                Sort Order
                                <input value={draft.sort_order} onChange={(event) => handleFieldChange('sort_order', event.target.value)} type="number" step="1" className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]" />
                            </label>
                        </div>
                    </div>

                    {(feedback.message || uploadFeedback.message || maintenanceMessage) && (
                        <div className="flex flex-col gap-2">
                            {feedback.message && <p className={`text-sm ${feedback.type === 'error' ? 'text-red-600' : 'text-[#1C1C1C]/68'}`}>{feedback.message}</p>}
                            {uploadFeedback.message && <p className={`text-sm ${uploadFeedback.type === 'error' ? 'text-red-600' : 'text-[#1C1C1C]/68'}`}>{uploadFeedback.message}</p>}
                            {maintenanceMessage && <p className="text-sm text-[#1C1C1C]/55">{maintenanceMessage}</p>}
                        </div>
                    )}
                </form>
            </section>

            <section className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8">
                <div className="border border-[#1C1C1C]/10 bg-white/45 rounded-sm p-6 md:p-8 flex flex-col gap-5">
                    <div className="flex items-end justify-between gap-4">
                        <div>
                            <p className="text-[10px] uppercase tracking-[0.28em] text-[#1C1C1C]/45 mb-3">Recent Orders</p>
                            <h3 className="font-serif text-3xl md:text-4xl font-light uppercase tracking-[0.12em]">Atelier Archive</h3>
                        </div>
                        <p className="text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/42">{recentOrders.length} visible</p>
                    </div>

                    <div className="flex flex-col gap-4">
                        {recentOrders.length === 0 ? (
                            <p className="text-sm text-[#1C1C1C]/58">No recent orders yet.</p>
                        ) : (
                            recentOrders.map((order) => (
                                <div key={order.id} className="border border-[#1C1C1C]/10 bg-white/75 rounded-sm p-4 md:p-5 flex flex-col gap-3">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <p className="text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/42 mb-2">#{String(order.id).slice(0, 8).toUpperCase()}</p>
                                            <p className="font-serif text-2xl font-light leading-none text-[#1C1C1C]">{formatProductCurrency(order.total || 0)}</p>
                                        </div>
                                        <span className={`rounded-full border px-3 py-2 text-[10px] uppercase tracking-[0.22em] ${getStatusClasses(order.status || 'draft')}`}>{order.status || 'pending'}</span>
                                    </div>
                                    <p className="text-sm leading-relaxed text-[#1C1C1C]/58">{buildOrderSummary(order)}</p>
                                    <div className="flex items-center justify-between gap-4 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/42">
                                        <span>{order.item_count || 0} piece{order.item_count === 1 ? '' : 's'}</span>
                                        <span>{formatDate(order.created_at)}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="border border-[#1C1C1C]/10 bg-[#1C1C1C] text-[#EFECE8] rounded-sm p-6 md:p-8 flex flex-col gap-5">
                    <div className="flex items-end justify-between gap-4">
                        <div>
                            <p className="text-[10px] uppercase tracking-[0.28em] text-white/40 mb-3">Recent Inquiries</p>
                            <h3 className="font-serif text-3xl md:text-4xl font-light uppercase tracking-[0.12em]">Atelier Inbox</h3>
                        </div>
                        <p className="text-[10px] uppercase tracking-[0.22em] text-white/35">{recentInquiries.length} visible</p>
                    </div>

                    <div className="flex flex-col gap-4">
                        {recentInquiries.length === 0 ? (
                            <p className="text-sm text-white/60">No recent inquiries yet.</p>
                        ) : (
                            recentInquiries.map((inquiry) => (
                                <div key={inquiry.id} className="border border-white/10 bg-white/[0.04] rounded-sm p-4 md:p-5 flex flex-col gap-3">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <p className="text-[10px] uppercase tracking-[0.22em] text-white/40 mb-2">{inquiry.query_type || 'Other'}</p>
                                            <p className="font-serif text-2xl font-light leading-none text-white">{inquiry.full_name || inquiry.email}</p>
                                        </div>
                                        <span className="text-[10px] uppercase tracking-[0.22em] text-white/38">{formatDate(inquiry.created_at)}</span>
                                    </div>
                                    <p className="text-sm leading-relaxed text-white/68">{buildInquiryPreview(inquiry.message)}</p>
                                    <div className="flex items-center justify-between gap-4 text-[10px] uppercase tracking-[0.22em] text-white/40">
                                        <span>{inquiry.email}</span>
                                        <span>{inquiry.status || 'new'}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
}
