/**
 * PixiJS CDN ambient type declarations for dashboard modules.
 * Covers PixiJS v8 API used in the dashboard codebase.
 */

declare namespace PIXI {
  interface IApplicationOptions {
    width?: number;
    height?: number;
    background?: number | string;
    backgroundColor?: number;
    backgroundAlpha?: number;
    resolution?: number;
    antialias?: boolean;
    autoDensity?: boolean;
    resizeTo?: HTMLElement | Window;
    view?: HTMLCanvasElement;
    preference?: string;
    powerPreference?: string;
  }

  interface ApplicationInitOptions extends IApplicationOptions {}

  class Application {
    constructor(options?: IApplicationOptions);
    init(options?: ApplicationInitOptions): Promise<void>;
    stage: Container;
    renderer: Renderer;
    canvas: HTMLCanvasElement;
    view: HTMLCanvasElement;
    screen: Rectangle;
    ticker: Ticker;
    destroy(removeView?: boolean): void;
    resize(): void;
  }

  class Container {
    children: DisplayObject[];
    x: number;
    y: number;
    width: number;
    height: number;
    alpha: number;
    visible: boolean;
    sortableChildren: boolean;
    zIndex: number;
    label: string;
    addChild<T extends DisplayObject>(child: T): T;
    removeChild<T extends DisplayObject>(child: T): T;
    removeChildren(): void;
    destroy(options?: boolean | { children?: boolean }): void;
  }

  class DisplayObject {
    x: number;
    y: number;
    width: number;
    height: number;
    alpha: number;
    visible: boolean;
    zIndex: number;
    destroy(options?: boolean | object): void;
  }

  interface ObservablePoint {
    x: number;
    y: number;
    set(x: number, y?: number): this;
  }

  interface ScalePoint {
    x: number;
    y: number;
    set(x: number, y?: number): this;
  }

  class Sprite extends Container {
    static from(source: string | Texture | HTMLCanvasElement): Sprite;
    constructor(texture?: Texture);
    texture: Texture;
    anchor: ObservablePoint;
    scale: ScalePoint;
    rotation: number;
    tint: number;
    zIndex: number;
    /** Custom property used in dashboard for texture lifecycle tracking */
    _tex?: Texture;
  }

  interface FillOptions {
    color?: number;
    alpha?: number;
  }

  class Graphics extends Container {
    // v8 fluent API
    rect(x: number, y: number, width: number, height: number): this;
    circle(x: number, y: number, radius: number): this;
    fill(color: number | FillOptions): this;
    stroke(color: number | FillOptions): this;
    // legacy v7 API (also used in codebase)
    beginFill(color: number, alpha?: number): this;
    endFill(): this;
    lineStyle(width: number, color?: number, alpha?: number): this;
    moveTo(x: number, y: number): this;
    lineTo(x: number, y: number): this;
    drawRect(x: number, y: number, width: number, height: number): this;
    drawRoundedRect(x: number, y: number, width: number, height: number, radius: number): this;
    drawCircle(x: number, y: number, radius: number): this;
    arc(x: number, y: number, radius: number, startAngle: number, endAngle: number, anticlockwise?: boolean): this;
    clear(): this;
    destroy(options?: boolean | object): void;
  }

  interface ITextStyle {
    fontFamily?: string | string[];
    fontSize?: number | string;
    fontWeight?: string;
    fill?: number | string | string[] | number[];
    align?: string;
    wordWrap?: boolean;
    wordWrapWidth?: number;
    lineHeight?: number;
    letterSpacing?: number;
    stroke?: number | string;
    strokeThickness?: number;
    dropShadow?: boolean;
    dropShadowColor?: number | string;
    dropShadowBlur?: number;
    dropShadowAngle?: number;
    dropShadowDistance?: number;
    dropShadowAlpha?: number;
  }

  class TextStyle {
    constructor(style?: Partial<ITextStyle>);
  }

  interface TextOptions {
    text: string;
    style?: Partial<ITextStyle>;
  }

  class Text extends Container {
    // v8: new PIXI.Text({ text, style })
    constructor(options: TextOptions);
    text: string;
    style: TextStyle;
    anchor: ObservablePoint;
    scale: ScalePoint;
    rotation: number;
    destroy(options?: boolean | object): void;
  }

  class Texture {
    static from(source: string | HTMLCanvasElement | HTMLImageElement): Texture;
    static WHITE: Texture;
    static EMPTY: Texture;
    width: number;
    height: number;
    destroy(destroyBase?: boolean): void;
  }

  class Rectangle {
    x: number;
    y: number;
    width: number;
    height: number;
    constructor(x?: number, y?: number, width?: number, height?: number);
  }

  class Renderer {
    width: number;
    height: number;
    resize(width: number, height: number): void;
    generateTexture(displayObject: Container | Graphics): Texture;
  }

  class Ticker {
    maxFPS: number;
    add(fn: (delta: number) => void): this;
    remove(fn: (delta: number) => void): this;
    start(): void;
    stop(): void;
  }

  class RenderTexture extends Texture {
    static create(options: { width: number; height: number; resolution?: number }): RenderTexture;
  }

  class Color {
    constructor(value: string | number | number[]);
    toNumber(): number;
    toHex(): string;
  }

  namespace TextureStyle {
    const defaultOptions: {
      scaleMode: string;
      [key: string]: unknown;
    };
  }
}

/** PixiJS CDN global (loaded via <script> tag) */
declare const PIXI: typeof PIXI;

/** Supabase CDN global */
declare const supabase: {
  createClient(url: string, key: string, options?: Record<string, unknown>): SupabaseClient;
};

interface SupabaseChannel {
  on(type: string, filter: Record<string, unknown>, handler: (payload: { payload: Record<string, unknown> }) => void): this;
  on(type: string, filter: { event: string }, handler: (payload: Record<string, unknown>) => void): this;
  subscribe(handler?: (status: string) => void): this;
  unsubscribe(): Promise<void>;
  send(message: { type: string; event: string; payload: Record<string, unknown> }): Promise<unknown>;
  track(presence: Record<string, unknown>): Promise<unknown>;
  presenceState(): Record<string, Array<{ role: string; [key: string]: unknown }>>;
}

interface SupabaseClient {
  channel(name: string, options?: Record<string, unknown>): SupabaseChannel;
  removeChannel(channel: SupabaseChannel): Promise<unknown>;
}
