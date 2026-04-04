# 🍽️ I Have Been Here

An AI-powered food journal app. Take a photo of your meal, let AI identify the dish and generate review options, rate it, and build your personal food timeline.

---

## What It Does

1. **Snap a photo** — take or upload a photo of your meal
2. **AI identifies the dish** — Gemini Vision analyzes the photo and uses grounded web search to match it against the restaurant's real menu
3. **Rate & review** — pick 1–5 stars; AI generates 4 personalized review suggestions based on the photo and rating
4. **Save to journal** — your meal is logged with photo, restaurant, rating, and review
5. **Browse your timeline** — scroll through your food history with stats, search, and full detail views

---

## Demo

| Step 1 — Photo + Restaurant | Step 2 — AI Menu Detection | Step 3 — Rate & Review | Step 4 — Confirm |
|---|---|---|---|
| Upload food photo & enter restaurant name | AI identifies dish from photo + web search | Star rating + AI-generated review options | Preview and save |

---

## Tech Stack

### Backend
| Layer | Technology |
|---|---|
| API Framework | FastAPI (Python) |
| Database | SQLite + SQLAlchemy (async) |
| AI Model | Google Gemini 2.5 Flash |
| AI Grounding | Google Search (real-time web) |
| Agent Framework | Google ADK |
| Package Manager | uv |

### Frontend
| Layer | Technology |
|---|---|
| Framework | React Native + Expo SDK 54 |
| Navigation | Expo Router (file-based) |
| State | Zustand |
| Language | TypeScript (strict) |
| Linting | Biome |

---

## AI Features

### Grounded Menu Detection
When you upload a food photo, the backend sends it to **Gemini Vision with Google Search grounding**. The model sees the dish, searches the restaurant's real menu online, and returns the top matching candidates — no hallucinated dish names.

### Grounded Restaurant Menu Discovery
On Step 1, selecting a restaurant instantly fetches its **real menu** via Gemini + Google Search grounding. Tap any menu item to skip straight to Step 3.

### Image-Aware Review Generation
Reviews reference what's visible in your photo — the sauce, texture, presentation — making them feel authentic rather than generic.

---

## Project Structure

```
IHaveBeenHere/
├── backend/
│   ├── main.py                          # FastAPI app entry point
│   ├── database.py                      # Async SQLAlchemy setup
│   ├── models.py                        # Restaurant, Meal ORM models
│   ├── schemas.py                       # Pydantic request/response types
│   ├── meal_agent/
│   │   └── agent.py                     # Google ADK agent with all tools
│   ├── routers/
│   │   ├── meals.py                     # /meals endpoints (CRUD, detect, generate)
│   │   ├── restaurants.py               # /restaurants endpoints + menu search
│   │   └── search.py                    # /search full-text endpoint
│   ├── services/
│   │   ├── ai_service.py                # High-level AI orchestration
│   │   └── adk_runner.py                # Google ADK session runner
│   └── tools/
│       ├── menu_identifier_grounded.py  # Vision + web → dish candidates
│       ├── restaurant_menu_searcher.py  # Web search → full restaurant menu
│       └── review_generator.py          # Image-aware review generation
│
└── frontend/
    ├── app/
    │   ├── (tabs)/
    │   │   ├── index.tsx                # Timeline (home feed)
    │   │   ├── search.tsx               # Full-text search
    │   │   ├── map.tsx                  # Map view
    │   │   ├── camera.tsx               # Quick camera access
    │   │   └── profile.tsx              # User profile
    │   ├── log/
    │   │   ├── step1.tsx                # Photo + restaurant picker
    │   │   ├── step2.tsx                # AI menu detection results
    │   │   ├── step3.tsx                # Rating + review selection
    │   │   └── step4.tsx                # Confirm + save
    │   └── meal/
    │       └── [id].tsx                 # Meal detail screen
    ├── components/
    │   ├── MealCard.tsx                 # Tappable meal preview card
    │   ├── Card.tsx / Button.tsx        # UI primitives
    │   ├── Screen.tsx                   # Safe-area scroll wrapper
    │   └── Text.tsx                     # Themed typography
    ├── lib/
    │   ├── api.ts                       # Typed API client
    │   └── env.ts                       # Environment config
    └── stores/
        └── mealStore.ts                 # Global meal state (Zustand + persist)
```

---

## Getting Started

### Prerequisites
- Python 3.13+
- Node.js 20+
- [uv](https://docs.astral.sh/uv/) (`curl -LsSf https://astral.sh/uv/install.sh | sh`)
- [Expo Go](https://expo.dev/go) on your phone (or Xcode for iOS Simulator)
- A [Google AI API key](https://aistudio.google.com/apikey)

---

### Backend Setup

```bash
cd backend

# Create .env
cp .env.example .env
# Edit .env and set your GOOGLE_API_KEY

# Install dependencies and run
uv run uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The API will be available at `http://localhost:8000`.
Interactive docs: `http://localhost:8000/docs`

**`.env` file:**
```env
DATABASE_URL=sqlite+aiosqlite:///./food_log.db
GOOGLE_API_KEY=your_google_ai_api_key_here
GOOGLE_GENAI_USE_VERTEXAI=FALSE
```

---

### Frontend Setup

```bash
cd frontend

npm install

# For local development (replace with your machine's IP)
API_URL=http://YOUR_LOCAL_IP:8000 npx expo start
```

- Press `i` — open iOS Simulator (requires Xcode)
- Press `a` — open Android emulator
- Scan the QR code — open in Expo Go on your phone

> Your phone and computer must be on the **same Wi-Fi network**.

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/meals` | List all logged meals |
| `POST` | `/meals` | Create a new meal (multipart with image) |
| `POST` | `/meals/detect-menu` | Upload photo → AI returns menu candidates |
| `POST` | `/meals/generate-reviews` | Menu + rating + photo → AI review options |
| `GET` | `/restaurants` | List restaurants |
| `GET` | `/restaurants/menus?name=...` | Fetch real menu for a restaurant via AI |
| `GET` | `/search?q=...` | Full-text search across meals and restaurants |

---

## Environment Variables

### Backend (`backend/.env`)
| Variable | Required | Description |
|---|---|---|
| `GOOGLE_API_KEY` | Yes | Google AI Studio API key |
| `DATABASE_URL` | No | SQLite URL (defaults to `food_log.db`) |
| `GOOGLE_GENAI_USE_VERTEXAI` | No | Set `TRUE` to use Vertex AI instead |

### Frontend (`frontend/.env`)
| Variable | Default | Description |
|---|---|---|
| `API_URL` | `http://localhost:8000` | Backend base URL |
| `APP_ENV` | `development` | `development` / `staging` / `production` |

---

## License

MIT
