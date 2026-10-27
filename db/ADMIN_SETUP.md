# ProLink Administrator Account Setup (`db/ADMIN_SETUP.md`)

Administrator accounts cannot be self-registered through public RPCs or signup metadata. Follow the steps below to provision and promote an administrator account manually.

---

## Step 1: Create the User Account

Choose one of the following methods using the email address you want to use for administration:

1. **Via the Live Application**:
   - Open the ProLink Sign Up page (`/sign-in?mode=signup`) and register a new account with your chosen email address.
2. **Via the Supabase Dashboard**:
   - Open your Supabase project dashboard and navigate to **Authentication** $\rightarrow$ **Users** $\rightarrow$ **Add user** $\rightarrow$ **Create new user** with your chosen email address.

When the user record is inserted into `auth.users`, the `on_auth_user_created` database trigger automatically creates a corresponding row in `public.profiles` with `role = 'user'`.

---

## Step 2: Promote the Account to Administrator

Open the **Supabase Dashboard** $\rightarrow$ **SQL Editor** and run the following statement, replacing `<ADMIN_EMAIL>` with the email address from Step 1:

```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = '<ADMIN_EMAIL>');
```

---

## Step 3: Verify Promotion & Rotate Credentials

1. Confirm that the update succeeded in the SQL Editor:
   ```sql
   select id, full_name, role, is_suspended
   from public.profiles
   where id = (select id from auth.users where email = '<ADMIN_EMAIL>');
   ```
2. Sign in through the standard `/sign-in` page. The portal will detect `role = 'admin'` and redirect you to `/admin`.
3. **Important Security Notice**: Ensure the administrator account's sign-in credential is changed to a strong, unique secret before the portal is demonstrated or shown to anyone.
