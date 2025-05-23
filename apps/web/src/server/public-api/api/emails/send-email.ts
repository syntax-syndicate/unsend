import { createRoute, z } from "@hono/zod-openapi";
import { PublicAPIApp } from "~/server/public-api/hono";
import { getTeamFromToken } from "~/server/public-api/auth";
import { sendEmail } from "~/server/service/email-service";

const route = createRoute({
  method: "post",
  path: "/v1/emails",
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: z
            .object({
              to: z.string().or(z.array(z.string())),
              from: z.string(),
              subject: z.string().optional().openapi({
                description: "Optional when templateId is provided",
              }),
              templateId: z.string().optional().openapi({
                description: "ID of a template from the dashboard",
              }),
              variables: z.record(z.string()).optional(),
              replyTo: z.string().or(z.array(z.string())).optional(),
              cc: z.string().or(z.array(z.string())).optional(),
              bcc: z.string().or(z.array(z.string())).optional(),
              text: z.string().optional().nullable(),
              html: z.string().optional().nullable(),
              attachments: z
                .array(
                  z.object({
                    filename: z.string(),
                    content: z.string(),
                  })
                )
                .optional(),
              scheduledAt: z.string().datetime().optional(),
            })
            .refine(
              (data) => !!data.subject || !!data.templateId,
              "Either subject or templateId should be passed."
            ),
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({ emailId: z.string().optional() }),
        },
      },
      description: "Retrieve the user",
    },
  },
});

function send(app: PublicAPIApp) {
  app.openapi(route, async (c) => {
    const team = await getTeamFromToken(c);

    const email = await sendEmail({
      ...c.req.valid("json"),
      teamId: team.id,
      apiKeyId: team.apiKeyId,
      text: c.req.valid("json").text ?? undefined,
      html: c.req.valid("json").html ?? undefined,
    });

    return c.json({ emailId: email?.id });
  });
}

export default send;
