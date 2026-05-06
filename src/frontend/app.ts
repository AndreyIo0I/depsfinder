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
      // Package nodes
      {
        selector: 'node[type="package"]',
        style: {
          'background-color': getNodeColor,
          'label': 'data(label)',
          'text-valign': 'center',
          'text-halign': 'center',
          'color': '#ffffff',
          'text-outline-width': 2,
          'text-outline-color': '#000000',
          'width': 80,
          'height': 80,
          'shape': 'ellipse',
          'font-size': '12px',
          'font-weight': 'bold'
        }
      },
      
      // File nodes
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
      
      // Import edges
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
    selectionType: 'single'
  });

  // Setup event handlers
  setupCytoscapeEvents();
  
  // Update stats
  updateStats();
  
  // Populate package list
  populatePackageList();
}

/**
 * Converts graph data to Cytoscape elements format
 */
function convertToCytoscapeElements(graph: Graph): any[] {
  const elements: any[] = [];
  
  // Add nodes
  for (const node of graph.nodes) {
    elements.push({
      data: {
        id: node.id,
        label: node.label,
        type: node.type,
        packageId: node.packageId,
        filePath: node.filePath
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
        type: edge.type
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
    showNodeDetails(node);
    
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
  
  // Double click node - open file
  cy.on('dblclick', 'node', (event: any) => {
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
      hideNodeDetails();
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
 * Updates statistics display
 */
function updateStats(): void {
  const statsElement = document.getElementById('stats');
  if (!statsElement || !graphData) return;
  
  const nodeCount = graphData.nodes.length;
  const edgeCount = graphData.edges.length;
  const packageCount = graphData.metadata.totalPackages;
  
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
  }
};
