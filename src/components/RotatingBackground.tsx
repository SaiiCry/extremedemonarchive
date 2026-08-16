import { useEffect, useState } from 'react';

// Background images rotate every 4 hours based on real time,
// so all visitors see the same background during the same window.
const BACKGROUND_IMAGES = [
  'https://cdn.wegic.ai/assets/onepage/uploads/2069629453812817922/image/2026/08/16/01M04HN4ZA83ZAZ6Z20A2E1KQZ.png?imageMogr2/format/webp',
  'https://cdn.wegic.ai/assets/onepage/uploads/2069629453812817922/image/2026/08/16/01M04HNH02AAYQD39G8SR3KWSB.png?imageMogr2/format/webp',
  'https://cdn.wegic.ai/assets/onepage/uploads/2069629453812817922/image/2026/08/16/01M04HNY6B2Y3FH6YFANFYJFN3.png?imageMogr2/format/webp',
  'https://cdn.wegic.ai/assets/onepage/uploads/2069629453812817922/image/2026/08/16/01M04HPX80JKWPFHCG85RQC76Y.png?imageMogr2/format/webp',
  'https://cdn.wegic.ai/assets/onepage/uploads/2069629453812817922/image/2026/08/16/01M04HQZR2FN322S1J1XXPYDXK.png?imageMogr2/format/webp',
  'https://cdn.wegic.ai/assets/onepage/uploads/2069629453812817922/image/2026/08/16/01M04HSP0CTJ2ETD6JQJ7B0EQX.png?imageMogr2/format/webp',
];

const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;

function getCurrentBackgroundIndex() {
  const slot = Math.floor(Date.now() / FOUR_HOURS_MS);
  return slot % BACKGROUND_IMAGES.length;
}

export default function RotatingBackground() {
  const [index, setIndex] = useState(getCurrentBackgroundIndex());

  useEffect(() => {
    // Check periodically in case the tab stays open across a 4h boundary
    const interval = setInterval(() => {
      setIndex(getCurrentBackgroundIndex());
    }, 5 * 60 * 1000); // check every 5 minutes
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 -z-20 overflow-hidden pointer-events-none">
      {BACKGROUND_IMAGES.map((src, i) => (
        <img
          key={src}
          src={src}
          alt=""
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-[3000ms] ease-in-out"
          style={{
            opacity: i === index ? 0.38 : 0,
            filter: 'blur(4px) saturate(1.25)',
          }}
        />
      ))}
      <div className="absolute inset-0 bg-[#06070a]/40" />
    </div>
  );
}
