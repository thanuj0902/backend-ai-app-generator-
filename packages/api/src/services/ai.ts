const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ""
const GROQ_API_KEY = process.env.GROQ_API_KEY || ""

interface AIProvider {
  generate(prompt: string): Promise<string>
  name: string
}

class GeminiProvider implements AIProvider {
  name = "gemini"

  async generate(prompt: string): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 8192 },
      }),
    })
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Gemini API error (${res.status}): ${err}`)
    }
    const data = await res.json()
    return data.candidates?.[0]?.content?.parts?.[0]?.text || ""
  }
}

class GroqProvider implements AIProvider {
  name = "groq"

  async generate(prompt: string): Promise<string> {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 8192,
      }),
    })
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Groq API error (${res.status}): ${err}`)
    }
    const data = await res.json()
    return data.choices?.[0]?.message?.content || ""
  }
}

function getProvider(): AIProvider {
  if (GEMINI_API_KEY) return new GeminiProvider()
  if (GROQ_API_KEY) return new GroqProvider()
  throw new Error("No AI provider configured. Set GEMINI_API_KEY or GROQ_API_KEY.")
}

const SYSTEM_PROMPT = `You are an expert full-stack developer. Generate a complete, production-ready application based on the user's description.

Return ONLY valid JSON with this exact structure:
{
  "files": [
    {
      "path": "relative/file/path",
      "content": "file content here",
      "language": "typescript|javascript|css|html|json|prisma|sql"
    }
  ],
  "dependencies": {
    "npm": ["package@version"],
    "devDependencies": []
  },
  "structure": {
    "summary": "brief explanation of the architecture",
    "entryPoint": "main file path"
  }
}

Key requirements:
- Generate a full project with proper file structure
- Include package.json if needed
- Use TypeScript by default
- Include all necessary config files
- Make it ready to run with minimal setup`

export async function generateAppCode(userPrompt: string): Promise<{
  files: { path: string; content: string; language: string }[]
  dependencies: { npm: string[]; devDependencies: string[] }
  structure: { summary: string; entryPoint: string }
}> {
  const provider = getProvider()
  const response = await provider.generate(`${SYSTEM_PROMPT}\n\nUser request: ${userPrompt}`)
  const cleaned = response.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
  const parsed = JSON.parse(cleaned)
  return {
    files: parsed.files || [],
    dependencies: parsed.dependencies || { npm: [], devDependencies: [] },
    structure: parsed.structure || { summary: "", entryPoint: "" },
  }
}
