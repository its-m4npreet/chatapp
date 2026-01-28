# LiteLLM/OpenRouter Error Fix Plan

## Error Summary
```
400 litellm.BadRequestError: OpenrouterException - 
{"error":{"message":"Provider returned error","code":400,"metadata":{"raw":
"{\"type\":\"error\",\"error\":{\"type\":\"bad_request_error\",
\"message\":\"invalid params, tool result's tool id(call_function_rt2rbnttijjs_2) not found (2013)\",
\"http_code\":\"400\"}
```

## Root Cause
1. **Invalid Tool Call**: The model `openrouter/minimax-m2` is receiving malformed tool/function call parameters
2. **Fallback Chain Broken**: The system tried to fall back to `gpt-4.1-mini` but no valid fallback model group was configured
3. **Missing Model Group Fallbacks**: The LiteLLM configuration lacks proper fallback model groups

## Solution Options

### Option 1: Fix LiteLLM Configuration (Recommended)

Create/update a LiteLLM configuration file with proper model settings and fallbacks:

```python
# litellm_config.yaml
model_list:
  - model_name: gpt-4.1-mini
    litellm_params:
      model: openrouter/auto
      api_key: os.environ/OPENROUTER_API_KEY
    fallbacks:
      - openrouter/anthropic/claude-sonnet-4-20250514
      - openrouter/google/gemini-2.5-pro
  
  - model_name: claude-sonnet
    litellm_params:
      model: openrouter/anthropic/claude-sonnet-4-20250514
      api_key: os.environ/OPENROUTER_API_KEY
    fallbacks:
      - openrouter/google/gemini-2.5-pro
```

### Option 2: Use Simple OpenRouter Configuration

```python
import litellm

# Set up OpenRouter with proper parameters
litellm.api_key = os.environ.get("OPENROUTER_API_KEY")

# Make calls without tool/function calling
response = litellm.completion(
    model="openrouter/google/gemini-2.5-pro",
    messages=[{"role": "user", "content": "Hello!"}],
    # Don't use tools/functions if not needed
)
```

### Option 3: Use Direct OpenAI-Compatible API

```javascript
// Frontend or backend direct call
const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': 'http://localhost:3000',
    'X-Title': 'ChatApp'
  },
  body: JSON.stringify({
    model: 'google/gemini-2.5-pro',
    messages: [{ role: 'user', content: 'Hello!' }]
  })
});
```

## Required Environment Variables

Create or update `.env` file:

```env
# OpenRouter API Key (get from https://openrouter.ai/keys)
OPENROUTER_API_KEY=sk-or-v1-xxxxx

# Optional: Site URL and title for OpenRouter tracking
OPENROUTER_SITE_URL=http://localhost:3000
OPENROUTER_APP_TITLE=ChatApp

# Alternative: Direct OpenAI API (if using OpenAI directly)
OPENAI_API_KEY=sk-xxxxx
```

## If Using VSCode BlackboxAI Extension

The error might be coming from the BlackboxAI extension. Try:

1. **Restart the extension**: Ctrl+Shift+P → "Reload Window"
2. **Clear extension cache**: Ctrl+Shift+P → "Developer: Clear Extension Host"
3. **Update extension settings**: 
   - Go to Settings → Extensions → BlackboxAI
   - Set model to a stable option like `gpt-4o` or `claude-sonnet`
4. **Check API key**: Ensure valid OpenRouter API key is set in extension settings

## If This Error Appears in Your Application

If LiteLLM is being used in your backend, add proper error handling:

```javascript
// In your backend code (e.g., index.js or controller)
const cacheService = require('./services/cacheService');

// Add try-catch for LLM calls
async function getAIResponse(prompt) {
    try {
        // Your LLM call here
        const response = await litellm.completion({
            model: "openrouter/google/gemini-2.5-pro",
            messages: [{ role: "user", content: prompt }],
        });
        return response.choices[0].message.content;
    } catch (error) {
        console.error('AI Response Error:', error);
        
        // Handle fallback gracefully
        if (error.code === 'bad_request_error') {
            return "I'm having trouble connecting to the AI service. Please try again later.";
        }
        
        throw error; // Re-throw other errors
    }
}
```

## Testing the Fix

1. **Test API Key**: Verify OpenRouter API key is valid
   ```bash
   curl -X POST "https://openrouter.ai/api/v1/chat/completions" \
     -H "Authorization: Bearer $OPENROUTER_API_KEY" \
     -H "Content-Type: application/json" \
     -H "HTTP-Referer: http://localhost:3000" \
     -d '{"model": "google/gemini-2.5-pro", "messages": [{"role": "user", "content": "test"}]}'
   ```

2. **Test Fallback**: Ensure multiple models are configured for fallback

3. **Monitor Logs**: Watch for repeated errors after fix

## Recommended Stable Model Configuration

```yaml
# litellm_config.yaml
settings:
  litellm_cache: "redis"  # Use Redis for caching responses
  
model_list:
  - model_name: gpt-4o
    litellm_params:
      model: openrouter/openai/gpt-4o
      api_key: os.environ/OPENROUTER_API_KEY
  
  - model_name: claude-sonnet
    litellm_params:
      model: openrouter/anthropic/claude-sonnet-4-20250514
      api_key: os.environ/OPENROUTER_API_KEY
  
  - model_name: gemini-2.5-pro
    litellm_params:
      model: openrouter/google/gemini-2.5-pro
      api_key: os.environ/OPENROUTER_API_KEY
```

## Prevention

1. **Always define fallbacks**: Never use a single model without fallbacks
2. **Use stable models**: Prefer well-tested models over experimental ones
3. **Monitor API status**: Check OpenRouter status page for outages
4. **Set rate limits**: Configure appropriate rate limits to avoid hitting quotas

## Status: Ready for Implementation

This plan addresses:
- ✅ Invalid tool call parameters
- ✅ Missing fallback models
- ✅ Proper model configuration
- ✅ Error handling
- ✅ Environment setup

