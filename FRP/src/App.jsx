import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from './components/Navbar';
import RegisterTab from './components/RegisterTab';
import LiveTab from './components/LiveTab';
import ChatWidget from './components/ChatWidget';
import ThemeToggle from './components/ThemeToggle';

function App() {
  const [activeTab, setActiveTab] = useState('register');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [registeredFaces, setRegisteredFaces] = useState([]);

  const handleRegisterFace = (newFace) => {
    setRegisteredFaces([...registeredFaces, newFace]);
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Background gradient elements */}
      <div className="fixed inset-0 bg-gradient-to-br from-dark-900 to-dark-800 -z-10"></div>
      <div className="fixed top-20 -left-32 w-64 h-64 rounded-full bg-primary-500/10 blur-3xl -z-10"></div>
      <div className="fixed bottom-20 -right-32 w-80 h-80 rounded-full bg-secondary-500/10 blur-3xl -z-10"></div>
      
      <header className="sticky top-0 z-50 glass-card bg-dark-900/80 backdrop-blur-lg border-b border-slate-700/50">
        <div className="container mx-auto px-4">
          <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>
      </header>

      <main className="flex-grow container mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {activeTab === 'register' ? (
            <motion.div
              key="register"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <RegisterTab onRegister={handleRegisterFace} />
            </motion.div>
          ) : (
            <motion.div
              key="live"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <LiveTab registeredFaces={registeredFaces} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <ChatWidget
        isOpen={isChatOpen}
        setIsOpen={setIsChatOpen}
        registeredFaces={registeredFaces}
      />

      <div className="fixed bottom-4 right-4 z-30">
        <ThemeToggle />
      </div>
    </div>
  );
}

export default App;