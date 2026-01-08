
import React, { useEffect, useRef, useState } from 'react';
import { X, Keyboard, CameraOff, CheckCircle2, Package, ShoppingBag } from 'lucide-react';

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

  // Use a ref for the onScan callback to avoid stale closures in the interval
  const onScanRef = useRef(onScan);
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let detectionInterval: number | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          }
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          
          if ('BarcodeDetector' in window) {
            const barcodeDetector = new (window as any).BarcodeDetector({
              formats: ['code_128', 'ean_13', 'qr_code', 'upc_a', 'ean_8']
            });

            detectionInterval = window.setInterval(async () => {
              // Always check the current value of isScanning via state
              // But we need to use a ref for isScanning too if we want to be perfectly safe
              if (videoRef.current && videoRef.current.readyState >= 2) {
                try {
                  const barcodes = await barcodeDetector.detect(videoRef.current);
                  if (barcodes.length > 0) {
                    // Logic handled inside a function that uses the ref
                    handleProcessCode(barcodes[0].rawValue);
                  }
                } catch (e) {
                  // Ignore detection errors
                }
              }
            }, 400); 
          }
        }
      } catch (err) {
        setError('Camera restricted or not supported.');
      }
    };

    const handleProcessCode = (code: string) => {
      // Check internal state using a ref or just rely on the sync nature of this call
      // For simplicity, we trigger the detection logic
      triggerScan(code);
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (detectionInterval) clearInterval(detectionInterval);
    };
  }, []);

  const triggerScan = (code: string) => {
    // Only proceed if we aren't currently "pausing" for a scan animation
    if (!isScanning) return;

    setIsScanning(false);
    setScanAnimation(true);
    
    if (navigator.vibrate) {
      navigator.vibrate(80);
    }

    // Call the LATEST onScan via ref
    const result = onScanRef.current(code);
    
    if (result.success) {
      if (result.name) {
        setLastDetected({ name: result.name, price: result.price || 0 });
      }
      
      // Auto-resume scanning after 1 second
      setTimeout(() => {
        setIsScanning(true);
        setScanAnimation(false);
      }, 1000);
      
      // Clear the feedback pill after 3 seconds
      setTimeout(() => {
        setLastDetected(null);
      }, 3000);
    } else {
      // Feedback for not found
      alert(`Product not found in registry: ${code}`);
      setIsScanning(true);
      setScanAnimation(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      triggerScan(manualCode.trim());
      setManualCode('');
      setShowManual(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-[200] flex flex-col animate-in fade-in duration-300">
      <div className="p-6 flex justify-between items-center text-white z-20 bg-gradient-to-b from-black/90 to-transparent">
        <div>
          <h2 className="text-xl font-black tracking-tight">{title}</h2>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isScanning ? 'bg-emerald-500 animate-pulse' : 'bg-orange-500'}`}></div>
            <p className="text-[10px] text-white/60 font-black uppercase tracking-widest">
              {isScanning ? 'Scanner Active' : 'Processing...'}
            </p>
          </div>
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
            
            <div className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-transform duration-300 ${scanAnimation ? 'scale-110' : 'scale-100'}`}>
               <div className={`w-72 h-56 border-2 rounded-[2.5rem] relative overflow-hidden transition-colors duration-300 ${scanAnimation ? 'border-emerald-400 bg-emerald-400/10' : 'border-white/20'}`}>
                  <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-emerald-400 rounded-tl-[2rem]"></div>
                  <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-emerald-400 rounded-tr-[2rem]"></div>
                  <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-emerald-400 rounded-bl-[2rem]"></div>
                  <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-emerald-400 rounded-br-[2rem]"></div>
                  
                  {isScanning && !scanAnimation && (
                    <div className="w-full h-1 bg-emerald-400 absolute top-0 animate-[scan_1.5s_ease-in-out_infinite] shadow-[0_0_15px_rgba(52,211,153,0.8)]"></div>
                  )}

                  {scanAnimation && (
                    <div className="absolute inset-0 flex items-center justify-center animate-in zoom-in duration-300">
                      <CheckCircle2 size={64} className="text-emerald-400" />
                    </div>
                  )}
               </div>
            </div>

            {isScanning && !scanAnimation && (
               <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 flex justify-center mt-36 animate-pulse">
                  <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-[0.3em] px-4 py-1 rounded-full border border-emerald-500/30">Ready for Item</span>
               </div>
            )}
          </>
        ) : (
          <div className="text-white text-center p-10 flex flex-col items-center">
            <CameraOff size={40} className="text-gray-400 mb-4" />
            <p className="font-bold text-gray-300 text-lg">{error}</p>
          </div>
        )}

        {lastDetected && (
          <div className="absolute top-32 left-6 right-6 z-30 animate-in slide-in-from-top duration-300">
            <div className="bg-white text-gray-950 p-5 rounded-[2rem] shadow-2xl flex items-center gap-4 border border-gray-100">
               <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                 <Package size={24} />
               </div>
               <div className="flex-1">
                 <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Added to Cart</p>
                 <p className="font-black text-sm truncate">{lastDetected.name}</p>
               </div>
               <div className="text-right">
                 <p className="font-black text-lg text-emerald-600">{fmt(lastDetected.price)}</p>
               </div>
            </div>
          </div>
        )}

        <div className="absolute bottom-12 left-6 right-6 flex flex-col gap-4 z-20">
          {!showManual ? (
            <div className="flex gap-4">
              <button 
                onClick={() => setShowManual(true)}
                className="flex-1 h-16 bg-white/10 backdrop-blur-xl border border-white/20 text-white rounded-3xl font-black flex items-center justify-center gap-3 active:scale-95 transition-transform"
              >
                <Keyboard size={20} />
                <span className="text-xs uppercase tracking-widest">Manual ID</span>
              </button>
              <button 
                onClick={onClose}
                className="flex-1 h-16 bg-emerald-600 text-white rounded-3xl font-black flex items-center justify-center gap-3 active:scale-95 transition-transform shadow-2xl"
              >
                <ShoppingBag size={20} />
                <span className="text-xs uppercase tracking-widest">View Cart</span>
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
                className="flex-1 bg-white/20 backdrop-blur-3xl border border-white/30 rounded-2xl px-6 py-5 text-white outline-none font-black placeholder:text-white/40"
              />
              <button type="submit" className="bg-emerald-600 text-white px-8 rounded-2xl font-black uppercase text-xs tracking-widest">
                Add
              </button>
            </form>
          )}
          {showManual && (
            <button 
              onClick={() => setShowManual(false)} 
              className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em] self-center"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const fmt = (n: number) => new Intl.NumberFormat('en-IN', { 
  style: 'currency', 
  currency: 'INR',
  maximumFractionDigits: 2 
}).format(n);

export default Scanner;
