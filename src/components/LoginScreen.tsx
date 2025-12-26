import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { usePOSStore } from '../store';

export function LoginScreen() {
  const [pin, setPin] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const navigate = useNavigate();
  const login = usePOSStore(state => state.login);
  const isAuthenticated = usePOSStore(state => state.isAuthenticated);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/floor');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handlePinChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    
    const newPin = [...pin];
    newPin[index] = value.slice(-1);
    setPin(newPin);
    setError('');

    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits entered
    if (newPin.every(d => d !== '') && newPin.join('').length === 4) {
      attemptLogin(newPin.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const attemptLogin = (pinCode: string) => {
    const success = login(pinCode);
    if (success) {
      navigate('/floor');
    } else {
      setError('Invalid PIN');
      setIsShaking(true);
      setPin(['', '', '', '']);
      setTimeout(() => {
        setIsShaking(false);
        inputRefs.current[0]?.focus();
      }, 500);
    }
  };

  const handleQuickLogin = (userPin: string) => {
    setPin(userPin.split(''));
    attemptLogin(userPin);
  };

  return (
    <div className="min-h-screen bg-ink-950 flex items-center justify-center p-4 pattern-dots">
      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-dragon-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gold-500/10 rounded-full blur-3xl" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Logo and Title */}
        <div className="text-center mb-10">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-dragon-500 to-dragon-700 shadow-glow mb-6"
          >
            <span className="text-4xl">🐉</span>
          </motion.div>
          <h1 className="text-3xl font-display font-bold text-gradient mb-2">
            Dragon Palace
          </h1>
          <p className="text-ink-400">Enter your PIN to continue</p>
        </div>

        {/* PIN Input Card */}
        <div className="card p-8">
          <motion.div 
            animate={isShaking ? { x: [-10, 10, -10, 10, 0] } : {}}
            transition={{ duration: 0.4 }}
            className="flex justify-center gap-4 mb-6"
          >
            {pin.map((digit, index) => (
              <input
                key={index}
                ref={el => inputRefs.current[index] = el}
                type="password"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={e => handlePinChange(index, e.target.value)}
                onKeyDown={e => handleKeyDown(index, e)}
                className={`
                  w-16 h-16 text-center text-2xl font-mono font-bold
                  bg-ink-800 border-2 rounded-xl outline-none transition-all
                  ${digit ? 'border-dragon-500 text-dragon-400' : 'border-ink-700 text-ink-300'}
                  focus:border-dragon-500 focus:ring-2 focus:ring-dragon-500/30
                `}
              />
            ))}
          </motion.div>

          <AnimatePresence>
            {error && (
              <motion.p 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-center text-dragon-400 mb-4"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Numeric Keypad */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, 'del'].map((key, i) => (
              <motion.button
                key={i}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  if (key === null) return;
                  if (key === 'del') {
                    const lastFilledIndex = pin.findLastIndex(d => d !== '');
                    if (lastFilledIndex >= 0) {
                      const newPin = [...pin];
                      newPin[lastFilledIndex] = '';
                      setPin(newPin);
                      inputRefs.current[lastFilledIndex]?.focus();
                    }
                  } else {
                    const firstEmptyIndex = pin.findIndex(d => d === '');
                    if (firstEmptyIndex >= 0) {
                      handlePinChange(firstEmptyIndex, String(key));
                    }
                  }
                }}
                disabled={key === null}
                className={`
                  h-14 rounded-xl font-semibold text-lg transition-all
                  ${key === null ? 'invisible' : ''}
                  ${key === 'del' 
                    ? 'bg-ink-800 text-ink-400 hover:bg-ink-700 hover:text-ink-200' 
                    : 'bg-ink-800 text-ink-100 hover:bg-ink-700 active:bg-ink-600'
                  }
                `}
              >
                {key === 'del' ? '⌫' : key}
              </motion.button>
            ))}
          </div>

          {/* Quick Login (Demo) */}
          <div className="border-t border-ink-700 pt-6">
            <p className="text-center text-ink-500 text-sm mb-4">Quick login (demo)</p>
            <div className="flex flex-wrap justify-center gap-2">
              {[
                { label: 'Admin', pin: '1234' },
                { label: 'Manager', pin: '5678' },
                { label: 'Server', pin: '1111' },
                { label: 'Cashier', pin: '3333' },
              ].map(user => (
                <button
                  key={user.pin}
                  onClick={() => handleQuickLogin(user.pin)}
                  className="px-3 py-1.5 rounded-lg text-sm bg-ink-800 text-ink-400 hover:bg-ink-700 hover:text-ink-200 transition-colors"
                >
                  {user.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-ink-600 text-sm mt-6">
          Dragon Palace POS v1.0
        </p>
      </motion.div>
    </div>
  );
}

