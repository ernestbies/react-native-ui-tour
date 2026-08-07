import * as React from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  LayoutChangeEvent,
  Platform,
  StatusBar,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { EdgeInsets, SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { BorderRadiusObject, IStep, Labels, ValueXY } from '../types';
import styles, { MARGIN } from './style';
import { SvgMask } from './SvgMask';
import { Tooltip, TooltipProps } from './Tooltip';

declare var __TEST__: boolean;
const MIN_TOOLTIP_MASK_GAP = 24;
const DEFAULT_TOOLTIP_HEIGHT = 135;
const DEFAULT_SAFE_AREA_INSETS: EdgeInsets = {
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
};
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export interface ModalProps {
  ref: any;
  currentStep?: IStep;
  visible?: boolean;
  isFirstStep: boolean;
  isLastStep: boolean;
  animationDuration?: number;
  tooltipComponent: React.ComponentType<TooltipProps>;
  tooltipStyle?: StyleProp<ViewStyle>;
  maskOffset?: number;
  borderRadius?: number;
  borderRadiusObject?: BorderRadiusObject;
  androidStatusBarVisible: boolean;
  backdropColor: string;
  labels: Labels;
  dismissOnPress?: boolean;
  easing: (value: number) => number;
  stop: () => void;
  next: () => void;
  prev: () => void;
  preventOutsideInteraction?: boolean;
}

interface Layout {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

interface State {
  isFirstStep: boolean;
  isLastStep: boolean;
  tooltip: object;
  notAnimated?: boolean;
  containerVisible: boolean;
  layout?: Layout;
  size?: ValueXY;
  position?: ValueXY;
  tooltipTranslateY: Animated.Value;
  tooltipScale: Animated.Value;
  opacity: Animated.Value;
  currentStep?: IStep;
  tooltipHeight: number;
}

interface Move {
  top: number;
  left: number;
  width: number;
  height: number;
}

export class Modal extends React.Component<ModalProps, State> {
  static defaultProps = {
    easing: Easing.out(Easing.cubic),
    animationDuration: 200,
    tooltipComponent: Tooltip as any,
    tooltipStyle: {},
    androidStatusBarVisible: false,
    backdropColor: 'rgba(0, 0, 0, 0.4)',
    labels: {},
    isHorizontal: false,
    preventOutsideInteraction: false,
  };

  layout: Layout = {
    x: 0,
    y: 0,
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  };

  state = {
    isFirstStep: false,
    isLastStep: false,
    tooltip: {},
    containerVisible: false,
    tooltipTranslateY: new Animated.Value(0),
    tooltipScale: new Animated.Value(0.92),
    opacity: new Animated.Value(0),
    layout: undefined,
    size: undefined,
    position: undefined,
    currentStep: undefined,
    tooltipHeight: DEFAULT_TOOLTIP_HEIGHT,
  };

  tooltipAnimation: Animated.CompositeAnimation | null = null;
  currentTarget?: Move;
  safeAreaInsets: EdgeInsets = DEFAULT_SAFE_AREA_INSETS;

  constructor(props: ModalProps) {
    super(props);
  }

  componentDidUpdate(prevProps: ModalProps) {
    if (prevProps.visible === true && this.props.visible === false) {
      this.reset();
    }
  }

  handleLayoutChange = ({ nativeEvent: { layout } }: LayoutChangeEvent) => {
    this.layout = layout;
  };

  handleTooltipLayout = ({ nativeEvent: { layout } }: LayoutChangeEvent) => {
    const tooltipHeight = Math.ceil(layout.height);

    if (tooltipHeight > 0 && tooltipHeight !== this.state.tooltipHeight) {
      this.setState({ tooltipHeight }, () => {
        if (this.currentTarget && this.props.visible) {
          this._animateMove(this.currentTarget);
        }
      });
    }
  };

  measure(): Promise<Layout> {
    if (typeof __TEST__ !== 'undefined' && __TEST__) {
      return Promise.resolve({
        x: 0,
        y: 0,
        width: 0,
        height: 0,
      });
    }

    return Promise.resolve(this.layout);
  }

  async _animateMove(
    obj: Move = {
      top: 0,
      left: 0,
      width: 0,
      height: 0,
    }
  ) {
    const layout = await this.measure();
    this.currentTarget = { ...obj };

    if (!this.props.androidStatusBarVisible && Platform.OS === 'android') {
      obj.top -= StatusBar.currentHeight || 30;
    }

    const center = {
      x: obj.left! + obj.width! / 2,
      y: obj.top! + obj.height! / 2,
    };

    const relativeToTop = center.y;
    const relativeToBottom = Math.abs(center.y - layout.height!);

    const verticalPosition = relativeToBottom > relativeToTop ? 'bottom' : 'top';

    const tooltip = {
      top: 0,
      left: this.safeAreaInsets.left + MARGIN,
      right: this.safeAreaInsets.right + MARGIN,
      width: undefined,
      maxWidth: 0,
      maxHeight: Math.max(
        layout.height! - this.safeAreaInsets.top - this.safeAreaInsets.bottom - MARGIN * 2,
        0
      ),
    };

    const stepTooltipOffset = this.props.currentStep?.tooltipBottomOffset || 0;
    const tooltipMaskGap = MARGIN + MIN_TOOLTIP_MASK_GAP + stepTooltipOffset;

    const safeAreaTop = this.safeAreaInsets.top + MARGIN;
    const safeAreaBottom = layout.height! - this.safeAreaInsets.bottom - MARGIN;
    const safeAreaLeft = this.safeAreaInsets.left + MARGIN;
    const safeAreaRight = layout.width! - this.safeAreaInsets.right - MARGIN;
    tooltip.maxWidth = Math.max(safeAreaRight - safeAreaLeft, 0);

    const maskDuration = this.props.animationDuration!;
    const tooltipDuration = Math.round(maskDuration * 0.55);
    const tooltipDelay = Math.round(maskDuration * 0.65);
    const preferredToValue =
      verticalPosition === 'bottom'
        ? obj.top + obj.height + tooltipMaskGap
        : obj.top - tooltipMaskGap - this.state.tooltipHeight;
    const minTooltipY = safeAreaTop;
    const maxTooltipY = Math.max(safeAreaBottom - this.state.tooltipHeight, minTooltipY);
    const toValue = clamp(preferredToValue, minTooltipY, maxTooltipY);
    const slideOffset = verticalPosition === 'bottom' ? 16 : -16;

    this.state.opacity.setValue(0);
    this.state.tooltipTranslateY.setValue(toValue + slideOffset);
    this.state.tooltipScale.setValue(0.94);

    const translateAnim = Animated.timing(this.state.tooltipTranslateY, {
      toValue,
      duration: tooltipDuration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    const scaleAnim = Animated.timing(this.state.tooltipScale, {
      toValue: 1,
      duration: tooltipDuration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    const opacityAnim = Animated.timing(this.state.opacity, {
      toValue: 1,
      duration: tooltipDuration,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    });
    if (this.tooltipAnimation) {
      this.tooltipAnimation.stop();
    }
    this.setState({
      isFirstStep: this.props.isFirstStep,
      isLastStep: this.props.isLastStep,
      currentStep: this.props.currentStep,
    });
    const tooltipAnimations =
      toValue !== (this.state.tooltipTranslateY as any)._value &&
      !this.props.currentStep?.keepTooltipPosition
        ? [translateAnim, scaleAnim, opacityAnim]
        : [scaleAnim, opacityAnim];

    this.tooltipAnimation = Animated.sequence([
      Animated.delay(tooltipDelay),
      Animated.parallel(tooltipAnimations),
    ]);
    this.tooltipAnimation.start(() => {
      this.tooltipAnimation = null;
    });

    this.setState({
      tooltip,
      layout,
      size: {
        x: obj.width,
        y: obj.height,
      },
      position: {
        x: Math.floor(Math.max(obj.left, 0)),
        y: Math.floor(Math.max(obj.top, 0)),
      },
    });
  }

  animateMove(obj = {}): Promise<void> {
    return new Promise((resolve) => {
      this.setState({ containerVisible: true }, () => this._animateMove(obj as any).then(resolve));
    });
  }

  reset() {
    if (this.tooltipAnimation) {
      this.tooltipAnimation.stop();
      this.tooltipAnimation = null;
    }

    this.setState({
      containerVisible: false,
      layout: undefined,
    });
  }

  handleNext = () => {
    this.props.next();
  };

  handlePrev = () => {
    this.props.prev();
  };

  handleStop = () => {
    this.reset();
    this.props.stop();
  };

  renderMask = () => (
    <SvgMask
      style={styles.overlayContainer}
      size={this.state.size!}
      position={this.state.position!}
      easing={this.props.easing}
      animationDuration={this.props.animationDuration}
      backdropColor={this.props.backdropColor}
      currentStep={this.props.currentStep}
      maskOffset={this.props.maskOffset}
      borderRadius={this.props.borderRadius}
      dismissOnPress={this.props.dismissOnPress}
      stop={this.props.stop}
    />
  );

  renderTooltip() {
    const { tooltipComponent: TooltipComponent, visible } = this.props;

    if (!visible) {
      return null;
    }

    const { opacity } = this.state;
    return (
      <Animated.View
        pointerEvents="box-none"
        key="tooltip"
        onLayout={this.handleTooltipLayout}
        style={[
          styles.tooltip,
          this.props.tooltipStyle,
          this.state.tooltip,
          {
            zIndex: 99,
            opacity,
            transform: [
              { translateY: this.state.tooltipTranslateY },
              { scale: this.state.tooltipScale },
            ],
          },
        ]}
      >
        <TooltipComponent
          isFirstStep={this.state.isFirstStep}
          isLastStep={this.state.isLastStep}
          currentStep={this.state.currentStep!}
          handleNext={this.handleNext}
          handlePrev={this.handlePrev}
          handleStop={this.handleStop}
          labels={this.props.labels}
        />
      </Animated.View>
    );
  }

  renderNonInteractionPlaceholder() {
    return this.props.preventOutsideInteraction ? (
      <View style={[StyleSheet.absoluteFill, styles.nonInteractionPlaceholder]} />
    ) : null;
  }

  render() {
    const containerVisible = this.state.containerVisible || this.props.visible;
    const contentVisible = this.state.layout && containerVisible;
    if (!containerVisible) {
      return null;
    }

    const renderContent = (insets: EdgeInsets | null) => {
      this.safeAreaInsets = insets || DEFAULT_SAFE_AREA_INSETS;

      return (
        <View
          style={[StyleSheet.absoluteFill, { backgroundColor: 'transparent' }]}
          pointerEvents="box-none"
        >
          <View style={styles.container} onLayout={this.handleLayoutChange} pointerEvents="box-none">
            {contentVisible && (
              <>
                {this.renderMask()}
                {this.renderNonInteractionPlaceholder()}
                {this.renderTooltip()}
              </>
            )}
          </View>
        </View>
      );
    };

    return (
      <View
        style={[StyleSheet.absoluteFill, { backgroundColor: 'transparent' }]}
        pointerEvents="box-none"
      >
        <SafeAreaInsetsContext.Consumer>{renderContent}</SafeAreaInsetsContext.Consumer>
      </View>
    );
  }
}
