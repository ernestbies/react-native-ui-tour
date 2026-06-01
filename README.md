# React Native UI Tour

Interactive step-by-step tours for React Native applications.

This package is an improved fork of [`rn-tourguide`](https://github.com/xcarpentier/rn-tourguide), which itself was based on [`react-native-copilot`](https://github.com/mohebifar/react-native-copilot). The goal of this fork is to keep the familiar API while making the package easier to maintain, publish, and use in modern React Native projects.

## What Changed

- Refactored the package into a library-only build with no bundled sample application or Expo runtime.
- Updated dependencies and peer dependency boundaries for npm publishing.
- Improved TypeScript support and declaration generation.
- Added safer refs for measured tour targets.
- Added optional scroll-view support when starting a tour.
- Improved mask and tooltip animations.
- Improved tooltip spacing around the highlighted target.
- Kept compatibility with the core `rn-tourguide` concepts: provider, zones, keyed tours, custom tooltips, events, labels, and SVG masks.

## Credits

This project builds on previous open-source work:

- [`xcarpentier/rn-tourguide`](https://github.com/xcarpentier/rn-tourguide)
- [`mohebifar/react-native-copilot`](https://github.com/mohebifar/react-native-copilot)

This repository is a fork-derived package. Original authors are credited in the license file alongside the current maintainer.

## Installation

```sh
yarn add react-native-ui-tour react-native-safe-area-context react-native-svg
```

or:

```sh
npm install react-native-ui-tour react-native-safe-area-context react-native-svg
```

`react`, `react-native`, `react-native-safe-area-context`, and `react-native-svg` are peer dependencies. Your app must provide them.

For bare React Native projects, install native dependencies as required by `react-native-safe-area-context` and `react-native-svg`:

```sh
cd ios && pod install
```

## Basic Usage

Wrap your app with `TourGuideProvider`, then mark UI elements with `TourGuideZone`.

```tsx
import * as React from 'react';
import { Button, Text, View } from 'react-native';
import { TourGuideProvider, TourGuideZone, useTourGuideController } from 'react-native-ui-tour';

const AppContent = () => {
  const { canStart, start, stop, eventEmitter } = useTourGuideController();

  React.useEffect(() => {
    if (!eventEmitter) {
      return;
    }

    const onStart = () => console.log('Tour started');
    const onStop = () => console.log('Tour stopped');
    const onStepChange = () => console.log('Step changed');

    eventEmitter.on('start', onStart);
    eventEmitter.on('stop', onStop);
    eventEmitter.on('stepChange', onStepChange);

    return () => {
      eventEmitter.off('start', onStart);
      eventEmitter.off('stop', onStop);
      eventEmitter.off('stepChange', onStepChange);
    };
  }, [eventEmitter]);

  return (
    <View>
      <TourGuideZone zone={1} text="This is the title">
        <Text>Dashboard</Text>
      </TourGuideZone>

      <TourGuideZone zone={2} text="Tap here to continue">
        <Button title="Primary action" onPress={() => {}} />
      </TourGuideZone>

      <Button disabled={!canStart} title="Start tour" onPress={() => start()} />
      <Button title="Stop tour" onPress={() => stop()} />
    </View>
  );
};

export const App = () => (
  <TourGuideProvider borderRadius={12}>
    <AppContent />
  </TourGuideProvider>
);
```

## API

### `TourGuideProvider`

Place this component near the root of your app.

```tsx
<TourGuideProvider borderRadius={12} maskOffset={8} backdropColor="rgba(0, 0, 0, 0.55)">
  <App />
</TourGuideProvider>
```

Common props:

| Prop                        | Type                                | Description                                                                  |
| --------------------------- | ----------------------------------- | ---------------------------------------------------------------------------- |
| `tooltipComponent`          | `React.ComponentType<TooltipProps>` | Custom tooltip renderer.                                                     |
| `tooltipStyle`              | `StyleProp<ViewStyle>`              | Style applied to the tooltip wrapper.                                        |
| `labels`                    | `Labels`                            | Localized button labels.                                                     |
| `androidStatusBarVisible`   | `boolean`                           | Set when Android status bar should be included in positioning.               |
| `startAtMount`              | `boolean \| string`                 | Start automatically when steps are registered. A string starts a keyed tour. |
| `backdropColor`             | `string`                            | Overlay color.                                                               |
| `verticalOffset`            | `number`                            | Additional vertical offset for the mask position.                            |
| `maskOffset`                | `number`                            | Extra spacing around highlighted targets.                                    |
| `borderRadius`              | `number`                            | Default rectangular mask radius.                                             |
| `animationDuration`         | `number`                            | Mask animation duration in milliseconds.                                     |
| `dismissOnPress`            | `boolean`                           | Stop the tour when pressing the overlay.                                     |
| `preventOutsideInteraction` | `boolean`                           | Block interactions outside the tooltip while a tour is visible.              |

### `TourGuideZone`

Wrap a component that should be highlighted by the tour.

```tsx
<TourGuideZone zone={1} text="Profile settings" borderRadius={8}>
  <ProfileButton />
</TourGuideZone>
```

Common props:

| Prop                  | Type                 | Description                                        |
| --------------------- | -------------------- | -------------------------------------------------- |
| `zone`                | `number`             | Step order.                                        |
| `tourKey`             | `string`             | Optional tour identifier for multiple tours.       |
| `isTourGuide`         | `boolean`            | Disable wrapping when false.                       |
| `text`                | `string`             | Tooltip text.                                      |
| `shape`               | `Shape`              | Mask shape.                                        |
| `maskOffset`          | `number`             | Per-step mask offset.                              |
| `borderRadius`        | `number`             | Per-step rectangular mask radius.                  |
| `borderRadiusObject`  | `BorderRadiusObject` | Per-corner rectangular mask radius.                |
| `keepTooltipPosition` | `boolean`            | Preserve tooltip position between steps.           |
| `tooltipBottomOffset` | `number`             | Extra tooltip spacing from the highlighted target. |

Supported shapes:

```ts
type Shape = 'circle' | 'rectangle' | 'circle_and_keep' | 'rectangle_and_keep';
```

### `TourGuideZoneByPosition`

Use this when the highlighted area is not tied to a concrete child component.

```tsx
<TourGuideZoneByPosition
  isTourGuide
  zone={3}
  text="This area is important"
  top={80}
  left={24}
  width={180}
  height={64}
/>
```

### `useTourGuideController`

Use this hook to start, stop, and observe a tour.

```tsx
const {
  canStart,
  start,
  stop,
  eventEmitter,
  getCurrentStep,
  TourGuideZone,
  TourGuideZoneByPosition,
} = useTourGuideController();
```

Returned values:

| Value                              | Description                                                                  |
| ---------------------------------- | ---------------------------------------------------------------------------- |
| `start(fromStep?, scrollViewRef?)` | Starts the tour, optionally from a specific step and with a scroll view ref. |
| `stop()`                           | Stops the current tour.                                                      |
| `canStart`                         | True when the tour has registered steps.                                     |
| `eventEmitter`                     | Event emitter for `start`, `stop`, and `stepChange`.                         |
| `getCurrentStep()`                 | Returns the active step.                                                     |
| `TourGuideZone`                    | Zone component bound to the selected tour key.                               |
| `TourGuideZoneByPosition`          | Position-based zone component bound to the selected tour key.                |

## Multiple Tours

Pass a `tourKey` to `useTourGuideController` when your app has more than one independent tour.

```tsx
const { start, TourGuideZone } = useTourGuideController('onboarding');

return (
  <>
    <TourGuideZone zone={1} text="First onboarding step">
      <Text>Welcome</Text>
    </TourGuideZone>

    <Button title="Start onboarding" onPress={() => start()} />
  </>
);
```

You can also pass the same `tourKey` manually to `TourGuideZone`.

## Scroll Views

You can pass a scroll view ref to `start` so the active target can be scrolled into view before measurement.

```tsx
const scrollRef = React.useRef<ScrollView>(null);
const { start } = useTourGuideController();

return (
  <>
    <ScrollView ref={scrollRef}>
      <TourGuideZone zone={1} text="A field inside the scroll view">
        <Text>Account details</Text>
      </TourGuideZone>
    </ScrollView>

    <Button title="Start" onPress={() => start(undefined, scrollRef)} />
  </>
);
```

## Custom Tooltip

Provide `tooltipComponent` to control the tooltip UI.

```tsx
const CustomTooltip = ({
  currentStep,
  handleNext,
  handlePrev,
  handleStop,
  isFirstStep,
  isLastStep,
}: TooltipProps) => (
  <View>
    <Text>{currentStep.text}</Text>
    {!isFirstStep && <Button title="Back" onPress={handlePrev} />}
    {!isLastStep && <Button title="Next" onPress={handleNext} />}
    <Button title="Close" onPress={handleStop} />
  </View>
)

<TourGuideProvider tooltipComponent={CustomTooltip}>
  <App />
</TourGuideProvider>
```

## Events

`eventEmitter` uses [`mitt`](https://github.com/developit/mitt).

```tsx
eventEmitter.on('start', () => {});
eventEmitter.on('stop', () => {});
eventEmitter.on('stepChange', (step) => {});
```

## Labels

Customize default tooltip button labels.

```tsx
<TourGuideProvider
  labels={{
    previous: 'Previous',
    next: 'Next',
    skip: 'Skip',
    finish: 'Finish',
  }}
>
  <App />
</TourGuideProvider>
```

## License

MIT. See [LICENSE](./LICENSE).

This fork is maintained by [Ernest Bieś](https://ernestbies.com). Original license notices from `rn-tourguide` and `react-native-copilot` are preserved in the license file.
