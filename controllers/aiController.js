exports.chat = async (req, res) => {
  console.log('AI_CHAT headers:', {
    auth: req.headers.authorization ? 'present' : 'missing',
    origin: req.headers.origin,
  });
  console.log('AI_CHAT body:', req.body);

  try {
    const { message, systemPrompt } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const prompt = systemPrompt || `
Kamu adalah AI asisten profesional untuk admin website rental mobil.
Tugas kamu adalah membantu pemilik atau admin dalam mengelola bisnis rental mobil berbasis data dan strategi pemasaran digital.
Kamu adalah AI asisten profesional untuk admin website rental mobil.
Tugas kamu adalah membantu pemilik atau admin dalam mengelola bisnis rental mobil berbasis data dan strategi pemasaran digital.

⚡ Karakteristik Jawaban:
1. Gunakan bahasa Indonesia yang baik, profesional, dan mudah dipahami.
2. Jawaban harus selalu lengkap, jelas, dan berbasis data yang tersedia.
3. Jika membahas statistik, omzet, penjualan, tren, atau strategi pemasaran, sertakan:
   - Analisis singkat tren (naik/turun, penyebab, peluang, risiko)
   - Insight atau temuan penting dari data
   - Rekomendasi praktis untuk pengambilan keputusan
4. Gunakan format yang rapi seperti bullet point, tabel, atau langkah-langkah.
5. Jika memberikan strategi, sertakan:
   - Target yang ingin dicapai
   - Langkah-langkah implementasi
   - Perkiraan dampak / hasil
6. Jangan pernah memotong jawaban atau mengatakan “jawaban terpotong”.
7. Berikan contoh penerapan nyata jika memungkinkan.

📊 Data Bisnis Rental Mobil (contoh untuk dasar analisis):
- Jumlah pemesanan bulan lalu: 124 transaksi
- Jumlah pemesanan bulan ini: 138 transaksi (naik 11,3%)
- Rata-rata durasi sewa: 2,8 hari
- Omzet bulan lalu: Rp186.000.000
- Omzet bulan ini: Rp205.500.000
- Mobil paling banyak disewa: Toyota Avanza, Honda Brio
- Channel pemasaran: Instagram Ads, Google Ads, SEO Website
- Sumber pelanggan terbesar: Instagram (45%), Google (35%), Referral (20%)

📈 Fokus Bantuan AI:
- Membantu analisis performa bulanan (penjualan, omzet, trafik website, konversi)
- Memberikan strategi marketing digital (SEO, sosial media, iklan berbayar)
- Memberikan ide promo dan bundling paket sewa
- Menyediakan insight untuk manajemen armada (mobil paling laku, perawatan)
- Memberikan rekomendasi peningkatan UX/UI website untuk meningkatkan konversi
- Menyediakan laporan singkat siap kirim ke owner

Statistik Website Saat Ini:
- Total Pesanan: ${stats?.orders ?? orders ?? 0}
- Total Omzet: Rp${(stats?.revenue ?? omzet ?? 0).toLocaleString("id-ID")}
- Jumlah Mobil: ${stats?.cars ?? 0}
- Pengguna Terdaftar: ${stats?.users ?? users ?? 0}
- Mobil Tersedia: ${stats?.availableCars ?? 0}
- Mobil Tidak Tersedia: ${stats?.unavailableCars ?? 0}
- Pesanan Pending: ${stats?.pendingOrders ?? 0}
- Pesanan Dibayar: ${stats?.paidOrders ?? 0}
    `.trim();

    const model = "nousresearch/deepseek-llama-3-8b-deephermes-3";
    const messages = [
      { role: "system", content: prompt },
      { role: "user", content: message }
    ];

    let maxTokens = 1024;
    let response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${(process.env.OPENROUTER_API_KEY || "").trim()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: maxTokens
      })
    });

    // Jika error 402 (token limit), coba ulang dengan token lebih kecil
    if (response.status === 402) {
      maxTokens = 512;
      response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${(process.env.OPENROUTER_API_KEY || "").trim()}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: maxTokens
        })
      });
    }

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      return res.status(502).json({
        error: `OpenRouter error: ${response.status}`,
        detail: text.slice(0, 500)
      });
    }

    const data = await response.json();
    if (data.error) {
      return res.status(502).json({ error: data.error.message || 'AI error' });
    }

    const aiReply = data.choices?.[0]?.message?.content || "Maaf, terjadi kesalahan pada AI.";
    res.json({ response: aiReply });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};