/* ═══════════════════════════════════════════════════════════
   WebSocket Client — Connection management
   ═══════════════════════════════════════════════════════════ */

const Network = (() => {
  let ws = null;
  let messageHandler = null;
  let reconnectTimer = null;
  let url = null;

  function connect(onMessage) {
    messageHandler = onMessage;
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    url = `${protocol}//${location.host}`;

    ws = new WebSocket(url);

    ws.onopen = () => {
      console.log('[WS] Connected');
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (messageHandler) messageHandler(data);
      } catch (e) {
        console.error('[WS] Parse error:', e);
      }
    };

    ws.onclose = () => {
      console.log('[WS] Disconnected');
      // Attempt reconnect after 2 seconds
      reconnectTimer = setTimeout(() => {
        console.log('[WS] Reconnecting...');
        connect(messageHandler);
      }, 2000);
    };

    ws.onerror = (err) => {
      console.error('[WS] Error:', err);
    };
  }

  function send(data) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    } else {
      console.warn('[WS] Not connected, cannot send:', data);
    }
  }

  function disconnect() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (ws) {
      ws.onclose = null; // prevent reconnect
      ws.close();
      ws = null;
    }
  }

  return { connect, send, disconnect };
})();
