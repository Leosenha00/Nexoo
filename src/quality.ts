export const qualities = {
  "1080p · 60 FPS": [1920, 1080, 60, 12000000],
  "1080p · 30 FPS": [1920, 1080, 30, 7000000],
  "1440p · 60 FPS": [2560, 1440, 60, 18000000],
  "4K · 30 FPS": [3840, 2160, 30, 26000000],
  "720p · 30 FPS": [1280, 720, 30, 3500000],
} as const;

export type Quality = keyof typeof qualities;
