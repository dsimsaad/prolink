# ProLink Insight Service

Python 3.12 / FastAPI microservice for job category classification. Existing
`GET /health` and `POST /match` endpoints remain available.

## Structure

```text
insight/
  main.py                    FastAPI, CORS, model startup, /classify, /match, /health
  requirements.txt           Runtime, test, and existing notebook dependencies
  app/
    db.py                    Root environment loader and read-only Supabase queries
    schemas.py               Validated request, response, and training models
    classifier.py            TF-IDF + logistic regression, persistence, abstention
  generator/
    synthetic_data.py        Seeded Faker dataset and optional CSV export
  models/classifier.pkl      Generated on first startup; ignored by Git
  tests/                     Offline database, classifier, and API tests
```

## Configuration

Set these variables in the **repository root** `.env` or `.env.local`, not inside
`insight/`. `.env.local` overrides `.env`; existing process variables override both.
Paths are resolved from the source file, independently of the shell's directory.

```dotenv
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-server-only-service-role-key
ALLOWED_ORIGINS=http://localhost:3000
```

`ALLOWED_ORIGINS` accepts comma-separated Next.js origins (no paths or trailing
slash). An unset or empty value defaults to `http://localhost:3000`.
The service-role key stays on this server and is never returned in API responses.

## Windows PowerShell

Starting at the monorepo root:

```powershell
cd insight
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

If PowerShell does not allow activation, use the environment's interpreter directly
instead; no execution-policy change is needed:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

## macOS / Linux

Starting at the monorepo root:

```bash
cd insight
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Interactive API documentation: <http://localhost:8000/docs>.
For deployment, omit `--reload`; configure allowed origins for the deployed frontend.
Each worker initializes its own in-memory model. Writes use a temporary file and
atomic replacement, so workers cannot read partially written artifacts.

## Deployment (Render)

The Insight Service is deployed as a Python Web Service on **Render**.

- **Environment**: Python 3
- **Root Directory**: `insight`
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- **Environment Variables**:
  - `SUPABASE_URL`: Supabase project URL (`https://<project-ref>.supabase.co`)
  - `SUPABASE_SERVICE_ROLE_KEY`: Supabase server-only service role key
  - `ALLOWED_ORIGINS`: Comma-separated frontend origins (e.g. `https://prolink.vercel.app,http://localhost:3000`)
- **Health Check Path**: `/health`

> **Render Free Tier Notice**: Instances spin down after ~15 minutes of inactivity. Initial requests after idle may encounter 30–50 seconds cold-start latency while the service wakes up.

## Classification

`POST /classify` accepts a nonblank title (up to 200 characters) and description
(up to 10,000 characters). Invalid input returns HTTP 422.

```json
{
  "title": "Leaking bathroom pipe",
  "description": "Need a plumber to replace a broken water pipe and fix the tap."
}
```

Response shape (confidence is illustrative and varies by trained model):

```json
{
  "suggested_category": "Plumbing",
  "confidence": 0.87,
  "is_fallback": false
}
```

Try it from PowerShell:

```powershell
$body = @{
    title = "Leaking bathroom pipe"
    description = "Need a plumber to replace a broken water pipe and fix the tap."
} | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://localhost:8000/classify -ContentType application/json -Body $body
```

## Training and model lifecycle

1. Startup loads a trusted local `models/classifier.pkl` if compatible with the
   installed scikit-learn version. Incompatible/corrupt artifacts trigger retraining.
2. Without an artifact, `fetch_training_jobs()` reads `jobs.title`,
   `jobs.description`, and the referenced `categories.name`. It orders by job ID,
   paginates, skips invalid rows, and caps the fetch at 10,000 rows. This matches
   `db/migrations/001_core_schema.sql`; no database migrations or writes are needed.
3. Missing credentials, empty data, or a database failure use 640 deterministic
   Faker examples across the eight categories in `db/seed/001_categories_areas.sql`.
   A single-class real dataset is supplemented with synthetic examples because
   logistic regression requires at least two classes. Logs identify the source.
4. TF-IDF word unigrams/bigrams feed class-balanced logistic regression. The fitted
   pipeline and provenance are saved atomically. If the filesystem is read-only,
   inference remains available in memory and startup logs a warning.
5. Predictions below **0.35** return `"General / Uncategorized"` with
   `is_fallback=true`; confidence remains the model's top probability. Text with
   no known vocabulary returns the same category with confidence **0.0**.

`is_fallback` describes prediction abstention, not whether synthetic training data
was used. Synthetic training is a bootstrap baseline, not evidence of real-world
accuracy. Evaluate on independent, labeled real jobs before relying on confidence
scores in production. Scores are uncalibrated logistic-regression probabilities.

The saved model is reused across restarts; new database jobs do **not** retrain it
automatically. To retrain, stop the service, remove only
`insight/models/classifier.pkl`, and restart. Only load model files created by a
trusted process: joblib/pickle deserialization can execute code.

## Tests and dataset export

From `insight/`, with the virtual environment active:

```bash
python -m pytest -q
python -m generator.synthetic_data --samples-per-category 80 --seed 42 --output data/synthetic/jobs.csv
```

Tests use temporary model files and mocked Supabase access; no live records or
credentials are required. CSV export is optional; startup uses generated records
in memory and never inserts them into Supabase.

Implementation references: [FastAPI lifespan](https://fastapi.tiangolo.com/advanced/events/),
[Supabase Python queries](https://supabase.com/docs/reference/python/select), and
[scikit-learn model persistence](https://scikit-learn.org/stable/model_persistence.html).
