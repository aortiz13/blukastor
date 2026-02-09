"use client";

import { useEffect, useState, useRef } from "react";
import { FilesetResolver, FaceLandmarker } from "@mediapipe/tasks-vision";

export const useFaceDetection = (
    videoRef: React.RefObject<HTMLVideoElement | null>
) => {
    const [isAligned, setIsAligned] = useState(false);
    const [faceDetected, setFaceDetected] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
    const requestRef = useRef<number>(0);

    useEffect(() => {
        const loadFaceLandmarker = async () => {
            try {
                const vision = await FilesetResolver.forVisionTasks(
                    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
                );
                faceLandmarkerRef.current = await FaceLandmarker.createFromOptions(
                    vision,
                    {
                        baseOptions: {
                            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
                            delegate: "GPU",
                        },
                        runningMode: "VIDEO",
                        numFaces: 1,
                    }
                );
                setIsLoading(false);
            } catch (err) {
                console.error("Error loading FaceLandmarker:", err);
                setError("Failed to load face detection model.");
                setIsLoading(false);
            }
        };

        loadFaceLandmarker();

        return () => {
            if (faceLandmarkerRef.current) {
                faceLandmarkerRef.current.close();
            }
        };
    }, []);

    const detectFace = () => {
        if (
            !faceLandmarkerRef.current ||
            !videoRef.current ||
            videoRef.current.readyState !== 4
        ) {
            requestRef.current = requestAnimationFrame(detectFace);
            return;
        }

        const video = videoRef.current;
        const startTimeMs = performance.now();
        const result = faceLandmarkerRef.current.detectForVideo(video, startTimeMs);

        if (result.faceLandmarks && result.faceLandmarks.length > 0) {
            setFaceDetected(true);
            const landmarks = result.faceLandmarks[0];

            // Simple alignment check logic
            // Check if nose tip (landmark 1) is within the center area
            // Check if face width is reasonable

            const noseTip = landmarks[1];
            const leftCheek = landmarks[234];
            const rightCheek = landmarks[454];

            const faceWidth = Math.abs(rightCheek.x - leftCheek.x);
            const isCentered =
                noseTip.x > 0.4 && noseTip.x < 0.6 && noseTip.y > 0.3 && noseTip.y < 0.7;
            const isCorrectSize = faceWidth > 0.25 && faceWidth < 0.55;

            setIsAligned(isCentered && isCorrectSize);
        } else {
            setFaceDetected(false);
            setIsAligned(false);
        }

        requestRef.current = requestAnimationFrame(detectFace);
    };

    useEffect(() => {
        if (!isLoading && !error) {
            requestRef.current = requestAnimationFrame(detectFace);
        }
        return () => cancelAnimationFrame(requestRef.current);
    }, [isLoading, error]);

    return { isAligned, faceDetected, isLoading, error };
};
