/**
 * Parse Conventional Commit messages into a syntax tree.
 *
 * The parser is intentionally structural: it preserves the message shape and source
 * locations, while `lintCommit()` is responsible for applying policy such as
 * preset-specific rules.
 *
 * @module
 */

import type {
  CommitAstNode as Node,
  CommitLiteralNode,
  CommitMessage,
  CommitParentNode,
} from "./parser_types.ts";
import { Scanner } from "./_internal/scanner.ts";
import { isNewline, isParens, isWhitespace } from "./_internal/type_checks.ts";

type ParseResult<T> = T | Error;

type ParentNode<TType extends CommitParentNode["type"]> = CommitParentNode & {
  type: TType;
  children: Node[];
};

type LiteralNode<
  TType extends CommitLiteralNode["type"],
  TValue extends string = string,
> = CommitLiteralNode & {
  type: TType;
  value: TValue;
};

type SummaryNode = ParentNode<"summary">;
type BodyNode = ParentNode<"body">;
type FooterNode = ParentNode<"footer">;
type TokenNode = ParentNode<"token">;
type ValueNode = ParentNode<"value">;
type ContinuationNode = ParentNode<"continuation">;
type TextNode = LiteralNode<"text">;
type NewlineNode = LiteralNode<"newline">;
type BreakingChangeNode =
  & LiteralNode<"breaking-change">
  & { value: "!" | "BREAKING CHANGE" | "BREAKING-CHANGE" };
type TypeNode = LiteralNode<"type">;
type ScopeNode = LiteralNode<"scope">;
type SeparatorNode = LiteralNode<"separator", ":" | " #">;
type WhitespaceNode = LiteralNode<"whitespace">;

/**
 * Parse a Conventional Commit message into a unist-compatible syntax tree.
 *
 * Surrounding whitespace is trimmed before parsing so the tree models the
 * commit message itself rather than editor padding.
 *
 * @param input The commit message to parse.
 * @returns A syntax tree rooted at a `message` node.
 *
 * @throws {Error} When the input does not match the Conventional Commits grammar.
 *
 * @example
 * ```ts
 * import { parseCommit } from "@miscellaneous/commitlint";
 *
 * const tree = parseCommit(
 *   "feat(parser): add support for scopes\n\nRefs: #123",
 * );
 *
 * console.log(tree.type); // “message”
 * console.log(tree.children[0]?.type); // “summary”
 * ```
 */
export function parseCommit(input: string): CommitMessage {
  const scanner = new Scanner(input.trim());
  const node = scanner.enter("message", [] as Node[]);

  const parsedSummary = summary(scanner);
  if (parsedSummary instanceof Error) {
    throw parsedSummary;
  }
  node.children.push(parsedSummary);

  if (scanner.eof()) {
    return scanner.exit(node) as CommitMessage;
  }

  const firstNewline = newline(scanner);
  if (firstNewline instanceof Error) {
    throw firstNewline;
  }
  node.children.push(firstNewline);

  let parsedBody: BodyNode | null = null;
  const candidateBody = body(scanner);
  if (!(candidateBody instanceof Error)) {
    parsedBody = candidateBody;
    node.children.push(candidateBody);
  }

  if (scanner.eof()) {
    return scanner.exit(node) as CommitMessage;
  }

  if (parsedBody !== null) {
    const footerSeparator = newline(scanner);
    if (footerSeparator instanceof Error) {
      throw footerSeparator;
    }
    node.children.push(footerSeparator);
  }

  while (!scanner.eof()) {
    const parsedFooter = footer(scanner);
    if (parsedFooter instanceof Error) {
      break;
    }
    node.children.push(parsedFooter);

    const trailingNewline = newline(scanner);
    if (trailingNewline instanceof Error) {
      break;
    }
    node.children.push(trailingNewline);
  }

  return scanner.exit(node) as CommitMessage;
}

/*
 * <summary>      ::= <type> "(" <scope> ")" ["!"] ":" <whitespace>* <text>
 *                 |  <type> ["!"] ":" <whitespace>* <text>
 */
function summary(scanner: Scanner): ParseResult<SummaryNode> {
  const node = scanner.enter("summary", [] as Node[]);

  const parsedType = type(scanner);
  if (parsedType instanceof Error) {
    return parsedType;
  }
  node.children.push(parsedType);

  const parsedScope = scope(scanner);
  if (!(parsedScope instanceof Error)) {
    node.children.push(parsedScope);
  }

  const parsedBreakingChange = breakingChange(scanner);
  if (!(parsedBreakingChange instanceof Error)) {
    node.children.push(parsedBreakingChange);
  }

  const parsedSeparator = separator(scanner);
  if (parsedSeparator instanceof Error) {
    return scanner.abort(node, [
      parsedScope instanceof Error ? "(" : false,
      parsedBreakingChange instanceof Error ? "!" : false,
      ":",
    ]);
  }
  node.children.push(parsedSeparator);

  const parsedWhitespace = whitespace(scanner);
  if (!(parsedWhitespace instanceof Error)) {
    node.children.push(parsedWhitespace);
  }

  node.children.push(text(scanner));
  return scanner.exit(node) as SummaryNode;
}

/*
 * <type>         ::= 1*<any UTF8-octets except newline or parens or ["!"] ":" or whitespace>
 */
function type(scanner: Scanner): ParseResult<TypeNode> {
  const node = scanner.enter("type", "" as TypeNode["value"]);
  node.value = scanner.consumeWhile((token) =>
    !isParens(token) && !isWhitespace(token) && !isNewline(token) &&
    token !== "!" && token !== ":"
  );

  if (node.value === "") {
    return scanner.abort(node);
  }

  return scanner.exit(node) as TypeNode;
}

/*
 * <text>         ::= *<any UTF8-octets except newline>
 */
function text(scanner: Scanner): TextNode {
  const node = scanner.enter("text", "" as TextNode["value"]);
  node.value = scanner.consumeWhile((token) => !isNewline(token));
  return scanner.exit(node) as TextNode;
}

/*
 * "(" <scope> ")"        ::= 1*<any UTF8-octets except newline or parens>
 */
function scope(scanner: Scanner): ParseResult<ScopeNode> {
  if (scanner.peek() !== "(") {
    return scanner.abort(scanner.enter("scope", "" as ScopeNode["value"]));
  }

  scanner.next();

  const node = scanner.enter("scope", "" as ScopeNode["value"]);
  node.value = scanner.consumeWhile((token) =>
    !isParens(token) && !isNewline(token)
  );

  if (scanner.peek() !== ")") {
    throw scanner.abort(node, [")"]);
  }

  const finalizedNode = scanner.exit(node) as ScopeNode;
  scanner.next();

  if (finalizedNode.value === "") {
    return scanner.abort(node);
  }

  return finalizedNode;
}

/*
 * <body>          ::= [<any body-text except pre-footer>], <newline>, <body>*
 *                  | [<any body-text except pre-footer>]
 */
function body(scanner: Scanner): ParseResult<BodyNode> {
  const node = scanner.enter("body", [] as Node[]);

  // Body parsing is speculative: if the remaining input is already a valid
  // footer block, leave it untouched so the caller can parse footer nodes.
  if (remainingInputIsFooterBlock(scanner)) {
    return scanner.abort(node);
  }

  const parsedBreakingChange = breakingChange(scanner, false);
  if (!(parsedBreakingChange instanceof Error) && scanner.peek() === ":") {
    node.children.push(parsedBreakingChange);
    node.children.push(separator(scanner) as SeparatorNode);

    const parsedWhitespace = whitespace(scanner);
    if (!(parsedWhitespace instanceof Error)) {
      node.children.push(parsedWhitespace);
    }
  }

  node.children.push(text(scanner));

  const parsedNewline = newline(scanner);
  if (!(parsedNewline instanceof Error)) {
    const nestedBody = body(scanner);
    if (nestedBody instanceof Error) {
      scanner.abort(parsedNewline);
    } else {
      node.children.push(parsedNewline);
      node.children.push(...nestedBody.children);
    }
  }

  return scanner.exit(node) as BodyNode;
}

/*
 * Check whether the remaining input can be parsed entirely as footers, with
 * optional blank lines between the previous section and the first footer.
 */
function remainingInputIsFooterBlock(scanner: Scanner): boolean {
  const checkpoint = scanner.position();

  while (!scanner.eof()) {
    const parsedNewline = newline(scanner);
    if (parsedNewline instanceof Error) {
      // Footer blocks may start immediately after the previous line.
    }

    const parsedFooter = footer(scanner);
    if (parsedFooter instanceof Error) {
      scanner.rewind(checkpoint);
      return false;
    }
  }

  scanner.rewind(checkpoint);
  return true;
}

/*
 * <footer>       ::= <token> <separator> <whitespace>* <value>
 */
function footer(scanner: Scanner): ParseResult<FooterNode> {
  const node = scanner.enter("footer", [] as Node[]);

  const parsedToken = token(scanner);
  if (parsedToken instanceof Error) {
    return parsedToken;
  }
  node.children.push(parsedToken);

  const parsedSeparator = separator(scanner);
  if (parsedSeparator instanceof Error) {
    scanner.abort(node);
    return parsedSeparator;
  }
  node.children.push(parsedSeparator);

  const parsedWhitespace = whitespace(scanner);
  if (!(parsedWhitespace instanceof Error)) {
    node.children.push(parsedWhitespace);
  }

  const parsedValue = value(scanner);
  if (parsedValue instanceof Error) {
    scanner.abort(node);
    return parsedValue;
  }
  node.children.push(parsedValue);

  return scanner.exit(node) as FooterNode;
}

/*
 * <token>        ::= <breaking-change>
 *                 |  <type>, "(" <scope> ")", ["!"]
 *                 |  <type>, ["!"]
 */
function token(scanner: Scanner): ParseResult<TokenNode> {
  const node = scanner.enter("token", [] as Node[]);

  const parsedBreakingChange = breakingChange(scanner);
  if (!(parsedBreakingChange instanceof Error)) {
    node.children.push(parsedBreakingChange);
    return scanner.exit(node) as TokenNode;
  }

  const parsedType = type(scanner);
  if (parsedType instanceof Error) {
    return parsedType;
  }
  node.children.push(parsedType);

  const parsedScope = scope(scanner);
  if (!(parsedScope instanceof Error)) {
    node.children.push(parsedScope);
  }

  const trailingBreakingChange = breakingChange(scanner);
  if (!(trailingBreakingChange instanceof Error)) {
    node.children.push(trailingBreakingChange);
  }

  return scanner.exit(node) as TokenNode;
}

/*
 * <breaking-change> ::= "!" | "BREAKING CHANGE" | "BREAKING-CHANGE"
 *
 * Note: "!" is only allowed in <footer> and <summary>, not <body>.
 */
function breakingChange(
  scanner: Scanner,
  allowBang = true,
): ParseResult<BreakingChangeNode> {
  const node = scanner.enter(
    "breaking-change",
    "" as BreakingChangeNode["value"] | "",
  );

  if (scanner.peek() === "!" && allowBang) {
    node.value = scanner.next() as BreakingChangeNode["value"];
  } else if (
    scanner.peekLiteral("BREAKING CHANGE") ||
    scanner.peekLiteral("BREAKING-CHANGE")
  ) {
    node.value = scanner.next(
      "BREAKING CHANGE".length,
    ) as BreakingChangeNode["value"];
  }

  if (node.value === "") {
    return scanner.abort(node, ["BREAKING CHANGE"]);
  }

  return scanner.exit(node) as BreakingChangeNode;
}

/*
 * <value>        ::= <text> <continuation>*
 *                 |  <text>
 */
function value(scanner: Scanner): ValueNode {
  const node = scanner.enter("value", [] as Node[]);
  node.children.push(text(scanner));

  let parsedContinuation: ParseResult<ContinuationNode>;
  while (!((parsedContinuation = continuation(scanner)) instanceof Error)) {
    node.children.push(parsedContinuation);
  }

  return scanner.exit(node) as ValueNode;
}

/*
 * <newline> <whitespace> <text>
 */
function continuation(scanner: Scanner): ParseResult<ContinuationNode> {
  const node = scanner.enter("continuation", [] as Node[]);

  const parsedNewline = newline(scanner);
  if (parsedNewline instanceof Error) {
    return parsedNewline;
  }
  node.children.push(parsedNewline);

  const parsedWhitespace = whitespace(scanner);
  if (parsedWhitespace instanceof Error) {
    scanner.abort(node);
    return parsedWhitespace;
  }
  node.children.push(parsedWhitespace);
  node.children.push(text(scanner));

  return scanner.exit(node) as ContinuationNode;
}

/*
 * <separator>    ::= ":" | " #"
 */
function separator(scanner: Scanner): ParseResult<SeparatorNode> {
  const node = scanner.enter("separator", "" as SeparatorNode["value"]);

  if (scanner.peek() === ":") {
    node.value = scanner.next() as SeparatorNode["value"];
    return scanner.exit(node) as SeparatorNode;
  }

  if (scanner.peek() === " ") {
    scanner.next();
    if (scanner.peek() === "#") {
      scanner.next();
      node.value = " #";
      return scanner.exit(node) as SeparatorNode;
    }
    return scanner.abort(node);
  }

  return scanner.abort(node);
}

/*
 * <whitespace>+   ::= <ZWNBSP> | <TAB> | <VT> | <FF> | <SP> | <NBSP> | <USP>
 */
function whitespace(scanner: Scanner): ParseResult<WhitespaceNode> {
  const node = scanner.enter("whitespace", "" as WhitespaceNode["value"]);
  node.value = scanner.consumeWhile((token) => isWhitespace(token));

  if (node.value === "") {
    return scanner.abort(node, [" "]);
  }

  return scanner.exit(node) as WhitespaceNode;
}

/*
 * <newline>+       ::= [<CR>], <LF>
 */
function newline(scanner: Scanner): ParseResult<NewlineNode> {
  const node = scanner.enter("newline", "" as NewlineNode["value"]);
  node.value = scanner.consumeWhile((token) => isNewline(token));

  if (node.value === "") {
    return scanner.abort(node, ["<CR><LF>", "<LF>"]);
  }

  return scanner.exit(node) as NewlineNode;
}
