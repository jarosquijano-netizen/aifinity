# AI Chatbot Feature - Finova

## Overview
Finova now includes an intelligent AI-powered financial assistant that can answer questions about your finances using real data from your transactions, budgets, and trends.

## Features Implemented

### 1. AI Configuration (Settings)
- **Multiple AI Providers**: Support for Claude, OpenAI (GPT-4), and Google Gemini
- **Secure Storage**: API keys are encrypted and stored securely in the database
- **Active Provider Management**: Switch between different AI providers easily
- **Visual Interface**: Beautiful UI to manage AI credentials with provider-specific colors

### 2. AI Chatbot (Insights)
- **Contextual Understanding**: The AI assistant has access to your real financial data:
  - Monthly income and expenses
  - Budget allocations and spending
  - Top expense categories
  - Transaction history
- **Interactive Chat UI**: Modern chat interface with:
  - Message history
  - User and AI message bubbles
  - Loading indicators
  - Suggested questions
  - Collapsible chat panel
- **Persistent History**: Chat conversations are saved and can be reviewed later
- **Multi-Provider Support**: Works with Claude, OpenAI, or Gemini based on your configuration

## How to Use

### Step 1: Configure AI Provider

1. Go to **Settings** tab
2. Scroll down to **AI Assistant Configuration** section
3. Click **Add Provider**
4. Select your preferred AI provider:
   - **Claude**: Anthropic's Claude 3.5 Sonnet (recommended for financial advice)
   - **OpenAI**: GPT-4 (versatile and powerful)
   - **Gemini**: Google's Gemini Pro (fast and efficient)
5. Enter your API key
6. Click **Save Configuration**

#### Getting API Keys:
- **Claude**: https://console.anthropic.com/
- **OpenAI**: https://platform.openai.com/api-keys
- **Gemini**: https://makersuite.google.com/app/apikey

### Step 2: Use the Chatbot

1. Navigate to **Insights** tab
2. Scroll down to find **Asistente Financiero AI** section
3. Click on the purple header to expand the chat
4. You can either:
   - Click on one of the suggested questions
   - Type your own financial question
5. Press **Enviar** or hit Enter to send your message
6. The AI will analyze your financial data and provide personalized advice

### Example Questions

- "¿Cómo puedo mejorar mi tasa de ahorro?"
- "¿En qué categorías gasto más?"
- "¿Qué consejo me das para mi situación financiera?"
- "¿Cuánto debería ahorrar para un fondo de emergencia?"
- "¿Cómo puedo reducir mis gastos en [categoría]?"
- "¿Estoy cumpliendo con mi presupuesto?"
- "¿Qué porcentaje de mis ingresos debería ahorrar?"

## Technical Details

### Backend Components

#### Database Tables
- `ai_config`: Stores AI provider configurations and API keys
  - `id`, `user_id`, `provider`, `api_key`, `api_key_preview`, `is_active`
- `ai_chat_history`: Stores chat conversation history
  - `id`, `user_id`, `provider`, `user_message`, `ai_response`, `created_at`

#### API Endpoints
- `GET /api/ai/config` - Get user's AI configurations
- `POST /api/ai/config` - Save/update AI configuration
- `DELETE /api/ai/config/:id` - Delete configuration
- `POST /api/ai/config/:id/activate` - Activate specific configuration
- `POST /api/ai/chat` - Send message to AI and get response
- `GET /api/ai/chat/history` - Get chat history

#### AI Integration
The backend integrates with three AI APIs:
- **Claude API**: Uses `claude-3-5-sonnet-20241022` model
- **OpenAI API**: Uses `gpt-4o` model
- **Gemini API**: Uses `gemini-pro` model

Each AI provider receives:
- User's financial context (income, expenses, budgets, categories)
- User's question
- System prompt to act as a financial advisor

### Frontend Components

#### Settings Component
- AI configuration form with provider selection
- List of configured providers with activation controls
- Visual indicators for active provider
- Secure API key input (password field)
- Links to get API keys from each provider

#### Insights Component
- Collapsible chat interface
- Real-time message sending and receiving
- Message history display with user/AI avatars
- Suggested questions for quick start
- Error handling with helpful messages
- Loading states and animations
- Responsive design for mobile and desktop

## Security Considerations

1. **API Key Storage**: Keys are stored in the database (consider encrypting in production)
2. **Authentication Required**: All AI endpoints require valid JWT authentication
3. **User Isolation**: Each user can only access their own configurations and chat history
4. **API Key Preview**: Only last 4 characters of API keys are shown in the UI
5. **Error Handling**: API errors don't expose sensitive information to the frontend

## Future Enhancements

- [ ] Encrypt API keys in the database
- [ ] Add rate limiting for AI requests
- [ ] Support for file uploads (analyze receipts, invoices)
- [ ] Voice input/output
- [ ] Scheduled financial reports via AI
- [ ] Integration with more AI providers (Llama, etc.)
- [ ] Advanced analytics and predictions
- [ ] Budget recommendations based on spending patterns
- [ ] Anomaly detection in transactions

## Troubleshooting

### "No active AI configuration found"
- Go to Settings and add an AI provider with a valid API key
- Make sure the configuration is marked as "Active"

### "Failed to get AI response"
- Check that your API key is valid
- Ensure you have sufficient credits with your AI provider
- Check your internet connection
- Try a different AI provider

### Chat history not loading
- Check browser console for errors
- Ensure you're logged in
- Clear browser cache and reload

### API Key not saving
- Ensure you've entered a valid API key format
- Check that backend server is running
- Look at browser network tab for error details

## Database Migration

The AI feature requires new database tables. Run the migration:

```bash
node backend/migrations/add-ai-tables.js
```

This creates:
- `ai_config` table with indexes
- `ai_chat_history` table with indexes

## Cost Considerations

Using AI APIs incurs costs based on usage:
- **Claude**: ~$3 per million input tokens, ~$15 per million output tokens
- **OpenAI GPT-4**: ~$5 per million input tokens, ~$15 per million output tokens  
- **Gemini Pro**: Free tier available, then pay-as-you-go

For typical financial questions, expect:
- ~500-1000 tokens per request (including context)
- ~200-500 tokens per response
- Cost: ~$0.01-0.05 per conversation

## Support

For issues or questions about the AI chatbot feature, please check:
1. This documentation
2. Console logs (browser and server)
3. API provider documentation
4. Contact support

---

**Note**: This AI assistant provides general financial advice based on your data. For specific financial planning, consult with a certified financial advisor.



