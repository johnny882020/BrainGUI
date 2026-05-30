export const Audio = {
  requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
  setAudioModeAsync: jest.fn(async () => {}),
  Recording: jest.fn().mockImplementation(() => ({
    prepareToRecordAsync: jest.fn(async () => {}),
    startAsync: jest.fn(async () => {}),
    stopAndUnloadAsync: jest.fn(async () => {}),
    getStatusAsync: jest.fn(async () => ({ metering: -40 })),
  })),
  RecordingOptionsPresets: { LOW_QUALITY: {} },
};
