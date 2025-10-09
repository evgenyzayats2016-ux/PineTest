
import React from 'react';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    title?: string;
    action?: React.ReactNode;
}

const Card: React.FC<CardProps> = ({ children, className = '', title, action }) => {
    return (
        <div className={`bg-brand-surface rounded-lg shadow-lg overflow-hidden ${className}`}>
            {title && (
                <div className="p-4 border-b border-brand-surface-light flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-brand-text">{title}</h3>
                    {action}
                </div>
            )}
            <div className="p-4">
                {children}
            </div>
        </div>
    );
};

export default Card;
