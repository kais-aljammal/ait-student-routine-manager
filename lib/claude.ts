import Anthropic from "@anthropic-ai/sdk";

const CLAUDE_SYSTEM =
  "You are a schedule generation assistant. You output only raw JSON arrays. No markdown. No backticks. No explanation. Your response must start with [ and end with ]";

export async function generateWithClaude(prompt: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is missing");
  }

  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: "claude-haiku-4-5",
    system: CLAUDE_SYSTEM,
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content
    .filter((item): item is Anthropic.TextBlock => item.type === "text")
    .map((item) => item.text)
    .join("\n")
    .trim();

  if (!text) {
    throw new Error("Claude returned empty text");
  }
  return text;
}
