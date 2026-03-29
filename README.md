# ET AI Concierge

ET AI Concierge is our submission for the ET Gen AI Hackathon.

It is a multi-agent financial guidance experience designed for the Economic Times ecosystem. The product turns a user conversation into a live financial profile, explains what matters right now, maps the user into relevant ET surfaces, and generates actionable recommendations, alert guidance, and partner-service suggestions in one flow.

## Problem Statement We Chose

Modern financial users do not just need content search. They need a concierge that can:

- understand their goals, risk comfort, and current life stage
- explain financial products and ET signals in plain language
- connect them to the right ET surface at the right moment
- generate useful nudges and alerts instead of generic notifications
- recommend relevant ET partner services without losing personalization

This project is built around that idea.

## What The Product Does

ET AI Concierge combines multiple agents into one user experience:

- `Profiler Agent`: builds a structured financial persona from natural conversation
- `Recommendation Agent`: suggests products, actions, and ET-aligned next steps
- `Pulse / RAG Agent`: retrieves ET knowledge-base content and synthesizes direct answers
- `Financial Life Navigator`: identifies portfolio gaps, immediate needs, and priorities
- `Welcome Concierge + Ecosystem Mapper`: maps the user to ET products, tools, events, and onboarding phases
- `Cross-Sell Engine`: creates behavior-aware nudges and smart alert opportunities
- `Services Marketplace Agent`: matches the user to partner cards, loans, insurance, and wealth offers
- `Action Dispatcher`: prepares downstream actions such as saved plans and follow-up workflow scaffolding

## Problems It Handles

The current implementation is built to handle these ET use cases:

- profile-based financial discovery for new and returning users
- direct Q&A over ET-style finance content using retrieval + synthesis
- goal-aware recommendation of ET products and surfaces
- financial-life diagnosis through gaps, risks, and immediate needs
- smart alert interpretation and next-step guidance
- partner offer explanation and fit analysis
- onboarding orchestration across the broader ET ecosystem

## Key Demo Flows

In the current demo, a user can:

- chat with the concierge and build a live financial profile
- get recommendations tailored to risk appetite and goals
- see navigator insights such as portfolio gaps and immediate needs
- view ET ecosystem touchpoints and a guided onboarding journey
- review smart alerts and ask what triggered them
- inspect marketplace offers and ask whether they fit their profile

## Tech Stack

- Backend: Python
- Frontend: React
- LLM provider support: Gemini or Grok
- Fallback mode: heuristic/offline-safe behavior when live keys are missing

## Repository Structure

- [backend](/c:/Users/sahaT/Desktop/Tanmoy/Project/ET_Hack/et-ai-concierge/backend): multi-agent orchestration, API server, prompts, RAG, ecosystem logic
- [frontend](/c:/Users/sahaT/Desktop/Tanmoy/Project/ET_Hack/et-ai-concierge/frontend): React demo interface for concierge, alerts, navigator, and marketplace
- [model.py](/c:/Users/sahaT/Desktop/Tanmoy/Project/ET_Hack/et-ai-concierge/model.py): one-shot launcher entry
- [.env.example](/c:/Users/sahaT/Desktop/Tanmoy/Project/ET_Hack/et-ai-concierge/.env.example): sample configuration

## How To Run

### 1. Clone and set up Python

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 2. Configure environment

Copy `.env.example` to `.env`.

At minimum, the app can run in heuristic mode without live model keys. For live LLM behavior, add one of these:

- `GEMINI_API_KEY`
- `XAI_API_KEY`

Additional optional configuration examples are documented in `.env.example`.

### 3. Start the backend

```powershell
python -m backend --serve
```

By default, the backend serves on:

- `http://127.0.0.1:8000`

### 4. Start the frontend

```powershell
cd frontend
npm install
npm start
```

The frontend reads the backend from `http://127.0.0.1:8000` by default.

## Backend Entry Points

- `python -m backend --serve`
- `python -m backend.app --serve`
- `python model.py`

## Current Feature Coverage

- conversational profiling
- recommendation generation
- RAG-backed ET knowledge synthesis
- financial life navigation
- ET ecosystem onboarding map
- cross-sell and smart alert suggestions inside the product experience
- marketplace recommendations across cards, loans, insurance, and wealth
- dispatcher scaffolding for follow-up actions

## Why This Fits ET

This project is designed specifically for ET rather than as a generic finance bot:

- it routes users across ET surfaces instead of stopping at chat answers
- it blends ET knowledge, ET onboarding, ET cross-sell, and ET marketplace logic
- it emphasizes explainable guidance and timing-aware nudges
- it can work for beginners, traders, wealth builders, and loan seekers
- it frames alerts as contextual intelligence, not just notification blasts

## Future Improvements

- real outbound alert delivery across email, SMS, or app channels
- richer ET article retrieval and ranking
- deeper portfolio ingestion from broker or account connections
- stronger personalization from real ET behavioral events
- analytics and experimentation for cross-sell timing
- compliance, consent, and channel preference controls for notifications

## Notes For Judges

- The app is designed to degrade gracefully when live model keys are unavailable.
- Heuristic mode keeps the demo usable offline for hackathon evaluation.
- The strongest end-to-end experience is visible through the frontend flow, where chat, navigator, alerts, and marketplace are connected.
