import React from 'react';
import { motion } from 'framer-motion';
import { HiOutlineUserAdd, HiOutlineVideoCamera } from 'react-icons/hi';

const Navbar = ({ activeTab, setActiveTab }) => {
  return (
    <nav className="flex items-center justify-between py-4">
      <div className="flex items-center space-x-2">
        <motion.div 
          className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-secondary-500 flex items-center justify-center"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <span className="text-xl font-bold text-white">F</span>
        </motion.div>
        <div>
          <h1 className="text-xl font-bold">FaceID Platform</h1>
          <p className="text-xs text-slate-400">Real-time facial recognition</p>
        </div>
      </div>

      <div className="flex">
        <button
          onClick={() => setActiveTab('register')}
          className={`tab-button flex items-center ${activeTab === 'register' ? 'active' : ''}`}
        >
          <HiOutlineUserAdd className="mr-2" />
          Register Face
        </button>
        <button
          onClick={() => setActiveTab('live')}
          className={`tab-button flex items-center ${activeTab === 'live' ? 'active' : ''}`}
        >
          <HiOutlineVideoCamera className="mr-2" />
          Live Recognition
        </button>
      </div>
    </nav>
  );
};

export default Navbar;