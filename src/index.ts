import Parser from 'tree-sitter';
import TypeScript from 'tree-sitter-typescript';

const parser = new Parser();
parser.setLanguage(TypeScript.typescript);

const callQuery = `
  (call_expression
    function: [
      (identifier) @call.path            
      (member_expression) @call.path
    ]
  )
`;

function extractCalls(code: string) {
    const tree = parser.parse(code);
    const query = new Parser.Query(TypeScript.typescript, callQuery);
    const matches = query.matches(tree.rootNode);

    return matches.flatMap(m => {
        const capture = m.captures[0];
        if (!capture) return [];

        const node = capture.node;
        let parent = node.parent;
        let condition = "None";
        let functionName = "Global Scope";

        while (parent) {
            // 1. Capture the NEAREST if_statement condition
            // We only set it if condition is still "None" so the inner-most one wins
            if (parent.type === 'if_statement' && condition === "None") {
                const condNode = parent.childForFieldName('condition');
                const conditionText = condNode ? condNode.text : "Unknown";

                const consequence = parent.childForFieldName('consequence');
                const alternative = parent.childForFieldName('alternative');

                if (consequence && node.startIndex >= consequence.startIndex && node.endIndex <= consequence.endIndex) {
                    condition = `IF ${conditionText} is TRUE`;
                } else if (alternative && node.startIndex >= alternative.startIndex && node.endIndex <= alternative.endIndex) {
                    condition = `IF ${conditionText} is FALSE (Else)`;
                }
            }

            // 2. Capture the Function or Method name
            if (parent.type === 'function_declaration' || parent.type === 'method_definition' || parent.type === 'function_expression' || parent.type === 'arrow_function') {
                const nameNode = parent.childForFieldName('name');
                if (nameNode) {
                    functionName = nameNode.text;
                } else {
                    // For arrow functions or anonymous functions, we might not find a 'name' field
                    functionName = "Anonymous Function";
                }
                // Once we find the containing function, we stop climbing
                break;
            }

            parent = parent.parent;
        }

        return [{
            call: node.text,
            insideFunction: functionName,
            triggeredBy: condition,
            line: node.startPosition.row + 1
        }];
    });
}

const testCode = `
function processOrder(order) {
  logging.info("Starting process");

  if (order.isValid) {
    inventory.reserve(order.items);
    
    if (order.isUrgent) {
      shipping.prioritize(order.id);
    } else {
      shipping.queue(order.id);
    }

  } else {
    notification.sendFailure(order.userId);
  }

  db.updateStatus(order.id);
}

function healthCheck() {
  system.ping();
}
`;

console.log("Found Calls:", extractCalls(testCode));