const fetch = require("node-fetch");

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
    `.trim();

    const model = "openai/gpt-5-mini";
    const messages = [
      { role: "system", content: prompt },
      { role: "user", content: message }
    ];

    let maxTokens = 1024;
    let response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
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
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
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