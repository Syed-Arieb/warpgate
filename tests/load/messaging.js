import { check } from 'k6';
import http from 'k6/http';
import { sleep } from 'k6';

export let options = {
  stages: [
    { duration: '1m', target: 10 },
    { duration: '2m', target: 10 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'],
    http_req_failed: ['rate<0.10'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const API_KEY = __ENV.API_KEY || '';

export default function () {
  if (!API_KEY) {
    return;
  }

  const headers = {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY,
  };

  const sessionsRes = http.get(`${BASE_URL}/api/sessions`, { headers });
  check(sessionsRes, {
    'list sessions status 200': (r) => r.status === 200,
  });

  sleep(1);
}
