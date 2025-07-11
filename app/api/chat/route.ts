import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const openai_key = process.env.OPENAI_API_KEY!;
const supabase_url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabase_key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabase_url, supabase_key);

export async function POST(req: NextRequest) {
  try {
    // 1. Leer el body del request
    const { query } = await req.json();
    if (!query) {
      console.log("⛔ No se envió 'query' en el body");
      return NextResponse.json({ result: "Falta la pregunta en el body (query)" });
    }

    // 2. OpenAI Embedding
    const embeddingRes = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openai_key}`,
      },
      body: JSON.stringify({
        input: query,
        model: "text-embedding-ada-002",
      }),
    });
    const embeddingJson = await embeddingRes.json();
    console.log("🔎 EMBEDDING JSON:", embeddingJson);

    if (!embeddingJson.data || !embeddingJson.data[0]?.embedding) {
      return NextResponse.json({ result: "Error al generar embedding", details: embeddingJson });
    }
    const embedding = embeddingJson.data[0].embedding;

    // 3. Buscar en Supabase usando la función match_page_sections
    const { data, error } = await supabase.rpc("match_page_sections", {
      embedding,
      match_threshold: 0.01,
      match_count: 5,
      min_content_length: 20
    });
    console.log("🔥 RESULTADO SUPABASE:", JSON.stringify(data), error);

    if (error) {
      console.log("⛔ ERROR SUPABASE:", error);
      return NextResponse.json({ result: "Error buscando información en la base.", details: error });
    }

    if (!data || data.length === 0) {
      console.log("⛔ No data relevante en la base de conocimiento");
      return NextResponse.json({ result: "No encontré información relevante en la base de conocimiento." });
    }

    // 4. Armar el contexto igual que el repo oficial
    const context = data.map((m: any) => m.content).join("\n\n---\n\n");

    // 5. Llamar a GPT SOLO con ese contexto
    const gptRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openai_key}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `Eres CONTENT COACH IA, experto en creación de contenido viral y estrategias de guionización.
Solo puedes responder usando la información que tienes en los documentos proporcionados (contexto abajo),
pero nunca lo digas explícitamente. SOLO puedes responder usando la siguiente información extraída de la base de conocimiento. 
Si algún fragmento usa '[nombre del tema]', reemplázalo por el tema de la pregunta del usuario. Si la respuesta no está en el contexto, responde: "Si la respuesta está parcialmente en el contexto, intenta razonar y sugerir la mejor opción basada en la información que sí existe, conectando ideas de la base de datos." No inventes información externa ni referencias a otras fuentes.
Responde con un tono seguro, directo, conversacional y natural, como un mentor de confianza.
Si no tienes suficiente información, sé honesto de forma natural.
Adapta automáticamente tu respuesta al idioma del usuario (español o inglés)."\n\n${context}`,
          },
          { role: "user", content: query }
        ],
        max_tokens: 600,
        temperature: 0.1
      }),
    });

    const gptData = await gptRes.json();
    console.log("🔎 GPT RESPONSE:", gptData);

    return NextResponse.json({
      result: gptData.choices?.[0]?.message?.content || "Sin respuesta."
    });
  } catch (error) {
    console.log("⛔ ERROR FATAL:", error);
    return NextResponse.json({ result: "Error fatal", details: error });
  }
}
