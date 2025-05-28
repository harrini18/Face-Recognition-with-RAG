import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineChat, HiX, HiOutlinePaperAirplane, HiOutlineInformationCircle } from 'react-icons/hi';

const ChatWidget = ({ isOpen, setIsOpen }) => {
  const [messages, setMessages] = useState([
    { 
      id: 1, 
      text: "Hello! I'm your FaceID assistant. Ask me anything about registered faces, like 'how many registered?', 'who was the last person registered?', or 'when was Alice added?'. You can also register a new face by typing 'register [name]' and uploading an image.", 
      sender: "bot" 
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const messagesEndRef = useRef(null);

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedFile(reader.result); // Base64-encoded image
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const normalizedInput = input.trim().toLowerCase();
    const userMessage = { id: Date.now(), text: input, sender: "user" };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    await new Promise(resolve => setTimeout(resolve, 500));

    try {
      if (normalizedInput.startsWith('register ')) {
        const name = normalizedInput.replace('register ', '').trim();
        if (!name) {
          throw new Error('Please provide a name to register');
        }
        if (!selectedFile) {
          throw new Error('Please upload an image to register a new face');
        }

        const response = await fetch('http://localhost:5000/api/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: name,
            image: selectedFile,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        setSelectedFile(null); // Clear file input after successful registration
        setMessages(prev => [...prev, { 
          id: Date.now() + 1, 
          text: data.answer,
          sender: "bot",
          timestamp: data.timestamp || new Date().toISOString()
        }]);
      } else {
        const response = await fetch('http://localhost:5000/api/query', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: normalizedInput,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        const botResponse = data.error 
          ? `Error: ${data.error}` 
          : normalizedInput === "how many registered?"
          ? `Number of registered faces: ${data.answer}`
          : data.answer;

        setMessages(prev => [...prev, { 
          id: Date.now() + 1, 
          text: botResponse, 
          sender: "bot",
          timestamp: data.timestamp || new Date().toISOString()
        }]);
      }
    } catch (error) {
      console.error('Error processing request:', error);
      setMessages(prev => [...prev, { 
        id: Date.now() + 1, 
        text: `Error: Could not process your request. ${error.message}`, 
        sender: "bot",
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setInput(suggestion);
    handleSendMessage();
  };

  const formatTimestamp = (timestamp) => {
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return 'Unknown time';
    }
  };

  return (
    <>
      <motion.button
        className="fixed bottom-4 right-4 w-14 h-14 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white flex items-center justify-center shadow-lg z-40"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={toggleChat}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
      >
        {isOpen ? <HiX size={24} /> : <HiOutlineChat size={24} />}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed bottom-20 right-4 w-80 sm:w-96 h-[460px] glass-card flex flex-col z-30"
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <div className="p-3 border-b border-slate-700/50 flex items-center">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-400 to-purple-500 mr-3 flex items-center justify-center">
                <HiOutlineInformationCircle className="text-white" />
              </div>
              <div>
                <h3 className="font-medium">FaceID Assistant</h3>
                <div className="text-xs text-slate-400 flex items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1"></span>
                  Online
                </div>
              </div>
            </div>
            
            <div className="flex-grow overflow-y-auto p-4 space-y-3">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div 
                    className={`max-w-[85%] p-3 rounded-lg ${
                      message.sender === 'user' 
                        ? 'bg-purple-500 text-white' 
                        : message.text.startsWith('Error:') 
                        ? 'bg-red-500/50 text-white' 
                        : 'bg-slate-700/50 text-white'
                    }`}
                  >
                    {message.text}
                    {message.sender === 'bot' && message.timestamp && (
                      <div className="text-xs text-slate-400 mt-1">
                        {formatTimestamp(message.timestamp)}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
              {isLoading && (
                <motion.div
                  className="flex justify-start"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="max-w-[85%] p-3 rounded-lg bg-slate-700/50 text-white">
                    Thinking...
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {!isLoading && messages.length === 1 && (
              <div className="px-4 pb-2 flex flex-wrap gap-2">
                {["how many registered?", "who was the last person registered?", "when was Alice added?"].map(suggestion => (
                  <button
                    key={suggestion}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="text-sm text-slate-300 bg-slate-700/50 px-3 py-1 rounded-full hover:bg-slate-600 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
            
            <div className="p-3 border-t border-slate-700/50">
              <div className="flex flex-col space-y-2">
                <div className="flex items-center">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask a question or type 'register [name]'..."
                    className="glass-input flex-grow mr-2"
                    disabled={isLoading}
                    onKeyPress={(e) => {
                        if (e.key === 'Enter' && !isLoading && input.trim()) {
                          handleSendMessage();
                        }
                    }}
                  />
                  <motion.button
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      isLoading || !input.trim() ? 'bg-gray-500 cursor-not-allowed' : 'bg-indigo-500'
                    }`}
                    whileHover={{ scale: isLoading || !input.trim() ? 1 : 1.05 }}
                    whileTap={{ scale: isLoading || !input.trim() ? 1 : 0.95 }}
                    onClick={handleSendMessage}
                    disabled={isLoading || !input.trim()}
                  >
                    <HiOutlinePaperAirplane className="text-white transform rotate-90" />
                  </motion.button>
                </div>
                <div className="flex items-center">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    disabled={isLoading}
                    className="text-sm text-slate-300"
                  />
                  {selectedFile && (
                    <button
                      onClick={() => setSelectorFile(null)}
                      className="ml-2 text-sm text-red-400 hover:text-red-600"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ChatWidget;