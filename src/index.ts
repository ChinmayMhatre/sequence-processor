import Parser from 'tree-sitter';
import TypeScript from 'tree-sitter-typescript';

const parser = new Parser();
parser.setLanguage(TypeScript.typescript);

const code = `
  if (user.isPremium) {
    billing.charge();
  }
`;

const tree = parser.parse(code);
console.log(tree.rootNode.toString());