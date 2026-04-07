# 🍽️ I Have Been Here

An AI-powered food journal app. Take a photo of your meal, let AI identify the dish and generate review options, rate it, and build your personal food timeline.

---

## What It Does

1. **Snap a photo** — take or upload a photo of your meal
2. **AI identifies the dish** — Gemini Vision analyzes the photo and uses grounded web search to match it against the restaurant's real menu
3. **Rate & review** — pick 1–5 stars; AI generates 4 personalized review suggestions based on the photo and rating
4. **Save to journal** — your meal is logged with photo, restaurant, rating, and review
5. **Browse your timeline** — scroll through your food history with stats, search, and full detail views
6. **Search by date** — filter your journal with a range calendar picker

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
| Database | Supabase PostgreSQL + SQLAlchemy (async) |
| Image Storage | Supabase Storage |
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
    │   │   ├── search.tsx               # Search + date range filter
    │   │   ├── map.tsx                  # Map view
    │   │   ├── camera.tsx               # Quick camera access
    │   │   └── settings.tsx             # App settings
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
- A [Supabase](https://supabase.com) project

---

### Supabase Setup

1. Create a new Supabase project
2. In **Storage**, create a public bucket named `meal-images`
3. Go to **Project Settings → API** and copy:
   - **Project URL** → `SUPABASE_URL`
   - **service_role** secret key → `SUPABASE_SERVICE_KEY`
4. Go to **Project Settings → Database** and copy the connection string → `DATABASE_URL`
   - Use the `postgresql+asyncpg://` format

---

### Backend Setup

```bash
cd backend

# Create .env from example
cp .env.example .env
# Fill in your keys (see Environment Variables below)

# Install dependencies and run
uv run uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The API will be available at `http://localhost:8000`.
Interactive docs: `http://localhost:8000/docs`

---

### Frontend Setup

```bash
cd frontend

npm install

# Set your machine's local IP in frontend/.env
# (required when testing on a real device)
echo "API_URL=http://YOUR_LOCAL_IP:8000" > .env
echo "APP_ENV=development" >> .env

npx expo start --clear
```

- Press `i` — open iOS Simulator (requires Xcode)
- Press `a` — open Android emulator
- Scan the QR code — open in Expo Go on your phone

> Your phone and Mac must be on the **same Wi-Fi network** when using a real device.

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/meals` | List meals (supports `from_date`, `to_date`, `skip`, `limit`) |
| `POST` | `/meals` | Create a new meal (multipart with image) |
| `GET` | `/meals/{id}` | Get a single meal |
| `PUT` | `/meals/{id}` | Update rating/review |
| `DELETE` | `/meals/{id}` | Delete a meal |
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
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Yes | Supabase service_role secret key |
| `DATABASE_URL` | Yes | PostgreSQL connection string (`postgresql+asyncpg://...`) |
| `GOOGLE_GENAI_USE_VERTEXAI` | No | Set `TRUE` to use Vertex AI instead |

### Frontend (`frontend/.env`)
| Variable | Default | Description |
|---|---|---|
| `API_URL` | `http://localhost:8000` | Backend base URL (use local IP for real devices) |
| `APP_ENV` | `development` | `development` / `staging` / `production` |

---

## License

MIT
