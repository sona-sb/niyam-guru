<div align="center">

# ⚖️ नियम-Guru (Niyam Guru)

**AI-Powered Indian Consumer Law Assistant & Judgment Prediction Platform**

[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![LangChain](https://img.shields.io/badge/LangChain-1.1-1C3C3C?logo=langchain&logoColor=white)](https://langchain.com)
[![Google Gemini](https://img.shields.io/badge/Gemini-2.5--flash-4285F4?logo=google&logoColor=white)](https://ai.google.dev)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20%26%20DB-3FCF8E?logo=supabase&logoColor=white)](https://supabase.com)

</div>

---

## 📖 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Setup & Installation](#setup--installation)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
  - [Vector Store Setup](#vector-store-setup)
  - [Database Setup (Supabase)](#database-setup-supabase)
  - [Gmail Integration (Optional)](#gmail-integration-optional)
- [Environment Variables](#environment-variables)
- [Running the Application](#running-the-application)
- [API Reference](#api-reference)
- [Data Assets](#data-assets)

---

## Overview

**Niyam Guru** (नियम-Guru) is an AI-powered legal technology platform built to help Indian consumers understand their rights under the **Consumer Protection Act, 2019**. It combines RAG (Retrieval-Augmented Generation) over 75 years of Supreme Court judgments, Google Gemini LLMs, multi-agent courtroom simulations, and a conversational legal assistant to provide:

- Structured judgment predictions for consumer complaints
- Interactive judicial question-and-answer sessions
- Multi-agent moot court simulations
- AI-powered legal chat with email drafting capabilities
- Multilingual voice input supporting 11 Indian languages

---

## Features

### 🔮 AI Judgment Prediction
Users submit a detailed consumer complaint form (complainant details, opposite party, transaction info, grievance, relief sought, and uploaded evidence). The system validates the complaint, retrieves similar historical cases via RAG, applies the Consumer Protection Act 2019, and produces a structured prediction including success probability, compensation ranges, applicable legal sections, and cited precedents.

### ❓ Judge Clarifying Questions
After prediction, the AI generates judicial-style clarifying questions targeting evidence gaps, timeline issues, and damages calculations. User responses are analyzed by the LLM and the prediction is updated accordingly.

### 🏛️ Courtroom Simulation (Moot Court)
A LangGraph-based multi-agent courtroom simulation with **Judge** and **Consumer** roles. Uses phased proceedings (opening → arguments → evidence → closing → verdict) with human-in-the-loop interaction for the consumer.

### 💬 AI Chat Assistant
A persistent conversational legal assistant specializing in Indian consumer law. It guides users through complaint intake, explains relevant CPA 2019 sections, and can draft and send formal complaint emails via Gmail API integration (with user approval).

### 🎙️ Multilingual Voice Input
Speech-to-text powered by **Sarvam AI** supporting 11 Indian languages + English with automatic translation to English.

### 📧 Email Integration
Gmail API integration (OAuth2 via LangChain GmailToolkit) for drafting and sending formal complaint/legal notice emails. Actual sending requires explicit user approval for safety.

### 📁 Case Management
Users can create, manage, and track multiple consumer complaint cases through a dashboard powered by Supabase.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React + Vite)                   │
│  Landing ─ Auth ─ Cases ─ Chat ─ Voice ─ MootCourt ─ Verdict│
└────────────────────────┬────────────────────────────────────┘
                         │ REST API
┌────────────────────────▼────────────────────────────────────┐
│                  Backend (FastAPI + LangChain)               │
│                                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐  │
│  │Prediction│ │Questions │ │  Chat    │ │    Voice      │  │
│  │  Routes  │ │  Routes  │ │  Routes  │ │    Routes     │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └──────┬────────┘  │
│       │             │            │               │           │
│  ┌────▼─────────────▼────────────▼───────────────▼────────┐ │
│  │           Core Services Layer                          │ │
│  │  Judgment Prediction │ Judge Q&A │ Chat │ Voice │ Email │ │
│  └────────────┬───────────────────────────────────────────┘ │
│               │                                              │
│  ┌────────────▼───────────────────────────────────────────┐ │
│  │   Google Gemini │ ChromaDB (RAG) │ Sarvam AI │ Gmail   │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────┬──────────────────────────────────┘
                           │
              ┌────────────▼─────────────┐
              │   Supabase (Auth + DB)    │
              │   ChromaDB Vector Store   │
              └──────────────────────────┘
```

---

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS 4, React Router 7, Three.js, Lucide Icons |
| **Backend** | Python 3.10+, FastAPI, Uvicorn, LangChain 1.1, LangGraph |
| **LLM** | Google Gemini 2.5 Flash (prediction & chat), Gemini Embeddings |
| **Vector Store** | ChromaDB with Gemini Embedding Model (`gemini-embedding-001`) |
| **Database & Auth** | Supabase (PostgreSQL + Auth) |
| **Voice** | Sarvam AI (Speech-to-Text + Translation) |
| **Email** | Gmail API via LangChain GmailToolkit (OAuth2) |
| **Data Processing** | Pandas, PyMuPDF, Sentence Transformers, scikit-learn |

---

## Project Structure

```
niyam-guru/
├── README.md
├── backend/
│   ├── credentials.json              # Gmail OAuth2 client credentials
│   ├── token.json                    # Gmail OAuth2 token (auto-generated)
│   ├── requirements.txt              # Python dependencies
│   └── src/niyam_guru_backend/
│       ├── api/                      # FastAPI routers
│       │   ├── server.py             # App entry point & CORS config
│       │   ├── prediction_routes.py  # Prediction endpoints
│       │   ├── question_routes.py    # Judge Q&A endpoints
│       │   ├── chat_routes.py        # Chat & email endpoints
│       │   └── voice_routes.py       # Voice transcription endpoints
│       ├── simulation/
│       │   └── judgement_prediction.py  # Core prediction engine (RAG + Gemini)
│       ├── questionare/
│       │   └── judge_questions.py    # Judge clarifying questions generator
│       ├── chat_agent/
│       │   ├── chat_service.py       # Persistent chat with tool-calling
│       │   ├── email_service.py      # Gmail draft/send service
│       │   └── voice_service.py      # Sarvam AI STT + translation
│       ├── agent/
│       │   └── agent_test.py         # LangGraph multi-agent courtroom sim
│       ├── retrieval/
│       │   └── create_vector_db.py   # ChromaDB vector store builder
│       ├── data_pipeline/            # Data processing scripts
│       │   ├── consumer_filter.py    # Filter raw judgments
│       │   ├── enrich_csv.py         # Enrich CSV with LLM
│       │   ├── to_csv.py            # Convert data to CSV format
│       │   └── script.py            # Data management scripts
│       └── config/
│           └── settings.py           # Environment variables & configuration
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── postcss.config.js
│   ├── public/media/                 # Static assets (videos, images)
│   └── src/
│       ├── App.tsx                   # Routing & layout
│       ├── main.tsx                  # React entry point
│       ├── index.css                 # Global styles (Tailwind)
│       ├── pages/                    # Page components
│       ├── components/               # Reusable UI components
│       ├── contexts/                 # React contexts (Auth)
│       ├── hooks/                    # Custom hooks
│       ├── lib/                      # Supabase client, API client, constants
│       └── types/                    # TypeScript type definitions
└── data/
    ├── laws/
    │   └── cpa2019.pdf               # Consumer Protection Act, 2019 (full text)
    ├── processed/
    │   ├── consumer_cases_extracted.csv  # Extracted consumer court cases
    │   └── consumer_laws.csv            # Consumer law sections
    ├── raw_judgements/                # 75 years of Supreme Court judgments (1950–2025)
    │   ├── 1950/ ... 2025/
    ├── vectorstore/
    │   └── consumer_act_gemini_db/   # Pre-built ChromaDB vector store
    └── simulation/                   # Saved prediction & simulation outputs
```

---

## Prerequisites

- **Python** 3.10 or higher
- **Node.js** 18 or higher + npm
- **Google Cloud** account with Gemini API access
- **Supabase** project (free tier works)
- **Sarvam AI** API key (optional — for voice features)
- **Gmail OAuth2 credentials** (optional — for email features)

---

## Setup & Installation

### Backend Setup

```bash
# 1. Navigate to the backend directory
cd backend

# 2. Create and activate a virtual environment (recommended)
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# 3. Install Python dependencies
pip install -r requirements.txt

# 4. Create a .env file in the backend directory (see Environment Variables section)
```

### Frontend Setup

```bash
# 1. Navigate to the frontend directory
cd frontend

# 2. Install Node.js dependencies
npm install

# 3. Create a .env file in the frontend directory (see Environment Variables section)
```

### Vector Store Setup

The vector store needs to be built once from the processed consumer case data:

```bash
cd backend
python -m niyam_guru_backend.retrieval.create_vector_db
```

This reads `data/processed/consumer_cases_extracted.csv`, creates embeddings using the Gemini embedding model, and persists a ChromaDB vector store to `data/vectorstore/consumer_act_gemini_db/`.

> **Note:** If the `data/vectorstore/consumer_act_gemini_db/` directory already exists with data, you can skip this step.

### Database Setup (Supabase)

Create the following tables in your Supabase project:

| Table | Purpose |
|-------|---------|
| `judgment_predictions` | Stores prediction results (case title, type, claim amount, success probability, compensation ranges, full prediction JSON) |
| `user_cases` | User case projects (user_id, case_name, case_type, status, complainant_name, opposite_party_name) |
| `case_messages` | Chat message history (case_id, role, content, metadata) |
| `case_voice_transcripts` | Voice transcripts (case_id, original_transcript, english_translation, language_code) |
| `case_emails` | Email drafts and sent emails (case_id, direction, from/to, subject, body, status, metadata) |

Supabase Auth (email/password) is used for user authentication on the frontend.

### Gmail Integration (Optional)

To enable email drafting and sending features:

1. Create an OAuth2 credential in the [Google Cloud Console](https://console.cloud.google.com/) with the scope `https://mail.google.com/`
2. Download the credentials JSON and save it as `backend/credentials.json`
3. Run the application once — it will open a browser window for OAuth authorization
4. After authorization, a `backend/token.json` file is auto-generated

---

## Environment Variables

### Backend (`backend/.env`)

```env
# Required
GOOGLE_API_KEY=your_gemini_api_key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_service_role_key

# Optional
SUPABASE_ANON_KEY=your_supabase_anon_key
SARVAM_API_KEY=your_sarvam_api_key             # For voice features
GMAIL_CREDENTIALS_FILE=credentials.json         # Path to Gmail OAuth2 credentials
GMAIL_TOKEN_FILE=token.json                     # Path to Gmail OAuth2 token

# Model Configuration (defaults shown)
EMBEDDING_MODEL=models/gemini-embedding-001
LLM_MODEL=gemini-2.5-flash
ENRICH_MODEL=gemini-2.0-flash
API_RATE_LIMIT_SECONDS=4.0
DEBUG=false
```

### Frontend (`frontend/.env`)

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_URL=http://localhost:8000
```

---

## Running the Application

### Start the Backend

```bash
cd backend
uvicorn niyam_guru_backend.api.server:app --reload --host 0.0.0.0 --port 8000
```

The API server will be available at `http://localhost:8000`.

### Start the Frontend

```bash
cd frontend
npm run dev
```

The frontend dev server will be available at `http://localhost:3000`.

### Build for Production (Frontend)

```bash
cd frontend
npm run build
npm run preview   # Preview the production build
```

---

## API Reference

### Prediction Endpoints (`/api/prediction`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/prediction/analyze` | Submit a consumer complaint (JSON with base64 files) for AI prediction |
| `POST` | `/api/prediction/analyze-multipart` | Submit a complaint via multipart form upload |
| `GET`  | `/api/prediction/health` | Health check |

### Judge Questions Endpoints (`/api/questions`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`  | `/api/questions/{prediction_id}` | Get judge clarifying questions for a prediction |
| `POST` | `/api/questions/submit` | Submit answers to judge questions & update prediction |
| `GET`  | `/api/questions/health` | Health check |

### Chat Endpoints (`/api/chat`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/chat/send` | Send a message to the AI chat assistant |
| `GET`  | `/api/chat/history/{case_id}` | Get chat history for a case |
| `POST` | `/api/chat/voice-transcript` | Submit a voice transcript |
| `GET`  | `/api/chat/cases/{user_id}` | Get all cases for a user |
| `POST` | `/api/chat/approve-email/{email_id}` | Approve a drafted email for sending |
| `GET`  | `/api/chat/emails/{case_id}` | Get all emails for a case |
| `GET`  | `/api/chat/health` | Health check |

### Voice Endpoints (`/api/voice`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/voice/transcribe` | Transcribe audio to text (Sarvam AI) |
| `POST` | `/api/voice/translate` | Translate text to English |
| `GET`  | `/api/voice/languages` | List supported languages |
| `GET`  | `/api/voice/health` | Health check |

---

## Data Assets

| Path | Description |
|------|-------------|
| `data/laws/cpa2019.pdf` | Consumer Protection Act, 2019 — full legal text used by the prediction engine |
| `data/processed/consumer_cases_extracted.csv` | Extracted consumer court cases used for RAG retrieval |
| `data/processed/consumer_laws.csv` | Consumer law sections reference |
| `data/raw_judgements/1950–2025/` | 75 years of raw Supreme Court judgment PDFs |
| `data/vectorstore/consumer_act_gemini_db/` | Pre-built ChromaDB vector store for semantic search |
| `data/simulation/` | Saved prediction outputs and courtroom simulation logs |

---

## Security Notes

- **Never commit** `credentials.json`, `token.json`, or `.env` files to version control. These are already listed in `.gitignore`.
- The backend `.env.example` and frontend `.env.example` contain placeholder values — copy them to `.env` and fill in your real keys.
- The Supabase **service role key** (`SUPABASE_KEY`) has full database access — keep it server-side only and never expose it to the frontend.
- The Supabase **anon key** (`VITE_SUPABASE_ANON_KEY`) is safe to use in the frontend since it's restricted by Row Level Security (RLS) policies.
- Gmail OAuth2 tokens (`token.json`) grant access to the configured Gmail account — treat them like passwords.
- If you suspect any credentials have been leaked, rotate them immediately in the respective service dashboards (Google Cloud Console, Supabase Dashboard, Sarvam AI).

---

## Frontend Routes

| Route | Page | Access |
|-------|------|--------|
| `/` | Landing page (Hero, About, Features) | Public |
| `/login` | Login / Sign up | Public |
| `/my-cases` | Case management dashboard | Protected |
| `/voice-input` | Voice input for complaint description | Protected |
| `/chat` | AI legal chat assistant | Protected |
| `/chat/:caseId` | Chat for a specific case | Protected |
| `/mootcourt/intro` | Moot court introduction | Protected |
| `/mootcourt/template` | Consumer complaint form | Protected |
| `/mootcourt/preview` | Complaint preview before submission | Protected |
| `/mootcourt/transition` | Animated document transition | Protected |
| `/mootcourt/questions` | Judge clarifying questions | Protected |
| `/mootcourt/prediction` | Final verdict & prediction view | Protected |

---

<div align="center">

**Built with ❤️ for Indian consumers**

</div>
