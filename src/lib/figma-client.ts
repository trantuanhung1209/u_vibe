import axios from 'axios';

/**
 * Figma API client for fetching design data
 */

const FIGMA_API_BASE = 'https://api.figma.com/v1';

// Simple in-memory cache to avoid hitting rate limits
const cache = new Map<string, { data: FigmaFile; timestamp: number }>();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

// Rate limit tracking
const rateLimitState = {
  retryAfter: 0,
  lastRateLimitTime: 0,
};

// Helper function to wait
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface FigmaNode {
  id: string;
  name: string;
  type: string;
  children?: FigmaNode[];
  absoluteBoundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  backgroundColor?: { r: number; g: number; b: number; a: number };
  fills?: FigmaFill[];
  strokes?: FigmaStroke[];
  effects?: FigmaEffect[];
  constraints?: FigmaConstraints;
  layoutMode?: string;
  primaryAxisSizingMode?: string;
  counterAxisSizingMode?: string;
  primaryAxisAlignItems?: string;
  counterAxisAlignItems?: string;
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  itemSpacing?: number;
  characters?: string;
  style?: FigmaTextStyle;
}

interface FigmaFill {
  type: string;
  color?: { r: number; g: number; b: number; a: number };
  opacity?: number;
}

interface FigmaStroke {
  type: string;
  color?: { r: number; g: number; b: number; a: number };
  opacity?: number;
}

interface FigmaEffect {
  type: string;
  visible?: boolean;
  radius?: number;
  offset?: { x: number; y: number };
  color?: { r: number; g: number; b: number; a: number };
}

interface FigmaConstraints {
  vertical?: string;
  horizontal?: string;
}

interface FigmaTextStyle {
  fontSize?: number;
  fontWeight?: number;
  fontFamily?: string;
  textAlignHorizontal?: string;
  textAlignVertical?: string;
}

interface FigmaFile {
  document: FigmaNode;
  components: Record<string, FigmaNode>;
  componentSets: Record<string, FigmaNode>;
  schemaVersion: number;
  styles: Record<string, FigmaTextStyle>;
  name: string;
  lastModified: string;
  thumbnailUrl: string;
  version: string;
}

/**
 * Extract file key and node ID from Figma URL
 * Supports formats:
 * - https://www.figma.com/file/{fileKey}/{fileName}
 * - https://www.figma.com/file/{fileKey}/{fileName}?node-id={nodeId}
 * - https://www.figma.com/design/{fileKey}/{fileName}
 * - https://www.figma.com/design/{fileKey}/{fileName}?node-id={nodeId}
 */
export function parseFigmaUrl(url: string): { fileKey: string; nodeId?: string } {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    
    // Expected format: /file/{fileKey}/... or /design/{fileKey}/...
    let fileIndex = pathParts.indexOf('file');
    if (fileIndex === -1) {
      fileIndex = pathParts.indexOf('design');
    }
    
    if (fileIndex === -1 || fileIndex + 1 >= pathParts.length) {
      throw new Error('Invalid Figma URL: missing file key. URL should be in format: figma.com/file/{key} or figma.com/design/{key}');
    }
    
    const fileKey = pathParts[fileIndex + 1];
    
    // Check for node-id parameter and convert format
    // Figma URLs use format like "0-1" but API expects "0:1"
    let nodeId = urlObj.searchParams.get('node-id');
    if (nodeId) {
      // Convert "0-1" to "0:1" format
      nodeId = nodeId.replace(/-/g, ':');
    }
    
    return { fileKey, nodeId: nodeId || undefined };
  } catch (error) {
    throw new Error(`Invalid Figma URL format: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Fetch Figma file data from API with caching and retry logic
 */
export async function fetchFigmaFile(fileKey: string, retryCount = 0): Promise<FigmaFile> {
  const accessToken = process.env.FIGMA_ACCESS_TOKEN;
  const MAX_RETRIES = 3;
  
  if (!accessToken) {
    throw new Error('FIGMA_ACCESS_TOKEN not found in environment variables');
  }
  
  // Check if we're in a rate limit cooldown period
  if (rateLimitState.retryAfter > Date.now()) {
    const waitTime = rateLimitState.retryAfter - Date.now();
    throw new Error(
      `Figma API rate limit active. Please wait ${Math.ceil(waitTime / 1000)} seconds before trying again.`
    );
  }
  
  // Check cache first
  const cacheKey = `file:${fileKey}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`[Figma] Using cached data for file ${fileKey}`);
    return cached.data;
  }
  
  try {
    console.log(`[Figma] Fetching file ${fileKey} from API (attempt ${retryCount + 1})`);
    const response = await axios.get(`${FIGMA_API_BASE}/files/${fileKey}`, {
      headers: {
        'X-Figma-Token': accessToken,
      },
    });
    
    // Store in cache
    cache.set(cacheKey, {
      data: response.data,
      timestamp: Date.now(),
    });
    
    // Reset rate limit state on success
    rateLimitState.retryAfter = 0;
    
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const message = error.response?.data?.err || error.message;
      
      // Handle rate limit with retry
      if (status === 429) {
        const retryAfter = error.response?.headers['retry-after'];
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, retryCount) * 1000;
        
        // Update rate limit state
        rateLimitState.lastRateLimitTime = Date.now();
        rateLimitState.retryAfter = Date.now() + waitTime;
        
        // Retry with exponential backoff
        if (retryCount < MAX_RETRIES) {
          console.log(`[Figma] Rate limited, retrying after ${waitTime}ms...`);
          await wait(waitTime);
          return fetchFigmaFile(fileKey, retryCount + 1);
        }
        
        throw new Error(
          `Figma API rate limit exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds and try again.`
        );
      }
      
      // Handle auth errors
      if (status === 403) {
        throw new Error('Figma access denied. Please check your FIGMA_ACCESS_TOKEN or file permissions.');
      }
      
      throw new Error(`Figma API error: ${message}`);
    }
    throw error;
  }
}

/**
 * Fetch specific node from Figma file
 */
export async function fetchFigmaNode(fileKey: string, nodeId: string): Promise<FigmaNode> {
  const accessToken = process.env.FIGMA_ACCESS_TOKEN;
  
  if (!accessToken) {
    throw new Error('FIGMA_ACCESS_TOKEN not found in environment variables');
  }
  
  try {
    const response = await axios.get(
      `${FIGMA_API_BASE}/files/${fileKey}/nodes?ids=${encodeURIComponent(nodeId)}`,
      {
        headers: {
          'X-Figma-Token': accessToken,
        },
      }
    );
    
    const nodeData = response.data.nodes[nodeId];
    if (!nodeData) {
      throw new Error(`Node ${nodeId} not found in file`);
    }
    
    return nodeData.document;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Figma API error: ${error.response?.data?.err || error.message}`);
    }
    throw error;
  }
}

/**
 * Fetch Figma design and return the relevant node
 */
export async function fetchFigmaDesign(fileKey: string, nodeId?: string): Promise<FigmaNode> {
  // If no nodeId or if it's the root (0:1), fetch the whole file
  if (!nodeId || nodeId === '0:1') {
    const file = await fetchFigmaFile(fileKey);
    return file.document;
  }
  
  try {
    return await fetchFigmaNode(fileKey, nodeId);
  } catch {
    // If node not found, fallback to fetching entire file
    console.warn(`Node ${nodeId} not found, fetching entire file instead`);
    const file = await fetchFigmaFile(fileKey);
    return file.document;
  }
}

/**
 * Main function to fetch design from Figma URL
 */
export async function getFigmaDesignFromUrl(url: string): Promise<FigmaNode> {
  const { fileKey, nodeId } = parseFigmaUrl(url);
  return fetchFigmaDesign(fileKey, nodeId);
}