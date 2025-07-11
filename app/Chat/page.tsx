'use client';
import React, { useState } from 'react';

export default function ChatPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setLoading(true);

    setMessages([...messages, { role: 'user', content: input }]);
    const res = await fetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ prompt: input }),
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json();

    setMessages([
      ...messages,
      { role: 'user', content: input },
      { role: 'assistant', content: data.result },
    ]);
    setInput('');
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 600, margin: '40px auto' }}>
      <h1>Chat IA (Demo)</h1>
      <div style={{ minHeight: 200, border: '1px solid #eee', padding: 16 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: 8 }}>
            <strong>{m.role === 'user' ? 'Tú:' : 'IA:'}</strong> {m.content}
          </div>
        ))}
      </div>
      <form onSubmit={handleSend} style={{ marginTop: 16 }}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Escribe tu pregunta..."
          style={{ width: '80%' }}
          disabled={loading}
        />
        <button type="submit" disabled={loading} style={{ marginLeft: 8 }}>
          Enviar
        </button>
      </form>
    </div>
  );
}
