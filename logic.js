class LogicParser {
    constructor() {
        this.stepCounter = 1;
        this.steps = [];
    }

    addStep(description, formula) {
        this.steps.push({
            step: this.stepCounter++,
            description: description,
            formula: formula
        });
    }

    cleanInput(input) {
        return input.replace(/\$/g, '').trim();
    }

    // Normalize input by converting LaTeX commands to symbols
    normalizeInput(text) {
        if (!text) return '';
        text = text.replace(/\u00A0/g, ' ');
        text = text.replace(/\\+/g, '\\');
        text = text.replace(/\\,|\\;|\\:|\\!|\\quad|\\qquad|\\ /g, ' ');
        
        const map = {
            '\\forall': '∀', '\\exists': '∃', '\\neg': '¬', '\\lnot': '¬',
            '\\land': '∧', '\\lor': '∨', '\\leftrightarrow': '↔', '\\to': '→',
            '<->': '↔', '->': '→', '!': '¬', '~': '¬', '&': '∧', '|': '∨'
        };
        
        for (const k in map) {
            text = text.split(k).join(map[k]);
        }
        return text;
    }

    // Tokenize the input string
    tokenize(input) {
        const tokens = [];
        let i = 0;
        while (i < input.length) {
            const ch = input[i];
            if (/\s/.test(ch)) { i++; continue; }
            
            if ('(),.:'.includes(ch)) {
                tokens.push({ type: ch, value: ch });
                i++;
                continue;
            }
            
            if (ch === '∀') { tokens.push({ type: 'forall', value: '∀' }); i++; continue; }
            if (ch === '∃') { tokens.push({ type: 'exists', value: '∃' }); i++; continue; }
            if (ch === '¬') { tokens.push({ type: 'not', value: '¬' }); i++; continue; }
            if (ch === '∧') { tokens.push({ type: 'and', value: '∧' }); i++; continue; }
            if (ch === '∨') { tokens.push({ type: 'or', value: '∨' }); i++; continue; }
            if (ch === '→') { tokens.push({ type: 'implies', value: '→' }); i++; continue; }
            if (ch === '↔') { tokens.push({ type: 'iff', value: '↔' }); i++; continue; }
            
            if (this.isLetter(ch)) {
                let j = i + 1;
                while (j < input.length && /[A-Za-z0-9_]/.test(input[j])) j++;
                tokens.push({ type: 'name', value: input.slice(i, j) });
                i = j;
                continue;
            }
            
            throw new Error('Unexpected character: ' + ch);
        }
        return tokens;
    }

    isLetter(ch) {
        return /[A-Za-z_]/.test(ch);
    }

    isDigit(ch) {
        return /[0-9]/.test(ch);
    }

    // Parse tokens into an AST
    parse(tokens) {
        this.tokens = tokens;
        this.index = 0;
        return this.parseExpression();
    }

    parseExpression() {
        return this.parseIff();
    }

    parseIff() {
        let left = this.parseImplies();
        while (this.match('iff')) {
            const right = this.parseImplies();
            left = { kind: 'Iff', left, right };
        }
        return left;
    }

    parseImplies() {
        let left = this.parseOr();
        while (this.match('implies')) {
            const right = this.parseOr();
            left = { kind: 'Implies', left, right };
        }
        return left;
    }

    parseOr() {
        let left = this.parseAnd();
        while (this.match('or')) {
            const right = this.parseAnd();
            left = { kind: 'Or', left, right };
        }
        return left;
    }

    parseAnd() {
        let left = this.parseUnary();
        while (this.match('and')) {
            const right = this.parseUnary();
            left = { kind: 'And', left, right };
        }
        return left;
    }

    parseUnary() {
        if (this.match('not')) {
            return { kind: 'Not', child: this.parseUnary() };
        }
        
        if (this.match('forall') || this.match('exists')) {
            const quantifier = this.previous().type;
            const variable = this.consume('name').value;
            let body = this.parseUnary();
            return {
                kind: quantifier === 'forall' ? 'ForAll' : 'Exists',
                variable,
                body
            };
        }
        
        return this.parsePrimary();
    }

    parsePrimary() {
        if (this.match('(')) {
            const expr = this.parseExpression();
            this.consume(')');
            return expr;
        }
        
        if (this.check('name')) {
            const name = this.consume('name').value;
            
            if (this.match('(')) {
                const args = this.parseArguments();
                this.consume(')');
                return { kind: 'Predicate', name, args };
            }
            
            return { kind: 'Variable', name };
        }
        
        throw new Error('Expected primary expression');
    }

    parseArguments() {
        const args = [this.parseExpression()];
        while (this.match(',')) {
            args.push(this.parseExpression());
        }
        return args;
    }

    // Parser helper methods
    match(expectedType) {
        if (this.check(expectedType)) {
            this.advance();
            return true;
        }
        return false;
    }

    check(expectedType) {
        if (this.isAtEnd()) return false;
        return this.peek().type === expectedType;
    }

    advance() {
        if (!this.isAtEnd()) this.index++;
        return this.previous();
    }

    peek() {
        return this.tokens[this.index];
    }

    previous() {
        return this.tokens[this.index - 1];
    }

    consume(expectedType) {
        if (this.check(expectedType)) return this.advance();
        throw new Error(`Expected ${expectedType}, found ${this.peek().type}`);
    }

    isAtEnd() {
        return this.index >= this.tokens.length;
    }

    // Convert AST back to LaTeX
    toLatex(node) {
        switch (node.kind) {
            case 'ForAll':
                return `\\forall ${node.variable} (${this.toLatex(node.body)})`;
            case 'Exists':
                return `\\exists ${node.variable} (${this.toLatex(node.body)})`;
            case 'Not':
                return `\\lnot ${this.toLatex(node.child)}`;
            case 'And':
                return `(${this.toLatex(node.left)} \\land ${this.toLatex(node.right)})`;
            case 'Or':
                return `(${this.toLatex(node.left)} \\lor ${this.toLatex(node.right)})`;
            case 'Implies':
                return `(${this.toLatex(node.left)} \\to ${this.toLatex(node.right)})`;
            case 'Iff':
                return `(${this.toLatex(node.left)} \\leftrightarrow ${this.toLatex(node.right)})`;
            case 'Predicate':
                return node.args && node.args.length > 0 
                    ? `${node.name}(${node.args.map(arg => this.toLatex(arg)).join(', ')})`
                    : node.name;
            case 'Variable':
                return node.name;
            default:
                return 'unknown';
        }
    }
}

class CNFConverter {
    constructor() {
        this.parser = new LogicParser();
    }

    convert(input) {
        this.parser.stepCounter = 1;
        this.parser.steps = [];

        // Step 1: Show original formula
        let formula = this.parser.cleanInput(input);
        this.parser.addStep("Original formula:", formula);

        try {
            // Normalize and parse
            const normalized = this.parser.normalizeInput(formula);
            const tokens = this.parser.tokenize(normalized);
            const ast = this.parser.parse(tokens);
            
            // Step 2: Eliminate implications
            const withoutImpl = this.eliminateImplications(ast);
            this.parser.addStep("Eliminate implications:", this.parser.toLatex(withoutImpl));
            
            // Step 3: De Morgan
            const withDeMorgan = this.applyDeMorgan(withoutImpl);
            if (this.parser.toLatex(withDeMorgan) !== this.parser.toLatex(withoutImpl)) {
                this.parser.addStep("Apply De Morgan's laws:", this.parser.toLatex(withDeMorgan));
            }
            
            // NEW STEP: Convert to Prenex form
            const prenexForm = this.convertToPrenex(withDeMorgan);
            if (this.parser.toLatex(prenexForm) !== this.parser.toLatex(withDeMorgan)) {
                this.parser.addStep("Convert to Prenex form:", this.parser.toLatex(prenexForm));
            }
            
            // Step 4: Distribute AND over OR
            const distributed = this.distributeAndOverOr(prenexForm);
            if (this.parser.toLatex(distributed) !== this.parser.toLatex(prenexForm)) {
                this.parser.addStep("Distribute AND over OR:", this.parser.toLatex(distributed));
            }
            
            // Final result
            const result = this.parser.toLatex(distributed);
            this.parser.addStep("CNF Result:", result);
            
            return {
                steps: this.parser.steps,
                result: result
            };
        } catch (error) {
            console.error("Error in CNF conversion:", error);
            this.parser.addStep("Error:", "Failed to process formula: " + error.message);
            return {
                steps: this.parser.steps,
                result: "Error"
            };
        }
    }
    
    eliminateImplications(ast) {
        switch (ast.kind) {
            case 'Implies':
                return {
                    kind: 'Or',
                    left: { kind: 'Not', child: this.eliminateImplications(ast.left) },
                    right: this.eliminateImplications(ast.right)
                };
            case 'Iff':
                return {
                    kind: 'And',
                    left: {
                        kind: 'Or',
                        left: { kind: 'Not', child: this.eliminateImplications(ast.left) },
                        right: this.eliminateImplications(ast.right)
                    },
                    right: {
                        kind: 'Or',
                        left: { kind: 'Not', child: this.eliminateImplications(ast.right) },
                        right: this.eliminateImplications(ast.left)
                    }
                };
            case 'Not':
                return { kind: 'Not', child: this.eliminateImplications(ast.child) };
            case 'And':
                return {
                    kind: 'And',
                    left: this.eliminateImplications(ast.left),
                    right: this.eliminateImplications(ast.right)
                };
            case 'Or':
                return {
                    kind: 'Or',
                    left: this.eliminateImplications(ast.left),
                    right: this.eliminateImplications(ast.right)
                };
            case 'ForAll':
                return {
                    kind: 'ForAll',
                    variable: ast.variable,
                    body: this.eliminateImplications(ast.body)
                };
            case 'Exists':
                return {
                    kind: 'Exists',
                    variable: ast.variable,
                    body: this.eliminateImplications(ast.body)
                };
            default:
                return ast;
        }
    }

    applyDeMorgan(ast) {
        switch (ast.kind) {
            case 'Not':
                if (ast.child.kind === 'And') {
                    return {
                        kind: 'Or',
                        left: { kind: 'Not', child: this.applyDeMorgan(ast.child.left) },
                        right: { kind: 'Not', child: this.applyDeMorgan(ast.child.right) }
                    };
                } else if (ast.child.kind === 'Or') {
                    return {
                        kind: 'And',
                        left: { kind: 'Not', child: this.applyDeMorgan(ast.child.left) },
                        right: { kind: 'Not', child: this.applyDeMorgan(ast.child.right) }
                    };
                } else if (ast.child.kind === 'Not') {
                    return this.applyDeMorgan(ast.child.child); 
                }
                return ast;
            case 'And':
                return {
                    kind: 'And',
                    left: this.applyDeMorgan(ast.left),
                    right: this.applyDeMorgan(ast.right)
                };
            case 'Or':
                return {
                    kind: 'Or',
                    left: this.applyDeMorgan(ast.left),
                    right: this.applyDeMorgan(ast.right)
                };
            case 'ForAll':
                return {
                    kind: 'ForAll',
                    variable: ast.variable,
                    body: this.applyDeMorgan(ast.body)
                };
            case 'Exists':
                return {
                    kind: 'Exists',
                    variable: ast.variable,
                    body: this.applyDeMorgan(ast.body)
                };
            default:
                return ast;
        }
    }

    distributeAndOverOr(ast) {
        if (ast.kind === 'Or') {
            if (ast.left.kind === 'And') {
                return {
                    kind: 'And',
                    left: this.distributeAndOverOr({
                        kind: 'Or',
                        left: ast.left.left,
                        right: ast.right
                    }),
                    right: this.distributeAndOverOr({
                        kind: 'Or',
                        left: ast.left.right,
                        right: ast.right
                    })
                };
            } else if (ast.right.kind === 'And') {
                return {
                    kind: 'And',
                    left: this.distributeAndOverOr({
                        kind: 'Or',
                        left: ast.left,
                        right: ast.right.left
                    }),
                    right: this.distributeAndOverOr({
                        kind: 'Or',
                        left: ast.left,
                        right: ast.right.right
                    })
                };
            }
        }
        
        if (ast.kind === 'And') {
            return {
                kind: 'And',
                left: this.distributeAndOverOr(ast.left),
                right: this.distributeAndOverOr(ast.right)
            };
        }
        
        if (ast.kind === 'Not') {
            return { kind: 'Not', child: this.distributeAndOverOr(ast.child) };
        }
        
        return ast;
    }
    convertToPrenex(ast) {
        const prenexConverter = new PrenexConverter();
        return prenexConverter.convertToPrenex(ast);
    }
}

class DNFConverter {
    constructor() {
        this.parser = new LogicParser();
    }

    convert(input) {
        this.parser.stepCounter = 1;
        this.parser.steps = [];

        // Step 1: Show original formula
        let formula = this.parser.cleanInput(input);
        this.parser.addStep("Original formula:", formula);

        try {
            // Normalize and parse
            const normalized = this.parser.normalizeInput(formula);
            const tokens = this.parser.tokenize(normalized);
            const ast = this.parser.parse(tokens);
            
            // Step 2: Eliminate implications
            const withoutImpl = this.eliminateImplications(ast);
            this.parser.addStep("Eliminate implications:", this.parser.toLatex(withoutImpl));
            
            // Step 3: De Morgan
            const withDeMorgan = this.applyDeMorgan(withoutImpl);
            if (this.parser.toLatex(withDeMorgan) !== this.parser.toLatex(withoutImpl)) {
                this.parser.addStep("Apply De Morgan's laws:", this.parser.toLatex(withDeMorgan));
            }
            
            // NEW STEP: Convert to Prenex form
            const prenexForm = this.convertToPrenex(withDeMorgan);
            if (this.parser.toLatex(prenexForm) !== this.parser.toLatex(withDeMorgan)) {
                this.parser.addStep("Convert to Prenex form:", this.parser.toLatex(prenexForm));
            }
            
            // Step 4: Distribute OR over AND
            const distributed = this.distributeOrOverAnd(prenexForm);
            if (this.parser.toLatex(distributed) !== this.parser.toLatex(prenexForm)) {
                this.parser.addStep("Distribute OR over AND:", this.parser.toLatex(distributed));
            }
            
            // Final result
            const result = this.parser.toLatex(distributed);
            this.parser.addStep("DNF Result:", result);
            
            return {
                steps: this.parser.steps,
                result: result
            };
        } catch (error) {
            console.error("Error in DNF conversion:", error);
            this.parser.addStep("Error:", "Failed to process formula: " + error.message);
            return {
                steps: this.parser.steps,
                result: "Error"
            };
        }
    }

    eliminateImplications(ast) {
        
        switch (ast.kind) {
            case 'Implies':
                return {
                    kind: 'Or',
                    left: { kind: 'Not', child: this.eliminateImplications(ast.left) },
                    right: this.eliminateImplications(ast.right)
                };
            case 'Iff':
                return {
                    kind: 'And',
                    left: {
                        kind: 'Or',
                        left: { kind: 'Not', child: this.eliminateImplications(ast.left) },
                        right: this.eliminateImplications(ast.right)
                    },
                    right: {
                        kind: 'Or',
                        left: { kind: 'Not', child: this.eliminateImplications(ast.right) },
                        right: this.eliminateImplications(ast.left)
                    }
                };
            case 'Not':
                return { kind: 'Not', child: this.eliminateImplications(ast.child) };
            case 'And':
                return {
                    kind: 'And',
                    left: this.eliminateImplications(ast.left),
                    right: this.eliminateImplications(ast.right)
                };
            case 'Or':
                return {
                    kind: 'Or',
                    left: this.eliminateImplications(ast.left),
                    right: this.eliminateImplications(ast.right)
                };
            case 'ForAll':
                return {
                    kind: 'ForAll',
                    variable: ast.variable,
                    body: this.eliminateImplications(ast.body)
                };
            case 'Exists':
                return {
                    kind: 'Exists',
                    variable: ast.variable,
                    body: this.eliminateImplications(ast.body)
                };
            default:
                return ast;
        }
    }

    applyDeMorgan(ast) {
        
        switch (ast.kind) {
            case 'Not':
                if (ast.child.kind === 'And') {
                    return {
                        kind: 'Or',
                        left: { kind: 'Not', child: this.applyDeMorgan(ast.child.left) },
                        right: { kind: 'Not', child: this.applyDeMorgan(ast.child.right) }
                    };
                } else if (ast.child.kind === 'Or') {
                    return {
                        kind: 'And',
                        left: { kind: 'Not', child: this.applyDeMorgan(ast.child.left) },
                        right: { kind: 'Not', child: this.applyDeMorgan(ast.child.right) }
                    };
                } else if (ast.child.kind === 'Not') {
                    return this.applyDeMorgan(ast.child.child); // Double negation
                }
                return ast;
            case 'And':
                return {
                    kind: 'And',
                    left: this.applyDeMorgan(ast.left),
                    right: this.applyDeMorgan(ast.right)
                };
            case 'Or':
                return {
                    kind: 'Or',
                    left: this.applyDeMorgan(ast.left),
                    right: this.applyDeMorgan(ast.right)
                };
            case 'ForAll':
                return {
                    kind: 'ForAll',
                    variable: ast.variable,
                    body: this.applyDeMorgan(ast.body)
                };
            case 'Exists':
                return {
                    kind: 'Exists',
                    variable: ast.variable,
                    body: this.applyDeMorgan(ast.body)
                };
            default:
                return ast;
        }
    }

    distributeOrOverAnd(ast) {
        if (ast.kind === 'And') {
            if (ast.left.kind === 'Or') {
                return {
                    kind: 'Or',
                    left: this.distributeOrOverAnd({
                        kind: 'And',
                        left: ast.left.left,
                        right: ast.right
                    }),
                    right: this.distributeOrOverAnd({
                        kind: 'And',
                        left: ast.left.right,
                        right: ast.right
                    })
                };
            } else if (ast.right.kind === 'Or') {
                return {
                    kind: 'Or',
                    left: this.distributeOrOverAnd({
                        kind: 'And',
                        left: ast.left,
                        right: ast.right.left
                    }),
                    right: this.distributeOrOverAnd({
                        kind: 'And',
                        left: ast.left,
                        right: ast.right.right
                    })
                };
            }
        }
        
        if (ast.kind === 'Or') {
            return {
                kind: 'Or',
                left: this.distributeOrOverAnd(ast.left),
                right: this.distributeOrOverAnd(ast.right)
            };
        }
        
        if (ast.kind === 'Not') {
            return { kind: 'Not', child: this.distributeOrOverAnd(ast.child) };
        }
        
        return ast;
    }
    // Add Prenex conversion method
    convertToPrenex(ast) {
        const prenexConverter = new PrenexConverter();
        return prenexConverter.convertToPrenex(ast);
    }
}


class ClausalConverter {
    constructor() {
        this.parser = new LogicParser();
    }

    convert(input) {
        this.parser.stepCounter = 1;
        this.parser.steps = [];

        // Step 1: Show original formula
        let formula = this.parser.cleanInput(input);
        this.parser.addStep("Original formula:", formula);

        try {
            // Normalize and parse
            const normalized = this.parser.normalizeInput(formula);
            const tokens = this.parser.tokenize(normalized);
            const ast = this.parser.parse(tokens);
            
            // Step 2: Eliminate implications
            const withoutImpl = this.eliminateImplications(ast);
            this.parser.addStep("Eliminate implications:", this.parser.toLatex(withoutImpl));
            
            // Step 3: De Morgan
            const withDeMorgan = this.applyDeMorgan(withoutImpl);
            if (this.parser.toLatex(withDeMorgan) !== this.parser.toLatex(withoutImpl)) {
                this.parser.addStep("Apply De Morgan's laws:", this.parser.toLatex(withDeMorgan));
            }
            
            // Step 4: Distribute AND over OR
            const distributed = this.distributeAndOverOr(withDeMorgan);
            if (this.parser.toLatex(distributed) !== this.parser.toLatex(withDeMorgan)) {
                this.parser.addStep("Convert to CNF:", this.parser.toLatex(distributed));
            }
            
            // Step 5: Extract clauses
            const clauses = this.extractClauses(distributed);
            const clausalForm = this.formatAsClauses(clauses);
            this.parser.addStep("Extract clauses:", clausalForm);
            
            return {
                steps: this.parser.steps,
                result: clausalForm,
                clauses: clauses
            };
        } catch (error) {
            console.error("Error in Clausal conversion:", error);
            this.parser.addStep("Error:", "Failed to process formula: " + error.message);
            return {
                steps: this.parser.steps,
                result: "Error",
                clauses: []
            };
        }
    }

    eliminateImplications(ast) {
        
        switch (ast.kind) {
            case 'Implies':
                return {
                    kind: 'Or',
                    left: { kind: 'Not', child: this.eliminateImplications(ast.left) },
                    right: this.eliminateImplications(ast.right)
                };
            case 'Iff':
                return {
                    kind: 'And',
                    left: {
                        kind: 'Or',
                        left: { kind: 'Not', child: this.eliminateImplications(ast.left) },
                        right: this.eliminateImplications(ast.right)
                    },
                    right: {
                        kind: 'Or',
                        left: { kind: 'Not', child: this.eliminateImplications(ast.right) },
                        right: this.eliminateImplications(ast.left)
                    }
                };
            case 'Not':
                return { kind: 'Not', child: this.eliminateImplications(ast.child) };
            case 'And':
                return {
                    kind: 'And',
                    left: this.eliminateImplications(ast.left),
                    right: this.eliminateImplications(ast.right)
                };
            case 'Or':
                return {
                    kind: 'Or',
                    left: this.eliminateImplications(ast.left),
                    right: this.eliminateImplications(ast.right)
                };
            case 'ForAll':
                return {
                    kind: 'ForAll',
                    variable: ast.variable,
                    body: this.eliminateImplications(ast.body)
                };
            case 'Exists':
                return {
                    kind: 'Exists',
                    variable: ast.variable,
                    body: this.eliminateImplications(ast.body)
                };
            default:
                return ast;
        }
    }

    applyDeMorgan(ast) {
        
        switch (ast.kind) {
            case 'Not':
                if (ast.child.kind === 'And') {
                    return {
                        kind: 'Or',
                        left: { kind: 'Not', child: this.applyDeMorgan(ast.child.left) },
                        right: { kind: 'Not', child: this.applyDeMorgan(ast.child.right) }
                    };
                } else if (ast.child.kind === 'Or') {
                    return {
                        kind: 'And',
                        left: { kind: 'Not', child: this.applyDeMorgan(ast.child.left) },
                        right: { kind: 'Not', child: this.applyDeMorgan(ast.child.right) }
                    };
                } else if (ast.child.kind === 'Not') {
                    return this.applyDeMorgan(ast.child.child); // Double negation
                }
                return ast;
            case 'And':
                return {
                    kind: 'And',
                    left: this.applyDeMorgan(ast.left),
                    right: this.applyDeMorgan(ast.right)
                };
            case 'Or':
                return {
                    kind: 'Or',
                    left: this.applyDeMorgan(ast.left),
                    right: this.applyDeMorgan(ast.right)
                };
            case 'ForAll':
                return {
                    kind: 'ForAll',
                    variable: ast.variable,
                    body: this.applyDeMorgan(ast.body)
                };
            case 'Exists':
                return {
                    kind: 'Exists',
                    variable: ast.variable,
                    body: this.applyDeMorgan(ast.body)
                };
            default:
                return ast;
        }
    }

    distributeAndOverOr(ast) {
        if (ast.kind === 'Or') {
            if (ast.left.kind === 'And') {
                return {
                    kind: 'And',
                    left: this.distributeAndOverOr({
                        kind: 'Or',
                        left: ast.left.left,
                        right: ast.right
                    }),
                    right: this.distributeAndOverOr({
                        kind: 'Or',
                        left: ast.left.right,
                        right: ast.right
                    })
                };
            } else if (ast.right.kind === 'And') {
                return {
                    kind: 'And',
                    left: this.distributeAndOverOr({
                        kind: 'Or',
                        left: ast.left,
                        right: ast.right.left
                    }),
                    right: this.distributeAndOverOr({
                        kind: 'Or',
                        left: ast.left,
                        right: ast.right.right
                    })
                };
            }
        }
        
        if (ast.kind === 'And') {
            return {
                kind: 'And',
                left: this.distributeAndOverOr(ast.left),
                right: this.distributeAndOverOr(ast.right)
            };
        }
        
        if (ast.kind === 'Not') {
            return { kind: 'Not', child: this.distributeAndOverOr(ast.child) };
        }
        
        return ast;
    }

    extractClauses(ast) {
        const clauses = [];
        
        if (ast.kind === 'And') {
            clauses.push(...this.extractClauses(ast.left));
            clauses.push(...this.extractClauses(ast.right));
        } else {
            clauses.push(this.extractLiterals(ast));
        }
        
        return clauses;
    }

    extractLiterals(ast) {
        const literals = [];
        
        if (ast.kind === 'Or') {
            literals.push(...this.extractLiterals(ast.left));
            literals.push(...this.extractLiterals(ast.right));
        } else if (ast.kind === 'Not') {
            literals.push({ negated: true, formula: this.parser.toLatex(ast.child) });
        } else {
            literals.push({ negated: false, formula: this.parser.toLatex(ast) });
        }
        
        return literals;
    }

    formatAsClauses(clauses) {
        if (clauses.length === 0) return "";
        
        return clauses.map(clause => {
            const literals = clause.map(literal => 
                literal.negated ? `\\lnot ${literal.formula}` : literal.formula
            ).join(' \\lor ');
            
            return `(${literals})`;
        }).join(' \\land ');
    }
}

class HornClauseConverter {
    constructor() {
        this.parser = new LogicParser();
    }

    convert(input) {
        this.parser.stepCounter = 1;
        this.parser.steps = [];

        // Step 1: Show original formula
        let formula = this.parser.cleanInput(input);
        this.parser.addStep("Original formula:", formula);

        try {
            // Use ClausalConverter to get CNF and clauses
            const clausalConverter = new ClausalConverter();
            const clausalResult = clausalConverter.convert(input);
            
            // Add steps from clausal conversion
            this.parser.steps = clausalResult.steps;
            this.parser.stepCounter = this.parser.steps.length + 1;
            
            // Analyze Horn clauses
            const hornAnalysis = this.analyzeHornClauses(clausalResult.clauses);
            
            if (hornAnalysis.isHorn) {
                this.parser.addStep("Formula is in Horn clause form!", "");
                if (hornAnalysis.hornClauses.length > 0) {
                    this.parser.addStep("Horn clauses:", hornAnalysis.displayForm);
                }
            } else {
                this.parser.addStep("Note: Formula is not in Horn form", "");
            }
            
            return {
                steps: this.parser.steps,
                result: hornAnalysis.displayForm,
                isHorn: hornAnalysis.isHorn,
                hornClauses: hornAnalysis.hornClauses
            };
        } catch (error) {
            console.error("Error in Horn clause conversion:", error);
            this.parser.addStep("Error:", "Failed to process formula: " + error.message);
            return {
                steps: this.parser.steps,
                result: "Error",
                isHorn: false,
                hornClauses: []
            };
        }
    }

    analyzeHornClauses(clauses) {
        let hornClauses = [];
        let isHorn = true;
        
        for (let clause of clauses) {
            let positiveCount = 0;
            let negativeCount = 0;
            
            for (let literal of clause) {
                if (literal.negated) {
                    negativeCount++;
                } else {
                    positiveCount++;
                }
            }
            
            
            if (positiveCount <= 1) {
                hornClauses.push(clause);
            } else {
                isHorn = false;
                hornClauses.push(clause); 
            }
        }
        
        let displayForm = hornClauses.map(clause => {
            const literals = clause.map(literal => 
                literal.negated ? `\\lnot ${literal.formula}` : literal.formula
            ).join(' \\lor ');
            
            return `(${literals})`;
        }).join(' \\land ');
        
        return {
            isHorn: isHorn,
            hornClauses: hornClauses,
            displayForm: displayForm
        };
    }
}


function getInput(){
    const textArea = document.querySelector("textarea");
    return textArea.value;
}

function clearFunction(){
    const fnc = document.getElementById("FNC");
    const fdc = document.getElementById("FDC");
    const clausal = document.getElementById("ClausalFormula");
    const horn = document.getElementById("HorneClause");
    document.getElementById("form").reset();
    fnc.innerHTML = "";
    fdc.innerHTML = "";
    clausal.innerHTML = "";
    horn.innerHTML = "";
}

function fncFunction(){
    const inputValue = getInput();
    if (!inputValue.trim()) return;
    
    try {
        const converter = new CNFConverter();
        const result = converter.convert(inputValue);
        
        let html = "";
        for (let step of result.steps) {
            html += `<div style="margin: 10px 0; padding: 10px; background: #f5f5f5; border-radius: 5px;">
                        <strong>Step ${step.step}:</strong> ${step.description}<br>
                        <span style="font-family: monospace;">$${step.formula}$</span>
                     </div>`;
        }
        html += `<div style="margin: 15px 0; padding: 15px; background: #e8f5e8; border-radius: 5px; border: 2px solid #4caf50;">
                    <strong>Final CNF Result:</strong><br>
                    <span style="font-family: monospace;">$${result.result}$</span>
                 </div>`;
        
        const fnc = document.getElementById("FNC");
        fnc.innerHTML = html;
        MathJax.typesetPromise([fnc]);
        
    } catch (error) {
        console.error("Error in CNF conversion:", error);
        const fnc = document.getElementById("FNC");
        fnc.innerHTML = "<p style='color: red;'>Error processing formula</p>";
    }
}

function fdcFunction(){
    const inputValue = getInput();
    if (!inputValue.trim()) return;
    
    try {
        const converter = new DNFConverter();
        const result = converter.convert(inputValue);
        
        let html = "";
        for (let step of result.steps) {
            html += `<div style="margin: 10px 0; padding: 10px; background: #f5f5f5; border-radius: 5px;">
                        <strong>Step ${step.step}:</strong> ${step.description}<br>
                        <span style="font-family: monospace;">$${step.formula}$</span>
                     </div>`;
        }
        html += `<div style="margin: 15px 0; padding: 15px; background: #ffe8e8; border-radius: 5px; border: 2px solid #ff6b6b;">
                    <strong>Final DNF Result:</strong><br>
                    <span style="font-family: monospace;">$${result.result}$</span>
                 </div>`;
        
        const fdc = document.getElementById("FDC");
        fdc.innerHTML = html;
        MathJax.typesetPromise([fdc]);
        
    } catch (error) {
        console.error("Error in DNF conversion:", error);
        const fdc = document.getElementById("FDC");
        fdc.innerHTML = "<p style='color: red;'>Error processing formula</p>";
    }
}

function conjuctiveFunction(){
    const inputValue = getInput();
    if (!inputValue.trim()) return;
    
    try {
        const converter = new ClausalConverter();
        const result = converter.convert(inputValue);
        
        let html = "";
        for (let step of result.steps) {
            html += `<div style="margin: 10px 0; padding: 10px; background: #f5f5f5; border-radius: 5px;">
                        <strong>Step ${step.step}:</strong> ${step.description}<br>
                        <span style="font-family: monospace;">$${step.formula}$</span>
                     </div>`;
        }
        html += `<div style="margin: 15px 0; padding: 15px; background: #e8e8ff; border-radius: 5px; border: 2px solid #6b6bff;">
                    <strong>Final Clausal Form:</strong><br>
                    <span style="font-family: monospace;">$${result.result}$</span>
                 </div>`;
        
        // Display clauses as a set
        if (result.clauses && result.clauses.length > 0) {
            html += `<div style="margin: 15px 0; padding: 15px; background: #f0f0ff; border-radius: 5px; border: 1px solid #9999ff;">
                        <strong>Clauses as Set:</strong><br>
                        <span style="font-family: monospace;">$\\{${result.clauses.map(c => c.map(l => l.negated ? '¬' + l.formula : l.formula).join(', '))}\\}$</span>
                     </div>`;
        }
        
        const clausalArea = document.getElementById("ClausalFormula");
        
        if (clausalArea) {
            clausalArea.innerHTML = html;
            MathJax.typesetPromise([clausalArea]);
        }
        
    } catch (error) {
        console.error("Error in Clausal conversion:", error);
        const clausalArea = document.getElementById("ClausalFormula");
        if (clausalArea) {
            clausalArea.innerHTML = "<p style='color: red;'>Error processing formula</p>";
        }
    }
}

function hornFunction(){
    const inputValue = getInput();
    if (!inputValue.trim()) return;
    
    try {
        const converter = new HornClauseConverter();
        const result = converter.convert(inputValue);
        
        let html = "";
        for (let step of result.steps) {
            html += `<div style="margin: 10px 0; padding: 10px; background: #f5f5f5; border-radius: 5px;">
                        <strong>Step ${step.step}:</strong> ${step.description}<br>`;
            if (step.formula) {
                html += `<span style="font-family: monospace;">$${step.formula}$</span>`;
            }
            html += `</div>`;
        }
        
        // Show Horn clause result
        const bgColor = result.isHorn ? '#e8ffe8' : '#ffe8e8';
        const borderColor = result.isHorn ? '#4caf50' : '#ff6b6b';
        const statusText = result.isHorn ? 'Valid Horn Formula' : 'Not a Horn Formula';
        
        html += `<div style="margin: 15px 0; padding: 15px; background: ${bgColor}; border-radius: 5px; border: 2px solid ${borderColor};">
                    <strong>${statusText}:</strong><br>`;
        if (result.result) {
            html += `<span style="font-family: monospace;">$${result.result}$</span>`;
        }
        html += `</div>`;
        
        const hornArea = document.getElementById("HorneClause");
        if (hornArea) {
            hornArea.innerHTML = html;
            MathJax.typesetPromise([hornArea]);
        }
        
    } catch (error) {
        console.error("Error in Horn clause conversion:", error);
        const hornArea = document.getElementById("HorneClause");
        if (hornArea) {
            hornArea.innerHTML = "<p style='color: red;'>Error processing formula</p>";
        }
    }
}


class PrenexConverter {
    constructor() {
        this.parser = new LogicParser();
    }

    convert(input) {
        this.parser.stepCounter = 1;
        this.parser.steps = [];

        // Step 1: Show original formula
        let formula = this.parser.cleanInput(input);
        this.parser.addStep("Original formula:", formula);

        try {
            // Normalize and parse
            const normalized = this.parser.normalizeInput(formula);
            const tokens = this.parser.tokenize(normalized);
            const ast = this.parser.parse(tokens);
            
            // Step 2: Eliminate implications
            const withoutImpl = this.eliminateImplications(ast);
            this.parser.addStep("Eliminate implications:", this.parser.toLatex(withoutImpl));
            
            // Step 3: Apply De Morgan's laws
            const withDeMorgan = this.applyDeMorgan(withoutImpl);
            if (this.parser.toLatex(withDeMorgan) !== this.parser.toLatex(withoutImpl)) {
                this.parser.addStep("Apply De Morgan's laws:", this.parser.toLatex(withDeMorgan));
            }
            
            // Step 4: Convert to Prenex form
            const prenexForm = this.convertToPrenex(withDeMorgan);
            if (this.parser.toLatex(prenexForm) !== this.parser.toLatex(withDeMorgan)) {
                this.parser.addStep("Convert to Prenex form:", this.parser.toLatex(prenexForm));
            }
            
            // Final result
            const result = this.parser.toLatex(prenexForm);
            this.parser.addStep("Prenex Result:", result);
            
            return {
                steps: this.parser.steps,
                result: result
            };
        } catch (error) {
            console.error("Error in Prenex conversion:", error);
            this.parser.addStep("Error:", "Failed to process formula: " + error.message);
            return {
                steps: this.parser.steps,
                result: "Error"
            };
        }
    }

    eliminateImplications(ast) {
        switch (ast.kind) {
            case 'Implies':
                return {
                    kind: 'Or',
                    left: { kind: 'Not', child: this.eliminateImplications(ast.left) },
                    right: this.eliminateImplications(ast.right)
                };
            case 'Iff':
                return {
                    kind: 'And',
                    left: {
                        kind: 'Or',
                        left: { kind: 'Not', child: this.eliminateImplications(ast.left) },
                        right: this.eliminateImplications(ast.right)
                    },
                    right: {
                        kind: 'Or',
                        left: { kind: 'Not', child: this.eliminateImplications(ast.right) },
                        right: this.eliminateImplications(ast.left)
                    }
                };
            case 'Not':
                return { kind: 'Not', child: this.eliminateImplications(ast.child) };
            case 'And':
                return {
                    kind: 'And',
                    left: this.eliminateImplications(ast.left),
                    right: this.eliminateImplications(ast.right)
                };
            case 'Or':
                return {
                    kind: 'Or',
                    left: this.eliminateImplications(ast.left),
                    right: this.eliminateImplications(ast.right)
                };
            case 'ForAll':
                return {
                    kind: 'ForAll',
                    variable: ast.variable,
                    body: this.eliminateImplications(ast.body)
                };
            case 'Exists':
                return {
                    kind: 'Exists',
                    variable: ast.variable,
                    body: this.eliminateImplications(ast.body)
                };
            default:
                return ast;
        }
    }

    applyDeMorgan(ast) {
        switch (ast.kind) {
            case 'Not':
                if (ast.child.kind === 'And') {
                    return {
                        kind: 'Or',
                        left: { kind: 'Not', child: this.applyDeMorgan(ast.child.left) },
                        right: { kind: 'Not', child: this.applyDeMorgan(ast.child.right) }
                    };
                } else if (ast.child.kind === 'Or') {
                    return {
                        kind: 'And',
                        left: { kind: 'Not', child: this.applyDeMorgan(ast.child.left) },
                        right: { kind: 'Not', child: this.applyDeMorgan(ast.child.right) }
                    };
                } else if (ast.child.kind === 'Not') {
                    return this.applyDeMorgan(ast.child.child); // Double negation
                } else if (ast.child.kind === 'ForAll') {
                    return {
                        kind: 'Exists',
                        variable: ast.child.variable,
                        body: { kind: 'Not', child: this.applyDeMorgan(ast.child.body) }
                    };
                } else if (ast.child.kind === 'Exists') {
                    return {
                        kind: 'ForAll',
                        variable: ast.child.variable,
                        body: { kind: 'Not', child: this.applyDeMorgan(ast.child.body) }
                    };
                }
                return ast;
            case 'And':
                return {
                    kind: 'And',
                    left: this.applyDeMorgan(ast.left),
                    right: this.applyDeMorgan(ast.right)
                };
            case 'Or':
                return {
                    kind: 'Or',
                    left: this.applyDeMorgan(ast.left),
                    right: this.applyDeMorgan(ast.right)
                };
            case 'ForAll':
                return {
                    kind: 'ForAll',
                    variable: ast.variable,
                    body: this.applyDeMorgan(ast.body)
                };
            case 'Exists':
                return {
                    kind: 'Exists',
                    variable: ast.variable,
                    body: this.applyDeMorgan(ast.body)
                };
            default:
                return ast;
        }
    }

    convertToPrenex(ast) {
        
        if (ast.kind === 'ForAll' || ast.kind === 'Exists') {
            const bodyPrenex = this.convertToPrenex(ast.body);
            return {
                kind: ast.kind,
                variable: ast.variable,
                body: bodyPrenex
            };
        }
        
        
        if (ast.kind === 'And' || ast.kind === 'Or') {
            const leftPrenex = this.convertToPrenex(ast.left);
            const rightPrenex = this.convertToPrenex(ast.right);
            
            
            const leftQuantifiers = this.extractQuantifiers(leftPrenex);
            const rightQuantifiers = this.extractQuantifiers(rightPrenex);
            
            
            const allQuantifiers = [...leftQuantifiers, ...rightQuantifiers];
            
            
            const leftMatrix = this.removeQuantifiers(leftPrenex);
            const rightMatrix = this.removeQuantifiers(rightPrenex);
            
            
            const matrix = {
                kind: ast.kind,
                left: leftMatrix,
                right: rightMatrix
            };
            
            
            return this.applyQuantifiers(allQuantifiers, matrix);
        }
        
        
        if (ast.kind === 'Not') {
            const childPrenex = this.convertToPrenex(ast.child);
            
        
            if (childPrenex.kind === 'ForAll' || childPrenex.kind === 'Exists') {
                const newKind = childPrenex.kind === 'ForAll' ? 'Exists' : 'ForAll';
                return {
                    kind: newKind,
                    variable: childPrenex.variable,
                    body: { kind: 'Not', child: this.convertToPrenex(childPrenex.body) }
                };
            }
            
            
            return { kind: 'Not', child: childPrenex };
        }
        
        return ast;
    }

    extractQuantifiers(ast) {
        const quantifiers = [];
        let current = ast;
        
        while (current.kind === 'ForAll' || current.kind === 'Exists') {
            quantifiers.push({
                kind: current.kind,
                variable: current.variable
            });
            current = current.body;
        }
        
        return quantifiers;
    }

    removeQuantifiers(ast) {
        let current = ast;
        while (current.kind === 'ForAll' || current.kind === 'Exists') {
            current = current.body;
        }
        return current;
    }

    applyQuantifiers(quantifiers, matrix) {
        let result = matrix;
        for (let i = quantifiers.length - 1; i >= 0; i--) {
            result = {
                kind: quantifiers[i].kind,
                variable: quantifiers[i].variable,
                body: result
            };
        }
        return result;
    }
}

function prenexFunction(){
    const inputValue = getInput();
    if (!inputValue.trim()) return;
    
    try {
        const converter = new PrenexConverter();
        const result = converter.convert(inputValue);
        
        let html = "";
        for (let step of result.steps) {
            html += `<div style="margin: 10px 0; padding: 10px; background: #f5f5f5; border-radius: 5px;">
                        <strong>Step ${step.step}:</strong> ${step.description}<br>
                        <span style="font-family: monospace;">$${step.formula}$</span>
                     </div>`;
        }
        html += `<div style="margin: 15px 0; padding: 15px; background: #fff8e1; border-radius: 5px; border: 2px solid #ffc107;">
                    <strong>Final Prenex Result:</strong><br>
                    <span style="font-family: monospace;">$${result.result}$</span>
                 </div>`;
        
        // Create or get the Prenex result area
        let prenexArea = document.getElementById("PrenexFormula");
        if (!prenexArea) {
            prenexArea = document.createElement("div");
            prenexArea.id = "PrenexFormula";
            document.body.appendChild(prenexArea);
        }
        
        prenexArea.innerHTML = html;
        MathJax.typesetPromise([prenexArea]);
        
    } catch (error) {
        console.error("Error in Prenex conversion:", error);
        let prenexArea = document.getElementById("PrenexFormula");
        if (!prenexArea) {
            prenexArea = document.createElement("div");
            prenexArea.id = "PrenexFormula";
            document.body.appendChild(prenexArea);
        }
        prenexArea.innerHTML = "<p style='color: red;'>Error processing formula</p>";
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const submit = document.querySelector("input[type='submit']");
    submit.addEventListener("click", (event) => {
        event.preventDefault();
        fncFunction();
        fdcFunction();
        conjuctiveFunction();
        hornFunction();
    });
    const clearButton = document.querySelector("button");
    clearButton.addEventListener("click", (event) => {
        event.preventDefault();
        clearFunction();
    });
});

function clearFunction(){
    const fnc = document.getElementById("FNC");
    const fdc = document.getElementById("FDC");
    const clausal = document.getElementById("ClausalFormula");
    const horn = document.getElementById("HorneClause");
    document.getElementById("form").reset();
    fnc.innerHTML = "";
    fdc.innerHTML = "";
    clausal.innerHTML = "";
    horn.innerHTML = "";
}
