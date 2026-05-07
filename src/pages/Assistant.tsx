import { useState } from 'react';
import { Bot, Send, X } from 'lucide-react';
import { useAi } from '../lib/data';
import { PageHero } from '../components/PageHero';

const SUGGESTIONS = [
  'Summarize this week',
  'Who is overbooked in the next 4 weeks?',
  'Who has space for a 60h security project starting June 8?',
];

export function AssistantPage() {
  const { history, send, reset } = useAi();
  const [input, setInput] = useState('');

  function submit(text: string) {
    send(text);
    setInput('');
  }

  return (
    <section>
      <PageHero
        icon={<Bot size={20} />}
        title="Assistant"
        subtitle={
          <>
            Natural-language queries over your capacity, projects, and pipeline data.{' '}
            <strong>Preview note:</strong> responses are simulated; production wires to the
            Anthropic API with tool definitions over the schema.
          </>
        }
        actions={
          history.length > 0 ? (
            <button onClick={reset}>
              <X size={12} /> Clear
            </button>
          ) : null
        }
      />

      <div className="ai-chat">
        {history.length === 0 && (
          <div className="ai-empty">
            <div className="ai-empty-icon">
              <Bot size={28} />
            </div>
            <p className="muted">Ask anything about your team, projects, or pipeline.</p>
            <div className="ai-suggestions">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => submit(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {history.map((m) => (
          <div key={m.id} className={`ai-msg ai-msg-${m.role}`}>
            <div className="ai-msg-role">{m.role}</div>
            <div className="ai-msg-content">{renderContent(m.content)}</div>
          </div>
        ))}
      </div>

      <form
        className="ai-input"
        onSubmit={(e) => {
          e.preventDefault();
          if (input.trim()) submit(input);
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about capacity, pipeline, or projects…"
        />
        <button className="primary" type="submit" disabled={!input.trim()}>
          <Send size={12} /> Send
        </button>
      </form>
    </section>
  );
}

function renderContent(text: string) {
  const lines = text.split('\n');
  return (
    <>
      {lines.map((line, i) => {
        if (line.startsWith('• ') || line.startsWith('- ')) {
          return <div key={i}>• {boldify(line.slice(2))}</div>;
        }
        if (/^\d+\.\s/.test(line)) {
          return <div key={i}>{boldify(line)}</div>;
        }
        if (line === '') return <div key={i} style={{ height: 8 }} />;
        return <div key={i}>{boldify(line)}</div>;
      })}
    </>
  );
}

function boldify(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith('**') && p.endsWith('**') ? (
      <strong key={i}>{p.slice(2, -2)}</strong>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}
