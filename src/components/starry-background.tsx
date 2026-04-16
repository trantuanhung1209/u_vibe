"use client";

import { useEffect, useRef } from "react";

export const StarryBackground = () => {
    const canvasRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!canvasRef.current) return;

        // Tạo các sao ngẫu nhiên
        const starCount = 50;
        const stars: HTMLDivElement[] = [];

        for (let i = 0; i < starCount; i++) {
            const star = document.createElement("div");
            star.className = "absolute rounded-full";
            
            // Vị trí ngẫu nhiên
            star.style.left = `${Math.random() * 100}%`;
            star.style.top = `${Math.random() * 100}%`;
            
            // Kích thước ngẫu nhiên
            const size = Math.random() * 3 + 1;
            star.style.width = `${size}px`;
            star.style.height = `${size}px`;
            
            // Màu sắc lung linh ngẫu nhiên
            const colors = [
                "rgba(147, 197, 253, 0.8)", // blue-300
                "rgba(196, 181, 253, 0.8)", // purple-300
                "rgba(252, 165, 165, 0.8)", // red-300
                "rgba(253, 224, 71, 0.8)",  // yellow-300
                "rgba(167, 243, 208, 0.8)", // green-300
                "rgba(251, 207, 232, 0.8)", // pink-300
            ];
            star.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            
            // Animation delay ngẫu nhiên
            const delay = Math.random() * 3;
            star.style.animationDelay = `${delay}s`;
            
            // Thời gian animation ngẫu nhiên
            const duration = Math.random() * 2 + 2;
            star.style.animation = `twinkle ${duration}s ease-in-out infinite`;
            
            canvasRef.current.appendChild(star);
            stars.push(star);
        }

        return () => {
            stars.forEach(star => star.remove());
        };
    }, []);

    return (
        <>
            <style jsx global>{`
                @keyframes twinkle {
                    0%, 100% {
                        opacity: 0;
                        transform: scale(0.8);
                    }
                    50% {
                        opacity: 1;
                        transform: scale(1.2);
                    }
                }
            `}</style>
            <div 
                ref={canvasRef}
                className="absolute inset-0 -z-10 h-full w-full bg-background dark:bg-[radial-gradient(#393e4a_1px,transparent_1px)] bg-[radial-gradient(#dadde2_1px,transparent_1px)] [background-size:16px_16px] overflow-hidden"
            />
        </>
    );
};
