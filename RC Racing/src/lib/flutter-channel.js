export const sendToFlutter = (action, payload = {}) => {
  console.log(`[R1 Bridge Debug] Action dispatched: ${action}`, payload);
  if (window.flutter_inappwebview && typeof window.flutter_inappwebview.callHandler === 'function') {
    window.flutter_inappwebview.callHandler(action, JSON.stringify(payload))
      .then(result => { console.log(`[R1 Bridge Response] Success:`, result); })
      .catch(err => { console.error(`[R1 Bridge Error]:`, err); });
  } else {
    console.warn(`[R1 Bridge Warning] Local simulation mode.`);
  }
};