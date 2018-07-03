import toposort from 'toposort'
import diff from 'shallow-diff'
import {
  setMergeInto
} from 'utils/sets'

// our default initial scope; does NOT include things like sin, cos, pi, e
// that mathjs is going to provide already
const DEFAULT_SCOPE_EXTENSION = {}

// Symbol names from MathJS that we want to allow.
// Note: Does not include all of mathjs's defaults, because we don't want some
// of them (for example, mathjs defines 's' as a Unit, which we have no interest in.)
const MATHJS_ALLOWED_SYMBOLS_NAMES = [
  'e',
  'pi',
  'cos',
  'sin',
  'tan',
  'sec',
  'csc',
  'cot',
  'log',
  'ln',
  'exp'
]

const DEFAULT_SYMBOL_NAMES = new Set( [
  ...MATHJS_ALLOWED_SYMBOLS_NAMES,
  ...Object.keys(DEFAULT_SCOPE_EXTENSION)
] )

/**
 * Functions for evaluating a serialized description of mathematical symbols.
 * This includes sorting the symbols into a valid evaluation order.
 *
 * As an example, consider the serialized symbol:values 'scope' below:
 *
 *     a = b/2 - c
 *     b = g(4) + c
 *     c = -1
 *     d = +1
 *     f(x, y) = a*x^2 - b*y
 *     g(t) = t^3 - 1
 *     p = c^2 + d^2
 *     z = 1
 *
 * These symbol definitions forms a directed graph where parents represent
 * evaluation dependencies and must be evaluated first.
 *
 * Note that 'x', 'y', and 't' are function arguments and do not appear in our
 * dependency graph.
 *
 * d ----------->--- p
 *          /
 * c -->-------\
 *        \     -->-- a -->--- f
 * g -->-- b --/              /
 *         \                 /
 *         \-------->-------
 *
 * z        (isolated node)
 *
 * This module has two main responsibilities:
 *   1. Generate an initial symbol:value mapping from a serialized description.
 *   2. Update an exisiting symbol:value mapping when some variable values have
 *      changed. For example, when a single variable value changes, we do not
 *      need to re-evaluate the entire mathscope. In the example above, if 'b'
 *      changes from 'g(4)' to 'g(3) + p' we only need to update b and its
 *      descendants.
 *
 *  Low-level functions are combined in the MathScope class, which provides
 *  caching for faster re-computation.
 */

/**
 * @typedef {Object.<string, string>} Symbols
 * mapping from symbol names to symbol values. Symbol values *must* be
 * parserable by a Parser class instance. Example:
 * { a: 'a=5', f: 'f(t)=t^2 + a' }
 *
 * @typedef {Object.<string, number|function|array>} Scope
 * mapping from symbol names to evaluated symbol values. Example:
 * { a: 5, f: t => t**2 + 5 }
 *
 * @typedef {Object.<string, error>} SymbolsErrors
 * mapping from symbol names to evaluation errors
 *
 * @typedef {Object.<string, set>} ChildMap
 * mapping from symbol name to direct children their direct children in the
 * dependency graph. Example:
 * { a: Set() { 'b', 'c' }  b: Set() { 'c' }, c: Set() {} }
 *
 * @typedef {Object.<string, string>} UnmetDependencies
 * object that maps node names to name of one of its unmet dependencies
 */

/**
 * evaluates a serialized scope from scratch or updates an existing scope
 *
 * @param  {Parser} parser for evaluating mathematical expressions
 * @param  {Symbols} symbols, must be parseable!
 * @param  {?Scope} oldScope
 * @param {?array|set} changed which serialized symbol values have changed.
 *   Starting from oldScope, only update these symbols and their children
 *
 * Note: The optional arguments oldScope and changed should NOT be used if
 * deleting symbols from or adding symbols to the scope. These arguments are
 * intended to improve performance when changing a single symbol's very often,
 * e.g., when the symbol's value is changed by a slider
 *
 */
export function evalScope(parser, symbols, oldScope = DEFAULT_SCOPE_EXTENSION, changed = null) {
  // Get the evaluation order and add symbols to scope
  const { childMap, unmetDependencies } = getChildMap(symbols, parser)

  const {
    safeSymbols,
    dependencyErrors
  } = removeUnmetDependencies(symbols, unmetDependencies)
  const safeChildMap = Object.keys(unmetDependencies).length === 0
    ? childMap
    : getChildMap(safeSymbols, parser).childMap

  const evalOrder = getEvalOrder(safeSymbols, safeChildMap, changed)
  const initial = {
    scope: { ...oldScope }, // copy oldScope, not mutate
    errors: dependencyErrors,
    updated: new Set(evalOrder)
  }

  return evalOrder.reduce((acc, symbolName) => {
    try {
      acc.scope[symbolName] = parser.parse(safeSymbols[symbolName] ).eval(acc.scope)
    }
    catch (err) {
      acc.errors[symbolName] = err
    }
    return acc
  }, initial)

}

/**
 * Removes symbols with unmet dependencies
 *
 * Comment about unmet dependencies:
 * We explicitly remove all unmet dependencies before trying to evaluate
 * anything because MathJS has trouble telling when FunctionAssignmentNodes
 * have unmet dependencies. In particular:
 *  - AssignmentNode:
 *    c = math.parse('c=a+b').eval({b:5}) // raises error, 'a is undefined'
 *  - FunctionAssignmentNode:
 *    f = math.parse('f(t)=t+a+b').eval({b:5}) // does not raise error
 *    f(1) // raises error
 * We'd like to catch the error in f when evaluating the scope, rather than
 * waiting to evaluate the function f.
 *
 * @param  {Symbols} symbols
 * @param  {UnmetDependencies} unmetDependencies
 * @return {object} result
 *    @property {Symbols} safeSymbols same as symbols, but with unmet
 *      dependencies removed
 *    @property {SymbolsErrors} dependencyErrors
 */
function removeUnmetDependencies(symbols, unmetDependencies) {
  // optimization: quick exit if no unmet dependencies
  if (Object.keys(unmetDependencies).length === 0) {
    return { safeSymbols: symbols, dependencyErrors: {} }
  }

  const omitThese = new Set(Object.keys(unmetDependencies))
  const safeSymbols = Object.keys(symbols).reduce((acc, symbolName) => {
    if (!omitThese.has(symbolName)) {
      acc[symbolName] = symbols[symbolName]
    }
    return acc
  }, {} )

  const dependencyErrors = Object.keys(unmetDependencies).reduce(
    (acc, symbolName) => {
      acc[symbolName] = Error(`Eval Error: Depends on undefined symbol ${unmetDependencies[symbolName]}`)
      return acc
    }, {} )

  return { safeSymbols, dependencyErrors }
}

/**
 * Determines a valid evaluation order for symbols. If onlyTheseAndChildren is
 * supplied, only returns those nodes and their children.
 *
 * @param  {Symbols} symbols
 * @param  {ChildMap} childMap pre-calculated for symbols
 * @param  {?array|Set} onlyTheseAndChildren
 *
 * @returns {array} of symbol names, a valid evaluation order for symbols
 */
export function getEvalOrder(symbols, childMap, onlyTheseAndChildren = null) {
  // construct dependency graph as array of nodes
  const nodesToInclude = onlyTheseAndChildren
    ? [...getDescendants(onlyTheseAndChildren, childMap)]
    : Object.keys(childMap)

  // Sort the non-isolated nodes
  // Alert! Isolated nodes---nodes without parents or children---are missed.
  // We'll add them in a moment
  const { edges, childless } = nodesToInclude.reduce((acc, node) => {
    if (childMap[node].size === 0) {
      acc.childless.push(node)
    }
    for (const child of childMap[node] ) {
      acc.edges.push( [node, child] )
    }
    return acc
  }, { edges: [], childless: [] } )
  const sorted = toposort(edges)
  const included = new Set(sorted)
  const isolated = childless.filter(node => !included.has(node))

  return [...sorted, ...isolated]
}

/**
 * Detect direct children of all nodes and detect nodes with unmet dependencies
 *
 * @param  {Symbols} symbols
 * @param  {Parser} parser
 *
 * @returns {object} result
 *    @property {ChildMap} childMap
 *    @property {UnmetDependencies} unmetDependencies
 */
export function getChildMap(symbols, parser) {

  const initial = Object.keys(symbols).reduce((acc, symbolName) => {
    acc[symbolName] = new Set()
    return acc
  }, {} )

  // maps nodes to their direct unmet dependency
  const unmetDirectDependencies = {}

  const childMap = Object.keys(symbols).reduce((childMap, symbolName) => {
    const symbol = symbols[symbolName]
    const dependencies = parser.parse(symbol).dependencies

    // remove dependencies
    dependencies.forEach(dep => {
      DEFAULT_SYMBOL_NAMES.has(dep) && dependencies.delete(dep)
    } )

    dependencies.forEach(dep => {
      if (childMap[dep] === undefined) {
        childMap[dep] = new Set()
        unmetDirectDependencies[symbolName] = dep
      }
      childMap[dep].add(symbolName)
    } )
    return childMap
  }, initial)

  // for each node with a direct unmet dependency, mark all of its children
  // as having the same unmet dependency
  const unmetDependencies = Object.keys(unmetDirectDependencies).reduce(
    (acc, node) => {
      getDescendantsOfNode(node, childMap).forEach(
        d => { acc[d] = unmetDirectDependencies[node] }
      )
      return acc
    }, { } )

  return { childMap, unmetDependencies }

}

/**
 * get all descendants of a single node in a directed graph
 *
 * @param  {ChildMap} childMap
 * @returns {set} the given node and all of its descendents
 */
export function getDescendantsOfNode(node, childMap) {
  const descendants = new Set( [node] )

  if (childMap[node].size === 0) {
    return descendants
  }

  childMap[node].forEach(child => {
    setMergeInto(descendants, getDescendantsOfNode(child, childMap))
  } )

  return descendants
}

/**
 * get all descendants of nodes in a directed graph
 *
 * @param  {set|array} nodes
 * @returns {set} the given nodes and all of their descendents
 */
export function getDescendants(nodes, childMap) {
  const children = new Set()
  nodes.forEach(node => {
    setMergeInto(children, getDescendantsOfNode(node, childMap))
  } )
  return children
}

export class ScopeEvaluator {

  constructor(parser) {
    this._parser = parser
  }

  _oldResult = {
    scope: {},
    errors: {},
    updated: {}
  }
  _oldSymbols = {}

  evalScope(symbols) {

    if (symbols === this._oldSymbols) {
      return this._oldResult
    }

    const { updatesOnly, changed } = ScopeEvaluator._detectChanges(symbols, this._oldSymbols)

    const result = updatesOnly
      ? this._patchScope(symbols, changed)
      : this._recalculateScope(symbols)

    this._updateState(symbols, result)
    return result

  }

  static _detectChanges(newSymbols, oldSymbols) {
    const { added, deleted, updated } = diff(newSymbols, oldSymbols)
    return {
      updatesOnly: added.length === 0 && deleted.length === 0,
      changed: updated
    }
  }

  _patchScope(symbols, changed) {
    const newResult = evalScope(this._parser, symbols, this._oldResult.scope, changed)
    const combinedErrors = Object.keys(this._oldResult.errors).filter(
      symbolName => !newResult.scope[symbolName]
    ).reduce((acc, symbolName) => {
      acc[symbolName] = this._oldResult.errors[symbolName]
      return acc
    }, newResult.errors)

    return {
      scope: newResult.scope,
      errors: combinedErrors,
      updated: newResult.updated
    }

  }

  _recalculateScope(symbols) {
    return evalScope(this._parser, symbols)
  }

  _updateState(symbols, result) {
    this._oldSymbols = symbols
    this._oldResult = result
  }

}
