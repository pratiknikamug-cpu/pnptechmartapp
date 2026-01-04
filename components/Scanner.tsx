
import React, { useEffect, useRef, useState } from 'react';
import { X, Keyboard, CameraOff, ChevronRight, CheckCircle2, Package, ShoppingBag } from 'lucide-react';

interface ScannerProps {
  onScan: (barcode: string) => { success: boolean, name?: string, price?: number };
  onClose: () => void;
  title?: string;
}

const Scanner: React.FC<ScannerProps> = ({ onScan, onClose, title = "Scan Barcode" }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(true);
  const [manualCode, setManualCode] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [lastDetected, setLastDetected] = useState<{ name: string, price: number } | null>(null);
  const [scanAnimation, setScanAnimation] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let detectionInterval: number | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: 'environment',
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          }
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          
          const track = stream.getVideoTracks()[0];
          const capabilities = track.getCapabilities?.();
          if (capabilities && (capabilities as any).focusMode?.includes('continuous')) {
            await track.applyConstraints({
              advanced: [{ focusMode: 'continuous' }] as any
            });
          }

          if ('BarcodeDetector' in window) {
            const barcodeDetector = new (window as any).BarcodeDetector({
              formats: ['code_128', 'ean_13', 'qr_code', 'upc_a', 'ean_8']
            });

            detectionInterval = window.setInterval(async () => {
              if (videoRef.current && isScanning && videoRef.current.readyState >= 2) {
                try {
                  const barcodes = await barcodeDetector.detect(videoRef.current);
                  if (barcodes.length > 0) {
                    const code = barcodes[0].rawValue;
                    handleDetectedCode(code);
                  }
                } catch (e) {
                  // Ignore detection errors
                }
              }
            }, 500); // Throttled for stability
          }
        }
      } catch (err) {
        setError('Camera restricted or not supported. Use manual entry.');
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (detectionInterval) clearInterval(detectionInterval);
    };
  }, [isScanning]);

  const handleDetectedCode = (code: string) => {
    setIsScanning(false);
    setScanAnimation(true);
    
    // Play haptic feedback if available
    if (navigator.vibrate) {
      navigator.vibrate(100);
    }

    const result = onScan(code);
    
    if (result.success && result.name && result.price !== undefined) {
      setLastDetected({ name: result.name, price: result.price });
      // Reset scanning after a short delay to allow continuous scanning
      setTimeout(() => {
        setIsScanning(true);
        setScanAnimation(false);
      }, 1500);
    } else {
      alert(`Product not found: ${code}`);
      setIsScanning(true);
      setScanAnimation(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      handleDetectedCode(manualCode.trim());
      setManualCode('');
      setShowManual(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-[100] flex flex-col animate-in fade-in duration-300">
      <div className="p-6 flex justify-between items-center text-white z-20 bg-gradient-to-b from-black/90 to-transparent">
        <div>
          <h2 className="text-xl font-black tracking-tight">{title}</h2>
          <p className="text-xs text-emerald-400 font-bold uppercase tracking-widest">Continuous Mode Active</p>
        </div>
        <button onClick={onClose} className="p-3 bg-white/10 backdrop-blur-md rounded-2xl active:scale-90 transition-transform">
          <X size={24} />
        </button>
      </div>

      <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-gray-950">
        {!error ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${scanAnimation ? 'opacity-40' : 'opacity-80'}`}
            />
            
            {/* Scanning Overlay */}
            <div className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-transform duration-300 ${scanAnimation ? 'scale-110' : 'scale-100'}`}>
               <div className={`w-72 h-56 border-2 rounded-[2.5rem] relative overflow-hidden transition-colors duration-300 ${scanAnimation ? 'border-emerald-400 bg-emerald-400/10' : 'border-white/20'}`}>
                  <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-emerald-400 rounded-tl-[2rem]"></div>
                  <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-emerald-400 rounded-tr-[2rem]"></div>
                  <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-emerald-400 rounded-bl-[2rem]"></div>
                  <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-emerald-400 rounded-br-[2rem]"></div>
                  
                  {!scanAnimation && (
                    <div className="w-full h-1.5 bg-emerald-400 absolute top-0 animate-[scan_2s_ease-in-out_infinite] shadow-[0_0_15px_rgba(52,211,153,0.8)]"></div>
                  )}

                  {scanAnimation && (
                    <div className="absolute inset-0 flex items-center justify-center animate-in zoom-in duration-300">
                      <CheckCircle2 size={64} className="text-emerald-400" />
                    </div>
                  )}
               </div>
            </div>
          </>
        ) : (
          <div className="text-white text-center p-10 flex flex-col items-center">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
              <CameraOff size={40} className="text-gray-400" />
            </div>
            <p className="font-bold text-gray-300 text-lg">{error}</p>
          </div>
        )}

        {/* Feedback Pill */}
        {lastDetected && (
          <div className="absolute top-32 left-6 right-6 z-30 animate-in slide-in-from-top duration-300">
            <div className="bg-emerald-600 text-white p-5 rounded-[2rem] shadow-2xl flex items-center gap-4 border border-white/20">
               <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                 <Package size={24} />
               </div>
               <div className="flex-1">
                 <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Added to Cart</p>
                 <p className="font-black text-sm truncate">{lastDetected.name}</p>
               </div>
               <div className="text-right">
                 <p className="font-black text-lg">₹{lastDetected.price.toFixed(2)}</p>
               </div>
            </div>
          </div>
        )}

        {/* Bottom Controls */}
        <div className="absolute bottom-12 left-6 right-6 flex flex-col gap-4 z-20">
          {!showManual ? (
            <div className="flex gap-4">
              <button 
                onClick={() => setShowManual(true)}
                className="flex-1 h-16 bg-white/10 backdrop-blur-xl border border-white/20 text-white rounded-3xl font-black flex items-center justify-center gap-3 active:scale-95 transition-transform shadow-2xl"
              >
                <Keyboard size={20} />
                <span className="text-xs uppercase tracking-widest">Manual</span>
              </button>
              <button 
                onClick={onClose}
                className="flex-1 h-16 bg-emerald-600 text-white rounded-3xl font-black flex items-center justify-center gap-3 active:scale-95 transition-transform shadow-2xl"
              >
                <ShoppingBag size={20} />
                <span className="text-xs uppercase tracking-widest">Go to Cart</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleManualSubmit} className="flex gap-3 animate-in slide-in-from-bottom duration-300">
              <input 
                autoFocus
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Barcode ID"
                className="flex-1 bg-white/20 backdrop-blur-3xl border border-white/30 rounded-2xl px-6 py-5 text-white outline-none focus:ring-2 focus:ring-emerald-500 font-black placeholder:text-white/40"
              />
              <button type="submit" className="bg-emerald-600 text-white px-8 rounded-2xl font-black uppercase text-xs tracking-widest active:scale-95 transition-all">
                Add
              </button>
            </form>
          )}
          {showManual && (
            <button 
              onClick={() => setShowManual(false)} 
              className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em] self-center"
            >
              Cancel Manual Entry
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Fixed missing export default Scanner
export default Scanner;
