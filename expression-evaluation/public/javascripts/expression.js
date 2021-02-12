const math = require("mathjs");
var current_expression = []; // The last expression that was submitted
var current_scope = {}; // The scope used to evaluate the last expression

// Select only the arithmetic functions from the official website of mathjs
const functions = [];
fetch("https://mathjs.org/docs/reference/functions.html").then(function (response) {
    return response.text();
}).then(function (text) {
    var domParser = new DOMParser();
    var doc = domParser.parseFromString(text, 'text/html');
    var links = doc.getElementById("arithmetic-functions").nextElementSibling.querySelectorAll("a");
    var ul = document.getElementById("functions");
    for (var i = 0; i < links.length; i++) {
        var link = links[i].href;
        var f = link.substring(link.lastIndexOf("/") + 1, link.lastIndexOf(".html"));
        functions.push(f);
        var li = document.createElement("li");
        var text = document.createTextNode(links[i].innerText.replace("math.", ''));
        li.appendChild(text);
        ul.appendChild(li);
    }
}).catch(function () {
    alert("Error!");
});

// Validate the expression to submit
module.exports.validate = function (input) {
    current_expression = []; // Clear the last expression input
    current_scope = {}; // Clear the last scope
    var scope = {};
    var submit = document.querySelector('input[id="' + CSS.escape("submit") + '"]');
    var eval_output = document.getElementById("eval");
    var valid = true; // Defines whether the expression is valid 
    try {
        var tree = math.parse(input.value);
        var output = [];
        tree.traverse(function (node, path, parent) {
            switch (node.type) {
                case "OperatorNode":
                    output.push(node.op);
                    break;
                case "ConstantNode":
                    output.push(node.value);
                    break;
                case "SymbolNode":
                    output.push(node.name);
                    if (parent == null
                        || parent.isParenthesisNode
                        || parent.isOperatorNode
                        || (parent.isFunctionNode && /args/.test(path))
                        || (parent.isAssignmentNode && /value/.test(path))) {
                        current_scope[node.name] = 0;
                        scope[node.name] = 0;
                    }
                    else if (parent.isFunctionNode && !functions.includes(node.name)) valid = false;
                    break;
            }
        });

        // Get the html elements for the parsed tree of the expression
        var domParser = new DOMParser();
        var doc = domParser.parseFromString(tree.toHTML(), "text/html");
        var query = doc.querySelectorAll("span");
        for (var i = 0; i < query.length; i++) {
            current_expression.push(query[i].innerHTML);
        }
        if (valid) {
            var eval = math.evaluate(input.value, scope);
            input.classList.remove("invalid");
            submit.disabled = false;
            eval_output.innerHTML = "Valid expression";
        }
        else {
            input.classList.add("invalid");
            submit.disabled = true;
            eval_output.innerHTML = "Invalid expression";
        }
    } catch (error) {
        input.classList.add("invalid");
        submit.disabled = true;
        eval_output.innerHTML = "Invalid expression";
    }   
}

// Show the html elements for expression 
module.exports.show = function () {
    var value = document.forms["form"]["input"].value;
    value = value.replace(/\s/g, '');
    if (value != "") {
        var node = document.createElement("li");
        var div = document.createElement("div");
        node.appendChild(div);
        for (var i = 0; i < current_expression.length; i++) {
            var exprNode = document.createTextNode(current_expression[i]);
            div.appendChild(exprNode);
            if (!functions.includes(current_expression[i])
                && /[a-zA-Z]+/.test(current_expression[i])
                && current_expression[i] in current_scope) {
                var inputNode = document.createElement("input", "text");
                div.appendChild(inputNode);
                inputNode.name = current_expression[i];
                inputNode.oninput = function () {
                    var inputs = node.querySelectorAll('input[name="' + CSS.escape(this.name) + '"]');
                    for (var j = 0; j < inputs.length; j++) {
                        inputs[j].value = this.value;
                        if (/^[^0-9]+$/.test(math.evaluate(inputs[j].value))) inputs[j].classList.add("invalid");
                        else inputs[j].classList.remove("invalid");
                    }
                }
            }
        }
        div.appendChild(document.createElement("br"));

        // Add the button that evaluates the expression
        var evalButton = document.createElement("button");
        evalButton.textContent = "Evaluate";
        evalButton.onclick = function () {
            var scope = {};
            var variables = node.querySelectorAll("input");
            for (var i = 0; i < variables.length; i++) {
                var variableNode = variables[i];
                scope[variableNode.name] = variableNode.value;
            }
            var result = div.querySelector("p");
            result.innerHTML = math.evaluate(value, scope);
        }
        div.appendChild(evalButton);

        // Add the button that deletes the expression
        var deleteButton = document.createElement("button");
        deleteButton.textContent = "Delete";
        deleteButton.onclick = function () {
            document.getElementById("expressions").removeChild(node);
        }
        div.appendChild(deleteButton);

        // Add the result of the evaluation of the expression
        var result = document.createElement("p");
        div.appendChild(result);

        // Add the expression to a list
        node.setAttribute("value", value);
        document.getElementById("expressions").appendChild(node);
    }
}
/* References
 * https://gomakethings.com/getting-html-with-fetch-in-vanilla-js/
 * https://stackoverflow.com/questions/23296094/browserify-how-to-call-function-bundled-in-a-file-generated-through-browserify
 */