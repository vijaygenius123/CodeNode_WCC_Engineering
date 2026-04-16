import { useState } from "react";
import { Search } from "lucide-react";
import { useRole } from "../context/RoleContext";
import { postResidentChat } from "../hooks/useApi";
import type { ResidentStatusResponse } from "../types";

const BASE_URL = import.meta.env.VITE_API_URL ?? "";

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default function Resident() {
  const { role } = useRole();
  const [reference, setReference] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [status, setStatus] = useState<ResidentStatusResponse | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatSending, setChatSending] = useState(false);

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    if (!reference.trim()) return;

    setLoading(true);
    setFetchError(null);
    setStatus(null);
    setSubmitted(reference.trim());
    setChatMsgs([]);
    setChatOpen(false);

    try {
      const res = await fetch(
        `${BASE_URL}/api/resident/${encodeURIComponent(reference.trim())}`,
        { headers: { "X-CaseView-Role": role } }
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(
          body.error ??
            "We could not find a report with that reference number."
        );
      }
      const data = (await res.json()) as ResidentStatusResponse;
      setStatus(data);
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleChat(e: React.FormEvent) {
    e.preventDefault();
    if (!chatInput.trim() || !submitted) return;

    const msg = chatInput.trim();
    setChatInput("");
    setChatMsgs((prev) => [...prev, { role: "user", content: msg }]);
    setChatSending(true);

    try {
      const reply = await postResidentChat(submitted, msg);
      setChatMsgs((prev) => [
        ...prev,
        { role: "assistant", content: reply.content },
      ]);
    } catch {
      setChatMsgs((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sorry, we're unable to respond at the moment. Please try again later.",
        },
      ]);
    } finally {
      setChatSending(false);
    }
  }

  return (
    <div className="govuk-width-container">
      <h1 className="govuk-heading-xl">Check your report</h1>
      <p className="govuk-body">
        Enter the reference number from your report confirmation email.
      </p>

      <div className="resident-lookup">
        <form onSubmit={handleLookup}>
          <label htmlFor="ref-input" className="govuk-heading-s mb-4">
            Report reference number
          </label>
          <div className="resident-input-group">
            <input
              id="ref-input"
              className="govuk-input"
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. REP-30101"
              aria-label="Report reference number"
              autoComplete="off"
            />
            <button
              type="submit"
              className="govuk-button"
              disabled={loading || !reference.trim()}
            >
              <Search size={16} style={{ marginRight: 6, verticalAlign: "middle" }} />
              {loading ? "Searching…" : "Find report"}
            </button>
          </div>
        </form>
      </div>

      {fetchError && (
        <div className="error-state" role="alert">
          {fetchError}
        </div>
      )}

      {status && (
        <div className="resident-status-card">
          <div className="govuk-panel">
            <div className="govuk-panel__title">Report type</div>
            <p className="govuk-body text-bold mb-0">
              {status.case_type_display}
            </p>
            <p className="text-grey text-small">{status.location_display}</p>
          </div>

          <div className="resident-status__status" role="status" aria-live="polite">
            {status.status_display}
          </div>

          <div className="govuk-panel">
            <div className="govuk-panel__title">What happens next</div>
            <div className="resident-status__next">{status.what_happens_next}</div>
          </div>

          {status.simplified_timeline.length > 0 && (
            <div className="govuk-panel">
              <div className="govuk-panel__title">Timeline</div>
              <div className="timeline" style={{ marginTop: 8 }}>
                {status.simplified_timeline.map((ev, i) => (
                  <div key={i} className="timeline-event">
                    <div className="timeline-event__dot" />
                    <div className="timeline-event__date">
                      {formatDate(ev.date)}
                    </div>
                    <div className="timeline-event__event">{ev.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-grey text-small">
            Last updated: {formatDate(status.last_updated)}
          </p>

          {/* Optional chat */}
          <button
            className="govuk-button govuk-button--secondary"
            style={{ marginTop: 8 }}
            onClick={() => setChatOpen((o) => !o)}
            aria-expanded={chatOpen}
          >
            {chatOpen ? "Close chat" : "Ask about your report"}
          </button>

          {chatOpen && (
            <div className="chat-panel" aria-label="Chat about your report">
              <div className="chat-messages" aria-live="polite">
                {chatMsgs.length === 0 && (
                  <p className="text-grey text-small" style={{ textAlign: "center" }}>
                    Ask us a question about your report.
                  </p>
                )}
                {chatMsgs.map((m, i) => (
                  <div
                    key={i}
                    className={`chat-message chat-message--${m.role}`}
                  >
                    {m.content}
                  </div>
                ))}
                {chatSending && (
                  <div className="chat-message chat-message--assistant text-grey">
                    …
                  </div>
                )}
              </div>
              <form className="chat-input-row" onSubmit={handleChat}>
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type your question…"
                  aria-label="Chat message"
                  disabled={chatSending}
                />
                <button
                  type="submit"
                  className="govuk-button"
                  disabled={chatSending || !chatInput.trim()}
                >
                  Send
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
