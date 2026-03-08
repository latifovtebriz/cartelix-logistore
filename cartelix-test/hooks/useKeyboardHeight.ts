import { useEffect, useState } from 'react';

/**
 * Mobile klaviatura yüksəkliyini izləyən hook
 * Klaviatura açılanda ekranı dinamik tənzimləyir
 */
export function useKeyboardHeight() {
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const [viewportHeight, setViewportHeight] = useState(
        typeof window !== 'undefined' ? window.innerHeight : 0
    );

    useEffect(() => {
        const initialHeight = window.innerHeight;

        const handleResize = () => {
            const currentHeight = window.innerHeight;
            const heightDifference = initialHeight - currentHeight;

            // Əgər fərq 100px-dən çoxdursa, klaviatura açılıb
            if (heightDifference > 100) {
                setKeyboardHeight(heightDifference);
            } else {
                setKeyboardHeight(0);
            }
            setViewportHeight(currentHeight);
        };

        // visualViewport API daha dəqiqdir
        if ('visualViewport' in window && window.visualViewport) {
            const viewport = window.visualViewport;

            const handleViewportResize = () => {
                const heightDifference = initialHeight - viewport.height;
                if (heightDifference > 100) {
                    setKeyboardHeight(heightDifference);
                } else {
                    setKeyboardHeight(0);
                }
                setViewportHeight(viewport.height);
            };

            viewport.addEventListener('resize', handleViewportResize);
            return () => viewport.removeEventListener('resize', handleViewportResize);
        }

        // Fallback: window resize
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return { keyboardHeight, viewportHeight, isKeyboardOpen: keyboardHeight > 0 };
}

/**
 * Input focus olduqda ekranı scroll edən hook
 */
export function useScrollOnFocus(inputRef: React.RefObject<HTMLElement>) {
    useEffect(() => {
        const input = inputRef.current;
        if (!input) return;

        const handleFocus = () => {
            // Bir az gözlə ki, klaviatura tam açılsın
            setTimeout(() => {
                input.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
        };

        input.addEventListener('focus', handleFocus);
        return () => input.removeEventListener('focus', handleFocus);
    }, [inputRef]);
}

export default useKeyboardHeight;
