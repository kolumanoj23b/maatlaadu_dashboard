revoke execute on function public.has_role(uuid, public.app_role) from public, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;