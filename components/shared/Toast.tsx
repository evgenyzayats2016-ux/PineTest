import React, { useEffect, useState } from 'react';

interface ToastProps {
  message: string;
  // FIX: Added 'error' to the supported types.
  type: 'success' | 'info' | 'error';
  onClose: () => void;
}

const ICONS = {
    info: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
    ),
    success: (
         <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
    ),
    // FIX: Added an icon for the 'error' type.
    error: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
    ),
};

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        setVisible(true); // Animate in
        const timer = setTimeout(() => {
            handleClose();
        }, 5000); // Auto-dismiss after 5 seconds

        return () => clearTimeout(timer);
    }, [message, type]); // Rerun effect if message or type changes

    const handleClose = () => {
        setVisible(false);
        // Wait for animation to finish before calling parent's onClose
        setTimeout(() => {
            onClose();
        }, 300);
    };

    const baseClasses = "fixed top-20 right-4 sm:right-6 lg:right-8 p-4 rounded-lg shadow-xl flex items-center space-x-4 z-50 transition-all duration-300 ease-in-out max-w-sm";
    const visibleClasses = "transform translate-x-0 opacity-100";
    const hiddenClasses = "transform translate-x-full opacity-0";

    const typeStyles = {
        info: 'bg-brand-accent text-white',
        success: 'bg-brand-success text-white',
        // FIX: Added a style for the 'error' type.
        error: 'bg-brand-danger text-white',
    };

    return (
        <div className={`${baseClasses} ${typeStyles[type]} ${visible ? visibleClasses : hiddenClasses}`} role="alert" aria-live="assertive">
            <div className="flex-shrink-0">{ICONS[type]}</div>
            <div className="flex-grow text-sm font-medium">{message}</div>
            <button onClick={handleClose} className="p-1 -mr-2 rounded-md hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white">
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
                <span className="sr-only">Закрыть</span>
            </button>
        </div>
    );
};

export default Toast;