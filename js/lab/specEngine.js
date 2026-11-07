// specEngine.js
export const SPEC_FIELDS = [
  { id: 'material', name: 'Material', icon: 'fa-layer-group', categories: ['textiles', 'tailoring', 'jewellery', 'objects', 'crafts'] },
  { id: 'color', name: 'Color', icon: 'fa-palette', categories: ['textiles', 'tailoring', 'jewellery', 'beauty', 'objects', 'crafts'] },
  { id: 'size', name: 'Size', icon: 'fa-ruler-combined', categories: ['textiles', 'tailoring'] },
  { id: 'fit', name: 'Fit', icon: 'fa-shirt', categories: ['tailoring'] },
  { id: 'stone', name: 'Stone Type', icon: 'fa-gem', categories: ['jewellery'] },
  { id: 'metal', name: 'Metal', icon: 'fa-ring', categories: ['jewellery'] },
  { id: 'skin_type', name: 'Skin Type', icon: 'fa-hand-sparkles', categories: ['beauty'] },
  { id: 'pattern', name: 'Pattern', icon: 'fa-shapes', categories: ['textiles', 'crafts'] },
  { id: 'care', name: 'Care Instructions', icon: 'fa-soap', categories: ['textiles', 'tailoring', 'beauty'] },
  { id: 'origin', name: 'Origin', icon: 'fa-map-marker-alt', categories: ['textiles', 'tailoring', 'objects', 'crafts'] },
  { id: 'weight', name: 'Weight', icon: 'fa-weight-hanging', categories: ['jewellery', 'objects'] },
  { id: 'length', name: 'Length', icon: 'fa-arrows-alt-v', categories: ['textiles', 'tailoring', 'jewellery'] }
];

export const SPEC_VALUES = [
  // Materials
  { id: 'cotton', name: 'Cotton', fields: ['material'], categories: ['textiles', 'tailoring'] },
  { id: 'silk', name: 'Silk', fields: ['material'], categories: ['textiles', 'tailoring'] },
  { id: 'ankara', name: 'Ankara Print', fields: ['material', 'pattern'], categories: ['textiles', 'tailoring'] },
  { id: 'linen', name: 'Linen', fields: ['material'], categories: ['textiles', 'tailoring'] },
  { id: 'leather', name: 'Leather', fields: ['material'], categories: ['tailoring', 'objects'] },
  
  // Metals & Stones
  { id: 'gold', name: 'Gold', fields: ['material', 'metal'], categories: ['jewellery', 'objects'] },
  { id: 'silver', name: 'Silver', fields: ['material', 'metal'], categories: ['jewellery'] },
  { id: 'diamond', name: 'Diamond', fields: ['stone'], categories: ['jewellery'] },
  { id: 'pearl', name: 'Pearl', fields: ['stone'], categories: ['jewellery'] },
  
  // Colors & Patterns
  { id: 'black', name: 'Black', fields: ['color'], categories: ['textiles', 'jewellery', 'beauty', 'objects'] },
  { id: 'red', name: 'Red', fields: ['color'], categories: ['textiles', 'jewellery', 'beauty'] },
  { id: 'floral', name: 'Floral', fields: ['pattern'], categories: ['textiles', 'crafts'] },
  { id: 'geometric', name: 'Geometric', fields: ['pattern'], categories: ['textiles', 'crafts'] },
  
  // Fit & Size
  { id: 'xs', name: 'XS', fields: ['size'], categories: ['textiles', 'tailoring'] },
  { id: 'm', name: 'M', fields: ['size'], categories: ['textiles', 'tailoring'] },
  { id: 'oversized', name: 'Oversized', fields: ['fit'], categories: ['tailoring'] },
  { id: 'slim', name: 'Slim Fit', fields: ['fit'], categories: ['tailoring'] },
  
  // Care & Origin
  { id: 'hand_wash', name: 'Hand wash only', fields: ['care'], categories: ['textiles', 'tailoring', 'beauty'] },
  { id: 'dry_clean', name: 'Dry clean only', fields: ['care'], categories: ['textiles', 'tailoring'] },
  { id: 'made_in_ng', name: 'Made in Nigeria', fields: ['origin'], categories: ['textiles', 'tailoring', 'jewellery', 'objects', 'crafts'] }
];

export class SpecEngine {
  constructor() {
    this.fields = SPEC_FIELDS;
    this.values = SPEC_VALUES;
  }

  suggestFields(categoryId, partialName = '') {
    let candidates = categoryId
      ? this.fields.filter(f => f.categories.includes(categoryId))
      : this.fields;
    
    if (partialName) {
      const lower = partialName.toLowerCase();
      candidates = candidates.filter(f => f.name.toLowerCase().includes(lower) || f.id.includes(lower));
    }
    return candidates.map(f => ({ name: f.name, id: f.id, icon: f.icon }));
  }

  suggestValues(fieldName, categoryId, partialValue = '') {
    const matchedField = this.fields.find(f =>
      f.name.toLowerCase() === fieldName.toLowerCase() || f.id === fieldName.toLowerCase()
    );
    if (!matchedField) return [];

    let candidates = this.values.filter(v => v.fields.includes(matchedField.id));
    if (categoryId) {
      candidates = candidates.filter(v => v.categories.includes(categoryId));
    }
    if (partialValue) {
      const lower = partialValue.toLowerCase();
      candidates = candidates.filter(v => v.name.toLowerCase().includes(lower));
    }
    return candidates.map(v => v.name);
  }

  // New helper to get the icon for a specific field ID
  getFieldIcon(fieldId) {
    const field = this.fields.find(f => f.id === fieldId.toLowerCase());
    return field ? field.icon : 'fa-circle-info';
  }
}