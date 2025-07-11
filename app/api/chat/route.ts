import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const openai_key = process.env.OPENAI_API_KEY!;
const supabase_url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabase_key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabase_url, supabase_key);

export async function POST(req: NextRequest) {
  const { query } = await req.json(); // IMPORTANTE: en ese repo usan { query }, no { prompt }

  // 1. OpenAI Embedding
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
  const embedding = embeddingJson.data[0].embedding;

  // 2. Buscar en Supabase usando la función match_page_sections
  const { data, error } = await supabase.rpc("match_page_sections", {
    embedding, // mismo nombre de parámetro que en la función SQL
    match_threshold: 0.2, // Puedes ajustar este valor
    match_count: 5,
    min_content_length: 20
  });

  if (error) {
    return NextResponse.json({ result: "Error buscando información en la base.", details: error });
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ result: "No encontré información relevante en la base de conocimiento." });
  }

  // 3. Armar el contexto igual que el repo
  const context = data.map((m: any) => m.content).join("\n\n---\n\n");

  // 4. Llamar a GPT SOLO con ese contexto
  const gptRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openai_key}`,
    },
    body: JSON.stringify({
      model: "gpt-4o", // puedes cambiarlo por "gpt-3.5-turbo" si quieres ahorrar tokens
      messages: [
        {
          role: "system",
          content: `Eres un asistente experto. SOLO puedes responder usando la siguiente información de la base de conocimiento. Si la respuesta no está en el contexto, responde: "No tengo información suficiente en la base de conocimiento para responder esa pregunta."\n\n${context}`,
        },
        { role: "user", content: query }
      ],
      max_tokens: 600,
      temperature: 0.1
    }),
  });

  const gptData = await gptRes.json();
  return NextResponse.json({
    result: gptData.choices?.[0]?.message?.content || "Sin respuesta."
  });
}
