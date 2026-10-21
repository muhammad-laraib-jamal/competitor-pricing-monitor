# backend/app/main.py

"""FastAPI entry point for Competitor Pricing Monitor MVP.
Provides basic CRUD for competitors and a monitoring run endpoint.
"""

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from . import models, schemas, database, services

app = FastAPI(title="Competitor Pricing Monitor")

# Allow frontend to access API (adjust origin as needed)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/api/health")
def health_check():
    return {"status": "ok"}

# Competitor CRUD
@app.post("/api/competitors", response_model=schemas.CompetitorOut)
def create_competitor(comp: schemas.CompetitorCreate, db: Session = Depends(get_db)):
    return services.create_competitor(db, comp)

@app.get("/api/competitors", response_model=list[schemas.CompetitorOut])
def list_competitors(db: Session = Depends(get_db)):
    return services.get_competitors(db)

@app.put("/api/competitors/{comp_id}", response_model=schemas.CompetitorOut)
def update_competitor(comp_id: int, comp: schemas.CompetitorUpdate, db: Session = Depends(get_db)):
    db_comp = services.get_competitor(db, comp_id)
    if not db_comp:
        raise HTTPException(status_code=404, detail="Competitor not found")
    return services.update_competitor(db, db_comp, comp)

@app.delete("/api/competitors/{comp_id}")
def delete_competitor(comp_id: int, db: Session = Depends(get_db)):
    db_comp = services.get_competitor(db, comp_id)
    if not db_comp:
        raise HTTPException(status_code=404, detail="Competitor not found")
    services.delete_competitor(db, db_comp)
    return {"detail": "deleted"}

# Monitoring run (mock implementation for now)
@app.post("/api/monitoring/run")
def run_monitoring(db: Session = Depends(get_db)):
    # Trigger a mock monitoring run that uses fixtures
    result = services.run_mock_monitoring(db)
    return {"detail": "monitoring run completed", "result": result}

# Alerts endpoint (basic)
@app.get("/api/alerts", response_model=list[schemas.AlertOut])
def list_alerts(db: Session = Depends(get_db)):
    return services.get_alerts(db)

# Approvals endpoint (basic)
@app.post("/api/approvals/{alert_id}/approve")
def approve_alert(alert_id: int, db: Session = Depends(get_db)):
    alert = services.get_alert(db, alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    services.approve_alert(db, alert)
    return {"detail": "approved"}

@app.post("/api/approvals/{alert_id}/reject")
def reject_alert(alert_id: int, db: Session = Depends(get_db)):
    alert = services.get_alert(db, alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    services.reject_alert(db, alert)
    return {"detail": "rejected"}
