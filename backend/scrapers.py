import requests
import re
import json
import logging

logger = logging.getLogger(__name__)

def fetch_cbs_injuries():
    """
    Scrapes CBS Sports NHL injury report for expected return dates.
    Returns a dict: { "FullName": "Injury Detail" }
    """
    url = "https://www.cbssports.com/nhl/injuries/"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    
    try:
        logger.info(f"Fetching injuries from {url}")
        resp = requests.get(url, headers=headers, timeout=15)
        if resp.status_code != 200:
            logger.error(f"Failed to fetch CBS injuries: {resp.status_code}")
            return {}
            
        html = resp.text
        # Extract rows
        rows = re.findall(r'<tr class="TableBase-bodyTr">.*?</tr>', html, re.DOTALL)
        
        injury_map = {}
        for row in rows:
            try:
                # Name is in CellPlayerName--long
                name_match = re.search(r'<span class="CellPlayerName--long">.*?<a.*?>([^<]+)</a>', row, re.DOTALL)
                if not name_match: continue
                name = name_match.group(1).strip()
                
                # Tds: 0-Name, 1-Pos, 2-Date, 3-Injury, 4-Status/Return
                tds = re.findall(r'<td class="TableBase-bodyTd[^"]*".*?>(.*?)</td>', row, re.DOTALL)
                
                if len(tds) >= 5:
                    ret_status = re.sub(r'<[^>]+>', '', tds[4]).strip()
                    # Clean up multiple spaces/newlines
                    ret_status = " ".join(ret_status.split())
                    injury_map[name] = ret_status
            except:
                continue
                
        logger.info(f"Successfully scraped {len(injury_map)} injuries from CBS")
        return injury_map
        
    except Exception as e:
        logger.error(f"Scraper error: {e}")
        return {}
