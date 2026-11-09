import { context, body, json, errorResponse, getRole } from "../../../lib/server";
import { DomainError } from "../../../lib/domain";
import { intakeSchema, registerApplicationTool } from "../../../lib/intake";
export async function POST(request: Request) { try {
  const ctx = await context(); if (await getRole(ctx) !== "coordinator") throw new DomainError("नया आवेदन बनाने के लिए समन्वयक भूमिका चुनें।", 403);
  const parsed = intakeSchema.safeParse(await body(request));
  if (!parsed.success) return json({ error: "नाम, गाँव, 10 अंकों का मोबाइल, सही रकबा और जानकारी रखने की सहमति भरें।" }, 400);
  return json({ case: await registerApplicationTool(ctx, parsed.data) }, 201);
} catch (e) { return errorResponse(e); } }
