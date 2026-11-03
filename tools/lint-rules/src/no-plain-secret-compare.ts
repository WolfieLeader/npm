import type { Context, ESTree, Rule, Visitor } from "@oxlint/plugins";

import { unwrap } from "./ast.ts";

const secretName = /secret|token|signature|digest|hash|hmac|password|api_?key/i;

const equalityOperators = new Set(["===", "!==", "==", "!="]);

/** A name that ends in one of these words describes a secret, such as `tokenType` or `hashAlgorithm`, and is public. */
const metadataWords = new Set(["algorithm", "encoding", "format", "id", "kind", "length", "name", "size", "type"]);

function isMetadata(name: string): boolean {
  const last = name.split(/_|(?<=[\da-z])(?=[A-Z])/u).at(-1) ?? name;

  return metadataWords.has(last.toLowerCase());
}

/** The identifier and member names an operand reads, including the values inside a template literal. */
function namesOf(node: ESTree.Expression): string[] {
  const value = unwrap(node);

  if (value.type === "Identifier") return [value.name];

  if (value.type === "MemberExpression" && !value.computed && value.property.type === "Identifier") {
    return [value.property.name];
  }

  return value.type === "TemplateLiteral" ? value.expressions.flatMap((expression) => namesOf(expression)) : [];
}

/** A literal, `undefined` or `typeof x` reveals nothing secret when compared. */
function isPublicValue(node: ESTree.Expression): boolean {
  const value = unwrap(node);
  const isUndefined = value.type === "Identifier" && value.name === "undefined";
  const isTypeof = value.type === "UnaryExpression" && value.operator === "typeof";

  return value.type === "Literal" || isUndefined || isTypeof;
}

function create(context: Context): Visitor {
  return {
    BinaryExpression(node: ESTree.BinaryExpression) {
      if (!equalityOperators.has(node.operator)) return;

      if (isPublicValue(node.left) || isPublicValue(node.right)) return;

      const name = [...namesOf(node.left), ...namesOf(node.right)].find(
        (candidate) => !isMetadata(candidate) && secretName.test(candidate),
      );

      if (name !== undefined) {
        context.report({ node, messageId: "plain", data: { name, operator: node.operator } });
      }
    },
  };
}

/** Rejects `===` and `!==` on values named like secrets, tokens, signatures, digests, hashes or passwords. */
export const noPlainSecretCompare: Rule = {
  meta: {
    type: "problem",
    docs: { description: "Compare secrets, tokens, digests and signatures in constant time." },
    schema: [],
    messages: {
      plain:
        "`{{name}}` looks secret and `{{operator}}` returns at the first different character, so compare it with a constant-time function such as `crypto.timingSafeEqual`.",
    },
  },
  create,
};
