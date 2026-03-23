'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import Cookies from 'js-cookie';
import { useAuth } from './auth-context';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    // Only connect if user is logged in
    if (!user) return;

    const token = Cookies.get('token');
    if (!token) return;

    // Initialize Socket Connection
    // Ensure we connect to the root URL, not /api namespace
    const baseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000').replace(/\/api\/?$/, '');

    const socketInstance = io(baseUrl, {
      auth: {
        token: token,
      },
      // Ensure we're not creating multiple connections
      autoConnect: true,
      reconnection: true,
      transports: ['websocket'],
    });

    socketInstance.on('connect', () => {
      console.log('Socket connected:', socketInstance.id);
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
    });

    const id = setTimeout(() => setSocket(socketInstance), 0);

    return () => {
      clearTimeout(id);
      socketInstance.disconnect();
      setTimeout(() => {
        setSocket(null);
        setIsConnected(false);
      }, 0);
    };
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};
