# Newzzy AI Companion - Complete Project Documentation

## Project Overview

**Project Name:** Newzzy AI Companion  
**Project Type:** Voice-enabled AI News Application (Web App)  
**Core Functionality:** An AI-powered news companion that delivers personalized news briefings through voice conversations and provides an interactive debate arena for discussing news topics.  
**Target Users:** News enthusiasts who want a personalized, voice-driven way to stay informed about topics they care about.  
**Technology Stack:** React 18 + TypeScript + Vite + Tailwind CSS + Supabase (Edge Functions) + ElevenLabs + Firecrawl

---

## Architecture Overview

### Frontend Stack

- **Framework:** React 18.3.1 with TypeScript 5.8.3
- **Build Tool:** Vite 5.4.19
- **Styling:** Tailwind CSS 3.4.17 with custom CSS variables for theming
- **Routing:** React Router DOM 6.30.1
- **State Management:** React Query (TanStack Query) 5.83.0 + localStorage for user preferences
- **Animations:** Framer Motion 12.38.0
- **UI Components:** Radix UI primitives (40+ components) + custom shadcn/ui-style components
- **Icons:** Lucide React 0.462.0

### Backend Stack

- **Backend:** Supabase Edge Functions (Deno runtime)
- **Database:** Supabase (PostgreSQL - for auth and potential future data storage)
- **Voice AI:** ElevenLabs Conversational AI (Agents API)
- **Search:** Firecrawl API for web scraping and search

---

## File Structure

```
newzzy-ai-companion/
├── public/                          # Static assets
│   ├── favicon.ico
│   ├── placeholder.svg
│   └── robots.txt
├── src/
│   ├── App.tsx                     # Main app component with routing and providers
│   ├── main.tsx                    # React entry point
│   ├── index.css                   # Global styles, CSS variables, Tailwind directives
│   ├── components/
│   │   ├── GradientOrb.tsx         # Animated gradient orb component (voice state visualizer)
│   │   ├── LiveCaptions.tsx        # Real-time caption display component
│   │   ├── NavLink.tsx             # Navigation link component
│   │   └── ui/                     # 40+ Radix UI-based components (shadcn/ui style)
│   │       ├── button.tsx
│   │       ├── input.tsx
│   │       ├── dialog.tsx
│   │       ├── dropdown-menu.tsx
│   │       ├── toast.tsx
│   │       ├── sonner.tsx          # Toast notifications (sonner)
│   │       ├── card.tsx
│   │       ├── accordion.tsx
│   │       ├── tabs.tsx
│   │       ├── select.tsx
│   │       ├── slider.tsx
│   │       ├── switch.tsx
│   │       ├── tooltip.tsx
│   │       └── ... (many more)
│   ├── pages/
│   │   ├── Onboarding.tsx          # User setup page (name, interests, voice selection)
│   │   ├── Chat.tsx                # Main voice chat interface with news feed
│   │   ├── Debate.tsx              # Debate arena with research assistant
│   │   └── NotFound.tsx            # 404 page
│   ├── lib/
│   │   ├── store.ts                # User preferences & voice options (localStorage)
│   │   ├── api.ts                  # API functions for search and signed URLs
│   │   └── utils.ts                # Utility functions (cn for className merging)
│   ├── hooks/
│   │   ├── use-mobile.tsx         # Mobile detection hook
│   │   └── use-toast.ts            # Toast hook
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts           # Supabase client initialization
│   │       └── types.ts            # TypeScript types for Supabase
│   └── test/
│       ├── example.test.ts
│       └── setup.ts
├── supabase/
│   └── functions/
│       ├── elevenlabs-signed-url/  # Generates signed URLs for ElevenLabs conversations
│       │   └── index.ts
│       └── search-web/             # Firecrawl-powered web search
│           └── index.ts
├── package.json                     # Dependencies and scripts
├── vite.config.ts                   # Vite configuration
├── tailwind.config.ts               # Tailwind CSS configuration
├── tsconfig.json                    # TypeScript configuration
├── eslint.config.js                 # ESLint configuration
└── postcss.config.js                # PostCSS configuration
```

---

## Core Features

### 1. Onboarding Flow (`Onboarding.tsx`)

**Purpose:** Set up personalized experience for new users

**Steps:**

1. **Name Input** - User enters their name (stored in localStorage as `newzzy_prefs`)
2. **Interest Selection** - Choose from predefined interests: Tech, AI, Sports, Gaming, Crypto, Politics, Science, Entertainment, Business, Health, World News, Climate, Space, Culture
3. **Voice Selection** - Choose from 5 AI voices powered by ElevenLabs:
   - **Rachel** - Polished, warm (default)
   - **Adam** - Measured, direct
   - **Bella** - Soft-spoken, conversational
   - **Antoni** - Deep, dramatic
   - **Elli** - Bright, agile

**Key Features:**

- Voice preview using Web Speech API
- Animated 3D stacked card effect on hover
- Gradient wordmark branding
- Navigation to either Chat or Debate mode

### 2. Chat Mode (`Chat.tsx`)

**Purpose:** Voice-powered news conversation with real-time web search

**Features:**

- **Voice Conversation** - Real-time voice interaction using ElevenLabs Conversational AI
- **Live Captions** - Display AI's speech in real-time
- **Transcript Display** - Rolling conversation history
- **News Feed** - Web-sourced news articles with categories:
  - Latest (default)
  - Social (Reddit, X/Twitter)
  - Videos (YouTube, interviews)
  - Official (Reuters, BBC, AP News)
  - Memes (viral content)

**Technical Details:**

- Caches news for 60 seconds to reduce API calls
- Handles Firecrawl rate limiting (429 errors)
- Auto-scrolls transcript
- Gradient orb visual feedback for states: idle, listening, speaking, searching
- Can navigate to Debate with specific news topic

**Key State:**

- `started` - Voice session active
- `caption` - Current AI speech
- `transcript` - Conversation history array
- `news` - Search results array
- `activeCategory` - Current news filter

### 3. Debate Arena (`Debate.tsx`)

**Purpose:** Interactive debate mode with AI opponent and real-time research

**Features:**

- **Topic Input** - Enter any debate topic
- **Tone Selection** - Choose AI opponent's debate style:
  - Calm (measured, strategic)
  - Soft (gentle, persuasive)
  - Aggressive (fast, sharp)
  - Funny (playful, witty)
  - Roasting (confident, biting)
  - Professor (analytical, evidence-first)

- **Research Assistant** - Real-time web research showing:
  - Supporting arguments (green accent)
  - Opposing arguments (red accent)
  - Source attribution for each point

**Technical Details:**

- Fetches both sides of argument simultaneously
- Extracts key points from scraped content
- Handles rate limiting gracefully
- Voice AI takes opposing position

**Key State:**

- `topic` - Debate topic
- `tone` - Selected debate style
- `supportingPoints` / `opposingPoints` - Research data
- `expandedCards` - UI state for expandable research cards

---

## API Integrations

### 1. ElevenLabs (`@elevenlabs/react`)

**Purpose:** Voice conversation and text-to-speech

**Usage:**

```typescript
import { useConversation } from "@elevenlabs/react";

const conversation = useConversation({
  onMessage: (message) => {
    /* handle messages */
  },
  onError: (error) => {
    /* handle errors */
  },
});

// Start session with signed URL
await conversation.startSession({
  signedUrl,
  overrides: {
    agent: { firstMessage: "..." },
    tts: { voiceId: prefs?.voiceId },
  },
});
```

**Edge Function:** `elevenlabs-signed-url/index.ts`

- Generates signed URLs for ElevenLabs conversation sessions
- Requires: `ELEVENLABS_API_KEY`, `ELEVENLABS_AGENT_ID` environment variables

### 2. Firecrawl Search (`search-web` Edge Function)

**Purpose:** Web search and content extraction

**Endpoint:** `POST /functions/v1/search-web`

**Request:**

```json
{
  "query": "technology news",
  "extractPoints": true
}
```

**Response:**

```json
{
  "results": [
    {
      "title": "Article Title",
      "url": "https://...",
      "description": "...",
      "source": "source.com",
      "image": "https://...",
      "keyPoints": ["point1", "point2"]
    }
  ],
  "textSummary": "..."
}
```

**Features:**

- Extracts key points from markdown content
- Filters junk content (nav, social, cookies)
- Returns structured data for news and debates
- Requires: `FIRECRAWL_API_KEY` environment variable

### 3. Supabase Client

**Purpose:** Backend services and potential data storage

**Configuration:**

- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase anon key

---

## UI/UX Design System

### Color Palette (CSS Variables in `index.css`)

```css
/* Backgrounds */
--bg-base: 240 33% 5% /* Dark base (#090912) */ --bg-surface: 240 25% 8%
  /* Surface cards */ --bg-elevated: 240 28% 13% /* Elevated elements */
  --bg-hover: 241 28% 16% /* Hover states */ /* Borders */ --border-subtle: 0 0%
  100% / 0.06 --border-default: 0 0% 100% / 0.1 --border-strong: 0 0% 100% /
  0.19 /* Text */ --text-primary: 240 33% 97% --text-secondary: 240 20% 60%
  --text-tertiary: 240 11% 37% /* Accents */ --purple-400: 258 90% 76%
  --purple-500: 258 90% 67% --purple-600: 262 83% 58% --teal-400: 171 73% 50%
  --red-400: 0 91% 71% --red-500: 0 84% 60% --amber-400: 43 96% 56%
  /* Semantic */ --primary: var(--purple-600) --destructive: var(--red-500);
```

### Typography

- **Display Font:** Space Grotesk (headings, branding)
- **UI Font:** Inter (body text)
- **Mono Font:** JetBrains Mono (code, timestamps)

### Components

The project includes 40+ shadcn/ui-style components built on Radix UI:

| Category     | Components                                                        |
| ------------ | ----------------------------------------------------------------- |
| Actions      | Button, Toggle, Switch                                            |
| Data Display | Badge, Card, Avatar, Skeleton                                     |
| Forms        | Input, Textarea, Select, Checkbox, Radio Group, Slider, Input OTP |
| Layout       | Resizable Panels, Scroll Area                                     |
| Navigation   | NavLink, Tabs, Breadcrumb, Pagination                             |
| Overlays     | Dialog, Drawer, Popover, Tooltip, Sheet, Alert Dialog             |
| Feedback     | Toast, Sonner, Progress, Alert                                    |
| Data         | Table, Accordion, Calendar, Chart                                 |
| Media        | Carousel, Aspect Ratio                                            |
| Other        | Context Menu, Menubar, Hover Card, Command                        |

### Custom Components

- **GradientOrb** - Animated orb that changes color/animation based on voice state (idle, listening, speaking, searching)
- **LiveCaptions** - Real-time text display of AI speech
- **Glass Card** - Glassmorphism card with backdrop blur

---

## State Management

### localStorage (`store.ts`)

**Key:** `newzzy_prefs`

**Structure:**

```typescript
interface UserPreferences {
  name: string;
  voiceId: string; // ElevenLabs voice ID
  voiceName: string;
  interests: string[]; // User-selected topics
}
```

### React Query

**Purpose:** Server state management for search results

**Configuration:**

- Query client configured in `App.tsx`
- Automatic cache management

### Component State

- React useState for UI state
- useCallback for optimized callbacks
- useMemo for computed values

---

## Routing

**Routes defined in `App.tsx`:**

| Path      | Component  | Description                                  |
| --------- | ---------- | -------------------------------------------- |
| `/`       | Onboarding | Initial setup (or home if preferences exist) |
| `/chat`   | Chat       | Voice news chat                              |
| `/debate` | Debate     | Debate arena                                 |
| `*`       | NotFound   | 404 page                                     |

---

## Environment Variables

Required in `.env` file:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
```

Required in Supabase Edge Functions secrets:

```
ELEVENLABS_API_KEY=your_elevenlabs_api_key
ELEVENLABS_AGENT_ID=your_elevenlabs_agent_id
FIRECRAWL_API_KEY=your_firecrawl_api_key
```

---

## Available Scripts

```bash
npm run dev          # Start development server (port 8080)
npm run build        # Production build
npm run build:dev    # Development build
npm run lint         # Run ESLint
npm run preview      # Preview production build
npm run test         # Run tests (Vitest)
npm run test:watch   # Watch mode for tests
```

---

## Key Implementation Details

### Voice Conversation Flow

1. User clicks mic button
2. App requests microphone permission
3. App calls `getSignedUrl()` edge function
4. ElevenLabs signed URL returned
5. `conversation.startSession()` initiates voice AI
6. Real-time messages flow through `onMessage` callback
7. Captions display via `LiveCaptions` component
8. Transcript stored in state

### News Search Flow

1. User selects category or refreshes
2. Query built from interests + category filters
3. Cache checked (60s TTL)
4. Rate limit checked
5. `searchWeb()` calls edge function
6. Firecrawl returns results
7. Results cached and displayed
8. Rate limiting handled gracefully

### Debate Research Flow

1. User enters topic and selects tone
2. Two parallel searches: "arguments for {topic}" and "arguments against {topic}"
3. Key points extracted from markdown
4. Results displayed in two columns
5. Voice AI takes opposing position

---

## Animation System

**Framer Motion** powers all animations:

- Page transitions (slide + fade)
- Orb breathing/pulsing effects
- Card hover effects
- Transcript message animations
- Loading skeletons

**Reduced Motion Support:**

- Respects `prefers-reduced-motion`
- Graceful degradation in `GradientOrb` component

---

## Browser APIs Used

- **Web Speech API** - Voice preview in onboarding
- **MediaDevices API** - Microphone access
- **localStorage** - User preferences persistence
- **Intersection Observer** - Scroll detection (via libraries)

---

## Testing

- **Vitest** - Unit testing framework
- **Testing Library** - React component testing
- **Playwright** - E2E testing (configuration included)

---

## External Services

| Service    | Purpose                  | Documentation              |
| ---------- | ------------------------ | -------------------------- |
| ElevenLabs | Voice AI & TTS           | https://elevenlabs.io/docs |
| Firecrawl  | Web scraping & search    | https://docs.firecrawl.dev |
| Supabase   | Backend & Edge Functions | https://supabase.com/docs  |
| Radix UI   | UI component primitives  | https://radix-ui.com       |

---

## Summary

Newzzy is a sophisticated voice-first news application that combines:

- **Personalization** - User-selected voice and interests
- **Voice AI** - Real-time conversational AI powered by ElevenLabs
- **Web Intelligence** - Live news search via Firecrawl
- **Interactive Debate** - AI-powered debate with real-time research
- **Polished UI** - Beautiful dark theme with smooth animations

The app demonstrates modern React patterns, TypeScript best practices, and seamless integration with multiple AI services through a serverless backend.
