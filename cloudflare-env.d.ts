declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    LOCAL_DEMO?: string;
    AI_BRIDGE_URL?: string;
    AI_BRIDGE_TOKEN?: string;
    OLLAMA_URL?: string;
    OLLAMA_MODEL?: string;
    OPENAI_BASE_URL?: string;
    OPENAI_API_KEY?: string;
    OPENAI_MODEL?: string;
    SPEECH_URL?: string;
  }
}
