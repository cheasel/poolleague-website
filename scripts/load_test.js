import http from 'k6/http';
import { sleep, check } from 'k6';

// 1. Load profile configurations (Ramp up virtual users, hold, then ramp down)
export const options = {
  stages: [
    { duration: '15s', target: 10 },  // Ramp up to 10 concurrent users
    { duration: '30s', target: 30 },  // Ramp up to 30 concurrent users
    { duration: '30s', target: 30 },  // Hold at 30 users for stable load analysis
    { duration: '15s', target: 0 },   // Ramp down to 0 users
  ],
  thresholds: {
    // We expect the HTTP error rate to be less than 1%
    http_req_failed: ['rate<0.01'],
    // 95% of requests should complete under 400ms (given local revalidation/caching)
    http_req_duration: ['p(95)<400'],
  },
};

// 2. User Scenario definition
export default function () {
  const BASE_URL = 'http://localhost:3000';

  // Session headers simulating browser traffic
  const params = {
    headers: {
      'User-Agent': 'k6-Load-Generator-Agent',
    },
  };

  // Phase 1: Visit Home page
  const homeRes = http.get(BASE_URL, params);
  check(homeRes, {
    'Home loads with 200': (r) => r.status === 200,
  });
  sleep(1);

  // Phase 2: Visit League Standings (Heavy page utilizing unstable_cache)
  const standingsRes = http.get(`${BASE_URL}/standings`, params);
  check(standingsRes, {
    'Standings loads with 200': (r) => r.status === 200,
  });
  sleep(1.5);

  // Phase 3: Visit Team Stats (Our newly created page with caching)
  const teamsRes = http.get(`${BASE_URL}/teams`, params);
  check(teamsRes, {
    'Team Stats loads with 200': (r) => r.status === 200,
  });
  sleep(1);

  // Phase 4: Visit Player Stats page
  const playersRes = http.get(`${BASE_URL}/players`, params);
  check(playersRes, {
    'Player Stats loads with 200': (r) => r.status === 200,
  });
  sleep(1.5);

  // Phase 5: Visit Matches/Fixtures Schedule timeline
  const matchesRes = http.get(`${BASE_URL}/matches`, params);
  check(matchesRes, {
    'Matches loads with 200': (r) => r.status === 200,
  });
  sleep(2);
}
