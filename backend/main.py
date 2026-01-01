from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from apscheduler.schedulers.background import BackgroundScheduler
import uvicorn
import logging
import os
import datetime
from dotenv import load_dotenv

load_dotenv()

from database import engine, get_db, Base
import models
from fantasy_client import FantasyClient
from scrapers import fetch_cbs_injuries

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Fantasy NHL Pool Manager")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Scheduler
scheduler = BackgroundScheduler()
fantasy_client = FantasyClient()

def _upsert_player(db, p, scoring_map, injury_map={}, ownership_map={}, team_id=None):
    try:
        db_p = db.query(models.Player).filter(models.Player.id == p.playerId).first()
        if not db_p:
            db_p = models.Player(id=p.playerId)
            db.add(db_p)
            db.flush()
        
        db_p.fullName = p.name
        db_p.position = p.position 
        db_p.proTeam = p.proTeam
        db_p.status = p.injuryStatus
        db_p.injury_detail = injury_map.get(p.name)
        # Use map if available, fallback to getattr
        db_p.ownership = ownership_map.get(p.playerId, getattr(p, 'percentOwned', 0))
        db_p.team_id = team_id
        
        # Extract stats
        current_year = 2026 
        stats_key = f'Total {current_year}'
        
        stats_dict = {}
        if hasattr(p, 'stats') and stats_key in p.stats:
             if 'total' in p.stats[stats_key]:
                 stats_dict = p.stats[stats_key]['total']
        
        # Populate Granular Stats
        db_p.goals = stats_dict.get('G', 0)
        db_p.assists = stats_dict.get('A', 0)
        db_p.ppp = stats_dict.get('PPP', 0)
        db_p.shp = stats_dict.get('SHP', 0)
        db_p.sog = stats_dict.get('SOG', 0)
        db_p.hits = stats_dict.get('HIT', 0)
        db_p.blocks = stats_dict.get('BLK', 0)
        db_p.plus_minus = stats_dict.get('+/-', 0)

        # Fantasy Points: Calculate dynamically based on league settings
        calculated_points = 0.0
        
        # Map DB fields/keys to scoring_map keys
        # scoring_map has keys like 'G', 'A', 'PPP' etc
        
        # Iterate over known scoring categories
        # Note: double dipping (e.g. G counts as G and PPP?) usually depends on league settings.
        # Typically in ESPN Points leagues: G=3, PPP=1. A Powerplay goal gets 3+1=4? 
        # Usually stats are separate. PPP is "Power Play Points", so yes it adds on top.
        
        for key, points_per_stat in scoring_map.items():
            val = stats_dict.get(key, 0)
            calculated_points += (val * points_per_stat)
            
        # Fallback if map is empty (though it shouldn't be)
        if not scoring_map:
             calculated_points = stats_dict.get('16', db_p.goals + db_p.assists)

        db_p.total_points = calculated_points
        db_p.last_updated = datetime.datetime.utcnow()

        # Daily Snapshot
        today_str = datetime.datetime.utcnow().strftime('%Y-%m-%d')
        snap = db.query(models.PlayerSnapshot).filter(
            models.PlayerSnapshot.player_id == db_p.id,
            models.PlayerSnapshot.day == today_str
        ).first()

        if not snap:
            snap = models.PlayerSnapshot(player_id=db_p.id, day=today_str)
            db.add(snap)
        
        snap.date = datetime.datetime.utcnow()
        snap.total_points = db_p.total_points
        snap.goals = db_p.goals
        snap.assists = db_p.assists
        snap.ppp = db_p.ppp
        snap.shp = db_p.shp
        snap.sog = db_p.sog
        snap.hits = db_p.hits
        snap.blocks = db_p.blocks
        snap.plus_minus = db_p.plus_minus
        snap.salary = db_p.salary
        snap.salary_value = db_p.salary_value
        snap.contract_years = db_p.contract_years

    except Exception as e:
        logger.error(f"Error upserting player {p.name}: {e}")

def sync_data():
    logger.info("Starting background sync...")
    if not fantasy_client.connect():
        logger.warning("Could not connect to ESPN API. Check credentials.")
        return

    db = next(get_db())
    try:
        # Fetch Scoring Settings
        scoring_map = fantasy_client.fetch_scoring_settings()
        
        # Sync Teams and Rosters
        standings = fantasy_client.get_standings()
        injury_map = fetch_cbs_injuries()
        ownership_map = fantasy_client.fetch_ownership()

        for team in standings:
            # Upsert Team
            db_team = db.query(models.LeagueTeam).filter(models.LeagueTeam.id == team.team_id).first()
            if not db_team:
                db_team = models.LeagueTeam(id=team.team_id)
                db.add(db_team)
            
            db_team.name = team.team_name
            db_team.rank = getattr(team, 'standing_playoff', team.standing)
            
            wins = getattr(team, 'wins', 0)
            losses = getattr(team, 'losses', 0)
            ties = getattr(team, 'ties', 0)
            
            if wins == 0 and hasattr(team, 'stats'):
                 wins = team.stats.get('W', 0)
                 losses = team.stats.get('L', 0)
                 ties = team.stats.get('T', 0)

            db_team.wins = wins
            db_team.losses = losses
            db_team.ties = ties
            
            # Points Logic: Calculate team points from their cumulative stats
            team_fantasy_points = 0.0
            if hasattr(team, 'stats'):
                for stat_key, pts_per_stat in scoring_map.items():
                    stat_val = team.stats.get(stat_key, 0)
                    team_fantasy_points += (stat_val * pts_per_stat)
            
            if team_fantasy_points == 0:
                team_fantasy_points = getattr(team, 'points', getattr(team, 'total_points', 0))
            
            db_team.points = team_fantasy_points

            # Populate Team Granular Stats
            if hasattr(team, 'stats'):
                ts = team.stats
                db_team.goals = ts.get('G', 0)
                db_team.assists = ts.get('A', 0)
                db_team.ppp = ts.get('PPP', 0)
                db_team.shp = ts.get('SHP', 0)
                db_team.sog = ts.get('SOG', 0)
                db_team.hits = ts.get('HIT', 0)
                db_team.blocks = ts.get('BLK', 0)
                db_team.pim = ts.get('PIM', 0)

            # Team Daily Snapshot
            today_str = datetime.datetime.utcnow().strftime('%Y-%m-%d')
            t_snap = db.query(models.TeamSnapshot).filter(
                models.TeamSnapshot.team_id == db_team.id,
                models.TeamSnapshot.day == today_str
            ).first()

            if not t_snap:
                t_snap = models.TeamSnapshot(team_id=db_team.id, day=today_str)
                db.add(t_snap)
            
            t_snap.date = datetime.datetime.utcnow()
            t_snap.points = db_team.points

            # Sync Team Roster
            for player in team.roster:
                _upsert_player(db, player, scoring_map, injury_map, ownership_map, team_id=team.team_id)

        # Sync Free Agents (Top 50)
        fas = fantasy_client.get_free_agents(size=50)
        for p in fas:
            _upsert_player(db, p, scoring_map, injury_map, ownership_map, team_id=None)

        db.commit()
        logger.info("Sync completed successfully.")
    except Exception as e:
        logger.error(f"Error during sync: {e}")
        db.rollback()
    finally:
        db.close()

@app.on_event("startup")
def start_scheduler():
    scheduler.add_job(sync_data, 'interval', minutes=5)
    scheduler.add_job(sync_data) # Run once on startup
    scheduler.start()

@app.get("/api/health")
def health():
    return {"status": "ok"}

@app.get("/api/teams")
def get_teams(db: Session = Depends(get_db)):
    from sqlalchemy.orm import joinedload
    return db.query(models.LeagueTeam).options(joinedload(models.LeagueTeam.players)).order_by(models.LeagueTeam.rank).all()

@app.get("/api/teams/{team_id}/players/history")
def get_team_players_history(team_id: int, stat: str = "total_points", db: Session = Depends(get_db)):
    """Returns historical points for all players on a specific team"""
    players = db.query(models.Player).filter(models.Player.team_id == team_id).all()
    player_ids = [p.id for p in players]
    player_map = {p.id: p.fullName for p in players}

    snaps = db.query(models.PlayerSnapshot).filter(models.PlayerSnapshot.player_id.in_(player_ids)).order_by(models.PlayerSnapshot.day.asc()).all()

    history_dict = {}
    for s in snaps:
        if s.day not in history_dict:
            history_dict[s.day] = {"day": s.day}
        p_name = player_map.get(s.player_id, f"Player {s.player_id}")
        # Dynamically get stat from snapshot object
        val = getattr(s, stat, 0)
        history_dict[s.day][p_name] = val

    return sorted(list(history_dict.values()), key=lambda x: x['day'])

@app.get("/api/players/free_agents")
def get_free_agents(db: Session = Depends(get_db)):
    return db.query(models.Player).filter(models.Player.team_id == None).order_by(models.Player.total_points.desc()).limit(50).all()

@app.get("/api/players/{player_id}")
def get_player_details(player_id: int, db: Session = Depends(get_db)):
    player = db.query(models.Player).filter(models.Player.id == player_id).first()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    return player

@app.get("/api/players/{player_id}/history")
def get_player_history(player_id: int, db: Session = Depends(get_db)):
    """Returns historical stats for a single player"""
    snaps = db.query(models.PlayerSnapshot).filter(models.PlayerSnapshot.player_id == player_id).order_by(models.PlayerSnapshot.day.asc()).all()
    return snaps

@app.get("/api/teams/history")
def get_teams_history(db: Session = Depends(get_db)):
    """Returns team points over time formatted for Recharts"""
    # Fetch all team snapshots
    snaps = db.query(models.TeamSnapshot).order_by(models.TeamSnapshot.day.asc()).all()
    teams = db.query(models.LeagueTeam).all()
    team_map = {t.id: t.name for t in teams}
    
    # Reformat to: [{ day: '2025-10-01', 'Team A': 100, 'Team B': 90 }, ...]
    history_dict = {}
    for s in snaps:
        if s.day not in history_dict:
            history_dict[s.day] = {"day": s.day}
        team_name = team_map.get(s.team_id, f"Team {s.team_id}")
        history_dict[s.day][team_name] = s.points
        
    return sorted(list(history_dict.values()), key=lambda x: x['day'])

@app.get("/api/settings/scoring")
def get_scoring_settings():
    return fantasy_client.fetch_scoring_settings()

@app.post("/api/sync")
def trigger_sync():
    sync_data()
    return {"message": "Sync completed"}

@app.get("/api/analysis/trade_suggestions")
def get_trade_suggestions(team_id: int = None, db: Session = Depends(get_db)):
    # Basic logic: Find my worst players and best free agents
    # This is a placeholder for more complex logic
    
    # Get top free agents
    top_fa = db.query(models.Player).order_by(models.Player.total_points.desc()).limit(5).all()
    
    # If we had my players, we would compare
    # For now, return the top FAs as "Pickup Recommendations"
    return {
        "pickup_recommendations": top_fa,
        "drop_candidates": [] # Would need team roster data
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
