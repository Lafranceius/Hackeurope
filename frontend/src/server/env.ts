const bool = (value: string | undefined, fallback: boolean) => {
  if (value === undefined) {
    return fallback;
  }
  return value.toLowerCase() === "true";
};

export const env = {
  databaseUrl: process.env.DATABASE_URL,
  nextAuthUrl: process.env.NEXTAUTH_URL,
  nextAuthSecret: process.env.NEXTAUTH_SECRET,
  enableStripe: bool(process.env.ENABLE_STRIPE, false),
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  enableS3: bool(process.env.ENABLE_S3, false),
  s3Endpoint: process.env.S3_ENDPOINT,
  s3Region: process.env.S3_REGION,
  s3AccessKeyId: process.env.S3_ACCESS_KEY_ID,
  s3SecretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  s3Bucket: process.env.S3_BUCKET,
  /** Feature flag — set to "true" to enable dynamic pricing UI and cron. */
  dynamicPricingEnabled: bool(process.env.DYNAMIC_PRICING_ENABLED, false),
  /** Secret token required by the /api/cron/reprice endpoint. */
  cronSecretToken: process.env.CRON_SECRET_TOKEN ?? "",
  /** Ollama base URL for the dataset assessment agent (no API key needed). */
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL ?? "http://localhost:11434",
  /** Ollama model to use — must support tool/function calling. */
  ollamaModel: process.env.OLLAMA_MODEL ?? "llama3.1:8b"
};
