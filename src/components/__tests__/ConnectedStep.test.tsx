import { ConnectedStep } from '../ConnectedStep';

jest.mock('react-native', () => ({
  ScrollView: class {},
}));

type MeasureCallback = (fx: number, fy: number, w: number, h: number, x: number, y: number) => void;

const createStep = (node: { measure: (cb: MeasureCallback) => void }) => {
  const step = new ConnectedStep({
    name: 'test',
    text: '',
    order: 0,
    tourKey: '_default',
    context: {},
  } as any);
  (step as any).wrapperRef.current = node;
  return step;
};

describe('ConnectedStep.measure', () => {
  beforeAll(() => {
    (globalThis as any).__TEST__ = undefined;
    (globalThis as any).requestAnimationFrame = (cb: () => void) => setTimeout(cb, 0);
  });

  test('resolves with the element rect once it is stable across two reads', async () => {
    const rect = { x: 10, y: 20, width: 100, height: 50 };
    const step = createStep({
      measure: (cb: MeasureCallback) => cb(0, 0, rect.width, rect.height, rect.x, rect.y),
    });

    const result = await step.measure();
    expect(result).toEqual(rect);
  });

  test('waits for a moving element to settle before resolving', async () => {
    let reads = 0;
    const step = createStep({
      measure: (cb: MeasureCallback) => {
        reads += 1;
        cb(0, 0, 100, 50, reads === 1 ? 10 : 40, reads === 1 ? 20 : 60);
      },
    });

    const result = await step.measure();
    expect(result).toEqual({ x: 40, y: 60, width: 100, height: 50 });
  });

  test('retries while the element has zero size', async () => {
    let reads = 0;
    const step = createStep({
      measure: (cb: MeasureCallback) => {
        reads += 1;
        if (reads === 1) {
          cb(0, 0, 0, 0, 0, 0);
        } else {
          cb(0, 0, 100, 50, 10, 20);
        }
      },
    });

    const result = await step.measure();
    expect(result).toEqual({ x: 10, y: 20, width: 100, height: 50 });
  });

  test('falls back to the last valid measurement when the element never settles', async () => {
    let reads = 0;
    const step = createStep({
      measure: (cb: MeasureCallback) => {
        reads += 1;
        cb(0, 0, 100, 50, 10, 20 + reads);
      },
    });

    const result = await step.measure();
    // 120 attempts: the last valid read happens on attempt 120
    expect(result).toEqual({ x: 10, y: 140, width: 100, height: 50 });
  });
});
