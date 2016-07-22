declare module 'terminal-kit' {

  export function terminal(message: string): typeof terminal;
  namespace terminal {
    const green: typeof terminal;
    const brightBlack: typeof terminal;

    const error: typeof terminal;
    const str: typeof terminal;

    const width: number;
    const height: number;

    function column(column: number): typeof terminal;
    function moveTo(column: number, line: number): typeof terminal;
    function eraseLineAfter(): typeof terminal;
  }

}
