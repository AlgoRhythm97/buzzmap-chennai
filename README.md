# BuzzMap Chennai

> BuzzMap Chennai is a software prototype of a low-cost optical mosquito sensing network that transforms mosquito wingbeat signals into AI-assisted vector surveillance observations across Chennai.

## Architecture

```
Virtual Optical Sensor
        ↓
Signal Processing
        ↓
Machine Learning
        ↓
Database
        ↓
Chennai Map
        ↓
City Intelligence
```

Note: Later components like the Virtual Optical Sensor, Signal Processing, Machine Learning, Database, and Map features will be implemented in subsequent stages.

## Local Setup

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```
