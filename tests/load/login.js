import { check } from 'k6';
import http from 'k6/http';

export let options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '1m', target: 20 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.05'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

export default function () {
  const payload = JSON.stringify({
    email: `user-${__VU}-${Date.now()}@test.com`,
    password: 'testpassword123',
    name: `Test User ${__VU}`,
  });

  const headers = { 'Content-Type': 'application/json' };
  const res = http.post(`${BASE_URL}/api/auth/register`, payload, { headers });

  check(res, {
    'register status 201': (r) => r.status === 201,
    'has access_token': (r) => r.json('access_token') !== undefined,
  });

  if (res.status === 201) {
    const token = res.json('access_token');
    const authHeaders = {
      ...headers,
      Authorization: `Bearer ${token}`,
    };

    const sessionRes = http.post(
      `${BASE_URL}/api/sessions`,
      JSON.stringify({ name: `Session-${__VU}` }),
      { headers: authHeaders }
    );

    check(sessionRes, {
      'create session status 201': (r) => r.status === 201,
    });

    const meRes = http.get(`${BASE_URL}/api/users/me`, { headers: authHeaders });
    check(meRes, {
      'get me status 200': (r) => r.status === 200,
    });
  }
}
