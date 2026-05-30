export const Accelerometer = {
  setUpdateInterval: jest.fn(),
  addListener: jest.fn(() => ({ remove: jest.fn() })),
};
export const Gyroscope = {
  setUpdateInterval: jest.fn(),
  addListener: jest.fn(() => ({ remove: jest.fn() })),
};
