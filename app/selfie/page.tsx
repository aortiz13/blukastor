"use client";

import { useRef, useState, useCallback } from "react";
import Webcam from "react-webcam";
import { CameraView } from "@/components/selfie/CameraView";
import { FaceOverlay } from "@/components/selfie/FaceOverlay";
import { useFaceDetection } from "@/hooks/selfie/useFaceDetection";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { RefreshCcw, Check, Aperture } from "lucide-react";

export default function SelfiePage() {
    const webcamRef = useRef<Webcam>(null);
    const [imgSrc, setImgSrc] = useState<string | null>(null);

    // Create a ref for the video element that useFaceDetection can key off of
    const videoRef = useRef<HTMLVideoElement | null>(null);

    // We need to bridge the webcamRef to videoRef so our hook can see it
    const handleUserMedia = useCallback(() => {
        if (webcamRef.current && webcamRef.current.video) {
            videoRef.current = webcamRef.current.video;
        }
    }, [webcamRef]);

    // Hook handles the logic
    const { isAligned, isSmiling, faceDetected, multipleFacesDetected, isLoading, error } = useFaceDetection(videoRef);

    const capture = useCallback(() => {
        if (webcamRef.current) {
            const imageSrc = webcamRef.current.getScreenshot();
            setImgSrc(imageSrc);
        }
    }, [webcamRef]);

    const retake = () => {
        setImgSrc(null);
    };

    const confirmPhoto = () => {
        // Logic to save/use the photo
        console.log("Photo confirmed:", imgSrc);
        // Proceed to next step...
    };

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-black text-white p-4">
                <p className="text-center text-red-400">Error: {error}. Por favor recarga la página.</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-black relative font-sans">
            {imgSrc ? (
                <div className="relative w-full max-w-md aspect-[9/16] bg-gray-900 rounded-2xl overflow-hidden shadow-2xl">
                    <Image src={imgSrc} alt="Selfie" fill className="object-cover mirror-x" />
                    <div className="absolute bottom-10 left-0 right-0 flex justify-center gap-8 z-20">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={retake}
                            className="rounded-full h-16 w-16 border-2 border-white/20 bg-black/40 text-white hover:bg-black/60 hover:text-white hover:scale-105 transition-all backdrop-blur-sm"
                        >
                            <RefreshCcw className="h-6 w-6" />
                        </Button>
                        <Button
                            variant="default"
                            size="icon"
                            onClick={confirmPhoto}
                            className="rounded-full h-16 w-16 bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/30 hover:scale-105 transition-all"
                        >
                            <Check className="h-8 w-8" />
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="relative w-full max-w-md h-[85vh] bg-gray-900 rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10">
                    <CameraView ref={webcamRef} onUserMedia={handleUserMedia} />

                    {!isLoading && (
                        <FaceOverlay
                            isAligned={isAligned}
                            isSmiling={isSmiling}
                            faceDetected={faceDetected}
                            multipleFacesDetected={multipleFacesDetected}
                        />
                    )}

                    <div className="absolute bottom-12 left-0 right-0 flex justify-center z-20">
                        <Button
                            onClick={capture}
                            disabled={!isAligned}
                            className={`
                    rounded-full h-20 w-20 p-0 border-4 transition-all duration-500 flex items-center justify-center group
                    ${isAligned
                                    ? 'bg-white border-emerald-500 scale-110 shadow-[0_0_30px_rgba(16,185,129,0.4)] cursor-pointer'
                                    : 'bg-transparent border-white/30 scale-100 opacity-60 cursor-not-allowed'
                                }
                `}
                        >
                            <div className={`
                    h-16 w-16 rounded-full transition-all duration-500
                    ${isAligned ? 'bg-emerald-500 scale-90 group-hover:scale-75' : 'bg-transparent'}
                `}>
                                {isAligned && <Aperture className="text-white h-full w-full p-3 animate-pulse" />}
                            </div>
                        </Button>
                    </div>

                    {isLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-30 backdrop-blur-sm">
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                                <p className="text-white font-light tracking-wide">Iniciando cámara...</p>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
