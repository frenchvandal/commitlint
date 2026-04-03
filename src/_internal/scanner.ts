import type {
  CommitAstNode as Node,
  CommitLiteralNode as Literal,
  CommitParentNode as Parent,
  CommitPoint as Point,
  CommitPosition as Position,
} from "../parser_types.ts";

import { CR, LF } from "./codes.ts";
import { isNewline } from "./type_checks.ts";

type PendingPosition = {
  start: Point;
  end?: Point;
};

type ScannerPoint = {
  line: number;
  column: number;
  offset: number;
};

type PendingLiteral<TType extends string, TValue extends string> =
  & Omit<Literal, "type" | "value" | "position">
  & {
    type: TType;
    value: TValue;
    position: PendingPosition;
  };

type PendingParent<TType extends string, TChildren extends Node[]> =
  & Omit<Parent, "type" | "children" | "position">
  & {
    type: TType;
    children: TChildren;
    position: PendingPosition;
  };

type PendingNode =
  | PendingLiteral<string, string>
  | PendingParent<string, Node[]>;

type FinalizedNode<TNode extends PendingNode> = Omit<TNode, "position"> & {
  position: Position;
};

/**
 * Incrementally scan a Conventional Commit message while preserving node positions.
 */
export class Scanner {
  #text: string;
  #pos: ScannerPoint;

  constructor(text: string, pos?: Point) {
    this.#text = text;
    this.#pos = pos
      ? { ...pos, offset: pos.offset ?? 0 }
      : { line: 1, column: 1, offset: 0 };
  }

  eof(): boolean {
    return this.#pos.offset >= this.#text.length;
  }

  next(n?: number): string {
    const token = n === undefined
      ? this.peek()
      : this.#text.slice(this.#pos.offset, this.#pos.offset + n);

    this.#pos.offset += token.length;
    this.#pos.column += token.length;

    if (isNewline(token)) {
      this.#pos.line += 1;
      this.#pos.column = 1;
    }

    return token;
  }

  peek(): string {
    let token = this.#text.charAt(this.#pos.offset);
    if (token === CR && this.#text.charAt(this.#pos.offset + 1) === LF) {
      token += LF;
    }
    return token;
  }

  peekLiteral(literal: string): boolean {
    const candidate = this.#text.slice(
      this.#pos.offset,
      this.#pos.offset + literal.length,
    );
    return literal === candidate;
  }

  consumeWhile(predicate: (token: string) => boolean): string {
    const startOffset = this.#pos.offset;

    while (!this.eof() && predicate(this.peek())) {
      this.next();
    }

    return this.#text.slice(startOffset, this.#pos.offset);
  }

  position(): ScannerPoint {
    return { ...this.#pos };
  }

  rewind(pos: Point): void {
    this.#pos = { ...pos, offset: pos.offset ?? 0 };
  }

  enter<TType extends string, TValue extends string>(
    type: TType,
    content: TValue,
  ): PendingLiteral<TType, TValue>;
  enter<TType extends string, TChildren extends Node[]>(
    type: TType,
    content: TChildren,
  ): PendingParent<TType, TChildren>;
  enter<TType extends string, TValue extends string, TChildren extends Node[]>(
    type: TType,
    content: TValue | TChildren,
  ): PendingLiteral<TType, TValue> | PendingParent<TType, TChildren> {
    const position: PendingPosition = { start: this.position() };

    return Array.isArray(content)
      ? { type, children: content, position }
      : { type, value: content, position };
  }

  exit<TNode extends PendingNode>(node: TNode): FinalizedNode<TNode> {
    node.position.end = this.position();
    return node as FinalizedNode<TNode>;
  }

  abort(
    node: {
      type: string;
      position?: PendingPosition | Position;
    },
    expectedTokens?: ReadonlyArray<string | false | null | undefined>,
  ): Error {
    const position = `${this.#pos.line}:${this.#pos.column}`;
    const validTokens = expectedTokens === undefined
      ? `<${node.type}>`
      : expectedTokens.filter(Boolean).join(", ");

    const error = this.eof()
      ? new Error(
        `unexpected token EOF at ${position}, valid tokens [${validTokens}]`,
      )
      : new Error(
        `unexpected token ‘${this.peek()}’ at ${position}, valid tokens [${validTokens}]`,
      );

    if (node.position !== undefined) {
      this.rewind(node.position.start);
    }

    return error;
  }
}
