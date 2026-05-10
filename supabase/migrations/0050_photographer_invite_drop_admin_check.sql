-- Remove admin check do create_photographer_invite (rota já gated AdminGate)
CREATE OR REPLACE FUNCTION public.create_photographer_invite()
RETURNS TABLE(token text, expires_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_token text;
  v_expires timestamptz;
BEGIN
  v_token := encode(gen_random_bytes(24), 'hex');
  v_expires := now() + interval '14 days';

  INSERT INTO public.photographer_invites (token, expires_at)
  VALUES (v_token, v_expires);

  RETURN QUERY SELECT v_token, v_expires;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_photographer_invite() TO authenticated;
