import * as React from 'react';
import { BorderRadiusObject, Shape } from '../types';
import { ITourGuideContext } from './TourGuideContext';

declare var __TEST__: boolean;

const MAX_MEASURE_WAIT_FRAMES = 120;

interface Props {
  name: string;
  text: string;
  order: number;
  tourKey: string;
  active?: boolean;
  shape?: Shape;
  context: ITourGuideContext;
  children?: any;
  maskOffset?: number;
  borderRadiusObject?: BorderRadiusObject;
  borderRadius?: number;
  keepTooltipPosition?: boolean;
  tooltipBottomOffset?: number;
}

export class ConnectedStep extends React.Component<Props> {
  static defaultProps = {
    active: true,
  };
  wrapperRef = React.createRef<any>();
  componentDidMount() {
    if (this.props.active) {
      this.register();
    }
  }

  componentDidUpdate(prevProps: Props) {
    if (this.props.active !== prevProps.active) {
      if (this.props.active) {
        this.register();
      } else {
        this.unregister();
      }
    }
  }

  componentWillUnmount() {
    this.unregister();
  }

  setNativeProps(obj: any) {
    if (this.wrapperRef.current) {
      this.wrapperRef.current.setNativeProps(obj);
    }
  }

  register() {
    if (this.props.context && this.props.context.registerStep) {
      this.props.context.registerStep(this.props.tourKey, {
        target: this,
        wrapper: this.wrapperRef,
        ...this.props,
      });
    } else {
      console.warn('context undefined');
    }
  }

  unregister() {
    if (this.props.context && this.props.context.unregisterStep) {
      this.props.context.unregisterStep(this.props.tourKey, this.props.name);
    } else {
      console.warn('unregisterStep undefined');
    }
  }

  measure() {
    if (typeof __TEST__ !== 'undefined' && __TEST__) {
      return new Promise((resolve) =>
        resolve({
          x: 0,
          y: 0,
          width: 0,
          height: 0,
        })
      );
    }

    return new Promise((resolve) => {
      let attempts = 0;
      let lastSize: { x: number; y: number; width: number; height: number } | undefined;

      const tryMeasure = () => {
        if (++attempts > MAX_MEASURE_WAIT_FRAMES) {
          // The element never settled — fall back to the last valid measurement
          resolve(lastSize || { x: 0, y: 0, width: 0, height: 0 });
          return;
        }

        const node = this.wrapperRef.current;
        if (node && node.measure) {
          const { borderRadius } = this.props;
          node.measure(
            (_ox: number, _oy: number, width: number, height: number, x: number, y: number) => {
              if (width === 0 || height === 0) {
                requestAnimationFrame(tryMeasure);
              } else {
                const size = {
                  x: borderRadius ? x + borderRadius : x,
                  y,
                  width: borderRadius ? width - borderRadius * 2 : width,
                  height,
                };
                // Resolve only once the element stops moving (layout settled)
                if (
                  lastSize &&
                  lastSize.x === size.x &&
                  lastSize.y === size.y &&
                  lastSize.width === size.width &&
                  lastSize.height === size.height
                ) {
                  resolve(size);
                  return;
                }
                lastSize = size;
                requestAnimationFrame(tryMeasure);
              }
            }
          );
        } else {
          requestAnimationFrame(tryMeasure);
        }
      };

      tryMeasure();
    });
  }

  render() {
    const copilot = {
      ref: this.wrapperRef,
      onLayout: () => {},
    };

    return React.cloneElement(this.props.children, { copilot });
  }
}
