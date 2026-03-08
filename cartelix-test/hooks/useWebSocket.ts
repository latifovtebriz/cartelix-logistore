import { useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

export const useWebSocket = (topic: string, onMessage: (message: any) => void) => {
    const clientRef = useRef<Client | null>(null);
    const onMessageRef = useRef(onMessage);

    useEffect(() => {
        onMessageRef.current = onMessage;
    }, [onMessage]);

    useEffect(() => {
        // Use relative path so Vite proxy handles it
        const socket = new SockJS('/ws');

        const client = new Client({
            webSocketFactory: () => socket,
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
            onConnect: () => {
                client.subscribe(topic, (message) => {
                    if (message.body) {
                        try {
                            const parsed = JSON.parse(message.body);
                            onMessageRef.current(parsed);
                        } catch (e) {
                            onMessageRef.current(message.body);
                        }
                    }
                });
            },
            onStompError: () => { },
            onWebSocketClose: () => { },
        });

        client.activate();
        clientRef.current = client;

        return () => {
            client.deactivate();
        };
    }, [topic]);

    return clientRef.current;
};
