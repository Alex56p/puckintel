from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from database import Base
import datetime

class Player(Base):
    __tablename__ = "players"
    id = Column(Integer, primary_key=True, index=True) # ESPN ID
    fullName = Column(String, index=True)
    position = Column(String)
    proTeam = Column(String)
    ownership = Column(Float) # Percent owned
    avg_points = Column(Float)
    total_points = Column(Float)
    team_id = Column(Integer, ForeignKey("league_teams.id"), nullable=True)
    status = Column(String) # HEALTHY, INJURED, OUT, etc
    injury_detail = Column(String) # Expected return date / notes
    salary = Column(String) # Current annual salary from PuckPedia
    salary_value = Column(Float) # Numeric salary for sorting
    contract_years = Column(String) # Years remaining
    lineup_slot = Column(String) # Current lineup slot from ESPN (e.g. 'BE', 'C', 'LW')
    
    team = relationship("LeagueTeam", back_populates="players")
    
    # Granular Stats
    goals = Column(Float, default=0.0)
    assists = Column(Float, default=0.0)
    ppp = Column(Float, default=0.0)
    shp = Column(Float, default=0.0)
    sog = Column(Float, default=0.0)
    hits = Column(Float, default=0.0)
    blocks = Column(Float, default=0.0)
    plus_minus = Column(Float, default=0.0)
    
    last_updated = Column(DateTime, default=datetime.datetime.utcnow)

class LeagueTeam(Base):
    __tablename__ = "league_teams"
    id = Column(Integer, primary_key=True, index=True) # ESPN Team ID
    name = Column(String)
    owner = Column(String)
    rank = Column(Integer)
    wins = Column(Integer)
    losses = Column(Integer)
    ties = Column(Integer)
    points = Column(Float)
    
    # Team-wide stats for detailed breakdown
    goals = Column(Float, default=0.0)
    assists = Column(Float, default=0.0)
    ppp = Column(Float, default=0.0)
    shp = Column(Float, default=0.0)
    sog = Column(Float, default=0.0)
    hits = Column(Float, default=0.0)
    blocks = Column(Float, default=0.0)
    pim = Column(Float, default=0.0)
    
    players = relationship("Player", back_populates="team")

class PlayerSnapshot(Base):
    """Stores stats over time for analysis"""
    __tablename__ = "player_snapshots"
    id = Column(Integer, primary_key=True, index=True)
    player_id = Column(Integer, ForeignKey("players.id"))
    date = Column(DateTime, default=datetime.datetime.utcnow) # Actual time of snap
    day = Column(String) # YYYY-MM-DD for easier querying
    lineup_slot = Column(String) # Lineup slot at time of snapshot

    
    total_points = Column(Float)
    goals = Column(Float, default=0.0)
    assists = Column(Float, default=0.0)
    ppp = Column(Float, default=0.0)
    shp = Column(Float, default=0.0)
    sog = Column(Float, default=0.0)
    hits = Column(Float, default=0.0)
    blocks = Column(Float, default=0.0)
    plus_minus = Column(Float, default=0.0)
    salary = Column(String)
    salary_value = Column(Float)
    contract_years = Column(String)
class TeamSnapshot(Base):
    """Stores team totals over time"""
    __tablename__ = "team_snapshots"
    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, ForeignKey("league_teams.id"))
    date = Column(DateTime, default=datetime.datetime.utcnow)
    day = Column(String) # YYYY-MM-DD
    points = Column(Float)
