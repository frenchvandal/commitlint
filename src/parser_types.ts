/**
 * Public syntax-tree types for {@link parseCommit}.
 *
 * @module
 */

/**
 * All node types emitted by {@link parseCommit}.
 */
export type CommitNodeType =
  | "message"
  | "summary"
  | "body"
  | "footer"
  | "token"
  | "value"
  | "continuation"
  | "type"
  | "scope"
  | "breaking-change"
  | "separator"
  | "whitespace"
  | "text"
  | "newline";

/**
 * Parent node types emitted by {@link parseCommit}.
 */
export type CommitParentNodeType =
  | "message"
  | "summary"
  | "body"
  | "footer"
  | "token"
  | "value"
  | "continuation";

/**
 * Literal node types emitted by {@link parseCommit}.
 */
export type CommitLiteralNodeType =
  | "type"
  | "scope"
  | "breaking-change"
  | "separator"
  | "whitespace"
  | "text"
  | "newline";

/**
 * A source location point in a parsed commit message.
 */
export type CommitPoint = {
  /** Line number, starting at `1`. */
  readonly line: number;
  /** Column number, starting at `1`. */
  readonly column: number;
  /** Character offset, starting at `0`. */
  readonly offset?: number;
};

/**
 * A source location range in a parsed commit message.
 */
export type CommitPosition = {
  /** Position of the first character in the range. */
  readonly start: CommitPoint;
  /** Position immediately after the last character in the range. */
  readonly end: CommitPoint;
};

/**
 * A literal node in the commit syntax tree.
 */
export type CommitLiteralNode = {
  /** Semantic node type. */
  readonly type: CommitLiteralNodeType;
  /** Literal value captured from the source message. */
  readonly value: string;
  /** Source location in the parsed message, when available. */
  readonly position?: CommitPosition;
};

/**
 * A parent node in the commit syntax tree.
 */
export type CommitParentNode = {
  /** Semantic node type. */
  readonly type: CommitParentNodeType;
  /** Child nodes in source order. */
  readonly children: ReadonlyArray<CommitAstNode>;
  /** Source location in the parsed message, when available. */
  readonly position?: CommitPosition;
};

/**
 * A node in the syntax tree returned by {@link parseCommit}.
 */
export type CommitAstNode = CommitLiteralNode | CommitParentNode;

/**
 * The root syntax-tree node returned by {@link parseCommit}.
 */
export type CommitMessage = CommitParentNode & {
  readonly type: "message";
};
