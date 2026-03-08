// Browser Push Notification Service
// Handles permission requests and sending browser notifications

export const pushNotificationService = {
    // Check if push notifications are supported
    isSupported: (): boolean => {
        return 'Notification' in window && 'serviceWorker' in navigator;
    },

    // Get current permission status
    getPermissionStatus: (): NotificationPermission | 'unsupported' => {
        if (!pushNotificationService.isSupported()) {
            return 'unsupported';
        }
        return Notification.permission;
    },

    // Request notification permission from user
    requestPermission: async (): Promise<NotificationPermission | 'unsupported'> => {
        if (!pushNotificationService.isSupported()) {
            console.warn('Push notifications are not supported in this browser');
            return 'unsupported';
        }

        try {
            const permission = await Notification.requestPermission();
            return permission;
        } catch (error) {
            console.error('Error requesting notification permission:', error);
            return 'denied';
        }
    },

    // Show a browser notification
    showNotification: (title: string, options?: NotificationOptions): Notification | null => {
        if (!pushNotificationService.isSupported()) {
            console.warn('Push notifications not supported');
            return null;
        }

        if (Notification.permission !== 'granted') {
            console.warn('Notification permission not granted');
            return null;
        }

        try {
            const notification = new Notification(title, {
                icon: '/logistore-logo.svg',
                badge: '/logistore-logo.svg',
                ...options,
            });

            // Auto-close after 5 seconds
            setTimeout(() => {
                notification.close();
            }, 5000);

            return notification;
        } catch (error) {
            console.error('Error showing notification:', error);
            return null;
        }
    },

    // Show discount notification
    showDiscountNotification: (productName: string, discount: number, productId?: number): void => {
        pushNotificationService.showNotification(
            '🎉 Endirim!',
            {
                body: `${productName} üzərində ${discount}% endirim! İndi yoxlayın.`,
                tag: 'discount-' + (productId || Date.now()),
                data: { type: 'discount', productId },
                requireInteraction: true,
            }
        );
    },

    // Show points earned notification
    showPointsNotification: (points: number): void => {
        pushNotificationService.showNotification(
            '⭐ Bonus Qazandınız!',
            {
                body: `${points} bonus puan hesabınıza əlavə edildi.`,
                tag: 'points-' + Date.now(),
                data: { type: 'points' },
            }
        );
    },

    // Show order status notification
    showOrderNotification: (status: string, orderId?: string): void => {
        pushNotificationService.showNotification(
            '📦 Sifariş Yeniləndi',
            {
                body: `Sifarişiniz: ${status}`,
                tag: 'order-' + (orderId || Date.now()),
                data: { type: 'order', orderId },
            }
        );
    },
};

export default pushNotificationService;
