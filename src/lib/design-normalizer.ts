/**
 * Design Normalizer - Converts Figma design JSON to structured UI Schema
 * This serves as the intermediary format between Figma API and GPT-4
 */

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
  cornerRadius?: number;
  clipsContent?: boolean;
}

// UI Schema - The AST that GPT-4 will understand
export interface UISchema {
  type: 'page' | 'section' | 'container' | 'component';
  name: string;
  metadata: {
    figmaNodeId: string;
    dimensions: { width: number; height: number };
    position: { x: number; y: number };
  };
  layout: {
    direction: 'horizontal' | 'vertical' | 'absolute';
    alignment?: {
      main?: 'start' | 'center' | 'end' | 'space-between' | 'space-around';
      cross?: 'start' | 'center' | 'end' | 'stretch';
    };
    padding?: { top: number; right: number; bottom: number; left: number };
    gap?: number;
  };
  styles?: {
    background?: string;
    border?: { width: number; color: string; radius: number };
    shadow?: string[];
  };
  content?: {
    type: 'text' | 'image' | 'icon';
    value: string;
    styles?: FigmaTextStyle;
  };
  children?: UISchema[];
  suggestedComponent?: string; // e.g., 'Button', 'Card', 'Input'
}

/**
 * Convert RGBA color to CSS format
 */
function rgbaToCSS(color: { r: number; g: number; b: number; a: number }): string {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  const a = color.a;
  
  return a < 1 ? `rgba(${r}, ${g}, ${g}, ${a})` : `rgb(${r}, ${g}, ${b})`;
}

/**
 * Infer component type from Figma node
 */
function inferComponentType(node: FigmaNode): string | undefined {
  const name = node.name.toLowerCase();
  
  // Button detection
  if (name.includes('button') || name.includes('btn')) {
    return 'Button';
  }
  
  // Input detection
  if (name.includes('input') || name.includes('textfield') || name.includes('text field')) {
    return 'Input';
  }
  
  // Card detection
  if (name.includes('card') && node.children && node.children.length > 1) {
    return 'Card';
  }
  
  // Badge detection
  if (name.includes('badge') || name.includes('tag') || name.includes('chip')) {
    return 'Badge';
  }
  
  // Avatar detection
  if (name.includes('avatar') || name.includes('profile')) {
    return 'Avatar';
  }
  
  return undefined;
}

/**
 * Extract layout information from Figma node
 */
function extractLayout(node: FigmaNode): UISchema['layout'] {
  const layout: UISchema['layout'] = {
    direction: 'vertical',
    alignment: {},
  };
  
  // Auto Layout detection
  if (node.layoutMode) {
    layout.direction = node.layoutMode === 'HORIZONTAL' ? 'horizontal' : 'vertical';
    
    // Initialize alignment object
    if (!layout.alignment) {
      layout.alignment = {};
    }
    
    // Alignment
    if (node.primaryAxisAlignItems) {
      const alignMap: Record<string, 'start' | 'center' | 'end' | 'space-between'> = {
        'MIN': 'start',
        'CENTER': 'center',
        'MAX': 'end',
        'SPACE_BETWEEN': 'space-between',
      };
      layout.alignment.main = alignMap[node.primaryAxisAlignItems];
    }
    
    if (node.counterAxisAlignItems) {
      const alignMap: Record<string, 'start' | 'center' | 'end'> = {
        'MIN': 'start',
        'CENTER': 'center',
        'MAX': 'end',
      };
      layout.alignment.cross = alignMap[node.counterAxisAlignItems];
    }
    
    // Padding
    if (node.paddingLeft !== undefined) {
      layout.padding = {
        top: node.paddingTop || 0,
        right: node.paddingRight || 0,
        bottom: node.paddingBottom || 0,
        left: node.paddingLeft || 0,
      };
    }
    
    // Gap
    if (node.itemSpacing !== undefined) {
      layout.gap = node.itemSpacing;
    }
  }
  
  return layout;
}

/**
 * Extract styles from Figma node
 */
function extractStyles(node: FigmaNode): UISchema['styles'] {
  const styles: UISchema['styles'] = {};
  
  // Background color
  if (node.backgroundColor) {
    styles.background = rgbaToCSS(node.backgroundColor);
  } else if (node.fills && node.fills.length > 0) {
    const fill = node.fills[0];
    if (fill.type === 'SOLID' && fill.color) {
      styles.background = rgbaToCSS({ ...fill.color, a: fill.opacity || 1 });
    }
  }
  
  // Border
  if (node.strokes && node.strokes.length > 0) {
    const stroke = node.strokes[0];
    if (stroke.type === 'SOLID' && stroke.color) {
      styles.border = {
        width: 1,
        color: rgbaToCSS({ ...stroke.color, a: stroke.opacity || 1 }),
        radius: node.cornerRadius || 0,
      };
    }
  }
  
  // Shadow (effects)
  if (node.effects && node.effects.length > 0) {
    styles.shadow = node.effects
      .filter((effect) => effect.type === 'DROP_SHADOW' && effect.visible)
      .map((effect) => {
        const { offset, radius, color } = effect;
        const defaultColor = { r: 0, g: 0, b: 0, a: 0.25 };
        return `${offset?.x || 0}px ${offset?.y || 0}px ${radius || 0}px ${rgbaToCSS(color || defaultColor)}`;
      });
  }
  
  return styles;
}

/**
 * Normalize a single Figma node to UI Schema
 */
function normalizeNode(node: FigmaNode): UISchema {
  const schema: UISchema = {
    type: node.type === 'FRAME' || node.type === 'COMPONENT' ? 'container' : 'component',
    name: node.name,
    metadata: {
      figmaNodeId: node.id,
      dimensions: {
        width: node.absoluteBoundingBox?.width || 0,
        height: node.absoluteBoundingBox?.height || 0,
      },
      position: {
        x: node.absoluteBoundingBox?.x || 0,
        y: node.absoluteBoundingBox?.y || 0,
      },
    },
    layout: extractLayout(node),
    styles: extractStyles(node),
  };
  
  // Text content
  if (node.type === 'TEXT' && node.characters) {
    schema.content = {
      type: 'text',
      value: node.characters,
      styles: node.style,
    };
  }
  
  // Infer component type
  schema.suggestedComponent = inferComponentType(node);
  
  // Process children
  if (node.children && node.children.length > 0) {
    schema.children = node.children.map(normalizeNode);
  }
  
  return schema;
}

/**
 * Main function: Convert Figma design to UI Schema (Design AST)
 */
export function normalizeDesignToSchema(figmaNode: FigmaNode): UISchema {
  const schema = normalizeNode(figmaNode);
  schema.type = 'page';
  return schema;
}

/**
 * Generate a human-readable description of the design
 * This helps GPT-4 understand the design context better
 */
export function generateDesignDescription(schema: UISchema): string {
  const description: string[] = [];
  
  description.push(`Design: ${schema.name}`);
  description.push(`Dimensions: ${schema.metadata.dimensions.width}x${schema.metadata.dimensions.height}px`);
  description.push(`Layout: ${schema.layout.direction} direction`);
  
  if (schema.children) {
    description.push(`\nComponents (${schema.children.length}):`);
    schema.children.forEach((child, i) => {
      description.push(`${i + 1}. ${child.name} (${child.suggestedComponent || child.type})`);
      if (child.content?.type === 'text') {
        description.push(`   Text: "${child.content.value}"`);
      }
    });
  }
  
  return description.join('\n');
}