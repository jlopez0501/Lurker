import { Platform } from 'react-native';

export const Reddit = {
  orange: '#FF4500',
  blue: '#0079D3',
  bg: '#0D1117',
  surface: '#1A1A1B',
  card: '#272729',
  border: '#343536',
  textPrimary: '#D7DADC',
  textSecondary: '#818384',
  textMuted: '#4A4A4B',
  upvote: '#FF4500',
  downvote: '#7193FF',
};

export const Colors = {
  light: {
    text: '#1C1C1C',
    background: '#DAE0E6',
    tint: Reddit.orange,
    icon: '#878A8C',
    tabIconDefault: '#878A8C',
    tabIconSelected: Reddit.orange,
  },
  dark: {
    text: Reddit.textPrimary,
    background: Reddit.bg,
    tint: Reddit.orange,
    icon: Reddit.textSecondary,
    tabIconDefault: Reddit.textSecondary,
    tabIconSelected: Reddit.orange,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
