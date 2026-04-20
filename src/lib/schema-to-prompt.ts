import type { UISchema } from './design-normalizer';

/**
 * Convert UI Schema to a concise, LLM-friendly prompt
 * This reduces the schema to essential information for code generation
 */
export function uiSchemaToPrompt(schema: UISchema): string {
  const lines: string[] = [];
  
  // Header
  lines.push(`# Figma Design: ${schema.name}`);
  lines.push('');
  
  // Metadata
  lines.push('## Layout Information');
  lines.push(`- Dimensions: ${schema.metadata.dimensions.width}x${schema.metadata.dimensions.height}px`);
  lines.push(`- Direction: ${schema.layout.direction}`);
  
  if (schema.layout.padding) {
    const p = schema.layout.padding;
    lines.push(`- Padding: ${p.top}px ${p.right}px ${p.bottom}px ${p.left}px`);
  }
  
  if (schema.layout.gap) {
    lines.push(`- Gap: ${schema.layout.gap}px`);
  }
  
  if (schema.layout.alignment) {
    lines.push(`- Alignment: main=${schema.layout.alignment.main || 'start'}, cross=${schema.layout.alignment.cross || 'start'}`);
  }
  
  lines.push('');
  
  // Styles
  if (schema.styles && Object.keys(schema.styles).length > 0) {
    lines.push('## Root Styles');
    if (schema.styles.background) {
      lines.push(`- Background: ${schema.styles.background}`);
    }
    if (schema.styles.border) {
      lines.push(`- Border: ${schema.styles.border.width}px ${schema.styles.border.color}, radius ${schema.styles.border.radius}px`);
    }
    if (schema.styles.shadow && schema.styles.shadow.length > 0) {
      lines.push(`- Shadow: ${schema.styles.shadow[0]}`);
    }
    lines.push('');
  }
  
  // Components
  if (schema.children && schema.children.length > 0) {
    lines.push(`## Components (${schema.children.length} items)`);
    lines.push('');
    
    schema.children.forEach((child, index) => {
      lines.push(`### ${index + 1}. ${child.name}`);
      
      if (child.suggestedComponent) {
        lines.push(`   Component Type: ${child.suggestedComponent}`);
      }
      
      lines.push(`   Dimensions: ${child.metadata.dimensions.width}x${child.metadata.dimensions.height}px`);
      lines.push(`   Layout: ${child.layout.direction}`);
      
      // Content
      if (child.content?.type === 'text') {
        lines.push(`   Text: "${child.content.value}"`);
        if (child.content.styles?.fontSize) {
          lines.push(`   Font: ${child.content.styles.fontSize}px, weight ${child.content.styles.fontWeight || 400}`);
        }
      }
      
      // Styles
      if (child.styles?.background) {
        lines.push(`   Background: ${child.styles.background}`);
      }
      
      if (child.styles?.border) {
        lines.push(`   Border radius: ${child.styles.border.radius}px`);
      }
      
      // Nested children count
      if (child.children && child.children.length > 0) {
        lines.push(`   Children: ${child.children.length} nested components`);
        
        // Show first few nested children
        child.children.slice(0, 3).forEach((nested, i) => {
          lines.push(`     ${i + 1}. ${nested.name}${nested.content?.type === 'text' ? ` - "${nested.content.value}"` : ''}`);
        });
        
        if (child.children.length > 3) {
          lines.push(`     ... and ${child.children.length - 3} more`);
        }
      }
      
      lines.push('');
    });
  }
  
  // Instructions
  lines.push('## Generation Instructions');
  lines.push('');
  lines.push('Create a Next.js/React component with:');
  lines.push('1. Tailwind CSS for styling (match colors, spacing, typography exactly)');
  lines.push('2. Responsive design (mobile-first approach)');
  lines.push('3. Proper semantic HTML structure');
  lines.push('4. Component composition (break into smaller components if needed)');
  lines.push('5. Accessibility (proper ARIA labels, semantic tags)');
  lines.push('');
  lines.push('Key requirements:');
  lines.push('- Match the layout direction and alignment');
  lines.push('- Use exact dimensions as max-width constraints');
  lines.push('- Preserve padding, gaps, and spacing');
  lines.push('- Convert colors accurately');
  lines.push('- Use shadcn/ui components where appropriate (Button, Card, etc.)');
  lines.push('- Add hover states and transitions for interactive elements');
  
  return lines.join('\n');
}

/**
 * Create a lightweight metadata object for storage
 * Only includes essential information, not the full schema
 */
export function createLightMetadata(schema: UISchema, figmaUrl: string) {
  return {
    source: 'figma',
    figmaUrl,
    figmaNodeId: schema.metadata.figmaNodeId,
    designName: schema.name,
    dimensions: schema.metadata.dimensions,
    componentsCount: schema.children?.length || 0,
    layoutDirection: schema.layout.direction,
    // Store only component names and types for reference
    components: schema.children?.map(child => ({
      name: child.name,
      type: child.suggestedComponent || child.type,
      hasText: child.content?.type === 'text',
      childrenCount: child.children?.length || 0,
    })) || [],
  };
}

/**
 * Serialize schema for efficient storage
 * Removes redundant information and compresses data
 */
export function serializeSchema(schema: UISchema): string {
  // Remove redundant position data and compress
  const compressed = {
    t: schema.type,
    n: schema.name,
    m: {
      id: schema.metadata.figmaNodeId,
      d: schema.metadata.dimensions,
    },
    l: {
      d: schema.layout.direction,
      a: schema.layout.alignment,
      p: schema.layout.padding,
      g: schema.layout.gap,
    },
    s: schema.styles,
    c: schema.content,
    ch: schema.children?.map(child => serializeSchemaNode(child)),
  };
  
  return JSON.stringify(compressed);
}

interface SerializedNode {
  t: 'page' | 'section' | 'container' | 'component';
  n: string;
  m: { d: { width: number; height: number } };
  l: {
    d: 'horizontal' | 'vertical' | 'absolute';
    a?: {
      main?: 'start' | 'center' | 'end' | 'space-between' | 'space-around';
      cross?: 'start' | 'center' | 'end' | 'stretch';
    };
    p?: { top: number; right: number; bottom: number; left: number };
    g?: number;
  };
  s?: UISchema['styles'];
  c?: UISchema['content'];
  sc?: string;
  ch?: SerializedNode[];
}

function serializeSchemaNode(node: UISchema): SerializedNode {
  return {
    t: node.type,
    n: node.name,
    m: { d: node.metadata.dimensions },
    l: {
      d: node.layout.direction,
      a: node.layout.alignment,
      p: node.layout.padding,
      g: node.layout.gap,
    },
    s: node.styles,
    c: node.content,
    sc: node.suggestedComponent,
    ch: node.children?.map(child => serializeSchemaNode(child)),
  };
}

/**
 * Deserialize compressed schema
 */
export function deserializeSchema(serialized: string): UISchema {
  const compressed = JSON.parse(serialized);
  
  return {
    type: compressed.t,
    name: compressed.n,
    metadata: {
      figmaNodeId: compressed.m.id,
      dimensions: compressed.m.d,
      position: { x: 0, y: 0 },
    },
    layout: {
      direction: compressed.l.d,
      alignment: compressed.l.a,
      padding: compressed.l.p,
      gap: compressed.l.g,
    },
    styles: compressed.s,
    content: compressed.c,
    children: compressed.ch?.map((child: SerializedNode) => deserializeSchemaNode(child)),
  };
}

function deserializeSchemaNode(node: SerializedNode): UISchema {
  return {
    type: node.t,
    name: node.n,
    metadata: {
      figmaNodeId: '',
      dimensions: node.m.d,
      position: { x: 0, y: 0 },
    },
    layout: {
      direction: node.l.d,
      alignment: node.l.a || undefined,
      padding: node.l.p,
      gap: node.l.g,
    },
    styles: node.s,
    content: node.c,
    suggestedComponent: node.sc,
    children: node.ch?.map((child) => deserializeSchemaNode(child)),
  };
}
