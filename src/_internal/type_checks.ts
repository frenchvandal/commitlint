import { CR, FF, LF, NBSP, SP, TAB, VT, ZWNBSP } from "./codes.ts";

export function isWhitespace(token: string): boolean {
  return token === ZWNBSP || token === TAB || token === VT || token === FF ||
    token === SP || token === NBSP;
}

export function isNewline(token: string): boolean {
  const firstCharacter = token.charAt(0);
  return firstCharacter === CR || firstCharacter === LF;
}

export function isParens(token: string): boolean {
  return token === "(" || token === ")";
}
