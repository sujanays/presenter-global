import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { env } from './config/env.js';
import { registerSocketHandlers } from './sockets/socketHandler.js';
import { getDbPool, query } from './config/db.js';
import { getRedisClient, getRedisPubSub } from './config/redis.js';
import { createAdapter } from '@socket.io/redis-adapter';
import authRoutes from './routes/authRoutes.js';
import deviceRoutes from './routes/deviceRoutes.js';

const app = express();
const httpServer = createServer(app);

// CORS config
app.use(cors({
  origin: [env.CLIENT_URL, 'http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
}));

app.use(express.json());

// API versioning v1 mounts
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/devices', deviceRoutes);


// Basic API Routes
app.get('/health', async (req, res) => {
  let dbStatus = 'disconnected';
  let redisStatus = 'disconnected';

  try {
    const dbTest = await query('SELECT NOW()');
    if (dbTest && dbTest.rows.length > 0) {
      dbStatus = 'connected';
    }
  } catch (e) {
    dbStatus = 'error (using fallback/offline mode)';
  }

  try {
    const redis = getRedisClient();
    if (redis && redis.status === 'ready') {
      redisStatus = 'connected';
    }
  } catch (e) {
    redisStatus = 'offline';
  }

  res.json({
    status: 'ok',
    uptime: process.uptime(),
    db: dbStatus,
    redis: redisStatus,
    timestamp: new Date().toISOString(),
  });
});

// Configure Socket.IO Server
const io = new Server(httpServer, {
  cors: {
    origin: '*', // Allow connections from all devices
    methods: ['GET', 'POST'],
  },
  pingInterval: 10000,
  pingTimeout: 5000,
});

// Horizontal Scale Adaption if Redis is connected
const setupRedisAdapter = () => {
  const { pub, sub } = getRedisPubSub();
  if (pub && sub) {
    let attached = false;
    const attach = () => {
      if (attached) return;
      if (pub.status === 'ready' && sub.status === 'ready') {
        try {
          io.adapter(createAdapter(pub, sub));
          attached = true;
          console.log('Socket.IO successfully attached Redis scaling adapter.');
        } catch (e) {
          console.warn('Could not attach Redis scaling adapter, running on local memory adapter.');
        }
      }
    };

    if (pub.status === 'ready' && sub.status === 'ready') {
      attach();
    } else {
      pub.on('ready', attach);
      sub.on('ready', attach);
      
      pub.on('error', (err: any) => {
        console.warn('Redis scaling adapter pub client offline. Keeping local memory adapter.');
      });
      sub.on('error', (err: any) => {
        console.warn('Redis scaling adapter sub client offline. Keeping local memory adapter.');
      });
    }
  }
};

// Database schema auto-creation
const initDatabase = async () => {
  const schemaDDL = `
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS devices (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        device_uid VARCHAR(255) UNIQUE NOT NULL,
        device_name VARCHAR(100) NOT NULL,
        device_type VARCHAR(50) NOT NULL, -- 'desktop', 'mobile'
        os_name VARCHAR(50),
        os_version VARCHAR(50),
        push_token VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS trusted_pairs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        desktop_device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
        mobile_device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
        pair_name VARCHAR(100) DEFAULT 'Trusted Mobile Remote',
        auth_secret VARCHAR(255) NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        last_used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_desktop_mobile_pair UNIQUE(desktop_device_id, mobile_device_id)
    );

    CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        desktop_device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
        session_token VARCHAR(255) UNIQUE NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        ended_at TIMESTAMP WITH TIME ZONE
    );

    CREATE TABLE IF NOT EXISTS websocket_connections (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        socket_id VARCHAR(100) UNIQUE NOT NULL,
        device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
        server_node_id VARCHAR(100) NOT NULL,
        connected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        last_ping_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        event_type VARCHAR(100) NOT NULL,
        ip_address VARCHAR(45),
        user_agent VARCHAR(255),
        payload JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await query(schemaDDL);
    console.log('PostgreSQL database schemas verified & created successfully.');
  } catch (error) {
    console.warn('PostgreSQL initialization warning: database offline. Using memory fallback operations.');
  }
};

const startServer = async () => {
  setupRedisAdapter();
  registerSocketHandlers(io);
  await initDatabase();

  httpServer.listen(env.PORT, () => {
    console.log(`====================================================`);
    console.log(`Presenter Server running on port ${env.PORT} in ${env.NODE_ENV} mode.`);
    console.log(`WebSocket Server active.`);
    console.log(`====================================================`);
  });
};

startServer().catch((error) => {
  console.error('Fatal startup error in Presenter server:', error);
});
