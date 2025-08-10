require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const sequelize = require("./config/database");
const db = {};
const app = express();
const server = http.createServer(app);
const { init } = require('./utils/socket');

// Setup CORS sesuai kebutuhan frontend
const io = init(server, {
  cors: {
    origin: "http://localhost:3001", // ganti sesuai frontend
    methods: ["GET", "POST"]
  }
});

// Buat folder uploads/payment_proofs jika belum ada
const uploadDir = path.join(__dirname, "uploads/payment_proofs");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log("Folder uploads/payment_proofs dibuat.");
}

Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

// Middleware
app.use(express.json());
app.use(cors({
  origin: "http://localhost:3001", // atau sesuai URL frontend
  credentials: true
}));
app.use('/uploads', express.static('uploads'));

// Import routes
const orderRoutes = require("./routes/orderRoutes");
const layananRoutes = require("./routes/layanan");
const testimoniRoutes = require("./routes/testimoni");
const authRoutes = require("./routes/authRoute");
const userRoutes = require("./routes/userRoute");
const notificationRoutes = require('./routes/notificationRoutes');
const paymentRoutes = require('./routes/paymentRoutes');



// Gunakan route
app.use("/api/layanan", layananRoutes);
app.use("/api/testimoni", testimoniRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/users", userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/payment', paymentRoutes);


// Tes koneksi
app.get("/", (req, res) => {
  res.send("Rental Mobil API is running");
});

// Simpan io di app agar bisa diakses di controller
app.set("io", io);

// Contoh event koneksi
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// CORS configuration
const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL,   // domain utama frontend
  /\.vercel\.app$/            // preview Vercel
];

app.use(cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true); // allow Postman/cURL
    const ok = ALLOWED_ORIGINS.some(r =>
      r instanceof RegExp ? r.test(origin) : r === origin
    );
    cb(ok ? null : new Error('Not allowed by CORS'), ok);
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','X-Requested-With']
}));
app.options('*', cors()); // handle preflight

// Jalankan server dan koneksi database
(async () => {
  try {
    await sequelize.authenticate();
    console.log("Database connected successfully");

    // Sinkronisasi model
    await sequelize.sync({ alter: true });
    console.log("Database synced");

    // Jalankan server
    const PORT = process.env.PORT || 3000;
    const server = app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Unable to connect to the database:", error);
    process.exit(1);
  }
})();
