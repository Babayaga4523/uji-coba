// Load env hanya di dev (biar .env lokal nggak override env Railway)
if (process.env.NODE_ENV !== 'production') require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const sequelize = require('./config/database');
const { init } = require('./utils/socket');

const app = express();

// ===== CORS =====
/**
 * Set di Railway → Variables:
 * FRONTEND_URL=https://rental-mobil-ruby.vercel.app
 * (opsional) FRONTEND_URL_PREVIEW_REGEX=\.vercel\.app$
 * (opsional) FRONTEND_URL_LOCAL=http://localhost:3001
 */
const allowList = [
  process.env.FRONTEND_URL,                       // prod vercel
  process.env.FRONTEND_URL_LOCAL,                 // lokal
].filter(Boolean);

const previewRegex = process.env.FRONTEND_URL_PREVIEW_REGEX
  ? new RegExp(process.env.FRONTEND_URL_PREVIEW_REGEX)
  : /\.vercel\.app$/; // default: semua preview vercel

app.use(cors({
  origin(origin, cb) {
    // izinkan tools tanpa origin (Postman/cURL)
    if (!origin) return cb(null, true);
    const ok = allowList.includes(origin) || previewRegex.test(origin);
    cb(ok ? null : new Error('Not allowed by CORS'), ok);
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','X-Requested-With']
}));
app.options('*', cors());

// (opsional) kalau pakai cookie/session di proxy
app.set('trust proxy', 1);

// ===== Static uploads =====
const uploadDir = path.join(__dirname, 'uploads/payment_proofs');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
app.use('/uploads', express.static('uploads'));

// ===== Parsers =====
app.use(express.json());

// ===== Routes =====
app.use('/api/layanan', require('./routes/layanan'));
app.use('/api/testimoni', require('./routes/testimoni'));
app.use('/api/auth', require('./routes/authRoute'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/users', require('./routes/userRoute'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/payment', require('./routes/paymentRoutes'));

app.get('/', (_, res) => res.send('Rental Mobil API is running'));

// ===== HTTP server & Socket.IO (PAKAI SATU SERVER SAJA) =====
const server = http.createServer(app);
const io = init(server, {
  cors: {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      const ok = allowList.includes(origin) || previewRegex.test(origin);
      cb(ok ? null : new Error('Not allowed by CORS'), ok);
    },
    credentials: true,
    methods: ['GET', 'POST']
  }
});
app.set('io', io);

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  socket.on('disconnect', () => console.log('User disconnected:', socket.id));
});

// ===== Boot =====
(async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connected successfully');

    // HATI-HATI di production; kalau perlu matikan alter:
    await sequelize.sync({ alter: false });
    console.log('Database synced');

    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
      console.log(`Server listening on :${PORT}`);
    });
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    process.exit(1);
  }
})();
