"use dom";

import { LEGACY_WEB_HTML } from "./legacy-web-html";

export default function LegacyApp() {
  return (
    <div style={{ flex: 1 }}>
      <iframe
        srcDoc={LEGACY_WEB_HTML}
        allowFullScreen
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}
