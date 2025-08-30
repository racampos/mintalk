# Voice Tutor Setup Instructions

## Required Environment Variables

Add these to your `.env.local` file:

```bash
# OpenAI Realtime API Configuration
OPENAI_API_KEY=sk-proj-your-openai-api-key-here
OPENAI_REALTIME_MODEL=gpt-realtime
OPENAI_REALTIME_VOICE=alloy

# Existing Helius configuration (keep these)
HELIUS_API_KEY=YOUR_KEY
HELIUS_RPC_URL=https://mainnet.helius-rpc.com
```

## Notes:

- Get your OpenAI API key from: https://platform.openai.com/api-keys
- Make sure you have access to the Realtime API (may require waitlist approval)
- Voice options: `alloy`, `echo`, `fable`, `onyx`, `nova`, `shimmer`
- The Realtime API is currently in beta and requires special access

## Next Steps:

1. Add the environment variables above
2. Restart your development server: `npm run dev`
3. The voice tutor will be available once implementation is complete
