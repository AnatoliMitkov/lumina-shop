import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '../../../../utils/supabase/server';
import { buildProductBulkMutationInput, buildProductMutationInput, normalizeProductRecord, sortProducts } from '../../../../utils/products';

export const dynamic = 'force-dynamic';

function isCatalogSetupError(error) {
    const message = typeof error?.message === 'string' ? error.message : '';

    return error?.code === '42P01'
        || error?.code === '42703'
        || error?.code === 'PGRST204'
        || error?.code === 'PGRST205'
        || message.toLowerCase().includes('products')
        || message.toLowerCase().includes('is_admin')
        || message.toLowerCase().includes('schema cache');
}

function toErrorResponse(error) {
    if (isCatalogSetupError(error)) {
        return NextResponse.json({ error: 'Catalog admin schema is missing. Run supabase/cart-orders.sql and supabase/catalog-admin.sql first.' }, { status: 503 });
    }

    if (error?.code === '23505') {
        return NextResponse.json({ error: 'That product slug is already in use.' }, { status: 409 });
    }

    return NextResponse.json({ error: error?.message || 'Unable to complete this admin request.' }, { status: 500 });
}

function normalizeProductIds(value) {
    if (!Array.isArray(value)) {
        return [];
    }

    return [...new Set(value
        .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
        .filter(Boolean))];
}

async function getAdminContext() {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return {
            errorResponse: NextResponse.json({ error: 'You must be signed in to use the admin catalog.' }, { status: 401 }),
        };
    }

    const profileResult = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .maybeSingle();

    if (profileResult.error) {
        return {
            errorResponse: toErrorResponse(profileResult.error),
        };
    }

    if (!profileResult.data?.is_admin) {
        return {
            errorResponse: NextResponse.json({ error: 'Admin access is required for product maintenance.' }, { status: 403 }),
        };
    }

    return { supabase, user };
}

export async function GET() {
    const context = await getAdminContext();

    if (context.errorResponse) {
        return context.errorResponse;
    }

    try {
        const { data, error } = await context.supabase
            .from('products')
            .select('*')
            .order('featured', { ascending: false })
            .order('sort_order', { ascending: true })
            .order('updated_at', { ascending: false });

        if (error) {
            throw error;
        }

        return NextResponse.json({
            products: sortProducts(data ?? []),
        });
    } catch (error) {
        return toErrorResponse(error);
    }
}

export async function POST(request) {
    const context = await getAdminContext();

    if (context.errorResponse) {
        return context.errorResponse;
    }

    try {
        const payload = await request.json();
        const productInput = buildProductMutationInput(payload);

        if (!productInput.name) {
            return NextResponse.json({ error: 'Product name is required.' }, { status: 400 });
        }

        if (!productInput.image_main) {
            return NextResponse.json({ error: 'A main image is required.' }, { status: 400 });
        }

        const { data, error } = await context.supabase
            .from('products')
            .insert(productInput)
            .select('*')
            .single();

        if (error) {
            throw error;
        }

        return NextResponse.json({
            product: normalizeProductRecord(data),
        });
    } catch (error) {
        return toErrorResponse(error);
    }
}

export async function PUT(request) {
    const context = await getAdminContext();

    if (context.errorResponse) {
        return context.errorResponse;
    }

    try {
        const payload = await request.json();
        const productId = typeof payload?.id === 'string' ? payload.id : '';

        if (!productId) {
            return NextResponse.json({ error: 'A product id is required for updates.' }, { status: 400 });
        }

        const productInput = buildProductMutationInput(payload);

        if (!productInput.name) {
            return NextResponse.json({ error: 'Product name is required.' }, { status: 400 });
        }

        if (!productInput.image_main) {
            return NextResponse.json({ error: 'A main image is required.' }, { status: 400 });
        }

        const { data, error } = await context.supabase
            .from('products')
            .update(productInput)
            .eq('id', productId)
            .select('*')
            .single();

        if (error) {
            throw error;
        }

        return NextResponse.json({
            product: normalizeProductRecord(data),
        });
    } catch (error) {
        return toErrorResponse(error);
    }
}

export async function PATCH(request) {
    const context = await getAdminContext();

    if (context.errorResponse) {
        return context.errorResponse;
    }

    try {
        const payload = await request.json();

        if (Array.isArray(payload?.products)) {
            const productEntries = payload.products
                .map((entry) => {
                    const productId = typeof entry?.id === 'string' ? entry.id.trim() : '';

                    if (!productId) {
                        return null;
                    }

                    return {
                        id: productId,
                        input: buildProductMutationInput(entry),
                    };
                })
                .filter(Boolean);

            if (productEntries.length === 0) {
                return NextResponse.json({ error: 'At least one product row is required for grid updates.' }, { status: 400 });
            }

            const updatedProducts = await Promise.all(productEntries.map(async ({ id, input }) => {
                if (!input.name) {
                    throw new Error('Product name is required for grid updates.');
                }

                if (!input.image_main) {
                    throw new Error('A main image is required for grid updates.');
                }

                const { data, error } = await context.supabase
                    .from('products')
                    .update(input)
                    .eq('id', id)
                    .select('*')
                    .single();

                if (error) {
                    throw error;
                }

                return normalizeProductRecord(data);
            }));

            return NextResponse.json({
                products: sortProducts(updatedProducts),
            });
        }

        const productIds = normalizeProductIds(payload?.ids);
        const updates = buildProductBulkMutationInput(payload?.updates);

        if (productIds.length === 0) {
            return NextResponse.json({ error: 'At least one product id is required for bulk updates.' }, { status: 400 });
        }

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: 'Choose at least one field to update.' }, { status: 400 });
        }

        const { data, error } = await context.supabase
            .from('products')
            .update(updates)
            .in('id', productIds)
            .select('*');

        if (error) {
            throw error;
        }

        return NextResponse.json({
            products: sortProducts((data ?? []).map((product) => normalizeProductRecord(product))),
        });
    } catch (error) {
        return toErrorResponse(error);
    }
}

export async function DELETE(request) {
    const context = await getAdminContext();

    if (context.errorResponse) {
        return context.errorResponse;
    }

    try {
        const requestUrl = new URL(request.url);
        const singleProductId = requestUrl.searchParams.get('id') || '';
        const payload = singleProductId ? null : await request.json().catch(() => null);
        const productIds = singleProductId ? [singleProductId] : normalizeProductIds(payload?.ids);

        if (productIds.length === 0) {
            return NextResponse.json({ error: 'A product id is required for deletion.' }, { status: 400 });
        }

        const { error } = await context.supabase
            .from('products')
            .delete()
            .in('id', productIds);

        if (error) {
            throw error;
        }

        return NextResponse.json({ success: true, deletedIds: productIds });
    } catch (error) {
        return toErrorResponse(error);
    }
}
