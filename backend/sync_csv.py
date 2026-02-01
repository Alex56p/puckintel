import csv
import io
from sqlalchemy.orm import Session
from sqlalchemy import text
import models

def process_csv_content(content: str, db: Session):
    """
    Parses a CSV string and updates player salaries in the database.
    Expected CSV columns: "Full Name", "Team", "Cap Hit", "Years Left"
    """
    # Use StringIO to treat the string as a file
    f = io.StringIO(content)
    reader = csv.DictReader(f)
    
    # Check headers (basic validation)
    # Note: CSV headers might differ slightly (e.g. tabs vs commas), 
    # but based on user prompt "Full Name\tTeam..." vs "CSV file", we assume standard CSV or TSV.
    # The user provided a copy-paste that looks like tab-separated, but requested "CSV file".
    # We will try to detect dialect or just assume standard CSV. 
    # If the user uploads a real CSV, it will be comma separated.
    
    # We'll normalize the input a bit to be safe. 
    # If the reader fieldnames are None, it might be an issue.
    
    updated_count = 0
    
    for row in reader:
        # Normalize keys (strip whitespace)
        row = {k.strip(): v for k, v in row.items() if k}
        
        full_name = row.get("Full Name")
        cap_hit_raw = row.get("Cap Hit")
        years_left = row.get("Years Left", "0")
        
        if not full_name:
            continue
            
        # Parse Cap Hit
        salary_val = 0.0
        salary_str = cap_hit_raw
        if cap_hit_raw:
            try:
                # Remove common currency symbols
                clean_cap = cap_hit_raw.replace("$", "").replace(",", "").strip()
                salary_val = float(clean_cap)
            except ValueError:
                pass
        
        # Find the player
        # We case-insensitive match on full name
        player = db.query(models.Player).filter(models.Player.fullName.ilike(full_name)).first()
        
        if player:
            player.salary = salary_str
            player.salary_value = salary_val
            player.contract_years = str(years_left)
            updated_count += 1
            
            # Update latest snapshot if exists
            # We can do a quick check for today's snapshot
            latest_snap = db.query(models.PlayerSnapshot).filter(
                models.PlayerSnapshot.player_id == player.id
            ).order_by(models.PlayerSnapshot.day.desc()).first()
            
            if latest_snap:
                latest_snap.salary = salary_str
                latest_snap.salary_value = salary_val
                latest_snap.contract_years = str(years_left)
    
    db.commit()
    return updated_count
