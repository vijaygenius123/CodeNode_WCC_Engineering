import { useState } from "react";
import { useRole } from "../context/RoleContext";
import { postMessage } from "../hooks/useApi";
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
        throw new Error(body.error ?? "We could not find a report with that reference number.");
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
      const reply = await postMessage(submitted, msg, role);
      setChatMsgs((prev) => [...prev, { role: "assistant", content: reply.content }]);
    } catch {
      setChatMsgs((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, we're unable to respond at the moment. Please try again later." },
      ]);
    } finally {
      setChatSending(false);
    }
  }

  return (
    <div className="govuk-width-container">
      <div className="govuk-grid-row">
        <div className="govuk-grid-column-two-thirds">

          <h1 className="govuk-heading-xl">Check your report status</h1>
          <p className="govuk-body">
            Enter the reference number from your report confirmation to see the current status.
          </p>

          {fetchError && (
            <div className="govuk-error-summary" role="alert" aria-labelledby="error-summary-title">
              <h2 className="govuk-error-summary__title" id="error-summary-title">
                There is a problem
              </h2>
              <div className="govuk-error-summary__body">
                <p className="govuk-body">{fetchError}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleLookup} noValidate>
            <div className="govuk-form-group">
              <label className="govuk-label govuk-label--m" htmlFor="ref-input">
                Report reference number
              </label>
              <div className="govuk-hint" id="ref-hint">
                For example, REF-10302 or WCC-2026-10302
              </div>
              <input
                id="ref-input"
                className="govuk-input govuk-input--width-20"
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                aria-describedby="ref-hint"
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            <button
              type="submit"
              className="govuk-button"
              disabled={loading || !reference.trim()}
            >
              {loading ? "Searching…" : "Find report"}
            </button>
          </form>

          {status && (
            <div>
              <hr className="govuk-section-break govuk-section-break--l govuk-section-break--visible" />

              <dl className="govuk-summary-list">
                <div className="govuk-summary-list__row">
                  <dt className="govuk-summary-list__key">Report type</dt>
                  <dd className="govuk-summary-list__value">{status.case_type_display}</dd>
                </div>
                <div className="govuk-summary-list__row">
                  <dt className="govuk-summary-list__key">Location</dt>
                  <dd className="govuk-summary-list__value">{status.location_display}</dd>
                </div>
                <div className="govuk-summary-list__row">
                  <dt className="govuk-summary-list__key">Last updated</dt>
                  <dd className="govuk-summary-list__value">{formatDate(status.last_updated)}</dd>
                </div>
              </dl>

              <div className="resident-status" role="status" aria-live="polite">
                {status.status_display}
              </div>

              <div className="govuk-inset-text">
                <h2 className="govuk-heading-s">What happens next</h2>
                <p className="govuk-body">{status.what_happens_next}</p>
              </div>

              {status.simplified_timeline.length > 0 && (
                <>
                  <h2 className="govuk-heading-m">Timeline</h2>
                  <ol className="timeline" aria-label="Case timeline">
                    {status.simplified_timeline.map((ev, i) => (
                      <li key={i} className="timeline-event">
                        <div className="timeline-event__dot" />
                        <div className="timeline-event__date">{formatDate(ev.date)}</div>
                        <div className="timeline-event__event">{ev.description}</div>
                      </li>
                    ))}
                  </ol>
                </>
              )}

              <button
                className="govuk-button govuk-button--secondary"
                onClick={() => setChatOpen((o) => !o)}
                aria-expanded={chatOpen}
                type="button"
              >
                {chatOpen ? "Close chat" : "Ask a question about your report"}
              </button>

              {chatOpen && (
                <div className="chat-panel" aria-label="Chat about your report">
                  <div className="chat-messages" aria-live="polite">
                    {chatMsgs.length === 0 && (
                      <p className="govuk-hint" style={{ textAlign: "center", marginTop: 10 }}>
                        Ask us a question about your report.
                      </p>
                    )}
                    {chatMsgs.map((m, i) => (
                      <div key={i} className={`chat-message chat-message--${m.role}`}>
                        {m.content}
                      </div>
                    ))}
                    {chatSending && (
                      <div className="chat-message chat-message--assistant govuk-hint">…</div>
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
                      className="govuk-button govuk-!-margin-0"
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
      </div>
    </div>
  );
}
