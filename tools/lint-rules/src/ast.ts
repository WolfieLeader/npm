import type { ESTree } from "@oxlint/plugins";

/** Strips TypeScript casts, `!`, optional chains and `await` around an expression. */
export function unwrap(node: ESTree.Expression): ESTree.Expression {
  const isWrapper =
    node.type === "TSAsExpression" ||
    node.type === "TSSatisfiesExpression" ||
    node.type === "TSNonNullExpression" ||
    node.type === "TSTypeAssertion" ||
    node.type === "ChainExpression";

  if (isWrapper) return unwrap(node.expression);

  return node.type === "AwaitExpression" ? unwrap(node.argument) : node;
}
