# PUCKINTEL: NHL Fantasy Analytics Hub

A full-stack application to track, analyze, and visualize your ESPN Fantasy NHL pool.

## Features
- **Data Sync**: Automatically fetches League Standings, Team Stats, and Free Agents from ESPN.
- **Analysis**: Suggests pickups based on free agent performance.
- **Visualization**: Modern Dashboard with graphs and stats.
- **History**: Stores data in PostgreSQL for historical trend analysis.

## Setup & Deployment

### Prerequisites
- Docker & Docker Compose
- ESPN Fantasy League ID (Visible in your league URL)
- (For Private Leagues) `swid` and `espn_s2` cookies.

### Getting Credentials
1. Login to ESPN Fantasy in your browser.
2. Open Developer Tools (F12) -> Application -> Cookies.
3. Look for `swid` (including `{}`) and `espn_s2`.

### Configuration
Create a `.env` file or set environment variables in Portainer:

```env
PORT=5173
LEAGUE_ID=12345678
LEAGUE_YEAR=2025
SWID={your_swid}
ESPN_S2=your_long_string
# Database will auto-initialize in Docker
```

### Deployment (Home Lab / Portainer)

1. **Build the images locally**:
   ```bash
   docker-compose -f docker-compose.build.yml build
   ```

2. **Run the stack**:
   ```bash
   docker-compose up -d
   ```

*Note: The images are tagged as `puckintel_backend:latest` and `puckintel_frontend:latest`. If you use a private registry, update the `image:` tags in `docker-compose.yml` accordingly.*

## Architecture
- **Frontend**: React (Vite) + Nginx (Production Build).
- **Backend**: FastAPI (Python) + PostgreSQL.
- **Database**: PostgreSQL 15 (with data persistence).
