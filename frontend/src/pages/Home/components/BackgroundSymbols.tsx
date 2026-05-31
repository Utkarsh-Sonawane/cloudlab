import React from 'react';
import { motion } from 'framer-motion';
import { 
  Cloud, Terminal, Cpu, Database, GitBranch, 
  Layers, HardDrive, Code2, Box, Activity, 
  Globe, Shield, Zap, Server, Monitor
} from 'lucide-react';

const SYMBOLS = [
  { Icon: Cloud, size: 40, top: '10%', left: '5%', delay: 0, duration: 20, prominent: true },
  { Icon: Terminal, size: 32, top: '15%', left: '85%', delay: 2, duration: 18, prominent: true },
  { Icon: Cpu, size: 48, top: '65%', left: '10%', delay: 1, duration: 22 },
  { Icon: Database, size: 36, top: '80%', left: '80%', delay: 3, duration: 25 },
  { Icon: GitBranch, size: 28, top: '40%', left: '92%', delay: 0.5, duration: 15, prominent: true },
  { Icon: Layers, size: 44, top: '25%', left: '15%', delay: 4, duration: 30 },
  { Icon: HardDrive, size: 32, top: '75%', left: '25%', delay: 1.5, duration: 20 },
  { Icon: Code2, size: 40, top: '10%', left: '45%', delay: 2.5, duration: 18 },
  { Icon: Box, size: 36, top: '85%', left: '40%', delay: 0, duration: 22, prominent: true },
  { Icon: Activity, size: 24, top: '50%', left: '5%', delay: 3.5, duration: 15 },
  { Icon: Globe, size: 32, top: '5%', left: '75%', delay: 1, duration: 25 },
  { Icon: Shield, size: 28, top: '55%', left: '88%', delay: 2, duration: 20 },
  { Icon: Zap, size: 24, top: '30%', left: '80%', delay: 0.5, duration: 12, prominent: true },
  { Icon: Server, size: 40, top: '45%', left: '20%', delay: 4, duration: 28 },
  { Icon: Monitor, size: 36, top: '20%', left: '60%', delay: 1.5, duration: 20 },
];

export const BackgroundSymbols: React.FC = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
      {SYMBOLS.map((s, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ 
            opacity: s.prominent ? [0.1, 0.2, 0.1] : [0.03, 0.08, 0.03],
            y: [0, -20, 0],
            rotate: [0, 5, -5, 0]
          }}
          transition={{ 
            duration: s.duration,
            repeat: Infinity,
            delay: s.delay,
            ease: "easeInOut"
          }}
          style={{
            position: 'absolute',
            top: s.top,
            left: s.left,
            color: s.prominent ? '#ffffff' : 'var(--brand-500)',
          }}
        >
          <s.Icon size={s.size} strokeWidth={s.prominent ? 2 : 1} />
        </motion.div>
      ))}
      
      {/* Additional decorative lines/vectors */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="circuit" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
            <path d="M10 10 H90 V90 H10 Z" fill="none" stroke="currentColor" strokeWidth="0.5" />
            <circle cx="10" cy="10" r="2" fill="currentColor" />
            <circle cx="90" cy="90" r="2" fill="currentColor" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#circuit)" />
      </svg>
    </div>
  );
};
