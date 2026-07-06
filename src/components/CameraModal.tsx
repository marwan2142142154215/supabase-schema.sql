import { useState, useRef, useEffect } from 'react'
import { Camera, X, FlipHorizontal } from 'lucide-react'

interface Props {
  onCapture: (photoDataUrl: string | null) => void
  onClose: () => void
  optional?: boolean
}

export default function CameraModal({ onCapture, onClose, optional }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [captured, setCaptured] = useState<string | null>(null)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user')
  const [error, setError] = useState('')

  useEffect(() => {
    startCamera()
    return () => stopCamera()
  }, [facingMode])

  const startCamera = async () => {
    stopCamera()
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode, width: { ideal: 640 }, height: { ideal: 480 } } })
      if (videoRef.current) { videoRef.current.srcObject = s }
      setStream(s)
      setError('')
    } catch (err: any) {
      setError('Kamera tidak tersedia: ' + (err.message || ''))
    }
  }

  const stopCamera = () => {
    if (stream) { stream.getTracks().forEach(t => t.stop()); setStream(null) }
  }

  const capture = () => {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current, canvas = canvasRef.current
    canvas.width = video.videoWidth; canvas.height = video.videoHeight
    canvas.getContext('2d')!.drawImage(video, 0, 0)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.7)
    setCaptured(dataUrl)
    stopCamera()
  }

  const retake = () => { setCaptured(null); startCamera() }

  const confirm = () => { onCapture(captured) }

  const skip = () => { onCapture(null) }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-secondary rounded-2xl p-4 max-w-lg w-full mx-4 border border-custom">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold">Kamera</h3>
          <button onClick={() => { stopCamera(); onClose() }} className="p-1 hover:bg-white/10 rounded-lg"><X size={20} /></button>
        </div>

        {error && (
          <div className="text-center py-8">
            <p className="text-accent-red mb-4">{error}</p>
            {optional && <button onClick={skip} className="px-6 py-2 bg-accent-indigo rounded-xl text-sm">Lanjutkan tanpa foto</button>}
          </div>
        )}

        {!error && (
          <>
            {!captured ? (
              <div className="relative">
                <video ref={videoRef} autoPlay playsInline className="w-full rounded-xl bg-black" />
                <button onClick={() => setFacingMode(f => f === 'user' ? 'environment' : 'user')}
                  className="absolute top-2 right-2 p-2 bg-black/50 rounded-lg text-white hover:bg-black/70">
                  <FlipHorizontal size={18} />
                </button>
                <div className="flex justify-center gap-4 mt-3">
                  <button onClick={capture} className="w-16 h-16 rounded-full bg-white border-4 border-accent-indigo flex items-center justify-center hover:scale-105 transition-transform">
                    <Camera size={28} className="text-black" />
                  </button>
                  {optional && <button onClick={skip} className="px-4 py-2 bg-card rounded-xl text-sm">Skip</button>}
                </div>
              </div>
            ) : (
              <div className="text-center">
                <img src={captured} alt="captured" className="w-full rounded-xl mb-3" />
                <div className="flex gap-2">
                  <button onClick={retake} className="flex-1 px-4 py-2 bg-card rounded-xl text-sm">Ulangi</button>
                  <button onClick={confirm} className="flex-1 px-4 py-2 bg-accent-green rounded-xl text-sm font-semibold">Gunakan</button>
                </div>
              </div>
            )}
          </>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  )
}
