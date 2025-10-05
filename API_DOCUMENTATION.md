# LoveCalls.ai API Documentation

Base URL: `https://rugoqenajhbjqcmrplac.supabase.co/functions/v1`

## Authentication
Most endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <SUPABASE_ANON_KEY>
```

---

## Edge Functions

### 1. Create Checkout Session
**Endpoint:** `POST /create-checkout`
**Auth:** Required
**Description:** Creates a Stripe checkout session for subscription purchase

**Request Body:**
```json
{
  "planType": "basic" | "premium"
}
```

**Response:**
```json
{
  "url": "https://checkout.stripe.com/..."
}
```

---

### 2. Customer Portal
**Endpoint:** `POST /customer-portal`
**Auth:** Required
**Description:** Creates a Stripe billing portal session for subscription management

**Request Body:**
```json
{
  "returnUrl": "https://your-app.com/settings"
}
```

**Response:**
```json
{
  "url": "https://billing.stripe.com/..."
}
```

---

### 3. Check Subscription
**Endpoint:** `POST /check-subscription`
**Auth:** Required
**Description:** Checks user's subscription status and trial information

**Request Body:** None

**Response:**
```json
{
  "subscribed": true,
  "tier": "premium",
  "stripeCustomerId": "cus_...",
  "onTrial": false,
  "trialMinutesUsed": 0,
  "trialMinutesLimit": 500,
  "trialDaysRemaining": 0
}
```

---

### 4. OpenAI Chat
**Endpoint:** `POST /openai-chat`
**Auth:** Required
**Description:** Handles text-based chat with AI companions

**Request Body:**
```json
{
  "messages": [
    {"role": "system", "content": "..."},
    {"role": "user", "content": "..."}
  ],
  "companionId": "uuid",
  "userId": "uuid"
}
```

**Response:**
```json
{
  "response": "AI response text",
  "tokensUsed": 150
}
```

---

### 5. OpenAI Realtime Session
**Endpoint:** `POST /openai-realtime-session`
**Auth:** Required
**Description:** Creates a session token for OpenAI Realtime voice API

**Request Body:**
```json
{
  "companionId": "uuid",
  "userId": "uuid",
  "voiceId": "alloy"
}
```

**Response:**
```json
{
  "client_secret": {
    "value": "...",
    "expires_at": 1234567890
  }
}
```

---

### 6. Text to Speech
**Endpoint:** `POST /text-to-speech`
**Auth:** Required
**Description:** Converts text to speech using ElevenLabs

**Request Body:**
```json
{
  "text": "Hello world",
  "voiceId": "21m00Tcm4TlvDq8ikWAM"
}
```

**Response:** Audio file (audio/mpeg)

---

### 7. Track Usage
**Endpoint:** `POST /track-usage`
**Auth:** Required
**Description:** Records conversation usage for billing

**Request Body:**
```json
{
  "userId": "uuid",
  "companionId": "uuid",
  "minutesUsed": 5,
  "tokensUsed": 1000,
  "apiType": "voice" | "text",
  "inputTokens": 500,
  "outputTokens": 500
}
```

**Response:**
```json
{
  "success": true,
  "usageId": "uuid"
}
```

---

### 8. Calculate Usage Costs
**Endpoint:** `POST /calculate-usage-costs`
**Auth:** Required
**Description:** Calculates costs for API usage

**Request Body:**
```json
{
  "action": "bulk_calculate" | "update_session" | null,
  "sessionId": "uuid",
  "apiType": "voice" | "text",
  "inputTokens": 500,
  "outputTokens": 500,
  "minutes": 5
}
```

**Response:**
```json
{
  "costCents": 150,
  "breakdown": {
    "voiceCostCents": 100,
    "textCostCents": 50
  }
}
```

---

### 9. Get Usage Stats
**Endpoint:** `POST /get-usage-stats`
**Auth:** Required
**Description:** Retrieves user usage statistics

**Request Body:**
```json
{
  "userId": "uuid"
}
```

**Response:**
```json
{
  "totalMinutes": 120,
  "totalCostCents": 3600,
  "sessionsCount": 24,
  "avgSessionLength": 5,
  "todayUsage": {...},
  "thisMonthUsage": {...},
  "breakdownByApiType": {...},
  "breakdownByCompanion": [...],
  "trialInfo": {...}
}
```

---

### 10. Get Clients (Admin)
**Endpoint:** `GET /get-clients`
**Auth:** Required (Service Role)
**Description:** Retrieves all client data for admin dashboard

**Request Body:** None

**Response:**
```json
{
  "clients": [
    {
      "userId": "uuid",
      "email": "user@example.com",
      "subscribed": true,
      "tier": "premium",
      "totalMinutes": 120,
      "totalCostCents": 3600
    }
  ]
}
```

---

### 11. Generate Companion Image
**Endpoint:** `POST /generate-companion-image`
**Auth:** Required
**Description:** Generates AI companion images using Grok AI

**Request Body:**
```json
{
  "name": "Emma",
  "age": 28,
  "gender": "female",
  "bio": "...",
  "physicalDescription": "...",
  "personality": ["friendly", "caring"],
  "hobbies": ["reading", "hiking"]
}
```

**Response:**
```json
{
  "imageUrl": "https://...",
  "prompt": "Generated prompt used"
}
```

---

### 12. Regenerate Companion Images
**Endpoint:** `POST /regenerate-companion-images`
**Auth:** Required
**Description:** Batch regenerates images for multiple companions

**Request Body:**
```json
{
  "companionIds": ["uuid1", "uuid2"]
}
```

**Response:**
```json
{
  "results": [
    {
      "companionId": "uuid",
      "success": true,
      "imageUrl": "https://..."
    }
  ]
}
```

---

### 13. Image Proxy
**Endpoint:** `GET /image-proxy?url=<encoded_url>`
**Auth:** Not Required
**Description:** Proxies external images to avoid CORS issues

**Query Parameters:**
- `url`: URL-encoded image URL

**Response:** Image file

---

### 14. Conversation Summarizer
**Endpoint:** `POST /conversation-summarizer`
**Auth:** Required
**Description:** Summarizes conversations for memory storage

**Request Body:**
```json
{
  "conversation": [
    {"role": "user", "content": "..."},
    {"role": "assistant", "content": "..."}
  ],
  "companionName": "Emma",
  "userName": "John"
}
```

**Response:**
```json
{
  "memorySummary": {
    "keyTopics": [...],
    "emotionalTone": "...",
    "importantDetails": [...],
    "timestamp": "2025-10-05T..."
  }
}
```

---

### 15. Invite Tester
**Endpoint:** `POST /invite-tester`
**Auth:** Required (Admin)
**Description:** Invites a tester and grants unlimited access

**Request Body:**
```json
{
  "email": "tester@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Tester invited successfully"
}
```

---

### 16. Realtime Voice Preview
**Endpoint:** `POST /realtime-voice-preview`
**Auth:** Required
**Description:** Preview endpoint for realtime voice features

**Request Body:** TBD

**Response:** TBD

---

## Error Responses

All endpoints return errors in this format:
```json
{
  "error": "Error message description"
}
```

Common HTTP status codes:
- `200`: Success
- `400`: Bad request (invalid parameters)
- `401`: Unauthorized (missing/invalid auth token)
- `403`: Forbidden (insufficient permissions)
- `500`: Internal server error

---

## Rate Limits

No explicit rate limits are currently enforced, but usage is tracked and billed based on subscription tier.

## Pricing

- **Basic Plan**: $19/month - 500 minutes
- **Premium Plan**: $39/month - 1500 minutes
- **Trial**: 500 minutes free

---

*Last Updated: 2025-10-05*
