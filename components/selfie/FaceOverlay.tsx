"use client";

import { motion } from "framer-motion";

interface FaceOverlayProps {
    isAligned: boolean;
    faceDetected: boolean;
}

export const FaceOverlay: React.FC<FaceOverlayProps> = ({
    isAligned,
    faceDetected,
}) => {
    const strokeColor = isAligned ? "#22c55e" : faceDetected ? "#eab308" : "#ef4444";
    const strokeWidth = isAligned ? 4 : 2;

    return (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <svg
                viewBox="0 0 100 100"
                className="w-full h-full opacity-80"
                preserveAspectRatio="none"
            >
                <defs>
                    <mask id="mask" x="0" y="0" width="100%" height="100%">
                        <rect x="0" y="0" width="100%" height="100%" fill="white" />
                        <motion.ellipse
                            cx="50"
                            cy="45"
                            rx="20"
                            ry="28"
                            fill="black"
                            animate={{
                                rx: isAligned ? 21 : 20,
                                ry: isAligned ? 29 : 28,
                            }}
                            transition={{
                                duration: 0.5,
                                repeat: isAligned ? 0 : Infinity,
                                repeatType: "reverse",
                            }}
                        />
                    </mask>
                </defs>
                <rect
                    x="0"
                    y="0"
                    width="100%"
                    height="100%"
                    fill="rgba(0,0,0,0.6)"
                    mask="url(#mask)"
                />

                <motion.ellipse
                    cx="50"
                    cy="45"
                    rx="20"
                    ry="28"
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={strokeWidth} // standardized unit
                    strokeDasharray={isAligned ? "0" : "4 2"}
                    animate={{
                        scale: isAligned ? 1.05 : 1,
                        stroke: strokeColor,
                    }}
                    transition={{ duration: 0.3 }}
                />
            </svg>

            <div className="absolute top-1/2 mt-40 text-center">
                <p className={`text-xl font-bold ${isAligned ? 'text-green-400' : 'text-white'}`}>
                    {isAligned ? "¡Perfecto! Mantén la posición" : "Ubica tu cara en el óvalo"}
                </p>
            </div>
        </div>
    );
};
