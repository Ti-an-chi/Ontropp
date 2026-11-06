// SpecEngine.js
export const SPEC_FIELDS = [
  { id: 'material', name: 'Material', categories: ['textiles', 'tailoring', 'jewellery', 'objects', 'crafts'] },
  { id: 'color', name: 'Color', categories: ['textiles', 'tailoring', 'jewellery', 'beauty', 'objects', 'crafts'] },
  { id: 'size', name: 'Size', categories: ['textiles', 'tailoring'] },
  { id: 'stone', name: 'Stone Type', categories: ['jewellery'] },
  { id: 'skin_type', name: 'Skin Type', categories: ['beauty'] },
  { id: 'pattern', name: 'Pattern', categories: ['textiles', 'crafts'] },
  { id: 'care', name: 'Care Instructions', categories: ['textiles', 'tailoring', 'beauty'] },
  { id: 'availability', name: 'Availability', categories: ['textiles', 'tailoring', 'jewellery', 'objects', 'beauty', 'crafts'] } // Mapped for internal logic if needed
];

export const SPEC_VALUES = [
  { id: 'cotton', name: 'Cotton', fields: ['material'], categories: ['textiles', 'tailoring'] },
  { id: 'silk', name: 'Silk', fields: ['material'], categories: ['textiles', 'tailoring'] },
  { id: 'ankara', name: 'Ankara Print', fields: ['material', 'pattern'], categories: ['textiles', 'tailoring'] },
  { id: 'gold', name: 'Gold', fields: ['material'], categories: ['jewellery', 'objects'] },
  { id: 'silver', name: 'Silver', fields: ['material'], categories: ['jewellery'] },
  { id: 'black', name: 'Black', fields: ['color'], categories: ['textiles', 'jewellery', 'beauty', 'objects'] },
  { id: 'red', name: 'Red', fields: ['color'], categories: ['textiles', 'jewellery', 'beauty'] },
  { id: 'xs', name: 'XS', fields: ['size'], categories: ['textiles', 'tailoring'] },
  { id: 'm', name: 'M', fields: ['size'], categories: ['textiles', 'tailoring'] },
  { id: 'diamond', name: 'Diamond', fields: ['stone'], categories: ['jewellery'] },
  { id: 'floral', name: 'Floral', fields: ['pattern'], categories: ['textiles', 'crafts'] },
  { id: 'hand_wash', name: 'Hand wash only', fields: ['care'], categories: ['textiles', 'tailoring', 'beauty'] }
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
    return candidates.map(f => f.name);
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
}