# XI Genius — Lineup Prediction MVP

Mobile-first Next.js prototype for a football starting XI prediction game.

## What works now

- Premier League match list from 433 API
- Match detail page from 433 event detail API
- Club logos via `https://media.prod.by433.com/media/logos/club/[id].png`
- Player images via `https://media.prod.by433.com/media/logos/player/[playerId].png`
- Official lineup status from event detail
- Full club player list from team detail endpoint
- Local prototype lineup picker with 11-player selection and broad roles: `GK / DEF / MID / FWD`
- Scoring helper for `+2 / +1 / -1` rules

## Run locally

```bash
npm install
npm run dev
```

Open:

```txt
http://localhost:3000
```

Useful demo URLs:

```txt
/                         # Match list
/matches/4813374          # Finished match with confirmed lineups
/matches/4813374/pick?teamId=8650
```

## Data source

```txt
Match schedule:
https://matchdata.prod.by433.com/events/bytournamenttemplateround?tournamentStageId=900326

Event detail / lineup:
https://matchdata.prod.by433.com/event/[eventId]?details=True

Team detail / squad:
https://matchdata.prod.by433.com/team/[teamId]?details=True

Club logo:
https://media.prod.by433.com/media/logos/club/[id].png

Player image:
https://media.prod.by433.com/media/logos/player/[playerId].png
```

## Next build steps

1. Add Supabase schema
2. Add guest profile/session
3. Persist rooms and predictions
4. Import/merge rosters from historical lineups
5. Store official lineups and calculate leaderboard
6. Add admin fallback for roster/lineup corrections
