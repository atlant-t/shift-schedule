/**
 * Provides the ability to add entities that can be represented by a segment on
 * some line.
 */
export class LineMap<T> {
  /** Helper map for storing added entities (tokens) */
  // TODO: It probably makes sense to refuse this helper.
  private _tokenRangeMap = new Map<T, { start: number; end: number }>();
  /** Root node of the tree */
  private _rootNode: LineMapNode<T> | null = null;

  /** The number of events. */
  public get size() {
    return this._tokenRangeMap.size;
  }

  /**
   * Returns whethe at least one event is schedulet at the requested time.
   *
   * @param time Requested time.
   * @returns Whether some event scheduled to the requested time.
   */
  public has(token: T): boolean {
    return this._tokenRangeMap.has(token);
  }

  /**
   * Checks if there is at least one set segment in the specified range.
   *
   * @param start Start of the range.
   * @param end End of the range. If not specified, takes start value.
   */
  public filled(start: number, end: number = start): boolean {
    assertRange(start, end);
    return hasNode(this._rootNode, start, end);
  }

  /**
   * Returns array of segment keys at the requested range.
   *
   * @param start Start of the range.
   * @param end End of the range. If not specified, takes start value.
   * @returns Array of segments.
   */
  public getKeys(start: number, end: number = start): Array<T> {
    assertRange(start, end);

    const result = new Set<T>();
    const nodes = !!this._rootNode ? getNodes(this._rootNode, start, end) : [];

    for (const node of nodes) {
      for (const token of node.tokens) {
        result.add(token);
      }
    }

    return Array.from(result);
  }

  /**
   * Returns the range of the requested segment by its associated key.
   *
   * @param token Segment instance to which the range is associated.
   * @returns The segment range or null if the range is not found.
   */
  public getRange(token: T): { start: number, end: number } | null {
    const range = this._tokenRangeMap.get(token);
    if (!range) {
      return null;
    }
    return { start: range.start, end: range.end };
  }

  /**
   * Adds a new segment with the specified range. If the segment already
   * exists, the segment range will be updated.
   *
   * @param token Segment instance that should be added to the LineMap.
   * @param start Start of the range.
   * @param end End of the range. If not specified, takes start value.
   * @returns Current LineMap instance.
   */
  public set(token: T, start: number, end: number = start): typeof this {
    assertRange(start, end);

    if (this._tokenRangeMap.has(token)) {
      const { start: currentStart, end: currentEnd } = this._tokenRangeMap.get(
        token,
      )!;
      if (start !== currentStart || end !== currentEnd) {
        // TODO: Find a more optimized solution to update segment range.
        this._rootNode = remove(this._rootNode, token);
        this._rootNode = insert(this._rootNode, token, start, end);
      }
    } else {
      this._rootNode = insert(this._rootNode, token, start, end);
      this._tokenRangeMap.set(token, { start, end });
    }

    return this;
  }

  /**
   * Removes exist event from the Schedule.
   *
   * @param token The token that should be removed.
   * @returns true if a segemnt in the LineMap existed and has been removed, or
   * false if the segment does not exist.
   */
  public remove(token: T): boolean {
    if (this._tokenRangeMap.delete(token)) {
      this._rootNode = remove(this._rootNode, token);
      return true;
    }
    return false;
  }

  public *[Symbol.iterator]() {
    return getTreeGenerator(this._rootNode);
  }
}

/**
 * A LineMap Tree Node contains references to segment token at a particular
 * range and represents part of a binary tree.
 */
class LineMapNode<T> {
  public lNode: LineMapNode<T> | null = null;
  public rNode: LineMapNode<T> | null = null;
  public readonly height: number = 0;

  constructor(
    public readonly start: number,
    public readonly end: number,
    public readonly tokens: Set<T> = new Set(),
  ) { }
}

/** Basic stack implementation as a helper. */
class Stack<T> {
  private _node: { value: T; prev: Stack<T>["_node"] } | null = null;
  public isEmpty() {
    return this._node == null;
  }
  public pop(): T | null {
    const node = this._node;
    this._node = node?.prev ?? null;
    return node?.value ?? null;
  }
  public put(value: T) {
    this._node = { value, prev: this._node };
  }
  public clear() {
    this._node = null;
  }
}

/** Basic queue implementation as a helper */
class Queue<T> {
  private _node: { value: T; next: Queue<T>["_node"] } | null = null;
  private _lastNode: Queue<T>["_node"] = null;
  public isEmpty() {
    return this._node == null;
  }
  public enqueue(value: T) {
    const newNode: Queue<T>["_node"] = { value, next: null };
    if (this._lastNode != null) {
      this._lastNode.next = newNode;
      this._lastNode = newNode;
    } else {
      this._node = this._lastNode = newNode;
    }
  }
  public dequeue(): T | null {
    const node = this._node;
    this._node = node?.next ?? (this._lastNode = null);
    return node?.value ?? null;
  }
}

/**
 * Checks whether there is a node on the range.
 *
 * @param node Root node of tree to check for a node that is in range.
 * @param start Start of the range.
 * @param end End of the range.
 */
function hasNode<N extends LineMapNode<any>>(node: N | null, start: number, end: number): boolean {
  return !!node && (
    Math.max(start, node.start) < Math.min(end, node.end) ||
    // The end is not included in the range, but it is possible that the user
    // is searching for a specific point (with the end equal to the start) that
    // falls on the edge of the range, and the check above cannot handle this
    // case correctly, so this case must be handled separately.
    // TODO: Find a better solution.
    start == end && start == node.start ||
    end < node.start && hasNode(node.lNode, start, end) ||
    start > node.start && hasNode(node.rNode, start, end)
  );
}

/**
 * Returns a node from the tree or null if the node is not found.
 *
 * @param node Tree root node.
 * @param point The key by which the search will be performed.
 */
function getNode<T>(node: LineMapNode<T>, point: number): LineMapNode<T> | null {
  let currentNode: LineMapNode<T> | null = node;
  let foundNode: LineMapNode<T> | null = null;

  while (currentNode != null) {
    if (currentNode.start > point) {
      currentNode = currentNode.lNode;
      continue;
    }
    if (currentNode.end <= point) {
      currentNode = currentNode.rNode;
      continue;
    }
    if (currentNode.start <= point && currentNode.end > point) {
      foundNode = currentNode;
    }
    break;
  }

  return foundNode;
}

/**
 * Returns a list of existing nodes in the specified range.
 *
 * @param node The root node of the subtree.
 * @param start Start of the range.
 * @param end End of the range.
 * @returns Array of found nodes.
 */
function getNodes<T>(node: LineMapNode<T> | null, start: number, end: number): Array<LineMapNode<T>> {
  const result = new Array();

  if (node == null) {
    return result;
  }

  if (start < node.start) {
    getNodes(node.lNode, start, end).forEach((n) => result.push(n));
  }

  if (Math.max(start, node.start) < Math.min(end, node.end)
    // The end is not included in the range, but it is possible that the user
    // is searching for a specific point (with the end equal to the start) that
    // falls on the edge of the range, and the check above cannot handle this
    // case correctly, so this case must be handled separately.
    // TODO: Find a better solution.
    || start === end && start >= node.start && start < node.end) {
    result.push(node);
  }

  if (end > node.end) {
    getNodes(node.rNode, start, end).forEach((n) => result.push(n));
  }

  return result;
}

/**
 * Returns a new Generator to the node.
 *
 * @param node Root node of a tree for which the Generator is needed.
 * @returns A new Generator.
 */
// TODO: Consider writing a specialized Generator (Iterator) that can be used
// to work with the tree in all functions, which will provide the ability to
// traverse the three in all directions. For public access, a wrapper can be
// made over the main generator.
function* getTreeGenerator<T>(node: LineMapNode<T> | null): Generator<[T, number, number], void, void> {
  const sentTokens = new Set<T>();
  const stack = new Stack<LineMapNode<T>>();

  while (node != null) {
    const lNode = node.lNode;
    const rNode = node.rNode;

    if (lNode != null) {
      if (lNode.lNode != null || lNode.rNode != null) {
        stack.put(node);
        node = lNode;
        continue;
      }

      for (const token of lNode.tokens) {
        if (false == sentTokens.has(token)) {
          sentTokens.add(token);
          yield [token, lNode.start, lNode.end];
        }
      }
    }

    for (const token of node.tokens) {
      if (false == sentTokens.has(token)) {
        sentTokens.add(token);
        yield [token, node.start, node.end];
      }
    }

    if (rNode != null) {
      if (rNode.lNode != null || rNode.rNode != null) {
        stack.put(node);
        node = rNode;
        continue;
      }

      for (const token of rNode.tokens) {
        if (false == sentTokens.has(token)) {
          sentTokens.add(token);
          yield [token, rNode.start, rNode.end];
        }
      }
    }

    node = stack.pop();
  }
}

/**
 * Adds token to the tree.
 *
 * @param node The root node of the tree to which the token should be added.
 * @param token The token that whould be added.
 * @param start Start time stamp of the token.
 * @param end Endt time stampt ot the token.
 * @returns Updated root node.
 */
function insert<T>(node: LineMapNode<T> | null, token: T, start: number, end: number): LineMapNode<T> {
  if (node == null) {
    const newNode = new LineMapNode<T>(start, end, new Set([token]));
    return newNode;
  }

  if (start <= node.start && end >= node.end) {
    node.tokens.add(token);
  }

  if (start > node.start && start < node.end) {
    const newNode = new LineMapNode(start, node.end, new Set(node.tokens));
    newNode.tokens.add(token);
    const mutableNode = node as {
      -readonly [P in keyof LineMapNode<T>]: LineMapNode<T>[P];
    };
    mutableNode.end = newNode.start;

    if (node.rNode == null) {
      node.rNode = newNode;
      updateHeight(node);
    } else {
      const stack = new Stack<LineMapNode<T>>();
      let minRNode = node.rNode;
      while (minRNode.lNode != null) {
        stack.put(minRNode);
        minRNode = minRNode.lNode;
      }
      minRNode.lNode = newNode;
      updateHeight(minRNode);
      while (stack.isEmpty() == false) {
        const parentNode = stack.pop()!;
        if (!!parentNode.lNode) {
          updateHeight(parentNode.lNode);
          parentNode.lNode = balance(parentNode.lNode);
        }
        if (!!parentNode.rNode) {
          updateHeight(parentNode.rNode);
          parentNode.rNode = balance(parentNode.rNode);
        }
        updateHeight(parentNode);
      }
    }

    node = balance(node);
  }

  if (end > node.start && end < node.end) {
    const newNode = new LineMapNode(node.start, end, new Set(node.tokens));
    newNode.tokens.add(token);
    const mutableNode = node as {
      -readonly [P in keyof LineMapNode<T>]: LineMapNode<T>[P];
    };
    mutableNode.start = newNode.end;

    if (node.lNode == null) {
      node.lNode = newNode;
    } else {
      const stack = new Stack<LineMapNode<T>>();
      let maxLNode = node.lNode;
      while (maxLNode.rNode != null) {
        stack.put(maxLNode);
        maxLNode = maxLNode.rNode;
      }
      maxLNode.rNode = newNode;
      updateHeight(maxLNode);
      while (stack.isEmpty() == false) {
        const parentNode = stack.pop()!;
        if (!!parentNode.lNode) {
          updateHeight(parentNode.lNode);
          parentNode.lNode = balance(parentNode.lNode);
        }
        if (!!parentNode.rNode) {
          updateHeight(parentNode.rNode);
          parentNode.rNode = balance(parentNode.rNode);
        }
        updateHeight(parentNode);
      }
    }

    node = balance(node);
  }

  if (start < node.start) {
    node.lNode = insert(node.lNode, token, start, Math.min(end, node.start));
    updateHeight(node);
    node = balance(node);
  }

  if (end > node.end) {
    node.rNode = insert(node.rNode, token, Math.max(start, node.end), end);
    updateHeight(node);
    node = balance(node);
  }

  return node;
}

/**
 * Removes the token from the tree.
 *
 * @param node The root node from which the token should be removed.
 * @param token The token that shoulf be removed.
 * @returns Updated root node.
 */
function remove<T>(node: LineMapNode<T> | null, token: T): LineMapNode<T> | null {
  if (node == null) {
    return null;
  }

  let sideTokenNode: LineMapNode<T> | null = null;
  if (sideTokenNode = findRootNode(node, (n) => !!n.lNode?.tokens.has(token))) {
    sideTokenNode.lNode = remove(sideTokenNode.lNode, token);
  } else if (sideTokenNode = findRootNode(node, (n) => !!n.rNode?.tokens.has(token))) {
    sideTokenNode.rNode = remove(sideTokenNode.rNode, token);
  }

  if (node.tokens.has(token)) {
    node.tokens.delete(token);
    updateHeight(node);

    if (node.tokens.size == 0) {
      if (node.lNode == null || node.rNode == null) {
        node = node.lNode ?? node.rNode;
      } else {
        const stack = new Stack<LineMapNode<T>>();
        const balanceFactor = getBalanceFactor(node);
        let nNode: LineMapNode<T>;
        if (balanceFactor < 0) {
          nNode = node.lNode;
          // Searches max left node and puts nodes that can be touched.
          while (nNode.rNode != null) {
            stack.put(nNode);
            nNode = nNode.rNode;
          }
          if (nNode.lNode) {
            const parentNNode = stack.pop();
            if (parentNNode != null) {
              parentNNode.rNode = nNode.lNode;
              updateHeight(parentNNode);
            }
          }
          nNode.lNode = node.lNode;
        } else {
          nNode = node.rNode;
          // Searches min right node and puts nodes that can be touched.
          while (nNode.rNode != null) {
            stack.put(nNode);
            nNode = nNode.rNode;
          }
          if (nNode.rNode) {
            const parentNNode = stack.pop();
            if (parentNNode != null) {
              parentNNode.lNode = nNode.rNode;
              updateHeight(parentNNode);
            }
          }
          nNode.rNode = node.rNode;
        }
        // Fix height of stacked nodes.
        while (stack.isEmpty() == false) {
          updateHeight(stack.pop()!);
        }
        updateHeight(nNode);
        node = balance(nNode);
      }
    } else {
      // After removing a token there is chance that neightboring nodes will
      // need to be merged.
      const stack = new Stack<LineMapNode<T>>();

      let lNode = node.lNode;
      while (lNode != null) {
        if (isEqualSets(lNode.tokens, node.tokens)) {
          const mutableNode = node as {
            -readonly [P in keyof LineMapNode<T>]: LineMapNode<T>[P];
          };
          mutableNode.start = lNode.start;
          const parentLNode = stack.pop();
          if (parentLNode != null) {
            parentLNode.rNode = lNode.lNode;
            updateHeight(parentLNode);
          } else {
            node.lNode = lNode.lNode;
            updateHeight(node);
          }
          lNode = parentLNode;
        } else if (lNode.rNode != null) {
          stack.put(lNode);
          lNode = lNode.rNode;
        } else {
          lNode = stack.pop();
        }
      }

      stack.clear();
      let rNode = node.rNode;
      while (rNode != null) {
        if (isEqualSets(rNode.tokens, node.tokens)) {
          const mutableNode = node as {
            -readonly [P in keyof LineMapNode<T>]: LineMapNode<T>[P];
          };
          mutableNode.end = rNode.end;
          const parentRNode = stack.pop();
          if (parentRNode != null) {
            parentRNode.lNode = rNode.rNode;
            updateHeight(parentRNode);
          } else {
            node.rNode = rNode.rNode;
            updateHeight(node);
          }
          rNode = parentRNode;
        } else if (rNode.rNode != null) {
          stack.put(rNode);
          rNode = rNode.lNode;
        } else {
          rNode = stack.pop();
        }
      }

      node = balance(node);
    }
  }

  return node;
}

/**
 * Balances subtree where the target node is a root node for the subtree
 * and returns new subtree root for the balanced subtree.
 *
 * @param node Subtree root node.
 * @returns Updated root node.
 */
function balance<T>(node: LineMapNode<T>): LineMapNode<T> {
  const balanceFactor = getBalanceFactor(node);
  if (balanceFactor === 2) {
    if (!!node.rNode && getBalanceFactor(node.rNode) < 0) {
      node.rNode = rotateRight(node.rNode);
    }
    return rotateLeft(node);
  }
  if (balanceFactor === -2) {
    if (!!node.lNode && getBalanceFactor(node.lNode) > 0) {
      node.lNode = rotateLeft(node.lNode);
    }
    return rotateRight(node);
  }
  // This case should not happen, but just in case it is worth at least
  // handling it somehow.
  if (Math.abs(balanceFactor) > 2) {
    node.lNode = !!node.lNode ? balance(node.lNode) : node.lNode;
    node.rNode = !!node.rNode ? balance(node.rNode) : node.rNode;
    updateHeight(node);
    return balance(node);
  }
  return node;
}

/**
 * Does right rotation for subtree and returns new subtree root node.
 *
 * @param node Current subtree root node.
 * @returns Updated root node.
 */
function rotateRight<T>(node: LineMapNode<T>): LineMapNode<T> {
  const bufferedNode = node.lNode!;
  node.lNode = bufferedNode.rNode;
  bufferedNode.rNode = node;
  updateHeight(node);
  updateHeight(bufferedNode);
  return bufferedNode;
}

/**
 * Does left rotation for subtree and returns new subtree root node.
 *
 * @param node Current subtree root node.
 * @returns Updated root node.
 */
function rotateLeft<T>(node: LineMapNode<T>): LineMapNode<T> {
  const bufferedNode = node.rNode!;
  node.rNode = bufferedNode.lNode;
  bufferedNode.lNode = node;
  updateHeight(node);
  updateHeight(bufferedNode);
  return bufferedNode;
}

/**
 * Updates the height of the node based on the height of its children without
 * recalculating their height.
 *
 * @param node Tree node whose height needs to be updated.
 */
function updateHeight<T>(node: LineMapNode<T>): void {
  const mutableNode = node as { -readonly [P in keyof LineMapNode<T>]: LineMapNode<T>[P] };
  mutableNode.height = 1 + Math.max(node.lNode?.height ?? -1, node.rNode?.height ?? -1);
}

/**
 * Returns balance factor for the node.
 *
 * Balance factor is the difference in height between the left and right
 * subtrees of a node. A negative value indicates a left-heavy, and a positive
 * value indicates a right-heavy.
 *
 * @param node Tree node whose balance needs to be calculated.
 * @returns Balance factor of the node.
 */
function getBalanceFactor<T>(node: LineMapNode<T>): number {
  return (node.rNode?.height ?? -1) - (node.lNode?.height ?? -1);
}

// breadth-first search
/**
 * Returns the first node in the provided tree (by performing a breadth-first
 * search) that satisfies the provided test function.
 *
 * @param node The root node of the tree in which the search will be performed.
 * @param fn Test function.
 * @returns Found node or null if node is not found.
 */
function findRootNode<T>(node: LineMapNode<T> | null, fn: (node: LineMapNode<T>) => boolean): LineMapNode<T> | null {
  if (node == null) {
    return null;
  }

  const queue = new Queue<LineMapNode<T>>();
  let currentNode: LineMapNode<T> | null = node;

  while (currentNode != null) {
    if (fn(currentNode)) {
      return node;
    }

    // Schedule next search iteration.
    if (currentNode.lNode != null) {
      queue.enqueue(currentNode.lNode);
    }
    if (currentNode.rNode != null) {
      queue.enqueue(currentNode.rNode);
    }
    currentNode = queue.dequeue();
  }

  return null;
}

/** Asserts that start of a range is not greate than its end. */
function assertRange(start: number, end: number) {
  if (end < start) {
    throw new Error(`Start (${start}) cannot be more than end (${end})`);
  }
}

/**
 * Helper function for comparing Sets.
 *
 * @param setA First Set.
 * @param setB Second Set.
 * @returns Whether Sets are equal.
 */
function isEqualSets<T>(setA: Set<T>, setB: Set<T>): boolean {
  if (setA.size != setB.size) {
    return false;
  }

  for (const item of setA) {
    if (false == setB.has(item)) {
      return false;
    }
  }

  return true;
}
