# ProLink — Team Setup & Onboarding Guide

Welcome to **ProLink**! This guide walks every team member through the software prerequisites, environment variables, and step-by-step setup commands for each part of the project.

---

## 1. System Prerequisites

Before running any service, make sure you have the following installed on your machine (Mac or Windows):

| Tool | Recommended Version | Download / Check Command |
| :--- | :--- | :--- |
| **Git** | `>= 2.40` | `git --version` |
| **Node.js** | `LTS (>= 20.x)` | `node -v` |
| **Python** | `3.12.x` | `python3 --version` or `py -3.12 --version` |
| **.NET SDK** | `8.0` or `9.0` | `dotnet --version` |
| **VS Code** | Latest | Recommended editor (see extension list below) |

### Recommended VS Code Extensions
When opening the repository in VS Code, install the workspace recommended extensions:
- **C# Dev Kit** (`ms-dotnettools.csdevkit`)
- **Python & Pylance** (`ms-python.python`, `ms-python.vscode-pylance`)
- **ESLint & Prettier** (`dbaeumer.vscode-eslint`, `esbenp.prettier-vscode`)
- **GitLens** (`eamodio.gitlens`)
- **EditorConfig** (`EditorConfig.EditorConfig`)
- **Docker** (`ms-azuretools.vscode-docker`)
- **Mermaid Preview** (`bierner.markdown-mermaid`)

---

## 2. Clone the Repository

```bash
git clone https://github.com/<username>/prolink.git
cd prolink
```

---

## 3. Frontend Setup (`web/`)

The web frontend is built with Next.js 16 (App Router), React 19, Tailwind CSS, and Supabase SSR.

### Step 1: Install Node Dependencies
```bash
cd web
npm install
```

### Step 2: Create Environment File (`web/.env.local`)
Create a new file named `.env.local` inside the `web/` folder with the following contents:

```env
NEXT_PUBLIC_SUPABASE_URL=https://yevrgmanogofvuxlpasd.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_8Xcq4WGAN06UQomk90vCrA_yiSak3fX
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_8Xcq4WGAN06UQomk90vCrA_yiSak3fX
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_INSIGHT_URL=http://localhost:8000
```

### Step 3: Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 4. Python Insight Service Setup (`insight/`)

The Insight Service handles data science notebooks, synthetic data generation, and machine learning category classification/ranking.

### macOS / Linux
```bash
# 1. Navigate to insight folder (or stay in root)
cd insight

# 2. Create virtual environment
python3.12 -m venv .venv

# 3. Activate virtual environment
source .venv/bin/activate

# 4. Install required Python packages
pip install -r requirements.txt

# 5. Run FastAPI local server
uvicorn main:app --reload --port 8000
```

### Windows (PowerShell / Command Prompt)
```cmd
:: 1. Navigate to insight folder
cd insight

:: 2. Create virtual environment
py -3.12 -m venv .venv

:: 3. Activate virtual environment
.venv\Scripts\activate

:: 4. Install required Python packages
pip install -r requirements.txt

:: 5. Run FastAPI local server
uvicorn main:app --reload --port 8000
```
Interactive API docs will be available at [http://localhost:8000/docs](http://localhost:8000/docs).

---

## 5. C# Core Engine API Setup (`api/`)

The Core Engine is an ASP.NET Core Web API with custom DSA data structures.

```bash
# 1. Restore and build solution
dotnet build api/ProLink.sln

# 2. Run unit tests
dotnet test api/ProLink.sln

# 3. Run the API locally
dotnet run --project api/ProLink.Api
```
The API will run on [http://localhost:5000](http://localhost:5000).

---

## 6. Database Migrations (`db/`)

1. We use a hosted Supabase PostgreSQL database.
2. When new database tables or columns are added:
   - Check the SQL scripts in `db/migrations/` (e.g. `001_schema.sql`, `002_rls.sql`).
   - Run the script in the **Supabase Dashboard $\rightarrow$ SQL Editor**.
   - Always commit new SQL migration files to Git before altering tables in Supabase.

---

## 7. Daily Team Workflow Rules

1. **Work in your component folder**: (e.g. `web/`, `api/`, `insight/`, `network/`, `db/`).
2. **Rebase before pushing**:
   ```bash
   git pull --rebase origin main
   git push origin main
   ```
3. **Never commit `.env` or `.env.local` files**: Real credentials must stay local.
4. **Test locally before pushing**: Pushing to `main` deploys to Vercel/Render.
