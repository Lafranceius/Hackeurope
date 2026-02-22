"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

type Msg = { id: string; body: string; senderName: string; createdAt: string };

export const MessageThreadPanel = ({
  initialThreadId,
  mode,
  requestId,
  contractId,
  initialMessages
}: {
  initialThreadId?: string;
  mode: "REQUEST" | "CONTRACT";
  requestId?: string;
  contractId?: string;
  initialMessages: Msg[];
}) => {
  const [threadId, setThreadId] = useState<string | undefined>(initialThreadId);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const send = async () => {
    let nextThreadId = threadId;

    if (!nextThreadId) {
      const createThread = await fetch("/api/messages/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: mode,
          requestId,
          contractId
        })
      });
      const threadBody = await createThread.json();
      if (!createThread.ok) {
        setStatus(threadBody.error ?? "Unable to create thread");
        return;
      }
      nextThreadId = threadBody.data.id;
      setThreadId(nextThreadId);
    }

    const sendMessage = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        threadId: nextThreadId,
        body: message
      })
    });
    const body = await sendMessage.json();
    if (!sendMessage.ok) {
      setStatus(body.error ?? "Unable to send message");
      return;
    }

    setStatus("Message sent. Refresh to see latest.");
    setMessage("");
  };

  return (
    <div className="panel p-4">
      <h3 className="text-xl font-semibold">Message Thread</h3>
      <div className="mt-3 max-h-64 space-y-2 overflow-y-auto rounded-md border border-border bg-mutedSurface p-3">
        {initialMessages.length === 0 ? (
          <p className="text-sm text-textMuted">No messages yet.</p>
        ) : (
          initialMessages.map((item) => (
            <div key={item.id} className="rounded-md border border-border bg-white p-2.5 text-sm">
              <p className="font-medium">{item.senderName}</p>
              <p>{item.body}</p>
              <p className="mt-1 text-xs text-textMuted">{new Date(item.createdAt).toLocaleString()}</p>
            </div>
          ))
        )}
      </div>
      <textarea
        rows={3}
        className="mt-3 w-full"
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        placeholder="Type a message"
      />
      <Button className="mt-2" size="sm" onClick={send} disabled={!message.trim()}>
        Send
      </Button>
      {status ? <p className="mt-2 text-sm text-textSecondary">{status}</p> : null}
    </div>
  );
};
