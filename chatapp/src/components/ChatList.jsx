import { useStore } from '../store/zustand';

const ChatList = () => {
  const { setSelectedChat, fetchMessages } = useStore();

  const handleChatSelect = (chatId) => {
    setSelectedChat(chatId);
    fetchMessages();
  };

  return (
    <div className="w-1/4 bg-gray-100 p-4">
      <h2 className="text-lg font-bold mb-4">Chats</h2>
      <div className="space-y-2">
        {/* Placeholder for chat list */}
        <div className="p-2 bg-white rounded cursor-pointer" onClick={() => handleChatSelect(1)}>Chat 1</div>
        <div className="p-2 bg-white rounded cursor-pointer" onClick={() => handleChatSelect(2)}>Chat 2</div>
      </div>
    </div>
  );
};

export default ChatList;
