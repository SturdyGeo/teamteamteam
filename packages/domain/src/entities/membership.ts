import { z } from "zod";

export const MembershipRoleSchema = z.enum(["owner", "admin", "member"]);
export type MembershipRole = z.infer<typeof MembershipRoleSchema>;

export const MembershipSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid(),
  user_id: z.string().uuid(),
  role: MembershipRoleSchema,
  created_at: z.string().datetime(),
});

export type Membership = z.infer<typeof MembershipSchema>;
