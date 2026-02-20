import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    /* config options here */
    reactCompiler: true,
    experimental: {
        serverActions: {
            allowedOrigins: ["blukastor.brandboost-ai.com.localhost:3000", "localhost:3000"],
        },
    },
    output: 'standalone',
    // @ts-ignore - Turbopack root override to fix workspace root inference issue
    turbopack: {
        root: __dirname,
        resolveAlias: {
            "shadcn": "./node_modules/shadcn",
        },
    },
};

export default nextConfig;
