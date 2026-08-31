import React, { createContext, useContext, useState, ReactNode } from 'react';
import axios from 'axios';

interface Message {
  role: 'user' | 'agent';
  content: string;
}

interface ChatContextType {
  isOpen: boolean;
  toggleDrawer: () => void;
  messages: Message[];
  sendMessage: (msg: string) => Promise<void>;
  isLoading: boolean;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'agent', content: 'Hi! I am your AI CRM Assistant. How can I help you today?' }
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const toggleDrawer = () => setIsOpen(!isOpen);

  const sendMessage = async (msg: string) => {
    if (!msg.trim()) return;
    
    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setIsLoading(true);
    
    try {
      const response = await axios.post('http://localhost:8000/ai/chat', { message: msg });
      setMessages(prev => [...prev, { role: 'agent', content: response.data.response }]);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, { role: 'agent', content: 'Sorry, I encountered an error communicating with the server.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ChatContext.Provider value={{ isOpen, toggleDrawer, messages, sendMessage, isLoading }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
