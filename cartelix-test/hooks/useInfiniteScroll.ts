import { useEffect, useRef, useCallback, useState } from 'react';

interface UseInfiniteScrollOptions<T> {
    fetchData: (page: number) => Promise<{ content: T[]; last: boolean; totalPages: number }>;
    initialPage?: number;
}

interface UseInfiniteScrollResult<T> {
    items: T[];
    isLoading: boolean;
    hasMore: boolean;
    loadMore: () => void;
    reset: () => void;
    loadMoreRef: React.RefObject<HTMLDivElement>;
}

/**
 * Infinite scroll hook - IntersectionObserver ilə avtomatik yükləmə
 */
export function useInfiniteScroll<T>({
    fetchData,
    initialPage = 0,
}: UseInfiniteScrollOptions<T>): UseInfiniteScrollResult<T> {
    const [items, setItems] = useState<T[]>([]);
    const [page, setPage] = useState(initialPage);
    const [isLoading, setIsLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    const loadMoreRef = useRef<HTMLDivElement>(null);
    const observerRef = useRef<IntersectionObserver | null>(null);

    const loadMore = useCallback(async () => {
        if (isLoading || !hasMore) return;

        setIsLoading(true);
        try {
            const result = await fetchData(page);
            setItems(prev => [...prev, ...result.content]);
            setHasMore(!result.last);
            setPage(p => p + 1);
        } catch (error) {
            console.error('[InfiniteScroll] Yükləmə xətası:', error);
        } finally {
            setIsLoading(false);
        }
    }, [fetchData, page, isLoading, hasMore]);

    const reset = useCallback(() => {
        setItems([]);
        setPage(initialPage);
        setHasMore(true);
    }, [initialPage]);

    // IntersectionObserver quraşdır
    useEffect(() => {
        if (observerRef.current) {
            observerRef.current.disconnect();
        }

        observerRef.current = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !isLoading) {
                    loadMore();
                }
            },
            { threshold: 0.1, rootMargin: '100px' }
        );

        if (loadMoreRef.current) {
            observerRef.current.observe(loadMoreRef.current);
        }

        return () => {
            observerRef.current?.disconnect();
        };
    }, [hasMore, isLoading, loadMore]);

    // İlk yükləmə
    useEffect(() => {
        if (items.length === 0 && hasMore) {
            loadMore();
        }
    }, []);

    return {
        items,
        isLoading,
        hasMore,
        loadMore,
        reset,
        loadMoreRef,
    };
}

export default useInfiniteScroll;
