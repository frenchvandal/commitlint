import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";

import {
  type CommitAstNode,
  type CommitLiteralNode,
  type CommitMessage,
  parseCommit,
} from "../mod.ts";

function expectParent(node: CommitAstNode, type?: string): CommitMessage {
  if (!("children" in node)) {
    throw new Error(`Expected parent node${type ? ` "${type}"` : ""}.`);
  }

  if (type !== undefined && node.type !== type) {
    throw new Error(`Expected parent node "${type}", got "${node.type}".`);
  }

  return node as CommitMessage;
}

function expectLiteral(node: CommitAstNode, type?: string): CommitLiteralNode {
  if (!("value" in node)) {
    throw new Error(`Expected literal node${type ? ` "${type}"` : ""}.`);
  }

  if (type !== undefined && node.type !== type) {
    throw new Error(`Expected literal node "${type}", got "${node.type}".`);
  }

  return node;
}

function source(node: CommitAstNode, input: string): string {
  const startOffset = node.position?.start.offset ?? 0;
  const endOffset = node.position?.end.offset ?? startOffset;
  return input.slice(startOffset, endOffset);
}

function visit(
  node: CommitAstNode,
  visitor: (candidate: CommitAstNode) => void,
) {
  visitor(node);

  if (!("children" in node)) {
    return;
  }

  for (const child of node.children) {
    visit(child, visitor);
  }
}

Deno.test("parseCommit parses a summary with scope and breaking marker", () => {
  const tree = parseCommit("feat(parser)!: add support for scopes");
  const summary = expectParent(tree.children[0]!, "summary");

  assertEquals(
    summary.children.map((child) => child.type),
    ["type", "scope", "breaking-change", "separator", "whitespace", "text"],
  );
  assertEquals(expectLiteral(summary.children[0]!).value, "feat");
  assertEquals(expectLiteral(summary.children[1]!).value, "parser");
  assertEquals(expectLiteral(summary.children[2]!).value, "!");
  assertEquals(
    expectLiteral(summary.children[5]!).value,
    "add support for scopes",
  );
});

Deno.test("parseCommit separates body and footer nodes", () => {
  const tree = parseCommit(
    "fix(parser): address edge case\n\nbody line\nsecond line\n\nRefs: #123",
  );

  assertEquals(
    tree.children.map((child) => child.type),
    ["summary", "newline", "body", "newline", "footer"],
  );

  const body = expectParent(tree.children[2]!, "body");
  const footer = expectParent(tree.children[4]!, "footer");

  assertEquals(
    body.children.map((child) => child.type),
    ["text", "newline", "text"],
  );
  assertEquals(
    footer.children.map((child) => child.type),
    ["token", "separator", "whitespace", "value"],
  );
  assertEquals(
    source(
      body,
      "fix(parser): address edge case\n\nbody line\nsecond line\n\nRefs: #123",
    ),
    "body line\nsecond line",
  );
});

Deno.test("parseCommit treats a footer immediately after the summary as a footer", () => {
  const tree = parseCommit("fix: address bug\nRefs #42");

  assertEquals(tree.children.map((child) => child.type), [
    "summary",
    "newline",
    "footer",
  ]);

  const footer = expectParent(tree.children[2]!, "footer");
  const token = expectParent(footer.children[0]!, "token");
  const value = expectParent(footer.children[2]!, "value");

  assertEquals(expectLiteral(token.children[0]!, "type").value, "Refs");
  assertEquals(expectLiteral(value.children[0]!, "text").value, "42");
});

Deno.test("parseCommit parses multiline BREAKING CHANGE footers", () => {
  const tree = parseCommit(
    "fix: address bug\n\nBREAKING CHANGE: first line\n second line",
  );
  assertEquals(tree.children.map((child) => child.type), [
    "summary",
    "newline",
    "footer",
  ]);

  const footer = expectParent(tree.children[2]!, "footer");
  const token = expectParent(footer.children[0]!, "token");
  const value = expectParent(footer.children[3]!, "value");
  const continuation = expectParent(value.children[1]!, "continuation");

  assertEquals(
    expectLiteral(token.children[0]!, "breaking-change").value,
    "BREAKING CHANGE",
  );
  assertEquals(expectLiteral(value.children[0]!, "text").value, "first line");
  assertEquals(
    continuation.children.map((child) => child.type),
    ["newline", "whitespace", "text"],
  );
  assertEquals(
    expectLiteral(continuation.children[2]!, "text").value,
    "second line",
  );
});

Deno.test("parseCommit allows missing whitespace after separators", () => {
  const tree = parseCommit("feat(tree):no whitespace here");
  const summary = expectParent(tree.children[0]!, "summary");

  assertEquals(summary.children.map((child) => child.type), [
    "type",
    "scope",
    "separator",
    "text",
  ]);
  assertEquals(
    expectLiteral(summary.children[3]!, "text").value,
    "no whitespace here",
  );
});

Deno.test("parseCommit preserves CRLF positions", () => {
  const input = "fix: bug\r\n\r\nRefs: #123";
  const tree = parseCommit(input);

  visit(tree, (node) => {
    if (!("value" in node) || node.position === undefined) {
      return;
    }

    assertEquals(source(node, input), node.value);
  });
});

Deno.test("parseCommit preserves positions across Unicode text", () => {
  const input =
    "feat(解析): ajoute la recherche 🔎\n\ncorps élargi\n\nRefs #123";
  const tree = parseCommit(input);

  assertEquals(tree.children.map((child) => child.type), [
    "summary",
    "newline",
    "body",
    "newline",
    "footer",
  ]);

  const summary = expectParent(tree.children[0]!, "summary");
  const footer = expectParent(tree.children[4]!, "footer");

  assertEquals(expectLiteral(summary.children[1]!, "scope").value, "解析");
  assertEquals(
    expectLiteral(summary.children[4]!, "text").value,
    "ajoute la recherche 🔎",
  );
  assertEquals(expectLiteral(footer.children[1]!, "separator").value, " #");

  visit(tree, (node) => {
    if (!("value" in node) || node.position === undefined) {
      return;
    }

    assertEquals(source(node, input), node.value);
  });
});

Deno.test('parseCommit throws when ":" is missing', () => {
  assertThrows(
    () => {
      parseCommit("feat add support for scopes");
    },
    Error,
    "unexpected token ‘ ’ at 1:5, valid tokens [(, !, :]",
  );
});

Deno.test('parseCommit throws when ")" is missing', () => {
  assertThrows(
    () => {
      parseCommit("feat(parser: add support for scopes");
    },
    Error,
    "unexpected token EOF at 1:36, valid tokens [)]",
  );
});

Deno.test("parseCommit trims surrounding editor padding before parsing", () => {
  const tree = parseCommit("\n\nfeat: add support\n");
  const summary = expectParent(tree.children[0]!, "summary");

  assertEquals(expectLiteral(summary.children[0]!, "type").value, "feat");
  assertStringIncludes(source(tree, "feat: add support"), "feat: add support");
});
