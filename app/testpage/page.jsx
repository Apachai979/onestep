'use client'
import { useState, useEffect } from 'react';

export default function TestPage() {
    const [content, setContent] = useState('Первоначальное состояние');
    const [isAnimating, setIsAnimating] = useState(false);

    const handleUpdate = () => {
        // Запускаем анимацию перед обновлением контента
        setIsAnimating(true);

        setTimeout(() => {
            setContent('Обновленное состояние');
            setIsAnimating(false);
        }, 300); // Длительность анимации 300ms
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen">
            <div
                className={`p-6 bg-blue-500 text-white rounded-lg transition-all duration-300 transform ${isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
                    }`}
            >
                {content}
            </div>
            <button
                onClick={handleUpdate}
                className="mt-4 px-4 py-2 bg-green-500 text-white rounded-lg"
            >
                Обновить блок
            </button>
        </div>
    );
}
