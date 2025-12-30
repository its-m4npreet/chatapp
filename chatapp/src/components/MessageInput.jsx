import { useState } from 'react';
import { useStore } from '../store/zustand';

const MessageInput = () => {
  const [input, setInput] = useState('');
  const sendMessage = useStore((state) => state.sendMessage);

  const handleSend = () => {
    if (input.trim()) {
      sendMessage(input);
      setInput('');
    }
  };

  return (
    <div className="p-4 border-t">
      <div className="flex">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          className="flex-1 p-2 border rounded-l"
          placeholder="Type a message..."
        />
        <button
          onClick={handleSend}
          className="bg-blue-500 text-white px-4 py-2 rounded-r"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default MessageInput;
