const io = require('socket.io-client');
const http = require('http');

const BACKEND_URL = 'http://localhost:3001';
const SOCKET_URL = 'http://localhost:3001';
const TEST_DESKTOP_ID = 'test_desktop_123';

function makeRequest(path, method, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BACKEND_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', (err) => reject(err));
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING SECURITY E2E VERIFICATION ---');

  // Test 1: Connect and join session WITHOUT a token
  console.log('\n[Test 1] Attempting unauthenticated mobile socket join...');
  await new Promise((resolve) => {
    const socket = io(SOCKET_URL, { forceNew: true, reconnection: false });
    
    socket.on('connect', () => {
      console.log('Socket connected. Sending SESSION_JOIN with no token...');
      socket.emit('SESSION_JOIN', {
        deviceId: TEST_DESKTOP_ID,
        role: 'mobile'
      });
    });

    socket.on('error', (err) => {
      console.log('Success: Received expected socket error:', err);
    });

    socket.on('disconnect', (reason) => {
      console.log('Success: Socket disconnected by server (reason:', reason + ')');
      resolve();
    });

    socket.on('SESSION_JOINED', (data) => {
      console.error('FAIL: Unauthenticated socket joined successfully!', data);
      process.exit(1);
    });

    // Timeout safety
    setTimeout(() => {
      socket.disconnect();
      resolve();
    }, 3000);
  });

  // Test 2: Connect and join session with an INVALID token
  console.log('\n[Test 2] Attempting mobile socket join with an invalid JWT...');
  await new Promise((resolve) => {
    const socket = io(SOCKET_URL, { forceNew: true, reconnection: false });
    
    socket.on('connect', () => {
      console.log('Socket connected. Sending SESSION_JOIN with invalid token...');
      socket.emit('SESSION_JOIN', {
        deviceId: TEST_DESKTOP_ID,
        role: 'mobile',
        token: 'invalid_jwt_signature_placeholder'
      });
    });

    socket.on('error', (err) => {
      console.log('Success: Received expected socket error:', err);
    });

    socket.on('disconnect', (reason) => {
      console.log('Success: Socket disconnected by server (reason:', reason + ')');
      resolve();
    });

    socket.on('SESSION_JOINED', (data) => {
      console.error('FAIL: Socket with invalid token joined successfully!', data);
      process.exit(1);
    });

    // Timeout safety
    setTimeout(() => {
      socket.disconnect();
      resolve();
    }, 3000);
  });

  // Test 3: Standard Auth Pairing flow
  console.log('\n[Test 3] Requesting a secure temporary pairing PIN from backend...');
  const reqRes = await makeRequest('/api/v1/devices/pair/request', 'POST', { deviceId: TEST_DESKTOP_ID });
  if (reqRes.status !== 200) {
    console.error('FAIL: Could not request pairing token:', reqRes.body);
    process.exit(1);
  }
  const pairingPin = reqRes.body.temporaryPairToken;
  console.log(`Success: Received pairing PIN: ${pairingPin}`);

  console.log('\nVerifying pairing PIN via REST API...');
  const verifyRes = await makeRequest('/api/v1/devices/pair/verify', 'POST', {
    token: pairingPin,
    mobileDeviceId: 'mock_mobile_device_999'
  });

  if (verifyRes.status !== 200) {
    console.error('FAIL: Verification rejected pairing PIN:', verifyRes.body);
    process.exit(1);
  }

  const jwtToken = verifyRes.body.accessToken;
  const verifiedDesktopId = verifyRes.body.deviceId;
  console.log(`Success: Pairing PIN verified! JWT Token received. Desktop target: ${verifiedDesktopId}`);

  console.log('\nConnecting mobile socket with valid JWT token...');
  await new Promise((resolve) => {
    const socket = io(SOCKET_URL, { forceNew: true, reconnection: false });
    
    socket.on('connect', () => {
      console.log('Socket connected. Sending SESSION_JOIN with valid token...');
      socket.emit('SESSION_JOIN', {
        deviceId: verifiedDesktopId,
        role: 'mobile',
        token: jwtToken
      });
    });

    socket.on('error', (err) => {
      console.error('FAIL: Received socket error with valid token:', err);
      process.exit(1);
    });

    socket.on('SESSION_JOINED', (data) => {
      console.log('Success: Mobile remote successfully paired and authorized!', data);
      socket.disconnect();
      resolve();
    });

    socket.on('disconnect', () => {
      resolve();
    });

    // Timeout safety
    setTimeout(() => {
      console.error('FAIL: Socket connection timed out');
      socket.disconnect();
      process.exit(1);
    }, 3000);
  });

  console.log('\n--- ALL SECURITY TESTS PASSED SUCCESSFULLY! ---');
  process.exit(0);
}

runTests().catch(err => {
  console.error('E2E Test harness failed with unexpected error:', err);
  process.exit(1);
});
