const PROVIDER_ALIASES: Record<string, string> = {
  "amazon-bedrock": "amzbr",
  anthropic: "anthp",
  google: "googl",
  "google-gemini-cli": "gemin",
  "google-antigravity": "antig",
  "google-vertex": "gvert",
  openai: "opnai",
  "azure-openai-responses": "azure",
  "openai-codex": "codex",
  "github-copilot": "ghcop",
  xai: "xai",
  groq: "groq",
  cerebras: "cereb",
  openrouter: "opnrt",
  "vercel-ai-gateway": "vlagt",
  zai: "zai",
  mistral: "mistr",
  minimax: "minim",
  "minimax-cn": "mincn",
  huggingface: "hface",
  opencode: "openc",
  "opencode-go": "opcgo",
  "kimi-coding": "kimic",
};

export function formatProviderName(provider: string): string {
  return PROVIDER_ALIASES[provider] ?? provider;
}

export function formatModelLabel(
  model: { provider?: string; id?: string } | null | undefined,
  fallbackId: string,
): string {
  const provider = model?.provider;
  const providerLabel = provider ? formatProviderName(provider) : undefined;
  const modelId = model?.id ?? fallbackId;
  return providerLabel ? `(${providerLabel}) ${modelId}` : modelId;
}
