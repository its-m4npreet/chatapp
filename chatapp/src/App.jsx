
import Sidebar from "./components/Sidebar";
import ChatWindow from "./components/ChatWindow";
import MessageInput from "./components/MessageInput";
import React, { useState } from "react";

function App() {
  const [selectedUserId, setSelectedUserId] = useState(1);
  const [messages, setMessages] = useState([
    { id: 1, sender: "Alice", text: "Hi!" },
    { id: 2, sender: "Bob", text: "Hello!" },
    { id: 3, sender: "Alice", text: "How are you?" },
  ]);

  const handleSend = (text) => {
    setMessages([
      ...messages,
      { id: messages.length + 1, sender: "You", text },
    ]);
  };

  return (
    <div className="chat-app-container">
      <Sidebar
        onSelectUser={setSelectedUserId}
        selectedUserId={selectedUserId}
      />
      <div className="main-chat-area">
        <ChatWindow selectedUserId={selectedUserId} messages={messages} />
        <MessageInput onSend={handleSend} />
      </div>
    </div>
  );
}

export default App;
