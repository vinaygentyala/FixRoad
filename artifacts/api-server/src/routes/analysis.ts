import { Router, type IRouter } from "express";
import {
  AnalyzePotholeBody,
  AnalyzePotholeResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();
const MAX_IMAGE_DATA_URL_LENGTH = 8 * 1024 * 1024;
const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 12;
const requestsByIp = new Map<string, { count: number; expiresAt: number }>();

const assessmentSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    is_pothole: { type: "boolean" },
    severity: { type: "string", enum: ["low", "medium", "high", "unknown"] },
    confidence: { type: ["number", "null"], minimum: 0, maximum: 1 },
    reason: { type: "string" },
    needs_manual_review: { type: "boolean" },
  },
  required: [
    "is_pothole",
    "severity",
    "confidence",
    "reason",
    "needs_manual_review",
  ],
} as const;

router.post("/analysis/potholes", async (req, res) => {
  const now = Date.now();
  const ip = req.ip ?? "unknown";
  const current = requestsByIp.get(ip);

  if (current && current.expiresAt > now && current.count >= MAX_REQUESTS_PER_WINDOW) {
    res.status(429).json({ error: "Too many image analyses. Please wait a few minutes and try again." });
    return;
  }

  if (!current || current.expiresAt <= now) {
    requestsByIp.set(ip, { count: 1, expiresAt: now + WINDOW_MS });
  } else {
    current.count += 1;
  }

  if (requestsByIp.size > 2_000) {
    for (const [key, entry] of requestsByIp) {
      if (entry.expiresAt <= now) requestsByIp.delete(key);
    }
  }

  const parsed = AnalyzePotholeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Provide a valid JPEG, PNG, or WebP image." });
    return;
  }

  const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(
    parsed.data.imageData,
  );
  if (
    !match ||
    parsed.data.imageData.length > MAX_IMAGE_DATA_URL_LENGTH ||
    match[2].length % 4 !== 0
  ) {
    res.status(400).json({ error: "The image must be a valid JPEG, PNG, or WebP data URL under 6 MiB." });
    return;
  }

  const apiKey = process.env.AI_GATEWAY_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: "AI analysis is not configured. You can still submit this report for officer review." });
    return;
  }

  try {
    const modelResponse = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(45_000),
      body: JSON.stringify({
        model: "openai/gpt-4.1-mini",
        max_tokens: 450,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "pothole_assessment",
            strict: true,
            schema: assessmentSchema,
          },
        },
        messages: [
          {
            role: "system",
            content:
              "Assess only visible road-surface evidence in the image. Return a cautious, concise assessment. Severity means apparent pothole damage only: low (small/shallow), medium (noticeable), high (large/deep or multiple). If the image is unclear, not a road, or no pothole is visible, set severity to unknown when appropriate and set needs_manual_review true. Do not make safety or repair-completion claims. Confidence is your confidence in whether a pothole is visible, from 0 to 1; use null if uncertain.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Is a pothole visible? Assess the image and provide the required structured fields.",
              },
              {
                type: "image_url",
                image_url: { url: parsed.data.imageData, detail: "low" },
              },
            ],
          },
        ],
      }),
    });

    if (!modelResponse.ok) {
      req.log.warn(
        { status: modelResponse.status },
        "AI Gateway image analysis request was rejected",
      );
      res.status(503).json({ error: "Image analysis is temporarily unavailable. You can still submit for manual review." });
      return;
    }

    const payload = (await modelResponse.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      res.status(503).json({ error: "The image assessment could not be read. Please retry or submit for manual review." });
      return;
    }

    const result = AnalyzePotholeResponse.parse(JSON.parse(content));
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Pothole image analysis failed");
    res.status(503).json({ error: "Image analysis is temporarily unavailable. You can still submit for manual review." });
  }
});

export default router;
