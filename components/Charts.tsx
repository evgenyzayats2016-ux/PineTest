import React from 'react';

const Charts: React.FC = () => {
    // Заменен виджет TradingView на iframe от Investing.com по запросу.
    // Iframe стилизован для полной адаптивности, чтобы заполнить родительский контейнер.
    // Параметры width и height были удалены из URL-адреса,
    // чтобы позволить графику адаптироваться к размерам iframe.
    return (
        <div className="h-[calc(100vh-10rem)] w-full">
            <iframe
                className="w-full h-full border-0"
                src="https://ssltvc.investing.com/?pair_ID=8862&interval=3600&plotStyle=candles&domain_ID=7&lang_ID=7&timezone_ID=17"
                title="График фьючерсов на природный газ от Investing.com"
            ></iframe>
        </div>
    );
};

export default Charts;