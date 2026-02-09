"use client";

import { useRef, useState, useCallback } from "react";
import Webcam from "react-webcam";
import { CameraView } from "@/components/selfie/CameraView";
import { FaceOverlay } from "@/components/selfie/FaceOverlay";
import { useFaceDetection } from "@/hooks/selfie/useFaceDetection";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { RefreshCcw, Camera, Check } from "lucide-react";

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
    const { isAligned, faceDetected, isLoading } = useFaceDetection(videoRef);

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

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-black relative">
            {imgSrc ? (
                <div className="relative w-full max-w-md aspect-[9/16] bg-gray-900 rounded-lg overflow-hidden">
                    <Image src={imgSrc} alt="Selfie" fill className="object-cover mirror-x" />
                    <div className="absolute bottom-10 left-0 right-0 flex justify-center gap-4 z-20">
                        <Button variant="secondary" size="icon" onClick={retake} className="rounded-full h-14 w-14">
                            <RefreshCcw className="h-6 w-6" />
                        </Button>
                        <Button variant="default" size="icon" onClick={confirmPhoto} className="rounded-full h-14 w-14 bg-green-500 hover:bg-green-600">
                            <Check className="h-6 w-6" />
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="relative w-full max-w-md h-[80vh] bg-gray-900 rounded-lg overflow-hidden">
                    <CameraView ref={webcamRef} onUserMedia={handleUserMedia} />

                    {!isLoading && (
                        <FaceOverlay isAligned={isAligned} faceDetected={faceDetected} />
                    )}

                    <div className="absolute bottom-10 left-0 right-0 flex justify-center z-20">
                        <Button
                            onClick={capture}
                            disabled={!isAligned}
                            className={`rounded-full h-16 w-16 transition-all duration-300 ${isAligned ? 'bg-white hover:bg-gray-200 scale-110' : 'bg-gray-500 opacity-50 cursor-not-allowed'}`}
                        >
                            <div className={`h-12 w-12 rounded-full border-4 ${isAligned ? 'border-black' : 'border-gray-300'}`} />
                        </Button>
                    </div>

                    {isLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-30">
                            <p className="text-white">Cargando cámara...</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
