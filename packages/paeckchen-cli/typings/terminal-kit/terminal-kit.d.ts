declare module 'terminal-kit' {

  export function terminal(message: string): (typeof terminal)&string;
  namespace terminal {
    const defaultColor: typeof terminal;
    const black: typeof terminal;
    const red: typeof terminal;
    const green: typeof terminal;
    const yellow: typeof terminal;
    const blue: typeof terminal;
    const magenta: typeof terminal;
    const cyan: typeof terminal;
    const white: typeof terminal;
    const brightBlack: typeof terminal;
    const brightRed: typeof terminal;
    const brightGreen: typeof terminal;
    const brightYellow: typeof terminal;
    const brightBlue: typeof terminal;
    const brightMagenta: typeof terminal;
    const brightCyan: typeof terminal;
    const brightWhite: typeof terminal;

    const styleReset: typeof terminal;
    const bold: typeof terminal;
    const dim: typeof terminal;
    const italic: typeof terminal;
    const underline: typeof terminal;
    const blink: typeof terminal;
    const inverse: typeof terminal;
    const hidden: typeof terminal;
    const strike: typeof terminal;

    const error: typeof terminal;
    const str: typeof terminal;

    const width: number;
    const height: number;

    function reset(): typeof terminal;
    function hideCursor(off?: boolean): typeof terminal;
    function column(column: number): typeof terminal;
    function moveTo(column: number, line: number): typeof terminal;
    function nextLine(n: number): typeof terminal;
    function eraseLineAfter(): typeof terminal;
  }

}
