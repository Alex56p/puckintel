from sqlalchemy import create_engine, text
import os

# Data gathered via search
SALARY_DATA = {
    # Star Batches
    "Connor McDavid": ("$12,500,000", "2026"),
    "Leon Draisaitl": ("$8,500,000", "2025"),
    "Auston Matthews": ("$13,250,000", "2028"),
    "Nathan MacKinnon": ("$12,600,000", "2031"),
    "Nikita Kucherov": ("$9,500,000", "2027"),
    "Cale Makar": ("$9,000,000", "2027"),
    "Quinn Hughes": ("$7,850,000", "2027"),
    "Igor Shesterkin": ("$5,666,667", "2025"),
    "Andrei Vasilevskiy": ("$9,500,000", "2028"),
    "Sidney Crosby": ("$8,700,000", "2027"),
    "Alex Ovechkin": ("$9,500,000", "2026"),
    "Jason Robertson": ("$7,750,000", "2026"),
    "Jack Hughes": ("$8,000,000", "2030"),
    "Elias Pettersson": ("$11,600,000", "2032"),
    "Matthew Tkachuk": ("$9,500,000", "2030"),
    "Artemi Panarin": ("$11,642,857", "2026"),
    "David Pastrnak": ("$11,250,000", "2031"),
    "Mitch Marner": ("$10,903,000", "2025"),
    "Mikko Rantanen": ("$9,250,000", "2025"),
    "Adam Fox": ("$9,500,000", "2029"),
    "Roman Josi": ("$9,059,000", "2028"),
    "Victor Hedman": ("$7,875,000", "2025"),
    "Erik Karlsson": ("$11,500,000", "2027"),
    "Sebastian Aho": ("$9,750,000", "2032"),
    "Connor Hellebuyck": ("$8,500,000", "2031"),
    "Jake Oettinger": ("$4,000,000", "2025"),
    "Kirill Kaprizov": ("$9,000,000", "2026"),
    "Jack Eichel": ("$10,000,000", "2026"),
    "Brayden Point": ("$9,500,000", "2030"),
    "William Nylander": ("$11,500,000", "2032"),
    "Jake Guentzel": ("$9,000,000", "2031"),
    "Sam Reinhart": ("$8,625,000", "2032"),
    "Filip Forsberg": ("$8,500,000", "2030"),
    "J.T. Miller": ("$8,000,000", "2030"),
    "Roope Hintz": ("$8,450,000", "2031"),
    "Mika Zibanejad": ("$8,500,000", "2030"),
    "Seth Jones": ("$9,500,000", "2030"),
    "Dougie Hamilton": ("$9,000,000", "2028"),
    "Rasmus Dahlin": ("$11,000,000", "2032"),
    "Moritz Seider": ("$8,550,000", "2031"),
    "Brock Faber": ("$925,000", "2025"),
    "Luke Hughes": ("$925,000", "2026"),
    "Lane Hutson": ("$925,000", "2026"),
    "Macklin Celebrini": ("$950,000", "2027"),
    "Connor Bedard": ("$950,000", "2026"),
    "Matvei Michkov": ("$950,000", "2027"),
    "Will Smith": ("$950,000", "2027"),
    "Cutter Gauthier": ("$950,000", "2026"),
    "Logan Stankoven": ("$814,167", "2025"),
    "Ivan Demidov": ("$940,833", "2027"),
    "John Tavares": ("$11,000,000", "2025"),
    "Brad Marchand": ("$6,125,000", "2025"),
    "Cole Caufield": ("$7,850,000", "2031"),
    "Chris Kreider": ("$6,500,000", "2027"),
    "Bo Horvat": ("$8,500,000", "2031"),
    "Brady Tkachuk": ("$8,205,714", "2028"),
    "Clayton Keller": ("$7,150,000", "2028"),
    "Mikhail Sergachev": ("$8,500,000", "2031"),
    "Noah Dobson": ("$4,000,000", "2025"),
    "Owen Power": ("$8,350,000", "2031"),
    "Juraj Slafkovsky": ("$7,600,000", "2032"),
    "Tim Stutzle": ("$8,350,000", "2031"),
    "Dylan Cozens": ("$7,100,000", "2030"),
    "Matt Boldy": ("$7,000,000", "2030"),
    "Wyatt Johnston": ("$894,167", "2025"),
    "Cole Perfetti": ("$3,250,000", "2026"),
    "Thomas Harley": ("$4,000,000", "2026"),

    # Search Batch 1
    "Brent Burns": ("$5,280,000", "2025"),
    "Evgeni Malkin": ("$6,100,000", "2026"),
    "Kris Letang": ("$6,100,000", "2028"),
    "Jamie Benn": ("$9,500,000", "2025"),
    "Steven Stamkos": ("$8,000,000", "2028"),
    "John Carlson": ("$8,000,000", "2026"),
    "Nazem Kadri": ("$7,000,000", "2029"),
    "Mark Stone": ("$9,500,000", "2027"),
    "Sergei Bobrovsky": ("$10,000,000", "2026"),
    "Scott Wedgewood": ("$1,500,000", "2026"),
    "Dmitry Orlov": ("$7,750,000", "2025"),
    "Justin Faulk": ("$6,500,000", "2027"),
    "Brock Nelson": ("$6,000,000", "2025"),
    "Frederik Andersen": ("$3,400,000", "2025"),
    "Ryan Nugent-Hopkins": ("$5,125,000", "2029"),
    "Mark Scheifele": ("$8,500,000", "2031"),
    "Vincent Trocheck": ("$5,625,000", "2029"),
    "Bryan Rust": ("$5,125,000", "2028"),
    "Darcy Kuemper": ("$5,250,000", "2027"),
    "Tom Wilson": ("$6,500,000", "2031"),

    # Search Batch 2
    "Jacob Trouba": ("$8,000,000", "2026"),
    "Tomas Hertl": ("$8,137,500", "2030"),
    "Mike Matheson": ("$4,875,000", "2026"),
    "Shayne Gostisbehere": ("$3,200,000", "2027"),
    "Darnell Nurse": ("$9,250,000", "2030"),
    "Josh Morrissey": ("$6,250,000", "2028"),
    "Artturi Lehkonen": ("$4,500,000", "2027"),
    "Shea Theodore": ("$5,200,000", "2025"),
    "Carter Verhaeghe": ("$4,166,667", "2025"),
    "MacKenzie Weegar": ("$6,250,000", "2031"),
    "Anthony Stolarz": ("$2,500,000", "2026"),
    "Kevin Fiala": ("$7,875,000", "2029"),
    "Dylan Larkin": ("$8,700,000", "2031"),
    "Alex Tuch": ("$4,750,000", "2026"),
    "Nick Schmaltz": ("$5,850,000", "2026"),
    "Adrian Kempe": ("$5,500,000", "2026"),
    "Ivan Barbashev": ("$5,000,000", "2028"),
    "Brandon Montour": ("$7,142,857", "2031"),
    "Darren Raddysh": ("$975,000", "2026"),
    "Jake Walman": ("$3,400,000", "2026"),
    "Ilya Sorokin": ("$8,250,000", "2032"),
    "Kyle Connor": ("$7,142,857", "2026"),
    "Zach Werenski": ("$9,583,333", "2028"),
    "Timo Meier": ("$8,800,000", "2031"),
    "Travis Konecny": ("$5,500,000", "2025"),
    "Joel Eriksson Ek": ("$5,250,000", "2029"),
    "Mackenzie Blackwood": ("$2,350,000", "2025"),
    "Rasmus Andersson": ("$4,550,000", "2026"),
    "Karel Vejmelka": ("$2,725,000", "2025"),
    "Charlie McAvoy": ("$9,500,000", "2030"),
    "Jakob Chychrun": ("$4,600,000", "2025"),
    "Tage Thompson": ("$7,142,857", "2030"),
    "Alex DeBrincat": ("$7,875,000", "2027"),
    "Brandon Hagel": ("$6,500,000", "2032"),
    "Miro Heiskanen": ("$8,450,000", "2029"),
    "Nico Hischier": ("$7,250,000", "2027"),
    "Martin Necas": ("$6,500,000", "2026"),
    "Nick Suzuki": ("$7,875,000", "2030"),
    "Morgan Geekie": ("$2,000,000", "2025"),
    "Stuart Skinner": ("$2,600,000", "2026"),
    
    # Missing Batch 3
    "Jesper Bratt": ("$7,875,000", "2031"),
    "Drake Batherson": ("$4,975,000", "2027"),
    "Filip Gustavsson": ("$3,750,000", "2026"),
    "Logan Thompson": ("$766,667", "2025"),
    "Evan Bouchard": ("$3,900,000", "2025"),
    "Kiefer Sherwood": ("$1,500,000", "2026"),
    "Trevor Zegras": ("$5,750,000", "2026"),
    "Spencer Knight": ("$4,500,000", "2026"),
    "Pyotr Kochetkov": ("$2,000,000", "2027"),
    "Jackson LaCombe": ("$925,000", "2026"),
    "Pavel Dorofeyev": ("$1,835,000", "2026"),
    "Akira Schmid": ("$875,000", "2026"),
    "Aliaksei Protas": ("$3,375,000", "2029"),
    "Dustin Wolf": ("$850,000", "2026"),
    "Kirill Marchenko": ("$3,850,000", "2027"),
    "Lucas Raymond": ("$8,075,000", "2032"),
    "Jake Sanderson": ("$8,050,000", "2032"),
    "Jamie Drysdale": ("$2,300,000", "2026"),
    "Yaroslav Askarov": ("$925,000", "2025"),
    "Anton Lundell": ("$5,000,000", "2030"),
    "Seth Jarvis": ("$7,420,000", "2032"),
    "Mason Lohrei": ("$925,000", "2025"),
    "Kent Johnson": ("$1,800,000", "2027"),
    "Simon Edvinsson": ("$925,000", "2025"),
    "Brandt Clarke": ("$863,333", "2026"),
    "Dylan Guenther": ("$7,143,000", "2032"),
    "Zack Bolduc": ("$925,000", "2026"),
    "Jesper Wallstedt": ("$925,000", "2026"),
    "Matthew Knies": ("$925,000", "2025"),
    "Jet Greaves": ("$812,500", "2026"),
    "Logan Cooley": ("$950,000", "2026"),
    "Frank Nazar": ("$950,000", "2027"),
    "Sam Rinzel": ("$950,000", "2027"),
    "Adam Fantilli": ("$950,000", "2026"),
    "Leo Carlsson": ("$950,000", "2026"),

    # Final Special Batch
    "Morgan Rielly": ("$7,500,000", "2030"),
    "Jakub Dobes": ("$965,000", "2027"),
    "Maveric Lamoureux": ("$886,667", "2027"),
    "Ryan Leonard": ("$950,000", "2027"),
    "Alexander Nikishin": ("$925,000", "2026"),
    "Zeev Buium": ("$966,500", "2027"),
    "Artyom Levshunov": ("$975,000", "2027"),
    "Beckett Sennecke": ("$942,500", "2028"),
    "Matthew Schaefer": ("$975,000", "2028"),
}

def sync(existing_engine=None):
    # Use provided engine or create new one
    if existing_engine:
        engine = existing_engine
    else:
        # Use DATABASE_URL from environment, default to local sqlite
        url = os.getenv("DATABASE_URL", "sqlite:///./backend/fantasy_pool.db")
        # Fix for postgres driver if using old style 'postgres://'
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)
        engine = create_engine(url)
    
    count = 0
    # If existing_engine is passed, we might be inside a transaction or not.
    # To be safe and simple, we'll just connect. 
    # If it's the main app's engine, we can use it directly.
    
    try:
        with engine.connect() as conn:
            # If using an engine that requires explicit transactions (like some Postgres configs), we might need .begin()
            # But engine.begin() is usually safer.
            pass
            
        with engine.begin() as conn:
            for name, (salary_str, expires) in SALARY_DATA.items():
                salary_val = 0.0
                try:
                    if salary_str and salary_str != "N/A":
                        salary_val = float(salary_str.replace("$", "").replace(",", ""))
                except:
                    pass

                # Update players table
                res = conn.execute(
                    text('UPDATE players SET salary = :s, salary_value = :sv, contract_years = :c WHERE "fullName" = :n'),
                    {"s": salary_str, "sv": salary_val, "c": expires, "n": name}
                )
                
                if res.rowcount > 0:
                    count += 1
                    # Update latest snapshot
                    conn.execute(
                        text("""
                            UPDATE player_snapshots 
                            SET salary = :s, salary_value = :sv, contract_years = :c 
                            WHERE player_id = (SELECT id FROM players WHERE "fullName" = :n) 
                            AND day = (SELECT MAX(day) FROM player_snapshots)
                        """),
                        {"s": salary_str, "sv": salary_val, "c": expires, "n": name}
                    )

        print(f"Successfully updated salary data for {count} players.")
    except Exception as e:
        print(f"Error syncing salaries: {e}")
        # If we didn't pass an engine, we created it, so maybe dispos? 
        # But create_engine doesn't need explicit close usually.

if __name__ == "__main__":
    sync()
