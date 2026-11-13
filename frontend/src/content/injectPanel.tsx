/// <reference types="chrome" />
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Panel } from '../panel/Panel';
// @ts-ignore
import tailwindStyles from '../globals.css?inline';
// @ts-ignore
import panelStyles from '../panel/Panel.css?inline';
import { isProductPage, getProductData } from './extractor';
import { publishProductData, publishToggle } from './internalBridge';

const APP_ID = 'shop-safe-ai-root';

function inject() {
    console.log('[Shop Safe] Injecting panel...');
    if (!isProductPage()) return;
    if (document.getElementById(APP_ID)) return;

    const host = document.createElement('div');
    host.id = APP_ID;
    host.style.position = 'fixed';
    host.style.top = '0';
    host.style.left = '0';
    host.style.width = '100vw';
    host.style.height = '100vh';
    host.style.zIndex = '2147483647';
    host.style.pointerEvents = 'none';

    document.body.appendChild(host);

    const shadow = host.attachShadow({ mode: 'open' });

    const container = document.createElement('div');
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.pointerEvents = 'none';
    container.style.backgroundColor = 'transparent';

    shadow.appendChild(container);

    const styleTag = document.createElement('style');
    // Combine Tailwind styles and our layout styles
    styleTag.textContent = (tailwindStyles as string) + '\n' + (panelStyles as string);
    shadow.appendChild(styleTag);

    // Keep the extension visually consistent across every store.
    container.style.setProperty('--host-accent', '#2563eb');

    const root = ReactDOM.createRoot(container);
    root.render(
        <React.StrictMode>
            <Panel />
        </React.StrictMode>
    );

    let lastProductFingerprint = '';
    let updateTimer: number | undefined;

    const publishUpdatedProductData = () => {
        const data = getProductData();
        const fingerprint = JSON.stringify([
            data.productUrl,
            data.productName,
            data.price,
            data.seller,
            data.reviews.averageRating ?? 0,
            data.reviews.reviewCount ?? 0,
            data.reviews.comments.length,
        ]);

        if (fingerprint === lastProductFingerprint) return;
        lastProductFingerprint = fingerprint;
        publishProductData(data);
    };

    // Commerce pages commonly render price and reviews in separate, delayed
    // requests. Retry a few times and observe later SPA updates.
    [700, 2_000, 5_000, 9_000].forEach(delay => {
        window.setTimeout(publishUpdatedProductData, delay);
    });
    const productObserver = new MutationObserver(() => {
        if (updateTimer !== undefined) window.clearTimeout(updateTimer);
        updateTimer = window.setTimeout(publishUpdatedProductData, 1_200);
    });
    productObserver.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
    });

    // Toggle logic for Keyboard Shortcut - forward to React
    chrome.runtime.onMessage.addListener((message: any) => {
        if (message.type === 'TOGGLE_PANEL') {
            publishToggle();
        }
    });

    host.style.display = 'block';
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
} else {
    inject();
}
