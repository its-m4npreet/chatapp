import React from "react";
import "../App.css";

const messages = [
  { id: 1, sender: "Alice", text: "Hi!" },
  { id: 2, sender: "Bob", text: "Hello!" },
  { id: 3, sender: "Alice", text: "How are you?" },
];

export default function ChatWindow({ selectedUserId }) {
  return (
    <section className="chat-window">
      <h2>Chat</h2>
      <div className="messages">
        {messages.map((msg) => (
          <div key={msg.id} className="message">
            <strong>{msg.sender}:</strong> {msg.text}
          </div>
        ))}
      </div>
    </section>
  );
}
