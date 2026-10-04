# ProLink Insight Service (`insight/`)

## Purpose
Python service for Introduction to Data Science (IDS), providing job category classification (NLP/ML), professional ranking score models, platform analytics, synthetic dataset generation, and exploratory data analysis (EDA) Jupyter notebooks. Deployed as a FastAPI serverless API on Vercel.

## Planned Owner
- **Lead**: P4 (Data Science Lead)

## Planned Structure & Files
```text
insight/
├── main.py                      FastAPI application entry point
├── requirements.txt             Python package dependencies
├── app/                         FastAPI API routes and business logic
│   ├── classifier/              Category text classification models & inference
│   ├── ranking/                 ML/statistical ranking scores for professionals
│   └── analytics/               Platform metrics, aggregations, and reporting
├── generator/                   Synthetic data generation scripts using Faker
│   └── generate_dataset.py
├── notebooks/                   Jupyter notebooks for EDA, modeling, and evaluation
│   ├── 01_exploratory_data_analysis.ipynb
│   └── 02_category_classifier_training.ipynb
├── data/                        Data directories (.gitignore ignores raw/synthetic content)
│   ├── raw/                     Raw survey responses and external datasets
│   ├── processed/               Cleaned and transformed datasets
│   └── synthetic/               Generated test datasets for training and benchmarking
├── models/                      Serialized machine learning models (.pkl, .joblib)
└── tests/                       pytest automated test suites
```

## What Will Go Inside
- **`app/`**: FastAPI endpoints serving category suggestions (`/api/classify`), ML ranking enhancements (`/api/rank`), and analytics dashboards (`/api/analytics`).
- **`generator/`**: Synthetic dataset generation tools using Faker to produce realistic Pakistani/local home service profiles, reviews, and job postings.
- **`notebooks/`**: Documented Jupyter notebooks conducting EDA, hypothesis testing, data cleaning, and model evaluation.
- **`data/` & `models/`**: Datasets and saved trained models.

## How to Run: TODO
Run these commands when ready to initialize the Python environment:

### macOS / Linux
```bash
# 1. Create virtual environment
python3.12 -m venv .venv

# 2. Activate virtual environment
source .venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Run FastAPI local development server
uvicorn main:app --reload --port 8000
```

### Windows (PowerShell / Command Prompt)
```cmd
# 1. Create virtual environment
py -3.12 -m venv .venv

# 2. Activate virtual environment
.venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Run FastAPI local development server
uvicorn main:app --reload --port 8000
```
API docs will be available at [http://localhost:8000/docs](http://localhost:8000/docs).
