from espn_api.hockey import League
import requests
import json
import os
import logging

logger = logging.getLogger(__name__)

class FantasyClient:
    def __init__(self, league_id=None, year=None, swid=None, espn_s2=None):
        self.league_id = league_id or int(os.getenv("LEAGUE_ID", 0))
        self.year = year or int(os.getenv("LEAGUE_YEAR", 2025))
        self.swid = swid or os.getenv("SWID")
        self.espn_s2 = espn_s2 or os.getenv("ESPN_S2")
        self.league = None

    def connect(self):
        try:
            self.league = League(
                league_id=self.league_id,
                year=self.year,
                espn_s2=self.espn_s2,
                swid=self.swid
            )
            logger.info("Connected to ESPN League: %s", self.league)
            return True
        except Exception as e:
            logger.error(f"Failed to connect to ESPN League: {e}")
            return False

    def get_free_agents(self, size=50):
        if not self.league: self.connect()
        return self.league.free_agents(size=size)

    def get_standings(self):
        if not self.league: self.connect()
        return self.league.standings()

    def get_team_by_id(self, team_id):
        if not self.league: self.connect()
        # Find team in list
        for team in self.league.teams:
            if team.team_id == team_id:
                return team
        return None

    def fetch_scoring_settings(self):
        """
        Fetches the raw scoring settings from the ESPN API since the library doesn't expose them fully for Hockey.
        Returns a dict mapping Stat keys (e.g., 'G', 'A') to Point values (e.g., 3.0, 2.0).
        """
        try:
            url = f"https://lm-api-reads.fantasy.espn.com/apis/v3/games/fhl/seasons/{self.year}/segments/0/leagues/{self.league_id}?view=mSettings"
            cookies = {"swid": self.swid, "espn_s2": self.espn_s2}
            resp = requests.get(url, cookies=cookies)
            resp.raise_for_status()
            data = resp.json()
            
            # Map of Stat ID to Stat Name (based on espn_api constants)
            # We map string keys to what our model uses
            ID_MAP = {
                13: 'G', 14: 'A', 15: '+/-', 17: 'PIM',
                18: 'PPG', 19: 'PPA', 20: 'SHG', 21: 'SHA',
                22: 'GWG', 29: 'SOG', 31: 'HIT', 32: 'BLK',
                38: 'PPP', 39: 'SHP',
                1: 'W', 2: 'L', 6: 'SV', 7: 'SO', 9: 'OTL'
            }
            
            scoring_map = {}
            if 'settings' in data and 'scoringSettings' in data['settings']:
                items = data['settings']['scoringSettings'].get('scoringItems', [])
                for item in items:
                    stat_id = item.get('statId')
                    points = item.get('points')
                    if stat_id in ID_MAP and points != 0:
                        scoring_map[ID_MAP[stat_id]] = points
                        
            logger.info(f"Fetched scoring settings: {scoring_map}")
            return scoring_map
        except Exception as e:
            logger.error(f"Error fetching scoring settings: {e}")
            return {}

    def fetch_ownership(self):
        """
        Fetches ownership percentages for players from the league-specific API.
        Returns a dict: { playerId: percentOwned }
        """
        try:
            # Using the league-specific endpoint with a larger limit to cover more free agents
            url = f"https://lm-api-reads.fantasy.espn.com/apis/v3/games/fhl/seasons/{self.year}/segments/0/leagues/{self.league_id}?view=kona_player_info"
            
            # Add a filter to get more players (default limit is often 50)
            filter_obj = {"players": {"limit": 1000, "sortPercOwned": {"sortPriority": 1, "sortAsc": False}}}
            headers = {"x-fantasy-filter": json.dumps(filter_obj)}
            
            cookies = {"swid": self.swid, "espn_s2": self.espn_s2}
            resp = requests.get(url, cookies=cookies, headers=headers)
            resp.raise_for_status()
            data = resp.json()
            
            ownership_map = {}
            players_list = data.get('players', [])
            
            for p_wrapper in players_list:
                p = p_wrapper.get('player', {})
                pid = p.get('id')
                owner_data = p.get('ownership', {})
                percent = owner_data.get('percentOwned', 0)
                if pid:
                    ownership_map[pid] = percent
            
            logger.info(f"Fetched ownership data for {len(ownership_map)} players")
            return ownership_map
        except Exception as e:
            logger.error(f"Error fetching ownership: {e}")
            return {}
