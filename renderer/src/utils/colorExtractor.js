/**
 * Generate a vibrant color based on text input (song title + artist)
 * This avoids CORS issues with external images
 */
export const generateColorFromText = (text) => {
  if (!text) {
    return { r: 30, g: 30, b: 30 };
  }

  // Create a hash from the text
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash; // Convert to 32bit integer
  }

  // Convert hash to hue (0-360 degrees)
  const hue = Math.abs(hash % 360) / 360;

  // Use vibrant saturation and medium luminosity for nice colors
  const saturation = 0.65 + (Math.abs(hash % 20) / 100); // 0.65-0.85
  const luminosity = 0.35 + (Math.abs(hash % 15) / 100); // 0.35-0.50

  return hslToRgb(hue, saturation, luminosity);
};

/**
 * Convert HSL to RGB
 */
const hslToRgb = (h, s, l) => {
  let r, g, b;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  };
};

/**
 * Generate gradient colors from dominant color
 */
export const generateGradient = (dominantColor) => {
  const { r, g, b } = dominantColor;

  // Create darker version for gradient
  const darkerR = Math.floor(r * 0.2);
  const darkerG = Math.floor(g * 0.2);
  const darkerB = Math.floor(b * 0.2);

  // Create even darker version for bottom
  const darkestR = Math.floor(r * 0.1);
  const darkestG = Math.floor(g * 0.1);
  const darkestB = Math.floor(b * 0.1);

  return {
    primary: `rgb(${r}, ${g}, ${b})`,
    dark: `rgb(${darkerR}, ${darkerG}, ${darkerB})`,
    gradient: `linear-gradient(180deg, rgb(${r}, ${g}, ${b}) 0%, rgb(${darkerR}, ${darkerG}, ${darkerB}) 50%, rgb(${darkestR}, ${darkestG}, ${darkestB}) 100%)`
  };
};
