-- Email/password sign-up was removed; Google OAuth is the only sign-in method.
-- username_available() was reachable by anon (via Postgres' default PUBLIC
-- execute grant plus an explicit anon grant) so the logged-out signup form could
-- pre-check handle availability. The only remaining caller is the authenticated
-- /welcome handle-picker, so restrict execution to authenticated only.
revoke execute on function public.username_available(text) from public;
revoke execute on function public.username_available(text) from anon;
grant execute on function public.username_available(text) to authenticated;
