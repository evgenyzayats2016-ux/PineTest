import React from 'react';

interface ModalProps {
    children: React.ReactNode;
    title: string;
    onClose: () => void;
}

const Modal: React.FC<ModalProps> = ({ children, title, onClose }) => {
    // Close modal on escape key press
    React.useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4"
            aria-labelledby="modal-title"
            role="dialog"
            aria-modal="true"
            onClick={onClose}
        >
            <div 
                className="bg-brand-surface rounded-lg shadow-xl overflow-hidden max-w-4xl w-full max-h-[90vh] flex flex-col"
                onClick={e => e.stopPropagation()} // Prevent closing when clicking inside the modal
            >
                <div className="p-4 border-b border-brand-surface-light flex justify-between items-center">
                    <h2 id="modal-title" className="text-lg font-semibold text-brand-text">{title}</h2>
                    <button onClick={onClose} className="p-1 rounded-full text-brand-text-secondary hover:bg-brand-surface-light" aria-label="Close modal">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div className="p-4 overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Modal;
