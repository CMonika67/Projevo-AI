<div align="center">

# 🚀 Projevo AI

### **The Intelligent Engineering Project Co-Pilot & Technical Defense Ecosystem**

*From initial architectural ideation to production-grade code diagnostics, skill roadmap mastery, and rigorous viva/interview defense.*

---

[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-24%2B-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.21-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Vite](https://img.shields.io/badge/Vite-6.4-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Google Gemini](https://img.shields.io/badge/AI-Google%20Gemini%202.5-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)
[![Supabase](https://img.shields.io/badge/Database-Supabase%20PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Tests](https://img.shields.io/badge/Tests-175%20Passing-22C55E?style=for-the-badge&logo=vitest&logoColor=white)](https://vitest.dev/)
[![Security Audit](https://img.shields.io/badge/Security-Hardened%20%26%20Zero--Leakage-10B981?style=for-the-badge&logo=shield)](https://github.com/CMonika67/Projevo-AI)

<br />

<p align="center">
  <a href="#-the-uniqueness-of-projevo-ai"><b>Why Projevo AI?</b></a> •
  <a href="#-core-pillars--feature-tour"><b>Core Pillars</b></a> •
  <a href="#-architecture--data-flow"><b>Architecture</b></a> •
  <a href="#-competitive-matrix"><b>Uniqueness Matrix</b></a> •
  <a href="#-tech-stack"><b>Tech Stack</b></a> •
  <a href="#-quick-start"><b>Quick Start</b></a> •
  <a href="#-automated-testing--verification"><b>Testing (175 Tests)</b></a> •
  <a href="#-enterprise-grade-security"><b>Security</b></a>
</p>

</div>

---

## 🌟 The Uniqueness of Projevo AI

Most developer tools solve isolated problems: **ChatGPT** produces generic text without repo context; **GitHub Copilot** autocompletes lines without evaluating architectural trade-offs; **LeetCode** focuses on abstract puzzles rather than full-stack system design; and static linters flag typos without providing interview-ready justifications.

**Projevo AI is built differently.** It is the first end-to-end engineering career co-pilot specifically engineered for student builders, capstone teams, and technical interview candidates:

1. **Full-Lifecycle Engineering Co-Pilot**: Guides builders from raw concept feasibility, prerequisite skill gap analysis, and system blueprints to live code auditing and final viva defense.
2. **Context-Aware Code Diagnostics (Project Doctor)**: Quarantines, scans, and scores entire multi-file project archives (`.zip`, `.py`, `.ts`, `.tsx`, `.js`) across 6 architectural dimensions with actionable remediation patches.
3. **Viva & Technical Defense Rehearsal**: Simulates rigorous university faculty vivas and Big-Tech architecture interrogations based on the user's *actual codebase* and design choices.
4. **Zero-Latency Single-Turn AI Engine**: Optimized prompt orchestration eliminates slow chained requests, delivering structured feasibility blueprints and interview question batches in a single high-speed Gemini roundtrip.
5. **Resilient Dual-Engine Persistence**: Seamlessly operates in zero-config offline mode (ACID-guaranteed local atomic store) and connects natively to cloud **Supabase PostgreSQL with Row-Level Security** in production.

---

## 🏛 Architecture & Data Flow

```mermaid
flowchart TB
    subgraph Client ["Client Presentation Layer (React 19 + TypeScript + Vite)"]
        UI["Modern Responsive UI\n(Tailwind + Lucide Icons)"]
        AuthView["Auth Choices Screen\n(Email/Password • 6-Digit OTP • Google Popup)"]
        DoctorView["Project Doctor\n(ZIP & Multi-File Drag-and-Drop)"]
        IdeaView["Idea Feasibility\n& Blueprint Generator"]
        InterviewView["Viva Simulator\n& Technical Interview Coach"]
        ProfileView["Skill Matrix &\nProfile Settings"]
    end

    subgraph SecurityGateway ["Security & Middleware Gateway (Express 4.21)"]
        RateLimit["express-rate-limit\n(Tiered IP Brute-Force Shields)"]
        CookieShield["HttpOnly + SameSite\nSession Cookies (Zero XSS)"]
        SafeExtractor["Zip-Slip & Symlink Safe Extractor\n(Memory-Bounded Stream)"]
        PromptQuarantine["Untrusted Code XML Sanitizer\n(Prompt Injection Defense)"]
    end

    subgraph CoreEngine ["Projevo AI Core Intelligence"]
        Orchestrator["Single-Turn Gemini 2.5 Orchestrator"]
        DiagnosticEngine["Code Quality & Vulnerability Evaluator"]
        VivaEngine["Socratic Technical Interview Generator"]
        SkillEngine["Prerequisite Gap Analyzer"]
    end

    subgraph Persistence ["Hybrid Dual-Storage Tier"]
        DBGuard{"Production DB Guard"}
        SupabaseDB[("Supabase Cloud\nPostgreSQL + RLS")]
        LocalDB[("Local Atomic JSON\n(Mutex-Locked with Corrupted Auto-Backup)")]
    end

    Client -->|Encrypted HTTPS Requests| SecurityGateway
    SecurityGateway --> CoreEngine
    CoreEngine --> DBGuard
    DBGuard -->|Production Mode| SupabaseDB
    DBGuard -->|Offline / Test Mode| LocalDB
