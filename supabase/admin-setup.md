# Admin Setup

1. Run `supabase/cart-orders.sql` first so the base account, order, and inquiry tables exist.
2. Run `supabase/catalog-admin.sql` to add the richer `products` schema, admin permissions, and the `product-media` storage bucket.
3. Run `supabase/catalog-seed.sql` if you want the 18 starter products included in this repo.
4. Mark your own profile as an admin in Supabase SQL:

```sql
update public.profiles
set is_admin = true
where email = 'you@example.com';
```

5. Sign back in and open `/admin` in the app.

## Notes

- Public storefront pages only show `active` products.
- The admin panel can create, edit, and delete products once `is_admin = true` is set on your profile.
- Image uploads go to the public Supabase Storage bucket `product-media`.