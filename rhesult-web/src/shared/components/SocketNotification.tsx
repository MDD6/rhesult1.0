'use client';

import React, { useEffect, useState } from 'react';
import { useSocket } from '../../context/SocketContext';

export interface NotificationPayload {
  title: string;
  message: string;
  type?: 'success' | 'error' | 'info';
}

interface NotificationItem extends NotificationPayload {
  id: string;
}

export const SocketNotification = () => {
    const { socket } = useSocket();
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);

    useEffect(() => {
        if (!socket) return;
        
        const handleNotification = (payload: NotificationPayload) => {
            const id = Math.random().toString(36).substring(7);
            const newItem = { ...payload, id };
            
            setNotifications(prev => [...prev, newItem]);

            // Auto dismiss
            setTimeout(() => {
                setNotifications(prev => prev.filter(n => n.id !== id));
            }, 5000);
        };

        socket.on('notification', handleNotification);

        return () => {
             socket.off('notification', handleNotification);
        }
    }, [socket]);

    const removeNotification = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    if (notifications.length === 0) return null;

    return (
        <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none w-full max-w-sm">
            {notifications.map((notif) => (
                <div 
                    key={notif.id}
                    className={`
                        pointer-events-auto px-4 py-3 rounded-lg shadow-lg 
                        transform transition-all duration-300 ease-in-out
                        border-l-4 mb-2 bg-white
                        ${notif.type === 'success' ? 'border-green-500 text-gray-800' : ''}
                        ${notif.type === 'error' ? 'bg-red-50 border-red-500 text-red-800' : ''}
                        ${notif.type === 'info' ? 'bg-blue-50 border-blue-500 text-blue-800' : ''}
                        ${!notif.type ? 'border-gray-500 text-gray-800' : ''}
                    `}
                >
                    <div className="flex justify-between items-start">
                        <div className="font-bold text-sm mb-1">{notif.title}</div>
                        <button 
                            onClick={() => removeNotification(notif.id)}
                            className="text-xs opacity-50 hover:opacity-100 ml-2 font-bold px-2 py-0.5 rounded hover:bg-black/5"
                        >
                            ✕
                        </button>
                    </div>
                    <div className="text-sm opacity-90">{notif.message}</div>
                </div>
            ))}
        </div>
    );
};
