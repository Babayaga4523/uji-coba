const fetch = require("node-fetch");

exports.chat = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    // Siapkan prompt system (bisa juga diterima dari frontend jika mau)
    const systemPrompt = `
Kamu adalah AI asisten profesional untuk admin website rental mobil.
Tugas kamu adalah membantu pemilik atau admin dalam mengelola bisnis rental mobil berbasis data dan strategi pemasaran digital.
    `.trim();

    // Kirim ke OpenRouter
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "openai/gpt-5-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        max_tokens: 1024
      })
    });

    const data = await response.json();

    // Tangani error dari OpenRouter
    if (data.error) {
      return res.status(500).json({ error: data.error.message || "AI error" });
    }

    // Kirim jawaban AI ke frontend
    const aiReply = data.choices?.[0]?.message?.content || "Maaf, terjadi kesalahan pada AI.";
    res.json({ response: aiReply });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};