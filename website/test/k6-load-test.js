import http from 'k6/http';
import { sleep, check } from 'k6';

export const options = {
  vus: 100,
  duration: '1m',
};

export default function () {
  // Website Pages
  const resWeb = http.get('http://localhost:8080');
  check(resWeb, {
    'web status is 200': (r) => r.status === 200,
  });

  // App Simulated API traffic
  const resApp = http.get('http://localhost:8080/app.js');
  check(resApp, {
    'app asset status is 200': (r) => r.status === 200,
  });

  sleep(0.1);
}
