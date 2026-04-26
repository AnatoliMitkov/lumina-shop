function toAmount(value) {
    const parsedValue = Number.parseFloat(String(value ?? 0));

    if (!Number.isFinite(parsedValue)) {
        return 0;
    }

    return Number(parsedValue.toFixed(2));
}

function normalizeCode(value) {
    return typeof value === 'string' ? value.trim().toUpperCase() : '';
}

function getPricingSnapshot(order = {}) {
    return order?.pricing_snapshot && typeof order.pricing_snapshot === 'object'
        ? order.pricing_snapshot
        : {};
}

function getOrderDate(order = {}) {
    const parsedDate = new Date(order?.paid_at || order?.created_at || 0);

    if (Number.isNaN(parsedDate.getTime())) {
        return null;
    }

    return parsedDate;
}

function createTimeline(days = 14) {
    const dayCount = Math.max(1, Number.parseInt(String(days ?? 14), 10) || 14);
    const shortFormatter = new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
    });
    const fullFormatter = new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
    const lookup = new Map();
    const points = [];
    const today = new Date();

    today.setHours(0, 0, 0, 0);

    for (let offset = dayCount - 1; offset >= 0; offset -= 1) {
        const pointDate = new Date(today);

        pointDate.setDate(today.getDate() - offset);

        const key = pointDate.toISOString().slice(0, 10);
        const point = {
            key,
            shortLabel: shortFormatter.format(pointDate),
            fullLabel: fullFormatter.format(pointDate),
            saved: 0,
            earned: 0,
            uses: 0,
        };

        lookup.set(key, point);
        points.push(point);
    }

    return { lookup, points };
}

function finalizeTimeline(points = []) {
    return points.map((point) => ({
        ...point,
        saved: toAmount(point.saved),
        earned: toAmount(point.earned),
    }));
}

export function buildDiscountCodeInsights(orders = [], code = '', days = 14) {
    const normalizedCode = normalizeCode(code);
    const { lookup, points } = createTimeline(days);
    let totalSaved = 0;
    let redemptions = 0;

    if (!normalizedCode) {
        return {
            redemptions: 0,
            totalSaved: 0,
            averageSaved: 0,
            timeline: finalizeTimeline(points),
            hasActivity: false,
        };
    }

    orders.forEach((order) => {
        const snapshot = getPricingSnapshot(order);
        const orderCode = normalizeCode(order?.discount_code || snapshot.discount_code);

        if (orderCode !== normalizedCode) {
            return;
        }

        const savedAmount = toAmount(snapshot.discount_applied_amount ?? 0);

        if (savedAmount <= 0) {
            return;
        }

        const orderDate = getOrderDate(order);
        const timelinePoint = orderDate ? lookup.get(orderDate.toISOString().slice(0, 10)) : null;

        totalSaved += savedAmount;
        redemptions += 1;

        if (timelinePoint) {
            timelinePoint.saved += savedAmount;
            timelinePoint.uses += 1;
        }
    });

    return {
        redemptions,
        totalSaved: toAmount(totalSaved),
        averageSaved: redemptions > 0 ? toAmount(totalSaved / redemptions) : 0,
        timeline: finalizeTimeline(points),
        hasActivity: redemptions > 0,
    };
}

export function buildAffiliateCodeInsights(orders = [], code = '', days = 14) {
    const normalizedCode = normalizeCode(code);
    const { lookup, points } = createTimeline(days);
    let trackedOrders = 0;
    let totalSaved = 0;
    let totalEarned = 0;

    if (!normalizedCode) {
        return {
            trackedOrders: 0,
            totalSaved: 0,
            totalEarned: 0,
            averageSaved: 0,
            averageEarned: 0,
            timeline: finalizeTimeline(points),
            hasActivity: false,
        };
    }

    orders.forEach((order) => {
        const snapshot = getPricingSnapshot(order);
        const orderCode = normalizeCode(order?.affiliate_code || snapshot.affiliate_code);

        if (orderCode !== normalizedCode) {
            return;
        }

        const savedAmount = toAmount(snapshot.affiliate_customer_discount_amount ?? 0);
        const earnedAmount = toAmount(snapshot.affiliate_commission_amount ?? 0);
        const orderDate = getOrderDate(order);
        const timelinePoint = orderDate ? lookup.get(orderDate.toISOString().slice(0, 10)) : null;

        trackedOrders += 1;
        totalSaved += savedAmount;
        totalEarned += earnedAmount;

        if (timelinePoint) {
            timelinePoint.saved += savedAmount;
            timelinePoint.earned += earnedAmount;
            timelinePoint.uses += 1;
        }
    });

    return {
        trackedOrders,
        totalSaved: toAmount(totalSaved),
        totalEarned: toAmount(totalEarned),
        averageSaved: trackedOrders > 0 ? toAmount(totalSaved / trackedOrders) : 0,
        averageEarned: trackedOrders > 0 ? toAmount(totalEarned / trackedOrders) : 0,
        timeline: finalizeTimeline(points),
        hasActivity: trackedOrders > 0,
    };
}