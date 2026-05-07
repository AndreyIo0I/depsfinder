/**
 * Frontend application logic - Cytoscape.js initialization and interactivity
 * Based on: openspec/changes/ts-dep-implementation/tasks.md (T012, T013)
 * Related specs: openspec/specs/ui.md, openspec/specs/types.md
 */

import type { Graph, Node, Edge, NodeType, FilterState } from '../types/global.ts';
import cytoscape from 'cytoscape';

// Global state
let cy: any = null;
let graphData: Graph | null = null;
let filterState: FilterState = {
  searchQuery: '',
  minDepth: 0,
  maxDepth: 100,
  showFileNodes: true,
  showPackageNodes: true,
  selectedPackages: []
};
let hiddenNodes: Set<string> = new Set();
let hiddenEdges: Set<string> = new Set();
let selectedNodeId: string | null = null;
let collapsedPackages: Set<string> = new Set();

// Initialize application
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await loadGraph();
    initializeCytoscape();
    setupEventListeners();
    hideLoadingOverlay();
  } catch (error) {
    console.error('Failed to initialize:', error);
    showError('Failed to load graph data');
  }
});

/**
 * Loads graph data from JSON endpoint
 */
async function loadGraph(): Promise<void> {
  const response = await fetch('/graph.json');
  if (!response.ok) {
    throw new Error('Failed to fetch graph data');
  }
  graphData = await response.json();
}

/**
 * Initializes Cytoscape.js with the graph data
 */
function initializeCytoscape(): void {
  if (!graphData) return;

  // Convert graph data to Cytoscape format
  const elements = convertToCytoscapeElements(graphData);

  // Initialize Cytoscape
  cy = cytoscape({
    container: document.getElementById('cy'),
    elements: elements,
    
    layout: {
      name: 'cose',
      animate: true,
      animationDuration: 500,
      fit: true,
      padding: 30,
      nodeDimensionsIncludeLabels: true,
      spacingFactor: 1.2,
      componentSpacing: 100,
      nodeRepulsion: 400000,
      edgeElasticity: 100,
      nestingFactor: 5,
      gravity: 80,
      numIter: 1000,
      initialTemp: 200,
      coolingFactor: 0.95,
      minTemp: 1.0,
      randomize: false
    },
    
    style: [
      // Package nodes (compound nodes/frames)
      {
        selector: 'node[type="package"]',
        style: {
          'background-color': getNodeColor,
          'label': 'data(label)',
          'text-valign': 'top',
          'text-halign': 'center',
          'color': '#ffffff',
          'text-outline-width': 2,
          'text-outline-color': '#000000',
          'width': 200,
          'height': 150,
          'shape': 'round-rectangle',
          'font-size': '14px',
          'font-weight': 'bold',
          'border-width': 3,
          'border-color': '#333',
          'padding': 30,
          'compound-sizing-wrt-labels': false
        }
      },
      
      // File nodes inside packages
      {
        selector: 'node[type="file"]',
        style: {
          'background-color': getNodeColor,
          'label': 'data(label)',
          'text-valign': 'top',
          'text-halign': 'center',
          'color': '#212529',
          'text-outline-width': 1,
          'text-outline-color': '#ffffff',
          'width': 40,
          'height': 40,
          'shape': 'rectangle',
          'font-size': '10px'
        }
      },
      
      // Import edges - outgoing (source to target)
      {
        selector: 'edge[type="import"][direction="outgoing"]',
        style: {
          'line-color': '#0d6efd',
          'target-arrow-color': '#0d6efd',
          'target-arrow-shape': 'triangle',
          'curve-style': 'bezier',
          'width': 2,
          'arrow-scale': 1.5
        }
      },
      
      // Import edges - incoming (target from source)
      {
        selector: 'edge[type="import"][direction="incoming"]',
        style: {
          'line-color': '#dc3545',
          'target-arrow-color': '#dc3545',
          'target-arrow-shape': 'triangle',
          'curve-style': 'bezier',
          'width': 2,
          'arrow-scale': 1.5
        }
      },
      
      // Default import edges (no direction specified)
      {
        selector: 'edge[type="import"]',
        style: {
          'line-color': '#6c757d',
          'target-arrow-color': '#6c757d',
          'target-arrow-shape': 'triangle',
          'curve-style': 'bezier',
          'width': 2,
          'arrow-scale': 1.5
        }
      },
      
      // Selected elements
      {
        selector: 'node:selected',
        style: {
          'border-width': 4,
          'border-color': '#ffc107',
          'background-opacity': 0.8
        }
      },
      
      {
        selector: 'edge:selected',
        style: {
          'width': 4,
          'line-color': '#ffc107',
          'target-arrow-color': '#ffc107'
        }
      },
      
      // Hover effect
      {
        selector: 'node:hover',
        style: {
          'background-opacity': 0.7
        }
      }
    ],
    
    wheelSensitivity: 0.3,
    boxSelectionEnabled: true,
    selectionType: 'single',
    layout: {
      name: 'preset',
      animate: false
    }
  });

  // Setup event handlers
  setupCytoscapeEvents();
  
  // Update stats
  updateStats();
  
  // Populate package list
  populatePackageList();
}

/**
 * Converts graph data to Cytoscape elements format with compound nodes for packages
 */
function convertToCytoscapeElements(graph: Graph): any[] {
  const elements: any[] = [];
  
  // First, add package nodes (these will be compound nodes/frames)
  const packageNodes = graph.nodes.filter(n => n.type === 'package');
  for (const node of packageNodes) {
    elements.push({
      data: {
        id: node.id,
        label: node.label,
        type: node.type,
        packageId: node.packageId,
        parent: null // Package nodes have no parent
      }
    });
  }
  
  // Then, add file nodes inside their package parent
  const fileNodes = graph.nodes.filter(n => n.type === 'file');
  for (const node of fileNodes) {
    elements.push({
      data: {
        id: node.id,
        label: node.label,
        type: node.type,
        packageId: node.packageId,
        filePath: node.filePath,
        parent: node.packageId // File nodes are children of their package
      }
    });
  }
  
  // Add edges
  for (const edge of graph.edges) {
    elements.push({
      data: {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: edge.type,
        direction: 'outgoing' // Default direction from source to target
      }
    });
  }
  
  return elements;
}

/**
 * Gets node color based on type and extension
 */
function getNodeColor(node: any): string {
  const type = node.data('type');
  
  if (type === 'package') {
    // Color packages based on their ID hash
    const id = node.data('id');
    const colors = ['#0d6efd', '#6f42c1', '#fd7e14', '#20c997', '#e83e8c'];
    const hash = id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  }
  
  // File nodes - color by extension
  const filePath = node.data('filePath') || '';
  if (filePath.endsWith('.tsx')) {
    return '#dc3545';
  } else if (filePath.endsWith('.ts')) {
    return '#198754';
  }
  return '#6c757d';
}

/**
 * Sets up Cytoscape event handlers
 */
function setupCytoscapeEvents(): void {
  // Node click
  cy.on('tap', 'node', (event: any) => {
    const node = event.target;
    selectedNodeId = node.data('id');
    showNodeDetails(node);
    highlightConnectedEdges(node);
    
    // Dispatch custom event
    document.dispatchEvent(new CustomEvent('node-selected', {
      detail: {
        nodeId: node.data('id'),
        nodeData: node.data()
      }
    }));
  });
  
  // Edge click
  cy.on('tap', 'edge', (event: any) => {
    const edge = event.target;
    console.log('Edge selected:', edge.data());
  });
  
  // Double click package node - collapse/expand
  cy.on('dblclick', 'node[type="package"]', (event: any) => {
    const node = event.target;
    const packageId = node.data('id');
    
    if (collapsedPackages.has(packageId)) {
      // Expand the package
      expandPackage(packageId);
    } else {
      // Collapse the package
      collapsePackage(packageId);
    }
  });
  
  // Double click file node - open file
  cy.on('dblclick', 'node[type="file"]', (event: any) => {
    const node = event.target;
    const filePath = node.data('filePath');
    
    if (filePath) {
      // Try to open file in editor (works with VS Code URL scheme)
      window.open(`vscode://file/${filePath}`, '_blank');
    }
  });
  
  // Background click - clear selection
  cy.on('tap', (event: any) => {
    if (event.target === cy) {
      selectedNodeId = null;
      hideNodeDetails();
      clearEdgeHighlights();
    }
  });
  
  // Delete key - hide selected nodes
  document.addEventListener('keydown', (event: KeyboardEvent) => {
    if (event.key === 'Delete') {
      const selectedNodes = cy?.elements(':selected').nodes();
      if (selectedNodes && selectedNodes.length > 0) {
        selectedNodes.forEach((node: any) => {
          const nodeId = node.data('id');
          hiddenNodes.add(nodeId);
          node.style('display', 'none');
          
          // Hide connected edges
          const connectedEdges = node.connectedEdges();
          connectedEdges.forEach((edge: any) => {
            const edgeId = edge.data('id');
            hiddenEdges.add(edgeId);
            edge.style('display', 'none');
          });
        });
        updateRestoreButton();
      }
    }
  });
}

/**
 * Shows node details in sidebar
 */
function showNodeDetails(node: any): void {
  const detailsPanel = document.getElementById('nodeDetails');
  const content = document.getElementById('nodeDetailsContent');
  
  if (!detailsPanel || !content) return;
  
  const data = node.data();
  const type = data.type === 'package' ? 'Package' : 'File';
  
  content.innerHTML = `
    <p><strong>Type:</strong> ${type}</p>
    <p><strong>Name:</strong> ${data.label}</p>
    <p><strong>ID:</strong> ${data.id}</p>
    ${data.filePath ? `<p><strong>Path:</strong> ${data.filePath}</p>` : ''}
    <p><strong>Package:</strong> ${data.packageId}</p>
  `;
  
  detailsPanel.classList.remove('hidden');
}

/**
 * Hides node details panel
 */
function hideNodeDetails(): void {
  const detailsPanel = document.getElementById('nodeDetails');
  if (detailsPanel) {
    detailsPanel.classList.add('hidden');
  }
}

/**
 * Highlights connected edges for the selected node
 * Outgoing edges (from selected node) - blue
 * Incoming edges (to selected node) - red
 */
function highlightConnectedEdges(node: any): void {
  if (!cy) return;
  
  // First, reset all edges to default style
  cy.edges().forEach((edge: any) => {
    edge.style({
      'line-color': '#6c757d',
      'target-arrow-color': '#6c757d',
      'width': 2,
      'opacity': 0.3
    });
  });
  
  // Get outgoing edges (edges where this node is the source)
  const outgoingEdges = node.outgoers('edge');
  outgoingEdges.forEach((edge: any) => {
    edge.style({
      'line-color': '#0d6efd',
      'target-arrow-color': '#0d6efd',
      'width': 3,
      'opacity': 1
    });
  });
  
  // Get incoming edges (edges where this node is the target)
  const incomingEdges = node.incomers('edge');
  incomingEdges.forEach((edge: any) => {
    edge.style({
      'line-color': '#dc3545',
      'target-arrow-color': '#dc3545',
      'width': 3,
      'opacity': 1
    });
  });
}

/**
 * Clears edge highlights and resets to default
 */
function clearEdgeHighlights(): void {
  if (!cy) return;
  
  cy.edges().forEach((edge: any) => {
    edge.style({
      'line-color': '#6c757d',
      'target-arrow-color': '#6c757d',
      'width': 2,
      'opacity': 1
    });
  });
}

/**
 * Updates statistics display
 */
function updateStats(): void {
  const statsElement = document.getElementById('stats');
  if (!statsElement || !graphData) return;
  
  const nodeCount = graphData.nodes.length;
  const edgeCount = graphData.edges.length;
  
  // Count unique packages from nodes
  const packages = new Set<string>();
  for (const node of graphData.nodes) {
    if (node.package) {
      packages.add(node.package);
    }
  }
  const packageCount = packages.size;
  
  statsElement.textContent = `${nodeCount} nodes, ${edgeCount} edges, ${packageCount} packages`;
}

/**
 * Populates package filter list
 */
function populatePackageList(): void {
  const packageList = document.getElementById('packageList');
  if (!packageList || !graphData) return;
  
  // Get unique packages
  const packages = new Set<string>();
  for (const node of graphData.nodes) {
    packages.add(node.packageId);
  }
  
  // Create checkboxes
  packageList.innerHTML = '';
  for (const pkg of Array.from(packages).sort()) {
    const label = document.createElement('label');
    label.innerHTML = `
      <input type="checkbox" value="${pkg}" checked>
      ${pkg}
    `;
    packageList.appendChild(label);
  }
}

/**
 * Sets up UI event listeners
 */
function setupEventListeners(): void {
  // Filters button
  const filtersBtn = document.getElementById('filtersBtn');
  const sidebar = document.getElementById('sidebar');
  filtersBtn?.addEventListener('click', () => {
    sidebar?.classList.toggle('hidden');
  });
  
  // Refresh button
  const refreshBtn = document.getElementById('refreshBtn');
  refreshBtn?.addEventListener('click', () => {
    location.reload();
  });
  
  // Help button
  const helpBtn = document.getElementById('helpBtn');
  const helpModal = document.getElementById('helpModal');
  const closeHelpBtn = document.getElementById('closeHelpBtn');
  
  helpBtn?.addEventListener('click', () => {
    helpModal?.classList.remove('hidden');
  });
  
  closeHelpBtn?.addEventListener('click', () => {
    helpModal?.classList.add('hidden');
  });
  
  // Search input
  const searchInput = document.getElementById('searchInput') as HTMLInputElement;
  searchInput?.addEventListener('input', (e) => {
    filterState.searchQuery = (e.target as HTMLInputElement).value;
    applyFilters();
  });
  
  // Node type filters
  const showFileNodes = document.getElementById('showFileNodes') as HTMLInputElement;
  const showPackageNodes = document.getElementById('showPackageNodes') as HTMLInputElement;
  
  showFileNodes?.addEventListener('change', (e) => {
    filterState.showFileNodes = (e.target as HTMLInputElement).checked;
    applyFilters();
  });
  
  showPackageNodes?.addEventListener('change', (e) => {
    filterState.showPackageNodes = (e.target as HTMLInputElement).checked;
    applyFilters();
  });
  
  // Depth filters
  const minDepth = document.getElementById('minDepth') as HTMLInputElement;
  const maxDepth = document.getElementById('maxDepth') as HTMLInputElement;
  const minDepthValue = document.getElementById('minDepthValue');
  const maxDepthValue = document.getElementById('maxDepthValue');
  
  minDepth?.addEventListener('input', (e) => {
    const value = (e.target as HTMLInputElement).value;
    filterState.minDepth = parseInt(value);
    if (minDepthValue) minDepthValue.textContent = value;
    applyFilters();
  });
  
  maxDepth?.addEventListener('input', (e) => {
    const value = (e.target as HTMLInputElement).value;
    filterState.maxDepth = parseInt(value);
    if (maxDepthValue) maxDepthValue.textContent = value;
    applyFilters();
  });
  
  // Package filters
  const packageList = document.getElementById('packageList');
  packageList?.addEventListener('change', () => {
    const checkboxes = packageList.querySelectorAll('input[type="checkbox"]');
    filterState.selectedPackages = Array.from(checkboxes)
      .filter(cb => (cb as HTMLInputElement).checked)
      .map(cb => (cb as HTMLInputElement).value);
    applyFilters();
  });
  
  // Keyboard shortcuts
  document.addEventListener('keydown', handleKeyboardShortcuts);
}

/**
 * Handles keyboard shortcuts
 */
function handleKeyboardShortcuts(event: KeyboardEvent): void {
  // Ctrl+F / Cmd+F - Focus search
  if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
    event.preventDefault();
    const searchInput = document.getElementById('searchInput') as HTMLInputElement;
    searchInput?.focus();
  }
  
  // Esc - Clear selection
  if (event.key === 'Escape') {
    cy?.elements().deselect();
    hideNodeDetails();
    const helpModal = document.getElementById('helpModal');
    helpModal?.classList.add('hidden');
  }
  
  // Space - Toggle sidebar
  if (event.key === ' ' && event.target === document.body) {
    event.preventDefault();
    const sidebar = document.getElementById('sidebar');
    sidebar?.classList.toggle('hidden');
  }
  
  // R - Refresh
  if (event.key === 'r' || event.key === 'R') {
    location.reload();
  }
  
  // H - Show help
  if (event.key === 'h' || event.key === 'H') {
    const helpModal = document.getElementById('helpModal');
    helpModal?.classList.toggle('hidden');
  }
}

/**
 * Applies current filters to the graph
 */
function applyFilters(): void {
  if (!cy) return;
  
  const elements = cy.elements();
  
  // Filter by search query
  if (filterState.searchQuery) {
    const query = filterState.searchQuery.toLowerCase();
    
    elements.nodes().forEach((node: any) => {
      const label = node.data('label').toLowerCase();
      const filePath = (node.data('filePath') || '').toLowerCase();
      const matches = label.includes(query) || filePath.includes(query);
      
      if (matches) {
        node.style('opacity', 1);
      } else {
        node.style('opacity', 0.1);
      }
    });
  } else {
    elements.nodes().style('opacity', 1);
  }
  
  // Filter by node type
  elements.nodes().forEach((node: any) => {
    const type = node.data('type');
    
    if (type === 'file' && !filterState.showFileNodes) {
      node.style('display', 'none');
    } else if (type === 'package' && !filterState.showPackageNodes) {
      node.style('display', 'none');
    } else {
      node.style('display', 'element');
    }
  });
  
  // Filter by package
  if (filterState.selectedPackages.length > 0) {
    elements.nodes().forEach((node: any) => {
      const packageId = node.data('packageId');
      
      if (!filterState.selectedPackages.includes(packageId)) {
        node.style('display', 'none');
      } else if (node.style('display') !== 'none') {
        node.style('display', 'element');
      }
    });
  }
  
  // Dispatch filter change event
  document.dispatchEvent(new CustomEvent('filter-change', {
    detail: filterState
  }));
}

/**
 * Hides loading overlay
 */
function hideLoadingOverlay(): void {
  const overlay = document.getElementById('loadingOverlay');
  overlay?.classList.add('hidden');
}

/**
 * Shows error message
 */
function showError(message: string): void {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) {
    overlay.innerHTML = `
      <div class="error-message">
        <h2>Error</h2>
        <p>${message}</p>
        <button onclick="location.reload()" class="btn">Retry</button>
      </div>
    `;
  }
}

// Export for global access
(window as any).tsdep = {
  refresh: () => location.reload(),
  focusOn: (nodeId: string) => {
    if (cy) {
      const node = cy.getElementById(nodeId);
      if (node.length > 0) {
        cy.animate({
          fit: {
            eles: node,
            padding: 50
          }
        });
        node.select();
      }
    }
  },
  applyFilter: (state: Partial<FilterState>) => {
    filterState = { ...filterState, ...state };
    applyFilters();
  },
  exportPNG: () => {
    if (cy) {
      const pngBase64 = cy.png({ full: true });
      const link = document.createElement('a');
      link.download = 'dependency-graph.png';
      link.href = pngBase64;
      link.click();
    }
  },
  restoreHiddenNodes: () => {
    hiddenNodes.clear();
    hiddenEdges.clear();
    if (cy) {
      cy.elements().style('display', 'element');
    }
    updateRestoreButton();
  }
};

/**
 * Updates the restore button visibility based on hidden nodes
 */
function updateRestoreButton(): void {
  const restoreBtn = document.getElementById('restoreBtn');
  if (!restoreBtn) return;
  
  if (hiddenNodes.size > 0) {
    restoreBtn.classList.remove('hidden');
  } else {
    restoreBtn.classList.add('hidden');
  }
}

/**
 * Restores all hidden nodes and edges
 */
function restoreHiddenNodes(): void {
  hiddenNodes.clear();
  hiddenEdges.clear();
  if (cy) {
    cy.elements().style('display', 'element');
  }
  updateRestoreButton();
}

/**
 * Collapses a package node - hides child file nodes and shows package as a single node
 * Preserves all incoming and outgoing edges at the package level
 */
function collapsePackage(packageId: string): void {
  if (!cy) return;
  
  collapsedPackages.add(packageId);
  
  // Get the package node
  const packageNode = cy.getElementById(packageId);
  
  // Get all file nodes inside this package
  const childNodes = cy.nodes().filter((node: any) => node.data('parent') === packageId);
  
  // Hide all child file nodes
  childNodes.forEach((node: any) => {
    node.style('display', 'none');
  });
  
  // Update package node style to show it's collapsed
  packageNode.style({
    'background-opacity': 0.5,
    'border-style': 'dashed'
  });
  
  // Reposition package node to average position of its children
  if (childNodes.length > 0) {
    let sumX = 0, sumY = 0, count = 0;
    childNodes.forEach((node: any) => {
      const pos = node.position();
      sumX += pos.x;
      sumY += pos.y;
      count++;
    });
    
    if (count > 0) {
      packageNode.position({
        x: sumX / count,
        y: sumY / count
      });
    }
  }
}

/**
 * Expands a package node - shows all child file nodes
 */
function expandPackage(packageId: string): void {
  if (!cy) return;
  
  collapsedPackages.delete(packageId);
  
  // Get the package node
  const packageNode = cy.getElementById(packageId);
  
  // Get all file nodes inside this package
  const childNodes = cy.nodes().filter((node: any) => node.data('parent') === packageId);
  
  // Show all child file nodes
  childNodes.forEach((node: any) => {
    node.style('display', 'element');
  });
  
  // Reset package node style
  packageNode.style({
    'background-opacity': 1,
    'border-style': 'solid'
  });
}
