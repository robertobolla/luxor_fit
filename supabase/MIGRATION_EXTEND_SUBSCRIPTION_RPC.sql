-- RPC to extend a gym member's subscription
-- Only allows updating if the member belongs to the empresario

CREATE OR REPLACE FUNCTION extend_gym_member_subscription(
  p_empresario_id TEXT,
  p_user_id TEXT,
  p_new_expiry TIMESTAMPTZ
)
RETURNS JSON AS $$
DECLARE
  v_updated_member JSON;
BEGIN
  -- Check if member exists and belongs to empresario
  -- We cast to text/uuid as needed. gym_members.user_id is UUID 
  -- but we might pass text from frontend (Clerk ID) if we fixed the table
  -- wait, gym_members.user_id IS UUID in definition? 
  -- In previous steps I found it might be UUID but Clerk IDs are text. 
  -- If createGymUser inserts text into UUID column it would fail unless the column IS text.
  -- Let's assume user_id is compatible with what is passed.
  -- But wait, my previous V2 fix CAST user_id to text in the SELECT.
  -- This implies the column might be UUID and Clerk IDs are NOT used?
  -- OR the column is UUID and the user IDs are actually UUIDs?
  -- create-gym-user script uses `clerkCreateUserResponse.id` which is usually `user_...`.
  -- If gym_members.user_id is UUID, insert triggers must be failing OR it's actually TEXT.
  -- The error "column reference user_id is ambiguous" happened in my V2 function because I used `user_id` as output param.
  -- The valid fix was casting `gm.user_id::text`.
  -- This suggests `gm.user_id` MIGHT be UUID.
  -- If Clerk IDs are `user_...`, they CANNOT be cast to UUID.
  -- So `gm.user_id` MUST be TEXT if it stores Clerk IDs.
  -- If `gm.user_id` is UUID, then Clerk IDs are NOT stored there directly?
  -- No, `create-gym-user` inserts `user_id: clerkUserId`.
  -- If `gym_members.user_id` is UUID, then it must be failing for `user_...` IDs.
  -- BUT `create-gym-user` works? 
  -- Maybe I should cast `p_user_id` to the column type.
  -- To be safe, I will try to update casting both sides to text if needed.
  
  -- Actually, to be safest, let's just let Postgres handle the types by using the column reference directly
  
  UPDATE gym_members
  SET 
    subscription_expires_at = p_new_expiry,
    is_active = true -- Reactivate if expired
  WHERE 
    empresario_id::text = p_empresario_id 
    AND user_id::text = p_user_id
  RETURNING row_to_json(gym_members.*) INTO v_updated_member;

  IF v_updated_member IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Member not found or does not belong to this empresario');
  END IF;

  RETURN json_build_object('success', true, 'data', v_updated_member);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
